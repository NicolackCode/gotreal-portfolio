import { createClient } from '@supabase/supabase-js'
import { Storage } from '@google-cloud/storage'
import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import os from 'os'
import fs from 'fs'
import * as dotenv from 'dotenv'
import * as crypto from 'crypto'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
const supabase = createClient(supabaseUrl!, supabaseKey!)

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: {
    client_email: process.env.GCP_CLIENT_EMAIL,
    private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
})
const bucket = storage.bucket(process.env.GCP_BUCKET_NAME || '')
const bucketName = process.env.GCP_BUCKET_NAME || '';

// Basic extraction of file path from URL
function getGcpFilePath(url: string | undefined): string | null {
  if (!url || !url.startsWith('https://storage.googleapis.com/')) return null;
  if (!url.endsWith('.mp4')) return null; // Only process MP4s
  
  // Try to parse out the bucket and path
  const urlObj = new URL(url);
  // Path usually looks like /bucket-name/assets/videos/...
  const pathParts = urlObj.pathname.split('/').filter(Boolean);
  
  // if format is storage.googleapis.com/bucket-name/folder/file.mp4
  if (pathParts[0] === bucketName) {
      return pathParts.slice(1).join('/'); // Remove bucket name from path
  }
  
  // Otherwise if format is bucket-name.storage.googleapis.com (not typically how Firebase/Supabase formats it, but just in case)
  return pathParts.join('/'); 
}

async function uploadDirectory(localPath: string, bucketPath: string) {
  const files = getAllFiles(localPath)
  for (const file of files) {
    const relativePath = path.relative(localPath, file).replace(/\\/g, '/')
    const destination = `${bucketPath}/${relativePath}`
    
    let contentType = 'application/octet-stream'
    if (file.endsWith('.m3u8')) contentType = 'application/vnd.apple.mpegurl'
    if (file.endsWith('.ts')) contentType = 'video/MP2T'
    
    await bucket.upload(file, {
      destination,
      metadata: {
        contentType,
        cacheControl: 'public, max-age=31536000'
      }
    })
  }
}

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
  const files = fs.readdirSync(dirPath)
  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles)
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file))
    }
  })
  return arrayOfFiles
}

async function processVideo(gcpPath: string): Promise<string> {
  const parsedPath = path.parse(gcpPath)
  // Example: videos/Project1/main.mp4 -> videos/Project1/main_hls/
  const hlsBucketPath = `${parsedPath.dir}/${parsedPath.name}_hls`
  const finalUrl = `https://storage.googleapis.com/${bucketName}/${hlsBucketPath}/master.m3u8`

  // ----- NEW: Check if already processed in GCP
  const masterRef = bucket.file(`${hlsBucketPath}/master.m3u8`)
  try {
    const [exists] = await masterRef.exists()
    if (exists) {
      console.log(`⏩ Skipping processing: ${hlsBucketPath}/master.m3u8 already exists in GCP!`)
      return finalUrl
    }
  } catch (err) {
    console.warn(`⚠️ Could not check if file exists, proceeding anyway:`, err)
  }
  // ------------------------------------------

  // ----- NEW 2: Check file size BEFORE downloading to save bandwidth
  try {
    const [metadata] = await bucket.file(gcpPath).getMetadata();
    const sizeBytes = Number(metadata.size);
    const MAX_SIZE_MB = 1000; // Increased to 1GB to process ANSWR and Le fou du bus
    if (sizeBytes > MAX_SIZE_MB * 1024 * 1024) {
      console.log(`⏩ Skipping processing: Video file is too huge (${(sizeBytes / 1024 / 1024).toFixed(1)} MB). Max is ${MAX_SIZE_MB} MB.`);
      throw new Error("VIDEO_TOO_LONG");
    }
  } catch (err) {
    if (err instanceof Error && err.message === "VIDEO_TOO_LONG") throw err; // Re-throw to be caught by caller
    console.warn(`⚠️ Could not check file size before download, proceeding...`);
  }
  // ------------------------------------------

  const tempDir = os.tmpdir()
  const uniqueId = crypto.randomUUID()
  const localInputPath = path.join(tempDir, `input_${uniqueId}.mp4`)
  const localOutputDir = path.join(tempDir, `output_${uniqueId}`)
  
  if (!fs.existsSync(localOutputDir)) {
    fs.mkdirSync(localOutputDir)
  }

  console.log(`\n⬇️ Downloading ${gcpPath}...`)
  try {
    await bucket.file(gcpPath).download({ destination: localInputPath })
  } catch (err) {
      console.error(`❌ Failed to download ${gcpPath}:`, err);
      throw err;
  }

  console.log(`⏳ Encoding FFmpeg (this will take a while)...`)
  
  // 1) Obtenir la durée de la vidéo d'abord
  let durationInSeconds = 0;
  let isVertical = false;
  try {
     const metadata = await new Promise<ffmpeg.FfprobeData>((resolve, reject) => {
        ffmpeg.ffprobe(localInputPath, (err, metadata) => {
           if (err) reject(err);
           else resolve(metadata);
        })
     });
     if (metadata?.format?.duration) {
         durationInSeconds = metadata.format.duration;
     }
     if (metadata?.streams) {
         const videoStream = metadata.streams.find(s => s.codec_type === 'video');
         if (videoStream && videoStream.width && videoStream.height) {
             const rotated = videoStream.tags?.rotate == '90' || videoStream.tags?.rotate == '270' || videoStream.tags?.rotate == '-90';
             if (rotated) {
                 isVertical = videoStream.width > videoStream.height;
             } else {
                 isVertical = videoStream.height > videoStream.width;
             }
         }
     }
  } catch {
      console.warn("⚠️ Could not read video metadata, progress will be approximate.");
  }

  // ----- NEW: Check if video is too long to process locally
  const MAX_DURATION_MINUTES = 60; // Increased to 60 mins 
  if (durationInSeconds > MAX_DURATION_MINUTES * 60) {
      console.log(`⏩ Skipping processing: Video is too long (${(durationInSeconds / 60).toFixed(1)} mins). Max is ${MAX_DURATION_MINUTES} mins.`);
      // On supprime juste le fichier qu'on a téléchargé pour tester la durée
      fs.unlinkSync(localInputPath);
      // On retourne un string vide ou un flag que la fonction appelante doit gérer
      // Dans notre cas, si on throw, l'appelant va faire un console.error et sauter l'update DB, gardant le MP4 d'origine.
      throw new Error("VIDEO_TOO_LONG");
  }
  // ------------------------------------------

  await new Promise((resolve, reject) => {
    let lastLogTime = 0;

    const scale1080 = isVertical ? 'scale=-2:1920' : 'scale=1920:-2';
    const scale720 = isVertical ? 'scale=-2:1280' : 'scale=1280:-2';
    const scale480 = isVertical ? 'scale=-2:854' : 'scale=854:-2';

    ffmpeg(localInputPath)
      .outputOptions([
        '-map 0:v:0', '-map 0:a:0?',
        '-filter:v:0', `${scale1080}`, '-c:v:0', 'libx264', '-b:v:0', '5000k', '-c:a:0', 'aac', '-b:a:0', '128k',
        
        '-map 0:v:0', '-map 0:a:0?',
        '-filter:v:1', `${scale720}`, '-c:v:1', 'libx264', '-b:v:1', '2500k', '-c:a:1', 'aac', '-b:a:1', '128k',
        
        '-map 0:v:0', '-map 0:a:0?',
        '-filter:v:2', `${scale480}`, '-c:v:2', 'libx264', '-b:v:2', '1000k', '-c:a:2', 'aac', '-b:a:2', '96k',
        
        '-f hls',
        '-hls_time 6',
        '-hls_playlist_type vod',
        '-hls_flags independent_segments',
        '-hls_segment_type mpegts',
        '-hls_segment_filename', path.join(localOutputDir, 'v%v/fileSequence%d.ts'),
        '-master_pl_name master.m3u8',
        '-var_stream_map', 'v:0,a:0 v:1,a:1 v:2,a:2'
      ])
      .output(path.join(localOutputDir, 'v%v/prog_index.m3u8'))
      .on('progress', (progress) => {
         const now = Date.now();
         if (now - lastLogTime > 1000) { // Update la console max 1 fois par sec pour pas déborder Windows
             lastLogTime = now;
             
             let percentString = '...';
             if (progress.percent !== undefined && !isNaN(progress.percent)) {
                 percentString = `${progress.percent.toFixed(2)}%`;
             } else if (durationInSeconds > 0 && progress.timemark) {
                 // Format timemark: 'hh:mm:ss.ms' -> On calcule manuellement
                 const timeParts = progress.timemark.split(':');
                 if (timeParts.length === 3) {
                     const h = parseFloat(timeParts[0]);
                     const m = parseFloat(timeParts[1]);
                     const s = parseFloat(timeParts[2]);
                     const currentSeconds = (h * 3600) + (m * 60) + s;
                     const currentPercent = (currentSeconds / durationInSeconds) * 100;
                     percentString = `${currentPercent.toFixed(2)}%`;
                 }
             }

             if (percentString !== '...') {
                 process.stdout.write(`\\r⏳ Encoding FFmpeg... ${percentString} completed (FPS: ${progress.currentFps || '?'})`);
             } else {
                 process.stdout.write(`\\r⏳ Encoding FFmpeg... Frame: ${progress.frames || '?'} (FPS: ${progress.currentFps || '?'})`);
             }
         }
      })
      .on('end', () => {
         process.stdout.write('\\n');
         resolve(true)
      })
      .on('error', (err) => {
         process.stdout.write('\\n');
         reject(err)
      })
      .run()
  })

  console.log(`⬆️ Uploading HLS playlist to GCP...`)
  await uploadDirectory(localOutputDir, hlsBucketPath)
  
  // Cleanup
  fs.unlinkSync(localInputPath)
  fs.rmSync(localOutputDir, { recursive: true, force: true })

  console.log(`✅ Finished processing: ${finalUrl}`)
  return finalUrl
}

async function run() {
  console.log("🚀 Starting HLS Portfolio Batch Processing...")
  
  const { data: projects, error } = await supabase.from('projects').select('*')
  
  if (error || !projects) {
    console.error("Failed to fetch projects from Supabase:", error)
    return
  }

  console.log(`Found ${projects.length} projects. Analyzing videos...`)

  let processedCount = 0;
  for (const project of projects) {
    processedCount++;
    
    // Check if this project even NEEDS processing before logging
    const needsMain = project.main_video_url && project.main_video_url.endsWith('.mp4');
    let needsCarousel = false;
    
    let carouselItems: string[] = []
    if (project.carousel_urls) {
        if (typeof project.carousel_urls === 'string') {
            try { carouselItems = JSON.parse(project.carousel_urls) } catch { /* ignore */ }
        } else if (Array.isArray(project.carousel_urls)) {
            carouselItems = project.carousel_urls
        }
        needsCarousel = carouselItems.some(url => url.endsWith('.mp4'));
    }

    if (!needsMain && !needsCarousel) {
       // Silently skip fully processed projects to avoid console spam
       continue;
    }

    console.log(`\n---------------------------------`)
    console.log(`🎥 [${processedCount}/${projects.length}] Project: ${project.title}`)
    
    // Process Main Video
    const mainPath = getGcpFilePath(project.main_video_url)
    if (mainPath) {
      try {
        const newHlsUrl = await processVideo(mainPath)
        const { error: updateErr } = await supabase
            .from('projects')
            .update({ main_video_url: newHlsUrl })
            .eq('id', project.id)
        
        if (updateErr) throw updateErr;

        console.log(`💾 Updated DB with new main_video_url: ${newHlsUrl}`)
      } catch (err) {
        if (err instanceof Error && err.message === "VIDEO_TOO_LONG") {
            console.log(`⏭️ Keeping original MP4 for main video (too long).`);
        } else {
            console.error(`❌ Error processing main video for ${project.title}`, err)
        }
      }
    } else {
      console.log(`⏭️ Skipping main video (already HLS, empty, or not MP4).`)
    }

    // Process Carousel Videos
    if (project.carousel_urls) {
        let carouselUpdated = false;
        for (let i = 0; i < carouselItems.length; i++) {
            const url = carouselItems[i];
            const carPath = getGcpFilePath(url);
            if (carPath) {
                try {
                    const newHlsUrl = await processVideo(carPath)
                    carouselItems[i] = newHlsUrl
                    carouselUpdated = true;
                } catch(err) {
                     if (err instanceof Error && err.message === "VIDEO_TOO_LONG") {
                         console.log(`⏭️ Keeping original MP4 for carousel video ${i + 1} (too long).`);
                     } else {
                         console.error(`❌ Error processing carousel video ${url} for ${project.title}`, err)
                     }
                }
            } else {
                 console.log(`⏭️ Skipping carousel video ${i + 1} (already HLS or not MP4).`)
            }
        }

        if (carouselUpdated) {
            const { error: updateErr } = await supabase
                .from('projects')
                .update({ carousel_urls: JSON.stringify(carouselItems) })
                .eq('id', project.id)
                
            if (updateErr) throw updateErr;
            console.log(`💾 Updated DB with new carousel_urls.`)
        }
    }
  }

  console.log(`\n🎉 All done! Portfolio is now fully processed for HLS streaming.`)
  process.exit(0)
}

run().catch(console.error)

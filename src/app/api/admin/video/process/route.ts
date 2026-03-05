import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Storage } from '@google-cloud/storage'
import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import os from 'os'
import fs from 'fs'

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: {
    client_email: process.env.GCP_CLIENT_EMAIL,
    private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
})

const bucket = storage.bucket(process.env.GCP_BUCKET_NAME || '')

// API to trigger HLS processing of a video
// This should ideally be a background queue/job, but for simple needs we can just start it async.
// NextJS app dir API routes might kill long running requests, so we return immediately and proc in background.
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {}
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fileName } = await req.json()
    if (!fileName) {
      return NextResponse.json({ error: 'No filename provided' }, { status: 400 })
    }

    // Lance le traitement en background
    processHLS(fileName).catch(err => console.error("Error processing HLS in background:", err))

    return NextResponse.json({ message: 'Processing started in background' })

  } catch (error) {
    console.error('HLS trigger error:', error)
    return NextResponse.json({ error: 'Failed to trigger processing' }, { status: 500 })
  }
}

async function processHLS(gcpIdentifier: string) {
  // 1. Download the original video from GCP to a local temp file
  const tempDir = os.tmpdir()
  const uniqueId = crypto.randomUUID()
  const localInputPath = path.join(tempDir, `input_${uniqueId}.mp4`)
  const localOutputDir = path.join(tempDir, `output_${uniqueId}`)
  
  if (!fs.existsSync(localOutputDir)) {
    fs.mkdirSync(localOutputDir)
  }

  console.log(`[HLS] Downloading ${gcpIdentifier} to ${localInputPath}...`)
  await bucket.file(gcpIdentifier).download({ destination: localInputPath })

  console.log(`[HLS] Starting FFmpeg processing...`)
  
  // We'll create a master playlist and 3 variants: 1080p, 720p, 480p
  // For production, consider using a proper transcoding service like Mux or GCP Transcoder API.
  // This is a basic local ffmpeg approach for demonstration/small scale.
  return new Promise((resolve, reject) => {
    ffmpeg(localInputPath)
      // 1080p stream
      .outputOptions([
        '-map 0:v:0',
        '-map 0:a:0?',
        '-s:v:0 1920x1080',
        '-c:v:0 libx264',
        '-b:v:0 5000k',
        '-c:a:0 aac',
        '-b:a:0 128k',
        // 720p stream
        '-map 0:v:0',
        '-map 0:a:0?',
        '-s:v:1 1280x720',
        '-c:v:1 libx264',
        '-b:v:1 2500k',
        '-c:a:1 aac',
        '-b:a:1 128k',
        // 480p stream
        '-map 0:v:0',
        '-map 0:a:0?',
        '-s:v:2 854x480',
        '-c:v:2 libx264',
        '-b:v:2 1000k',
        '-c:a:2 aac',
        '-b:a:2 96k',
        
        // HLS Config
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
      .on('end', async () => {
         console.log(`[HLS] FFmpeg processing finished for ${gcpIdentifier}. Uploading to GCP...`)
         try {
           const subfolderName = gcpIdentifier.split('.')[0] + '_hls'
           await uploadDirectory(localOutputDir, subfolderName)
           console.log(`[HLS] Finished uploading HLS assets for ${gcpIdentifier}`)
           // Cleanup local
           fs.unlinkSync(localInputPath)
           fs.rmSync(localOutputDir, { recursive: true, force: true })
           resolve(true)
         } catch(e) {
           reject(e)
         }
      })
      .on('error', (err) => {
        console.error(`[HLS] FFmpeg error:`, err)
        reject(err)
      })
      .run();
  })
}

async function uploadDirectory(localPath: string, bucketPath: string) {
  const files = getAllFiles(localPath)
  for (const file of files) {
    const relativePath = path.relative(localPath, file).replace(/\\/g, '/')
    const destination = `videos/${bucketPath}/${relativePath}`
    
    let contentType = 'application/octet-stream'
    if (file.endsWith('.m3u8')) contentType = 'application/vnd.apple.mpegurl'
    if (file.endsWith('.ts')) contentType = 'video/MP2T'
    
    await bucket.upload(file, {
      destination,
      metadata: {
        contentType
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

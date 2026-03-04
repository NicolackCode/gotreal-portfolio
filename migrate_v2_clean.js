import { Storage } from '@google-cloud/storage'
import fs from 'fs'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const projectId = process.env.GCP_PROJECT_ID
const clientEmail = process.env.GCP_CLIENT_EMAIL
const privateKey = process.env.GCP_PRIVATE_KEY
const bucketName = process.env.GCP_BUCKET_NAME

const storage = new Storage({
  projectId,
  credentials: {
    client_email: clientEmail,
    private_key: privateKey?.replace(/\\n/g, '\n'),
  },
})

// Nettoie pour avoir un nom de Projet très propre (sans dossiers ni balises)
function extractCleanMetadata(filename) {
    // 1. Enlever les dossiers (ex: "assets/videos/Captations Live/[TOP3] Shanixx...")
    let nameOnly = filename.split('/').pop()
    
    // 2. Tenter d'extraire une catégorie si on est dans un sous-dossier clair
    let categoryMatch = filename.match(/assets\/videos\/([^\/]+)\//)
    let category = categoryMatch ? categoryMatch[1].replace(/_/g, ' ') : ''

    // 3. Enlever les tags moches type [TOP1], [RAW]
    nameOnly = nameOnly.replace(/^\[.*?\]_?/, '').trim()

    // 4. Enlever les suffixes de qualité / parties (_main, _NA, _01, .mp4)
    nameOnly = nameOnly.replace(/_(\d+|main|NA|01|02|03|04|05|06|07|08|09|10|11)\.(mp4|webm)$/i, '')
    nameOnly = nameOnly.replace(/\.(mp4|webm)$/i, '')

    // 5. Remplacer les _ par des espaces
    let title = nameOnly.replace(/_/g, ' ')

    return { title, category }
}

async function run() {
    console.log("🚀 Custom V2 Importer : Scan du bucket en cours...")
    const [files] = await storage.bucket(bucketName).getFiles()
    
    // On groupe par titre propre
    const projectsMap = new Map()

    files.forEach(file => {
        if (!file.name.endsWith('.mp4') && !file.name.endsWith('.webm')) return
        
        const name = file.name
        const url = `https://storage.googleapis.com/${bucketName}/${name}`

        const { title: cleanTitle, category } = extractCleanMetadata(name)

        if (!projectsMap.has(cleanTitle)) {
            projectsMap.set(cleanTitle, {
                title: cleanTitle,
                client: category || 'General',
                description: '',
                files: [ { name, url, isMain: name.includes('_main') } ]
            })
        } else {
            const existing = projectsMap.get(cleanTitle)
            existing.files.push({ name, url, isMain: name.includes('_main') })
            if (category && existing.client === 'General') {
              existing.client = category // Update client info if found later
            }
        }
    })

    const allProjects = Array.from(projectsMap.values())

    // 3. Dispatch Main / Carousel (et on met un Rank de base alphabétique ou aléatoire pour que le front marche, modifiable ensuite par l'admin)
    const finalProjects = allProjects.map((p, index) => {
        let main = p.files.find(f => f.isMain)
        if (!main) {
            main = p.files[0]
        }
        
        const carousel = p.files.filter(f => f.url !== main.url).map(f => f.url)

        return {
            title: p.title,
            client: p.client, // On recycle le champ 'client' pour stocker la catégorie V1 propre
            description: p.description,
            main_video_url: main.url,
            carousel_urls: carousel,
            rank: index + 1
        }
    })

    fs.writeFileSync('./public/v2_projects_clean.json', JSON.stringify(finalProjects, null, 2))
    console.log(`✅ JSON regénéré (Clean V2) : ${finalProjects.length} Projets exportés sans métadonnées poubelles !`)
}

run()

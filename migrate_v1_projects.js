const { Storage } = require('@google-cloud/storage')
const fs = require('fs')
require('dotenv').config({ path: '.env.local' })

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

// Détermine la qualité intrinsèque (pour le rank combiné V1)
function getQualityScore(filename) {
    if (filename.includes('_main') || filename.includes('4K')) return 4;
    // Si la vidéo a un _01 ou _02 c'est sûrement de la bonne captation multi, on donne un bonus léger
    if (filename.match(/_0[1-9]/)) return 3;
    return 2;
}

// Nettoie pour avoir un nom de Projet Groupé ("Dossier")
function extractDisplayTitle(filename) {
    let title = filename.replace(/^\[.*?\]_/, ''); // Enlève [TOP1]
    title = title.replace(/_(\d+|main|NA|01|02|03|04|05|06|07|08|09|10|11)\.mp4$/, '');
    return title.replace(/_/g, ' ');
}

async function run() {
    console.log("🚀 Lancement du scan du bucket pour générer Main + Carousel...")
    const [files] = await storage.bucket(bucketName).getFiles()
    
    const projectsMap = new Map()

    // 1. On mappe les fichiers à "Dossiers Projet"
    files.forEach(file => {
        if (!file.name.endsWith('.mp4') && !file.name.endsWith('.webm')) return
        
        const name = file.name
        const url = `https://storage.googleapis.com/${bucketName}/${name}`

        // Extraction Rangs
        let rank = 'RAW'
        if (name.includes('[TOP3]')) rank = 'TOP3'
        else if (name.includes('[TOP2]')) rank = 'TOP2'
        else if (name.includes('[TOP1]')) rank = 'TOP1'

        const baseTitle = extractDisplayTitle(name)
        const qualityScore = getQualityScore(name)
        const rankScore = rank === 'TOP3' ? 3 : rank === 'TOP2' ? 2 : rank === 'TOP1' ? 1 : 0
        const globalScore = (rankScore * 10) + qualityScore

        if (!projectsMap.has(baseTitle)) {
            projectsMap.set(baseTitle, {
                title: baseTitle,
                client: 'Archive V1',
                description: '',
                globalScore: globalScore,
                files: [ { name, url, isMain: name.includes('_main') } ]
            })
        } else {
            const existing = projectsMap.get(baseTitle)
            existing.files.push({ name, url, isMain: name.includes('_main') })
            // On retient le meilleur score de toutes les vidéos du dossier de ce projet
            if (globalScore > existing.globalScore) {
                existing.globalScore = globalScore
            }
        }
    })

    const allProjects = Array.from(projectsMap.values())
    // 2. On trie les projets (Dossiers) par meilleur Score pour déterminer L'ORDRE D'AFFICHAGE (Rank Supabase final)
    allProjects.sort((a, b) => b.globalScore - a.globalScore)

    // 3. Dispatch Main / Carousel
    const finalProjects = allProjects.map((p, index) => {
        let main = p.files.find(f => f.isMain)
        // S'il ya pas de _main, on prend soit le 01, soit la plus grosse qualité, ici on simplifie en prenant la 1ère.
        if (!main) {
            main = p.files[0]
        }
        
        // Tout le reste va dans le carrousel
        const carousel = p.files.filter(f => f.url !== main.url).map(f => f.url)

        return {
            title: p.title,
            client: p.client,
            description: p.description,
            main_video_url: main.url,
            carousel_urls: carousel,
            rank: index + 1
        }
    })

    fs.writeFileSync('./public/v1_projects.json', JSON.stringify(finalProjects, null, 2))
    console.log(`✅ JSON regénéré : ${finalProjects.length} Projets classés (avec Master et Carrousels) !`)
}

run()


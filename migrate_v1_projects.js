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

function getQualityScore(filename) {
    if (filename.includes('_main') || filename.includes('_01') || filename.includes('_02') || filename.includes('_03') || filename.includes('_04')) return 4;
    return 2;
}

function extractDisplayTitle(filename) {
    let title = filename.replace(/^\[.*?\]_/, '');
    title = title.replace(/_(\d+|main|NA|01|02|03|04|05|06|07|08|09|10|11)\.mp4$/, '');
    return title.replace(/_/g, ' ');
}

async function run() {
    console.log("🚀 Lancement du scan du bucket...")
    const [files] = await storage.bucket(bucketName).getFiles()
    
    const projectsMap = new Map()

    files.forEach(file => {
        if (!file.name.endsWith('.mp4') && !file.name.endsWith('.webm')) return
        
        const name = file.name
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
                video_url: `https://storage.googleapis.com/${bucketName}/${name}`,
                globalScore: globalScore
            })
        } else {
            const existing = projectsMap.get(baseTitle)
            if (globalScore > existing.globalScore) {
                existing.video_url = `https://storage.googleapis.com/${bucketName}/${name}`
                existing.globalScore = globalScore
            }
        }
    })

    const allProjects = Array.from(projectsMap.values())
    allProjects.sort((a, b) => b.globalScore - a.globalScore)

    // Attribuer le rank définitif
    const finalProjects = allProjects.map((p, index) => ({
        title: p.title,
        client: p.client,
        description: p.description,
        video_url: p.video_url,
        rank: index + 1
    }))

    fs.writeFileSync('./public/v1_projects.json', JSON.stringify(finalProjects, null, 2))
    console.log(`✅ Fichier /public/v1_projects.json généré avec ${finalProjects.length} projets classés !`)
}

run()


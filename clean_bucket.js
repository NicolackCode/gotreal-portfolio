const { Storage } = require('@google-cloud/storage')
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

async function purgePreviews() {
  console.log('🗑️ Début du grand nettoyage de Printemps sur ton Google Cloud Storage...')
  const bucket = storage.bucket(bucketName)
  const [files] = await bucket.getFiles()

  let deleteCount = 0
  let savedBytes = 0

  for (const file of files) {
    // Si c'est une vidéo encodée "preview" (souvent _NA_preview ou stockée dans des dossiers previews)
    // Ici on supprime tout ce qui a "previews", "720p", "_NA_" (anciennes conventions)
    if (file.name.includes('/previews/') || file.name.includes('720p') || file.name.includes('1080p') || file.name.includes('_NA_')) {
      const size = parseInt(file.metadata.size || 0, 10)
      savedBytes += size
      
      console.log(`- Suppression: ${file.name} (${(size / (1024*1024)).toFixed(2)} MB)...`)
      try {
        await file.delete()
        deleteCount++
      } catch (err) {
        console.error(`❌ Erreur sur ${file.name}`, err.message)
      }
    }
  }

  const savedGigabytes = (savedBytes / (1024 * 1024 * 1024)).toFixed(2)
  console.log(`\n✅ Nettoyage terminé !`)
  console.log(`🧹 ${deleteCount} fichiers (previews, doublons 720p) supprimés.`)
  console.log(`💰 Tu as économisé ~${savedGigabytes} Go de stockage cloud !`)
}

purgePreviews()

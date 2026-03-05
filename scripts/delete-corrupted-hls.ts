import { Storage } from '@google-cloud/storage'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: {
    client_email: process.env.GCP_CLIENT_EMAIL,
    private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
})
const bucket = storage.bucket(process.env.GCP_BUCKET_NAME || '')

async function deleteFolder(prefix: string) {
  console.log(`Checking prefix: ${prefix}...`)
  const [files] = await bucket.getFiles({ prefix })
  if (files.length > 0) {
    console.log(`Found ${files.length} files. Deleting...`)
    for (const f of files) {
      await f.delete()
      console.log(`Deleted ${f.name}`)
    }
  } else {
    console.log('No files found for ' + prefix)
  }
}

async function run() {
  await deleteFolder('videos/Raw_Archive/[RAW]_ANSWR_-_All_Night_Long_Slalom_01_hls/')
  await deleteFolder('videos/Raw_Archive/[RAW]_Le_Fou_Du_Bus_01_hls/')
  await deleteFolder('videos/Raw_Archive/[RAW]_Le_Fou_Du_Bus_hls/')
}

run().catch(console.error)

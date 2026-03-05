import { Storage } from '@google-cloud/storage'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: {
    client_email: process.env.GCP_CLIENT_EMAIL,
    private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
})

const bucketName = process.env.GCP_BUCKET_NAME || '';

async function setCors() {
  console.log(`Configuring CORS for bucket: ${bucketName}...`);
  try {
    const [bucket] = await storage.bucket(bucketName).get();
    
    const corsConfiguration = [
      {
        method: ['GET', 'HEAD', 'OPTIONS', 'PUT'], // Ajout de PUT
        origin: ['*'], // Ou remplacez par ['http://localhost:3000', 'https://votre-domaine.com']
        responseHeader: ['Content-Type', 'Access-Control-Allow-Origin', 'Range'],
        maxAgeSeconds: 3600,
      },
    ];

    await bucket.setCorsConfiguration(corsConfiguration);
    console.log(`✅ CORS configuration successfully updated for bucket ${bucketName}!`);
  } catch (err) {
    console.error(`❌ Error setting CORS:`, err);
  }
}

setCors().catch(console.error);

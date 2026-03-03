require('dotenv').config({ path: '.env.local' });
const { Storage } = require('@google-cloud/storage');

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: {
    client_email: process.env.GCP_CLIENT_EMAIL,
    private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
});

async function configureCors() {
  const bucket = storage.bucket(process.env.GCP_BUCKET_NAME);
  await bucket.setCorsConfiguration([
    {
      origin: ['http://localhost:3000', 'https://gotreal-portfolio.vercel.app'],
      method: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
      responseHeader: ['Content-Type', 'Authorization', 'Access-Control-Allow-Origin'],
      maxAgeSeconds: 3600,
    },
  ]);
  console.log('CORS configuré sur ' + process.env.GCP_BUCKET_NAME);
}

configureCors().catch(console.error);

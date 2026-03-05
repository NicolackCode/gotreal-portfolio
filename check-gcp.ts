import { Storage } from '@google-cloud/storage'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const bucket = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: { client_email: process.env.GCP_CLIENT_EMAIL, private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n') }
}).bucket(process.env.GCP_BUCKET_NAME || '');

async function run() {
  const [files] = await bucket.getFiles({ prefix: '' });
  console.log('Total files found in entire bucket:', files.length);
  for (let i = 0; i < Math.min(files.length, 20); i++) {
    console.log(files[i].name);
  }
}
run().catch(console.error);

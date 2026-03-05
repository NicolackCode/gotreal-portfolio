const { Client } = require('pg');
const fs = require('fs');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const client = new Client({ connectionString: envConfig.DATABASE_URL });

async function run() {
  try {
    await client.connect();
    console.log('Connected to PG');
    
    // Check if category exists
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='projects' AND column_name='category';
    `);
    
    if (res.rows.length === 0) {
      await client.query('ALTER TABLE projects RENAME COLUMN client TO category;');
      console.log('Renamed client to category');
      await client.query('ALTER TABLE projects ADD COLUMN client text;');
      console.log('Added new client column');
    } else {
      console.log('Column category already exists. Checking client...');
      const res2 = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='projects' AND column_name='client';
      `);
      if (res2.rows.length === 0) {
         await client.query('ALTER TABLE projects ADD COLUMN client text;');
         console.log('Added new client column only (category already existed)');
      } else {
         console.log('Both category and client exist. No migration needed.');
      }
    }
  } catch(e) {
    console.error('Error:', e);
  } finally {
    await client.end();
  }
}
run();

const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();
  try {
    await client.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS forced_span VARCHAR;");
    console.log("✅ Database updated: column forced_span added successfully!");
  } catch (e) {
    console.error("❌ Error updating database:", e.message);
  } finally {
    await client.end();
  }
}

run();

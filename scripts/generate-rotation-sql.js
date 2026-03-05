require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addRotationColumn() {
  console.log('Fetching projects to generate rotation migration...');
  
  console.log('\n=============================================');
  console.log('COPIE/COLLE CECI DANS LE SUPABASE SQL EDITOR :');
  console.log('=============================================\n');
  
  console.log('-- Ajout de la colonne rotation (0 par défaut)');
  console.log('ALTER TABLE public.projects ADD COLUMN rotation INTEGER DEFAULT 0 NOT NULL;');
  
  console.log('\n=============================================');
}

addRotationColumn();

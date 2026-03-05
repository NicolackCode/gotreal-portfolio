require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('projects')
    .select('title, rotation')
    .ilike('title', '%patate douce%');
    
  console.log("DB RESULT:", data);
  if (error) console.error("ERR:", error);
}

check();

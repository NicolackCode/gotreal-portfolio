/* eslint-disable */
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
const supabase = createClient(supabaseUrl, supabaseKey)

async function addVisibilityColumn() {
  console.log("Adding is_visible column to projects table...")
  
  // Try to insert a dummy project just to see the schema error, or if we can execute RPC
  // Since we don't have direct SQL access through the standard JS client without an RPC, 
  // we will try to update a non-existent column to see if it exists
  
  const { data, error } = await supabase
    .from('projects')
    .select('is_visible')
    .limit(1)

  if (error && error.code === '42703') { // column does not exist
     console.log("Column 'is_visible' does not exist. Please run this SQL in your Supabase Dashboard SQL Editor:")
     console.log("\nALTER TABLE projects ADD COLUMN is_visible BOOLEAN DEFAULT true;\n")
  } else if (!error) {
     console.log("Column 'is_visible' already exists!")
  } else {
     console.log("Unexpected error checking column:", error)
  }
}

addVisibilityColumn()

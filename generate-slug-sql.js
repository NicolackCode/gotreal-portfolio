/* eslint-disable */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Fonction pour slugifier une string proprement (ex: "Mon Super Clip" -> "mon-super-clip")
function generateSlug(title) {
  return title
    .toLowerCase()
    .normalize('NFD') // Sépare les accents des lettres
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/[^a-z0-9]+/g, '-') // Remplace tous les caractères non alphanum par des tirets
    .replace(/^-+|-+$/g, ''); // Enleve les tirets au début ou à la fin
}

async function prepareSlugMigration() {
  console.log('Fetching projects to generate slug migration...');
  const { data: projects, error } = await supabase.from('projects').select('id, title');

  if (error) {
    console.error('Error fetching projects:', error);
    return;
  }

  console.log('\n=============================================');
  console.log('ETAPE 1 : AJOUT DE LA COLONNE (A COPIER DANS SUPABASE SQL EDITOR)');
  console.log('=============================================\n');
  console.log('ALTER TABLE public.projects ADD COLUMN slug TEXT UNIQUE;');
  
  console.log('\n=============================================');
  console.log('ETAPE 2 : REMPLISSAGE DES SLUGS (A COPIER DANS SUPABASE SQL EDITOR)');
  console.log('=============================================\n');
  
  for (const project of projects) {
    if (!project.title) continue;
    const slug = generateSlug(project.title);
    console.log(`UPDATE public.projects SET slug = '${slug}' WHERE id = '${project.id}';`);
  }
  
  console.log('\n=============================================');
  console.log('ETAPE 3 : RENDRE LA COLONNE OBLIGATOIRE (A COPIER DANS SUPABASE SQL EDITOR)');
  console.log('=============================================\n');
  console.log('ALTER TABLE public.projects ALTER COLUMN slug SET NOT NULL;');
  console.log('\nMigration brute prête !');
}

prepareSlugMigration();

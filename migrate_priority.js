const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf-8');
const lines = env.split('\n');
const getEnv = (key) => {
    const line = lines.find(l => l.startsWith(key));
    if (!line) return null;
    return line.split('=')[1].replace(/['"]/g, '').trim();
};

const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
// On utilise la service_role key si possible pour outpasser les éventuelles RLS ou sinon l'anon key
const key = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'); 

const supabase = createClient(url, key);

const getPriority = (url) => {
  if (!url) return null;
  const upperUrl = decodeURIComponent(url).toUpperCase();
  // INVERSION ICI : Si l'URL dit "TOP 3", le nouveau badge est "TOP 1". Si l'URL dit "TOP 1", le nouveau badge est "TOP 3".
  if (upperUrl.includes('TOP 3') || upperUrl.includes('TOP_3') || upperUrl.includes('TOP3')) return 'TOP 1';
  if (upperUrl.includes('TOP 2') || upperUrl.includes('TOP_2') || upperUrl.includes('TOP2')) return 'TOP 2';
  if (upperUrl.includes('TOP 1') || upperUrl.includes('TOP_1') || upperUrl.includes('TOP1')) return 'TOP 3';
  if (upperUrl.includes('RAW')) return 'RAW';
  return null;
}

async function run() {
    console.log("Correction de l'inversion TOP1 / TOP3 pour les anciens tags d'URL...");
    const { data: projects, error } = await supabase.from('projects').select('id, main_video_url, title');
    
    if (error) {
        console.error("Erreur de récupération:", error);
        return;
    }
    
    let count = 0;
    // D'abord on reset tout à null pour être sûr
    await supabase.from('projects').update({ priority: null }).not('id', 'is', null);

    for (const project of projects) {
        const prio = getPriority(project.main_video_url);
        if (prio) {
            console.log(`Correction de '${project.title}' -> Ancien TAG URL, nouveau badge : ${prio}`);
            const { error: updErr } = await supabase.from('projects').update({ priority: prio }).eq('id', project.id);
            if (updErr) {
                console.error(`Erreur sur ${project.title}:`, updErr);
            } else {
                count++;
            }
        }
    }
    console.log(`\n🎉 Correction terminée. ${count} projets mis à jour avec la bonne logique TOP 1 / TOP 3.`);
}

run().catch(console.error);

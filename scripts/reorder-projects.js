require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const requestedOrder = [
  "Annonce Newrave - Valenciennes 2025",
  "Morn Collection",
  "ANSWR - Dystopia",
  "Newrave - les histoires ne meurent jamais",
  "Le fou du bus",
  "Slalom Not just a club",
  "Laetitia & Stephane",
  "Eskha - La machine du moulin rouge",
  "Shanixx - LBR Festival",
  "Puzzle - Classique",
  "Spicy V - Teaser All Night Long",
  "Alix Van Ripato - Terres de mémoire",
  "Crystal Chardonnay",
  "Flor Fantasy",
  "Patate Douce - Fête de la musique",
  "Skone - Panorama Festival",
  "Panteros666 - Initial Festival",
  "Phvra - Bad Neck",
  "Eskha - Jardin d’hiver",
  "Marion Di Napoli - Dour Festival",
  "Back in the street",
  "Ni femme ni rien",
  "Fragments Nocturne",
  "Foo Fighters Tribute - All My life",
  "Khaos à Slalom",
  "ANSWR - All Night Long Slalom",
  "Fossile - MEA",
  "AMRK - Teaser All Night Long",
  "RPC - Radical",
  "ZZZE Kiosk - Felleries 2023",
  "DYEN à Slalom",
  "Al Hamra Restaurant",
  "Mandragora à Slalom",
  "Rabadub 2022 - Felleries",
  "Birthday recap - Slalom",
  "Balade en ville",
  "Organik à slalom",
  "Teknbass 016 - 360 highlight",
  "Une Éclipse au parfum oriental",
  "Annonce sortie album puzzle"
];

const aliasMap = {
  "Slalom Not just a club": "Slalom - Not just a club",
  "Laetitia & Stephane": "Laetitia et Stephane",
  "Alix Van Ripato - Terres de mémoire": "Alix Van Ripato - Terre de memoires",
  "Patate Douce - Fête de la musique": "Patate Douce - Fete de la musique",
  "Eskha - Jardin d’hiver": "Eskha - Jardin dHiver",
  "Ni femme ni rien": "Adahy - Ni femme ni rien",
  "Khaos à Slalom": "KHAOS a Slalom",
  "AMRK - Teaser All Night Long": "AMRK - All Night Long Slalom",
  "DYEN à Slalom": "DYEN a Slalom",
  "Mandragora à Slalom": "Mandragora a Slalom",
  "Organik à slalom": "Organik a Slalom",
  "Une Éclipse au parfum oriental": "Une eclipse au parfum oriental"
}

async function reorderProjects() {
  console.log("Fetching all projects from Supabase...");
  const { data: projects, error } = await supabase.from('projects').select('id, title, rank');

  if (error || !projects) {
    console.error("Error fetching projects:", error);
    return;
  }

  console.log(`Found ${projects.length} projects. Matching with requested order of ${requestedOrder.length} items.\n`);

  let matchedCount = 0;
  let missingItems = [];

  for (let i = 0; i < requestedOrder.length; i++) {
    const rawTitle = requestedOrder[i];
    const newRank = i + 1; // 1 to 40
    
    // Check if this title has a known alias in our map
    const searchTarget = aliasMap[rawTitle] || rawTitle;
    
    // Normalize both for comparison (remove special quotes and accents, lowercase)
    const normalize = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/['’]/g, "'").trim();

    const project = projects.find(p => p.title && normalize(p.title) === normalize(searchTarget));

    if (project) {
      console.log(`✅ [Rank ${newRank}] Updating: "${project.title}"`);
      const { error: updateErr } = await supabase
        .from('projects')
        .update({ rank: newRank })
        .eq('id', project.id);
        
      if (updateErr) {
        console.error(`❌ Failed to update ${project.title}:`, updateErr);
      } else {
        matchedCount++;
      }
    } else {
      console.warn(`❓ [Rank ${newRank}] WARNING: Could not find exact match for "${rawTitle}" in database.`);
      missingItems.push(rawTitle);
      
      // Try a fuzzy match just to help the user identify it
       const fuzzyMatch = projects.find(p => p.title && p.title.toLowerCase().includes(rawTitle.toLowerCase().split('-')[0].trim()));
       if (fuzzyMatch) {
           console.log(`   💡 Did you mean: "${fuzzyMatch.title}" ?`);
       }
    }
  }

  console.log(`\n==============================================`);
  console.log(`Finished processing!`);
  console.log(`Total successfully matched and updated: ${matchedCount} / ${requestedOrder.length}`);
  if (missingItems.length > 0) {
      console.log(`\nCouldn't find these exact titles in the database (maybe a typo in the email list?):`);
      missingItems.forEach(i => console.log(`- ${i}`));
  }
}

reorderProjects();

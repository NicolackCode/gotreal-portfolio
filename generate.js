const fs = require('fs');
const path = require('path');

// Les chemins vers tes dossiers
const videosDir = path.join(__dirname, 'assets', 'videos');
const outputFile = path.join(__dirname, 'data', 'projects.json');

let projects = [];

// Vérifie si le dossier des vidéos existe
if (!fs.existsSync(videosDir)) {
    console.error("❌ ERREUR : Le dossier", videosDir, "n'existe pas !");
    process.exit(1);
}

console.log("🔍 Scan des vidéos en cours...\n");

// On lit les dossiers (catégories)
const categories = fs.readdirSync(videosDir);

categories.forEach(category => {
    const categoryPath = path.join(videosDir, category);
    
    // On vérifie que c'est bien un dossier (et pas un fichier caché .DS_Store par ex)
    if (fs.statSync(categoryPath).isDirectory()) {
        const files = fs.readdirSync(categoryPath);
        
        files.forEach(file => {
            // On ne prend que les MP4
            if (file.endsWith('.mp4')) {
                const id = file.replace('.mp4', ''); // Le nom sans l'extension
                
                // On cherche le rank (ex: [TOP1], [RAW]) dans le nom du fichier
                let rank = "RAW";
                const rankMatch = file.match(/\[(.*?)\]/);
                if (rankMatch) {
                    rank = rankMatch[1]; // Récupère ce qui est entre les crochets
                }

                projects.push({
                    id: id,
                    category: category,
                    rank: rank
                });
                
                console.log(`📁 Trouvé : [${category}] -> ${file}`);
            }
        });
    }
});

// On crée le dossier /data/ s'il n'existe pas encore
const dataDir = path.dirname(outputFile);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// On écrit le fichier JSON
fs.writeFileSync(outputFile, JSON.stringify(projects, null, 4));

console.log(`\n✅ SUCCÈS ! ${projects.length} vidéos ont été enregistrées dans ${outputFile}`);
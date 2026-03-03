import os
import json
import subprocess

# Chemins relatifs à la racine de ton projet
PREVIEWS_DIR = r"assets/previews"
OUTPUT_JSON = r"data/projects.json"

def get_video_dimensions(path):
    """Extrait largeur et hauteur d'une vidéo via ffprobe."""
    try:
        cmd = [
            'ffprobe', '-v', 'error', 
            '-select_streams', 'v:0', 
            '-show_entries', 'stream=width,height', 
            '-of', 'json', path
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        data = json.loads(result.stdout)
        width = data['streams'][0]['width']
        height = data['streams'][0]['height']
        return width, height
    except Exception as e:
        print(f"⚠️ Erreur ffprobe sur {path}: {e}")
        return 1920, 1080 # Fallback 16:9

def sync():
    projects_db = {}
    
    if not os.path.exists(PREVIEWS_DIR):
        print("❌ Dossier previews introuvable.")
        return

    print("🔍 Analyse du dossier previews...")

    # On scanne les catégories (Publicité, Clip...)
    for cat in os.listdir(PREVIEWS_DIR):
        cat_path = os.path.join(PREVIEWS_DIR, cat)
        if not os.path.isdir(cat_path): continue
        
        # On regarde les résolutions (2160p, 1080p...)
        for res in os.listdir(cat_path):
            res_path = os.path.join(cat_path, res)
            if not os.path.isdir(res_path): continue
            
            # On scanne les fichiers de previews
            for file in os.listdir(res_path):
                if not file.endswith(".mp4"): continue
                
                # On extrait l'ID (ex: [TOP3]_Slalom_main)
                file_id = file.split("_p")[0] 
                
                # On détermine le nom propre du projet
                project_id = file_id.replace("_main", "").replace("_2", "").replace("_3", "").replace("_4", "")
                
                if project_id not in projects_db:
                    # Extraction du rank (ex: TOP3)
                    rank = project_id.split("]")[0].replace("[", "") if "[" in project_id else "RAW"
                    
                    # On récupère les dimensions (sur la version 1080p ou 480p peu importe, le ratio est le même)
                    # On prend le premier fichier trouvé pour ce projet pour extraire le ratio
                    full_path = os.path.join(res_path, file)
                    width, height = get_video_dimensions(full_path)

                    projects_db[project_id] = {
                        "id": project_id,
                        "category": cat,
                        "rank": rank,
                        "width": width,
                        "height": height,
                        "resolutions": set(),
                        "files": {}
                    }
                
                # On ajoute la résolution détectée
                projects_db[project_id]["resolutions"].add(res)
                
                # On classe par type de fichier (main, 2, 3...)
                file_type = "main" if "_main" in file_id else file_id.split("_")[-1]
                
                if file_type not in projects_db[project_id]["files"]:
                    projects_db[project_id]["files"][file_type] = []
                
                # Chemin relatif pour le web
                preview_path = f"assets/previews/{cat}/{res}/{file}"
                if preview_path not in projects_db[project_id]["files"][file_type]:
                    projects_db[project_id]["files"][file_type].append(preview_path)

    # Nettoyage pour le JSON (convertir les sets en listes triées)
    final_data = []
    for p_id in projects_db:
        proj = projects_db[p_id]
        # On trie les résolutions de la plus grande à la plus petite
        proj["resolutions"] = sorted(list(proj["resolutions"]), key=lambda x: int(x.replace("p", "")), reverse=True)
        final_data.append(proj)

    # Sauvegarde
    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(final_data, f, indent=4, ensure_ascii=False)
    
    print(f"✅ Sync terminée ! {len(final_data)} projets ont été indexés avec dimensions dans {OUTPUT_JSON}")

if __name__ == "__main__":
    sync()

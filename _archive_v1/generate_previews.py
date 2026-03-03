import os
import subprocess
import json

# --- CONFIGURATION ---
INPUT_DIR = r"C:\Users\nicol\Desktop\Site portfolio gauteh\assets\videos"
OUTPUT_DIR = r"C:\Users\nicol\Desktop\Site portfolio gauteh\assets\previews"

# Qualités cibles : 480p pour mobile, 720p/1080p pour standard
STD_QUALITIES = [1080, 720, 480] 
# Qualités premium débloquées uniquement pour les meilleurs projets
PREMIUM_QUALITIES = [2160, 1440]
PREMIUM_MARKER = "[TOP3]" 

CLIP_DURATION = 10  
NUM_CLIPS = 5       

def get_video_info(path):
    """Récupère la hauteur et la durée de la vidéo via FFprobe."""
    cmd = ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=height,duration", "-of", "json", path]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        data = json.loads(res.stdout)
        if 'streams' in data and len(data['streams']) > 0:
            return int(data['streams'][0].get('height', 0)), float(data['streams'][0].get('duration', 0))
    except Exception as e:
        return None, None
    return None, None

def transcode_clip(input_p, output_p, height, start_time):
    """Découpe et encode l'extrait avec le son activé."""
    cmd = [
        "ffmpeg", "-ss", str(start_time), "-t", str(CLIP_DURATION),
        "-i", input_p,
        "-vf", f"scale=-2:{height}",
        "-c:v", "libx264", "-crf", "24", "-preset", "faster",
        "-c:a", "aac", "-b:a", "128k", # Encodage audio pour le "Magic Sound"
        "-y", output_p
    ]
    
    # On capture la sortie pour voir si FFmpeg plante
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    # Si le code de retour n'est pas 0, c'est qu'il y a eu une erreur
    if result.returncode != 0:
        # On affiche les deux dernières lignes de l'erreur pour comprendre
        erreur_courte = "\n".join(result.stderr.splitlines()[-2:])
        print(f"   ❌ ERREUR FFMPEG sur cet extrait : {erreur_courte}")

print("🚀 GÉNÉRATEUR DE PREVIEWS PRO - AUDIO & MULTI-RES ACTIF")
print("========================================================")

for root, dirs, files in os.walk(INPUT_DIR):
    for file in files:
        if file.lower().endswith((".mp4", ".mov")):
            path = os.path.join(root, file)
            orig_h, duration = get_video_info(path)
            
            if orig_h is None or duration <= 0:
                print(f"⚠️  Ignoré (Corrompu ou illisible) : {file}")
                continue

            # Choix des résolutions selon le tag [TOP3]
            target_qualities = list(STD_QUALITIES)
            if PREMIUM_MARKER in file:
                target_qualities += PREMIUM_QUALITIES

            # Calcul des 5 extraits équidistants
            # On met une sécurité pour les vidéos très courtes
            interval = duration / (NUM_CLIPS + 1) if duration > (CLIP_DURATION + 5) else max(0.1, (duration - 2) / NUM_CLIPS)
            
            print(f"\n🎬 Traitement de : {file} (Source: {orig_h}p)")
            
            for q in target_qualities:
                if q <= (orig_h + 10): # Ne pas upscaler (gonfler artificiellement)
                    rel_path = os.path.relpath(root, INPUT_DIR)
                    folder = os.path.join(OUTPUT_DIR, rel_path, f"{q}p")
                    os.makedirs(folder, exist_ok=True)
                    
                    for i in range(NUM_CLIPS):
                        start_time = interval * (i + 1)
                        # Le nom final : [RANK]_Nom_main_p0.mp4
                        output_name = f"{os.path.splitext(file)[0]}_p{i}.mp4"
                        output_file = os.path.join(folder, output_name)
                        
                        if not os.path.exists(output_file):
                            print(f"   📦 Création -> {q}p | Extrait {i+1}/{NUM_CLIPS}")
                            transcode_clip(path, output_file, q, start_time)
                        else:
                            # On ne spamme pas la console si le fichier existe déjà
                            pass

print("\n✨ TOUTES LES PREVIEWS SONT GÉNÉRÉES AVEC SON ET MULTI-RÉSOLUTION.")
import os
from datetime import datetime
from pathlib import Path

def get_ignore_list(directory):
    """Lit le fichier .gitignore et retourne une liste de motifs à ignorer."""
    gitignore_path = Path(directory) / ".gitignore"
    ignore_list = [".git"] # Toujours ignorer .git
    if gitignore_path.exists():
        with open(gitignore_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    # Nettoyage sommaire du motif
                    pattern = line.replace("/*", "")
                    ignore_list.append(pattern)
    return ignore_list

def should_ignore(path, root_dir, ignore_list):
    """Vérifie si un chemin doit être ignoré selon la liste .gitignore."""
    relative_path = str(path.relative_to(root_dir)).replace("\\", "/")
    for pattern in ignore_list:
        if pattern.endswith("/"):
            if relative_path.startswith(pattern.rstrip("/")) or f"/{pattern.rstrip('/')}" in relative_path:
                return True
        else:
            if relative_path == pattern or relative_path.endswith("/" + pattern) or f"/{pattern}/" in relative_path:
                return True
            # Gestion simple des extensions
            if pattern.startswith("*."):
                ext = pattern[1:]
                if relative_path.endswith(ext):
                    return True
    return False

def generate_tree(dir_path, root_dir, prefix="", ignore_list=None, public_only=False):
    """Génère récursivement une chaîne de caractères représentant l'arborescence."""
    tree_str = ""
    
    # Récupérer et trier les éléments
    try:
        items = sorted(list(dir_path.iterdir()), key=lambda x: (not x.is_dir(), x.name.lower()))
    except PermissionError:
        return prefix + " [Permission Denied]\n"

    # Filtrer les éléments si mode public
    if public_only and ignore_list:
        items = [item for item in items if not should_ignore(item, root_dir, ignore_list)]
    elif not public_only:
        # En mode complet, on ignore quand même le dossier .git qui est trop lourd/bruyant
        items = [item for item in items if item.name != ".git"]

    for i, item in enumerate(items):
        is_last = (i == len(items) - 1)
        connector = "└── " if is_last else "├── "
        
        tree_str += f"{prefix}{connector}{item.name}\n"
        
        if item.is_dir():
            new_prefix = prefix + ("    " if is_last else "│   ")
            tree_str += generate_tree(item, root_dir, new_prefix, ignore_list, public_only)
            
    return tree_str

def main():
    root_dir = Path.cwd()
    now = datetime.now()
    timestamp = now.strftime("%Y-%m-%d_%H-%M-%S")
    date_display = now.strftime("%d/%m/%Y à %H:%M:%S")
    
    output_filename = f"scan_portfolio_{timestamp}.txt"
    ignore_list = get_ignore_list(root_dir)
    
    with open(output_filename, "w", encoding="utf-8") as f:
        f.write(f"====================================================\n")
        f.write(f"       SCAN DU PORTFOLIO - {date_display}\n")
        f.write(f"====================================================\n\n")
        
        # VERSION COMPLÈTE
        f.write("--- VERSION COMPLÈTE (Tous les fichiers locaux) ---\n")
        f.write(".\n")
        f.write(generate_tree(root_dir, root_dir, public_only=False))
        f.write("\n" + "="*52 + "\n\n")
        
        # VERSION PUBLIQUE
        f.write("--- VERSION PUBLIQUE (GitHub - Respecte .gitignore) ---\n")
        f.write(".\n")
        f.write(generate_tree(root_dir, root_dir, ignore_list=ignore_list, public_only=True))
        f.write("\n" + "="*52 + "\n")
        f.write(f"Fin du scan généré par Antigravity.\n")

    print(f"Scan terminé ! Fichier créé : {output_filename}")

if __name__ == "__main__":
    main()

# BOITE A OUTILS : ADMINISTRATION GOTREAL

Ce dossier a été conçu pour simplifier la vie des Gestionnaires du site GotReal qui ne sont pas développeurs.
Tous les fichiers ici finissant par `.bat` sont des **Raccourcis exécutables**.
Il vous suffit de faire un double-clic dessus pour qu'ils fassent le travail à votre place, sans avoir à ouvrir de Terminal complexe.

---

### 🎬 1_Lancer_Encodage_Video.bat

**A utiliser lorsque vous venez d'ajouter un nouveau projet vidéo sur le site Admin.**
Le site accepte vos énormes .mp4 ou .mov, mais ils sont trop lourds pour internet.
Double-cliquez sur ce script : il détectera vos nouvelles vidéos automatiquement et vous demandera laquelle convertir en format "Netflix" (HLS, multi-résolution). Laissez-le tourner !

### 🌍 2_Allumer_Site_GotReal_Local.bat

**A utiliser si vous voulez regarder la version "Brouillon" du site sur votre ordinateur.**
Il allume un serveur privé sur la machine. Tant que la boite noire ("l'invite de commande") reste ouverte en bas de l'écran, vous pouvez visiter l'interface secrète `http://localhost:3000` via Chrome ou Safari.

### 🧹 3_Vider_Cache_Memoire.bat

**A utiliser si vous avez changé une vidéo / un texte, mais que le site web refuse de se mettre à jour visuellement.**
Le code du site s'est bloqué dans le temps ("mis en cache"). Double-cliquez ici pour vider sa mémoire forçée. Au prochain démarrage (avec le script #2 par exemple), il devra tout télécharger à neuf depuis la base de données !

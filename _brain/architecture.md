?# Architecture et Règles Fondamentales - Portfolio GOTREAL

## 1. Stack Technique
- **Frontend pur** : HTML5, CSS3.
- **Style** : Utilisation massive de variables CSS natives à la racine (`:root`). Pas de framework (pas de Tailwind, Bootstrap, etc.).
- **Logique** : Vanilla JS.
- **Animations** : Utilisation exclusive de **GSAP** (GreenSock) pour les transitions complexes.
- **Serveur de développement** : Live Server (extension VS Code). AUCUNE configuration Node.js ou bundler (Vite, Webpack) ne doit être utilisée.

## 2. Direction Artistique (DA)
- **Vibe globale** : Dark Cinematic, Brutalisme Éditorial, Nocturne, Urbain.
- **Palette de couleurs** : 
  - Fond : Noir pur (`#000000`) ou gris abyssal.
  - Textes : Blanc cassé ou argent.
  - Accents : "Néon" (Rouge électrique ou Cyan) rappelant le milieu urbain.
- **Typographie** :
  - **Titres** : Grotesque imposante en lettres capitales (ex: Syne, Space Grotesk).
  - **UI / Métadonnées** : Monospace très petite avec un large espacement des lettres (`letter-spacing`), par exemple JetBrains Mono.
- **Structure de page** : Le contenu vidéo est roi. L'interface est repoussée sur les bords de l'écran, créant une sensation de "cadre de caméra".

## 3. Workflow & Mémoire
- **`_brain/`** : Dossier central de la mémoire de l'agent.
- **`_brain/references/`** : Notes d'analyse des sites de référence.
- **`_brain/errors/`** : Documentation des bugs complexes résolus pour éviter les régressions (ex. soucis de scroll GSAP).

## 4. Architecture Multi-page V3 (Routing SPA)
Pour garantir des transitions fluides façon "cielrose.tv" sans coupure de navigation :
- **Principe Rooter** : Le site fonctionne sur de multiples fichiers (`index.html`, `/projects/nom-du-projet.html`) mais se comporte comme une Single Page Application.
- **Librairie** : Utilisation de **Barba.js** (`@barba/core`) couplé à GSAP.
- **Structure DOM Obligatoire** :
  - Un conteneur englobant unique `data-barba="wrapper"`.
  - Un conteneur de page `data-barba="container" data-barba-namespace="xxx"` contenant le HTML spécifique à injecter.
- **Preloader** : Un système de chargement initial (fond noir, barre de calcul de pourcentages) masquant le DOM tant que le cache réseau vidéo n'est pas prêt.


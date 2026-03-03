?# Analyse de RÃ©fÃ©rence : cielrose.tv (V2)

## 1. Navigation & Transition (Slides)
La page d'accueil ne se contente pas de remplacer la source d'une vidÃ©o statique. 
*   **MÃ©canique :** Lorsqu'un Ã©vÃ©nement de "wheel" (scroll) est dÃ©tectÃ©, une nouvelle instance de projet "glisse" par-dessus l'ancienne le long de l'axe vertical (axe Y).
*   **Effet d'empilement :** Le projet prÃ©cÃ©dent recule lÃ©gÃ¨rement en arriÃ¨re-plan (scale ou parallax) pendant que le nouveau vient recouvrir l'espace, crÃ©ant une vraie sensation physique de "glissement" de cartes.

## 2. Design Projet & UI Immersive
*   **Expansion (Hero State) :** Au clic, la miniature s'agrandit pour remplir 100vw/100vh. Ã€ ce moment, l'interface "Camera Frame" globale de la homepage s'efface.
*   **Scroll Natif Vertical :** DÃ¨s que le projet est ouvert, le site abandonne le scroll hijacking (slide par slide) et restaure un scroll document classique (`overflow-y: auto`).
*   **Contraste Ã‰ditorial :** En descendant sous la vidÃ©o hÃ©roÃ¯que, le design bascule pour prÃ©senter des informations (crÃ©dits, synopsis, stills vidÃ©o) souvent sur un fond clair (gris/blanc). Cela dÃ©tache l'expÃ©rience "spectateur" (vidÃ©o) de l'expÃ©rience "lecteur" (page projet).
*   **Bottom UI :** La barre de progression vidÃ©o et les contrÃ´les sons sont ancrÃ©s au bas de la vidÃ©o, mais remontent avec elle quand on scrolle la page.

## 3. Physique & Easing (GSAP)
*   **Scroll MagnÃ©tique (Snap) :** L'utilisateur dÃ©place la vidÃ©o proportionnellement au delta de la molette ou au drag. S'il relÃ¢che au-delÃ  du centre de gravitÃ© (50% de la hauteur), la vidÃ©o glisse pour combler l'espace (`duration: 1.2`, `ease: "expo.out"`). Sinon, elle retombe (annulation du mouvement).
*   **Zoom Contemplatif (Transition SPA) :** L'agrandissement de la miniature vers le format 100vw/vh est particuliÃ¨rement lent et assumÃ©, pour ajouter du poids et du drame. Les paramÃ¨tres optimaux sont une **durÃ©e de 1.2s** avec un **easing personnalisÃ© `expo.inOut`**.


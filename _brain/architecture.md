# 🏛️ ARCHITECTURE DU PROJET PORTFOLIO (V2)

_(Agent : Tu as l'autorisation de mettre à jour ce fichier si notre stack technique ou la topologie évolue)._

## 📂 Topologie de l'Application (`src/`)

- `app/(public)/` : Les pages visibles par tous (Accueil, About, Projets). Sauf exception, ce sont des Server Components.
- `app/admin/` : Le tableau de bord privé protégé par Supabase Auth via le `middleware.ts`.
- `app/api/` : Nos Route Handlers Next.js (Backend) pour gérer les requêtes vers Supabase et le traitement vidéo.
- `components/ui/` : Nos composants réutilisables client/serveur (`AmbilightPlayer`, `MasonryGrid`, `ProjectCard`).
- `lib/` : Utilitaires et configuration (ex: client `supabase.ts`).
- `scripts/` : Scripts de maintenance et de processing (ex: `process-hls.ts`, `reorder-projects.js`).

## 🧠 Topologie de la Mémoire (`_brain/`)

- `architecture.md` : Stack technique et topologie.
- `workflow.md` : Règles de code et objectifs UX/UI.
- `gotreal/` : Le tableau de bord éclaté de NOTRE projet (roadmap, bugs, architecture actuelle).
- `references/[nom-du-site]/` : Dossiers documentant tes analyses web via Browser.

## 🗄️ Base de données & Vidéos

- **BDD** : Les projets (titres, slugs, descriptions, ordre d'affichage) sont gérés de manière relationnelle dans PostgreSQL via Supabase.
- **Pipeline HLS** : On ne sert JAMAIS de lourds fichiers `.mp4` bruts sur le front-end. Les vidéos (Bucket GCP) sont converties en flux adaptatifs HLS (`.m3u8` / `.ts`) et lues via `AmbilightPlayer`.

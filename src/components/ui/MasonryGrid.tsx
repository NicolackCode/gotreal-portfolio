'use client'

import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import ProjectCard from './ProjectCard'

interface Project {
  id: string
  title: string
  category: string
  client?: string
  description?: string
  main_video_url?: string
  carousel_urls?: string[]
  rank?: number
  forced_span?: string
  priority?: string
  rotation?: number
  slug?: string
}

interface MasonryGridProps {
  projects: Project[]
}

// Transforme la chaine "col-span-X row-span-Y" en variables CSS pour contourner le purger de Tailwind
const parseSpanStyles = (spanString: string): React.CSSProperties => {
  const vars: Record<string, string> = {};
  if (!spanString) return vars;
  const parts = spanString.trim().split(/\s+/);
  for (const part of parts) {
    const colMatch = part.match(/^(?:(md|xl):)?col-span-(\d+)$/);
    if (colMatch) {
      const prefix = colMatch[1] ? `--${colMatch[1]}-col-span` : '--col-span';
      vars[prefix] = colMatch[2];
    }
    const rowMatch = part.match(/^(?:(md|xl):)?row-span-(\d+)$/);
    if (rowMatch) {
      const prefix = rowMatch[1] ? `--${rowMatch[1]}-row-span` : '--row-span';
      vars[prefix] = rowMatch[2];
    }
  }
  return vars as React.CSSProperties;
}

// On n'utilise plus Masonry mais une Grid pure CSS,
// mais on garde les interfaces et le nom du fichier pour ne pas casser l'import père.

export default function MasonryGrid({ projects }: MasonryGridProps) {
  const [activeFilter, setActiveFilter] = useState('TOUT')
  const [globalIsMuted, setGlobalIsMuted] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  // Auto-healing : Dictionnaire des formats validés par la physique des vidéos.
  // format: Record<projectId, 'vertical' | 'horizontal'>
  const [verifiedFormats, setVerifiedFormats] = useState<Record<string, 'vertical' | 'horizontal'>>({})

  const handleFormatLoaded = React.useCallback((id: string, format: 'vertical' | 'horizontal') => {
     setVerifiedFormats(prev => {
        // Ne déclencher un re-render que si la valeur change vraiment
        if (prev[id] === format) return prev;
        return { ...prev, [id]: format };
     });
  }, []);

  React.useEffect(() => {
    const savedState = localStorage.getItem('gotreal_global_muted')
    // Par défaut, si l'user a interagi sur la home, on sera à 'false' (son actif)
    if (savedState === 'false') {
      setGlobalIsMuted(false)
    } else if (savedState === 'true') {
      setGlobalIsMuted(true)
    } else {
      // Si on arrive directement ici sans passer par la home (ex: direct url)
      // on laisse muted par défaut pour éviter un blocage navigateur non maîtrisé.
      setGlobalIsMuted(true) 
    }
    setIsMounted(true)
  }, [])

  React.useEffect(() => {
    const handleGlobalInteraction = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      
      // On ignore le bouton de mute (le toggle est géré dans son onClick)
      if (target.closest('#mute-btn-masonry')) return;
      
      // Si on clique sur un lien (ex: projet) ou un autre bouton (ex: filtre)
      const isButtonOrLink = target.closest('button') || target.closest('a');
      
      setGlobalIsMuted(prev => {
        let nextMuted = !prev; // Par défaut, cliquer dans le vide inverse l'état
        
        if (isButtonOrLink) {
           nextMuted = false; // "les boutons ont juste l'option d'activer"
        }

        localStorage.setItem('gotreal_global_muted', nextMuted ? 'true' : 'false')
        return nextMuted;
      });
    }
    
    document.addEventListener('click', handleGlobalInteraction)
    document.addEventListener('touchstart', handleGlobalInteraction)
    
    return () => {
      document.removeEventListener('click', handleGlobalInteraction)
      document.removeEventListener('touchstart', handleGlobalInteraction)
    }
  }, [])

  const toggleGlobalMute = () => {
    const nextState = !globalIsMuted;
    setGlobalIsMuted(nextState);
    localStorage.setItem('gotreal_global_muted', nextState ? 'true' : 'false')
  }

  // Extraire les catégories uniques, en isolant le bouton TOUT
  // BUGFIX (Tempo) : Le champ en base de données qui contient les catégories s'appelle actuellement 'client', 
  // car nous n'avons pas encore pu passer de script de migration SQL sur le Supabase live de production.
  const categories = useMemo(() => {
    if (!projects) return []
    const catList = projects.map(p => (p.category || p.client)?.trim().toUpperCase()).filter((c): c is string => Boolean(c))
    const uniqueCat = Array.from(new Set(catList))
    return uniqueCat.sort()
  }, [projects])

  // Filtrer les projets
  const filteredProjects = useMemo(() => {
    let result = [...projects]
    
    if (activeFilter !== 'TOUT') {
      result = result.filter(p => (p.category || p.client)?.trim().toUpperCase() === activeFilter)
    }

    return result
  }, [projects, activeFilter])

  if (!projects || projects.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-zinc-500 font-mono tracking-widest uppercase">
        Aucun projet à afficher
      </div>
    )
  }

  if (!isMounted) {
    return (
      <div className="w-full h-[50vh] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-zinc-800 border-t-zinc-400 rounded-full animate-spin opacity-50" />
      </div>
    )
  }

  return (
    <div className="w-full py-12">
      
      {/* MENU FILTRES CATEGORIES EYECANNDY STYLE */}
      {categories.length > 0 && (
        <div className="flex flex-col items-center justify-center mb-8 sm:mb-12">
          <button
            onClick={() => setActiveFilter('TOUT')}
            className={`text-sm md:text-base font-sans font-black tracking-widest uppercase px-4 py-2 mb-8 transition-colors ${
              activeFilter === 'TOUT' 
                ? 'text-white border-b-2 border-white' 
                : 'text-zinc-600 hover:text-zinc-300 border-b-2 border-transparent hover:border-zinc-700'
            }`}
          >
            ALL
          </button>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 w-full px-4">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`text-[10px] md:text-xs font-sans font-bold tracking-widest uppercase px-1 py-1 transition-colors ${
                  activeFilter === cat 
                    ? 'text-white border-b-2 border-white' 
                    : 'text-zinc-600 hover:text-zinc-300 border-b-2 border-transparent hover:border-zinc-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* GRILLE DYNAMIQUE (Colonnes pures, hauteur ajustée via ratio pour 0 crop) */}
      {filteredProjects.length === 0 ? (
        <div className="w-full h-32 flex items-center justify-center text-zinc-500 font-mono tracking-widest uppercase text-xs">
          Aucun projet pour cette catégorie
        </div>
      ) : (
        // Grille très fine (24 colonnes) pour un contrôle maximal. Mode manuel (sans auto-placement dense).
        <div className="w-full grid grid-cols-6 md:grid-cols-12 xl:grid-cols-24 gap-[4px] auto-rows-[20px] pb-24">
            {filteredProjects.map((project, index) => {
              
              const isRotatedVertical = project.rotation === 90 || project.rotation === -90 || project.rotation === 270;
              const fallbackIsNativeVert = project.client?.toLowerCase().includes('reel') || project.client?.toLowerCase().includes('tiktok') || project.category?.toLowerCase().includes('reel') || project.category?.toLowerCase().includes('tiktok');
              const fallbackIsVertical = isRotatedVertical || fallbackIsNativeVert;

              const physicalFormat = verifiedFormats[project.id];
              const isVertical = physicalFormat ? physicalFormat === 'vertical' : fallbackIsVertical;

              // En mode grille ultra fine (24 cols, 20px rows), on calcule la surface de base :
              const getGridSpan = (isVert: boolean) => {
                 // 1 colonne = ~80px de large (sur grand écran). 1 row = 20px de haut.
                 // ratio portrait moyen: 0.56 (9/16). ratio paysage: 1.77 (16/9).
                 // Si col=4 (320px), la hauteur portrait = 320 / 0.56 = 571px. 
                 // 571px / 20 = ~28 rows.
                 
                 // Pour simplifier et assurer un display parfait, on applique un ratio mathématique "magique" basé sur 4 pour les calculs:
                 if (isVert) {
                    // Vertical par défaut : 4 cols (large) x ~28 rows (haut)
                    return "col-span-2 md:col-span-4 row-span-14 md:row-span-28";
                 }
                 // Horizontal par défaut : 8 cols (large) x ~18 rows (haut)
                 return "col-span-4 md:col-span-8 row-span-9 md:row-span-18"; 
              }

              // Le spanClasses définit à la fois la largeur ET la hauteur absolue dans la trame
              const spanClasses = project.forced_span || getGridSpan(isVertical);

              return (
                <motion.div 
                  key={project.id}
                  layout="position"
                  initial={{ opacity: 0, scale: 0.9, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut", delay: (index % 10) * 0.05 }}
                  style={parseSpanStyles(spanClasses)}
                  className={`project-card-span relative w-full h-full overflow-hidden ring-1 ring-white/10`}
                >
                  <ProjectCard 
                    project={project} 
                    priorityLoad={index < 8} 
                    globalIsMuted={globalIsMuted} 
                    onFormatLoaded={handleFormatLoaded}
                    spanData={spanClasses.trim()} // Injecte le texte des grid-spans
                  />
                </motion.div>
              )
            })}

            {/* FILLERS / GADGETS DÉCORATIFS */}
            {/* Ces blocs vont automatiquement boucher les trous "impossibles" de la grille CSS dense */}
            {Array.from({ length: 12 }).map((_, i) => {
               // Génération de tailles de fillers petites pour se faufiler
               const fillerCols = [2, 3, 4][i % 3]; // 2, 3 ou 4 colonnes max
               const fillerRows = [4, 6, 8][i % 3]; // petites hauteurs
               const spanClasses = `col-span-${fillerCols} row-span-${fillerRows}`;

               return (
                  <motion.div
                    key={`filler-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.3 }}
                    transition={{ duration: 1, delay: 1 + (i * 0.1) }}
                    style={parseSpanStyles(spanClasses)}
                    className={`project-card-span relative w-full h-full bg-zinc-900/30 flex justify-center items-center overflow-hidden mix-blend-screen group`}
                  >
                     {/* Petite décoration "tech" */}
                     <div className="text-[8px] font-mono text-zinc-700 uppercase tracking-widest opacity-50 group-hover:opacity-100 transition-opacity">
                        [ {i % 2 === 0 ? 'VOID' : 'NULL'} ]
                     </div>
                     <div className="absolute top-1 left-1 w-1 h-1 bg-zinc-800 rounded-full" />
                     <div className="absolute top-1 right-1 w-1 h-1 bg-zinc-800 rounded-full" />
                     <div className="absolute bottom-1 right-1 w-1 h-1 bg-zinc-800 rounded-full" />
                     <div className="absolute bottom-1 left-1 w-1 h-1 bg-zinc-800 rounded-full" />
                  </motion.div>
               )
            })}
        </div>
      )}

      {/* Bouton global Unmute / Mute (Flottant bottom right) */}
      <button 
        id="mute-btn-masonry"
        onClick={toggleGlobalMute}
        className="fixed bottom-6 right-6 z-50 bg-black border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900 px-4 py-3 font-sans font-bold text-[10px] sm:text-xs uppercase tracking-widest transition-colors shadow-2xl"
      >
        {globalIsMuted ? '🔇 SON COUPÉ' : '🔊 SON ACTIF'}
      </button>
    </div>
  )
}

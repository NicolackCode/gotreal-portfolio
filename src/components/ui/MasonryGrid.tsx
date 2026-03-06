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

// === SAFELIST TAILWIND (Empêche PurgeCSS de supprimer les classes responsives dynamiques) ===
// 'col-span-1' 'row-span-1' 'md:col-span-1' 'md:row-span-1' 'xl:col-span-1' 'xl:row-span-1'
// 'col-span-2' 'row-span-2' 'md:col-span-2' 'md:row-span-2' 'xl:col-span-2' 'xl:row-span-2'
// 'col-span-3' 'row-span-3' 'md:col-span-3' 'md:row-span-3' 'xl:col-span-3' 'xl:row-span-3'
// 'col-span-4' 'row-span-4' 'md:col-span-4' 'md:row-span-4' 'xl:col-span-4' 'xl:row-span-4'
// 'col-span-5' 'row-span-5' 'md:col-span-5' 'md:row-span-5' 'xl:col-span-5' 'xl:row-span-5'
// 'col-span-6' 'row-span-6' 'md:col-span-6' 'md:row-span-6' 'xl:col-span-6' 'xl:row-span-6'
// 'col-span-8' 'row-span-8' 'md:col-span-8' 'md:row-span-8' 'xl:col-span-8' 'xl:row-span-8'
// 'col-span-10' 'row-span-10' 'md:col-span-10' 'md:row-span-10' 'xl:col-span-10' 'xl:row-span-10'
// 'col-span-12' 'row-span-12' 'md:col-span-12' 'md:row-span-12' 'xl:col-span-12' 'xl:row-span-12'
// 'col-span-14' 'row-span-14' 'md:col-span-14' 'md:row-span-14' 'xl:col-span-14' 'xl:row-span-14'
// 'col-span-16' 'row-span-16' 'md:col-span-16' 'md:row-span-16' 'xl:col-span-16' 'xl:row-span-16'
// 'col-span-18' 'row-span-18' 'md:col-span-18' 'md:row-span-18' 'xl:col-span-18' 'xl:row-span-18'
// 'col-span-20' 'row-span-20' 'md:col-span-20' 'md:row-span-20' 'xl:col-span-20' 'xl:row-span-20'
// 'col-span-22' 'row-span-22' 'md:col-span-22' 'md:row-span-22' 'xl:col-span-22' 'xl:row-span-22'
// 'col-span-24' 'row-span-24' 'md:col-span-24' 'md:row-span-24' 'xl:col-span-24' 'xl:row-span-24'

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

  // Extraire les catégories uniques, en excluant les GADGETS du menu cliquable
  const categories = useMemo(() => {
    if (!projects) return []
    const catList = projects
       .filter(p => p.category !== 'GADGET') // Ne crée pas de bouton "GADGET"
       .map(p => (p.category || p.client)?.trim().toUpperCase())
       .filter((c): c is string => Boolean(c))
    const uniqueCat = Array.from(new Set(catList))
    return uniqueCat.sort()
  }, [projects])

  // Filtrer les projets : Les GADGETS sont TOUJOURS présents pour boucher les trous, peu importe la catégorie sélectionnée !
  const filteredProjects = useMemo(() => {
    if (activeFilter === 'TOUT') {
       return [...projects];
    }
    
    return projects.filter(p => 
      p.category === 'GADGET' || // Toujours inclure la colle
      (p.category || p.client)?.trim().toUpperCase() === activeFilter
    )
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
        // Grille très fine (24 colonnes) pour un contrôle maximal. grid-flow-dense pour boucher les trous
        <div className="w-full grid grid-cols-6 md:grid-cols-12 xl:grid-cols-24 gap-[4px] auto-rows-[20px] grid-flow-dense pb-24">
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

              if (project.category === 'GADGET') {
                 // DESIGN GADGET (LIVING AMBIENT CANVAS)
                 // Couleurs harmonieuses qui évoquent des reflets d'écran
                 const colorPair = [
                   ["bg-pink-500", "bg-purple-600"],
                   ["bg-cyan-400", "bg-blue-600"],
                   ["bg-orange-500", "bg-red-600"],
                   ["bg-emerald-400", "bg-teal-600"],
                   ["bg-fuchsia-500", "bg-rose-500"]
                 ][index % 5];
                 
                 // L'animation "pulse/spin" s'emballe si le son de la page est activé (battement simulé)
                 const animSpeed = globalIsMuted ? 10 : 2;
                 
                 return (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 1, delay: (index % 10) * 0.05 }}
                      style={parseSpanStyles(spanClasses)}
                      className="project-card-span relative w-full h-full bg-zinc-950 border border-white/5 overflow-hidden group rounded-2xl"
                    >
                       {/* Blob Radiant 1 */}
                       <motion.div 
                         className={`absolute -top-[20%] -left-[20%] w-[140%] h-[140%] rounded-full mix-blend-screen filter blur-[40px] md:blur-[80px] opacity-30 ${colorPair[0]} pointer-events-none`}
                         animate={{
                            x: ["0%", "20%", "-10%", "0%"],
                            y: ["0%", "30%", "10%", "0%"],
                            scale: [1, 1.2, 0.9, 1],
                            opacity: globalIsMuted ? [0.2, 0.4, 0.2] : [0.4, 0.9, 0.4]
                         }}
                         transition={{ duration: animSpeed * 1.5, repeat: Infinity, ease: "easeInOut" }}
                       />
                       
                       {/* Blob Radiant 2 */}
                       <motion.div 
                         className={`absolute -bottom-[20%] -right-[20%] w-[140%] h-[140%] rounded-full mix-blend-screen filter blur-[40px] md:blur-[80px] opacity-30 ${colorPair[1]} pointer-events-none`}
                         animate={{
                            x: ["0%", "-30%", "20%", "0%"],
                            y: ["0%", "-20%", "-10%", "0%"],
                            scale: [1, 1.4, 0.8, 1],
                            opacity: globalIsMuted ? [0.1, 0.3, 0.1] : [0.2, 0.7, 0.2]
                         }}
                         transition={{ duration: animSpeed * 1.2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                       />

                       {/* Astrolabe Géométrique Central Tournant */}
                       <div className="absolute inset-0 flex items-center justify-center opacity-30 group-hover:opacity-60 transition-opacity mix-blend-plus-lighter pointer-events-none">
                           <motion.div 
                              animate={{ rotate: 360 }}
                              transition={{ duration: animSpeed * 3, repeat: Infinity, ease: "linear" }}
                              className="w-2/3 h-2/3 max-w-[120px] max-h-[120px] border-[0.5px] border-white/30 rounded-full flex items-center justify-center p-2"
                           >
                               <motion.div 
                                  animate={{ rotate: -360 }}
                                  transition={{ duration: animSpeed * 1.5, repeat: Infinity, ease: "linear" }}
                                  className="w-full h-full border-t border-b border-white/50 rounded-full flex items-center justify-center"
                               >
                                    <div className="w-1/2 h-1/2 border-[0.5px] border-white/20 rounded-full" />
                               </motion.div>
                           </motion.div>
                       </div>
                       
                       {/* Données HUD d'Habillage (Tech Vibe) */}
                       <div className="absolute top-3 left-3 flex justify-between items-start right-3 pointer-events-none z-10 mix-blend-screen">
                           <div className="text-[8px] font-mono text-white/70 uppercase tracking-widest whitespace-nowrap">
                               NODE.{project.title.split('_')[1] || `0${index}`}
                           </div>
                           <motion.div 
                               animate={{ opacity: globalIsMuted ? [0.2, 0.5, 0.2] : [0.6, 1, 0.6] }}
                               transition={{ duration: globalIsMuted ? 2 : 0.6, repeat: Infinity, ease: "easeInOut" }}
                               className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                           />
                       </div>

                       {/* Glass / Noise de surface */}
                       <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px] pointer-events-none" />
                       
                       {/* Interaction Bordure au Hover */}
                       <div className="absolute inset-0 border-2 border-transparent group-hover:border-white/10 rounded-2xl transition-colors duration-500 pointer-events-none z-20" />
                    </motion.div>
                 );
              }

              // PROJET CLASSIQUE
              return (
                <motion.div 
                  key={project.id}
                  layout="position"
                  initial={{ opacity: 0, scale: 0.9, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut", delay: (index % 10) * 0.05 }}
                  style={parseSpanStyles(spanClasses)}
                  className={`project-card-span relative w-full h-full overflow-hidden`}
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

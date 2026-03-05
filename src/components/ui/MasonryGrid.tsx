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

  // Filtrer ET Trier les projets (Priorité: TOP 3 > TOP 2 > TOP 1 > RAW > Reste)
  const filteredProjects = useMemo(() => {
    let result = [...projects]
    
    if (activeFilter !== 'TOUT') {
      result = result.filter(p => (p.category || p.client)?.trim().toUpperCase() === activeFilter)
    }

    return result.sort((a, b) => {
      const getScore = (val?: string) => {
        if (!val) return 5
        if (val === 'TOP 1') return 1
        if (val === 'TOP 2') return 2
        if (val === 'TOP 3') return 3
        if (val === 'RAW') return 4
        return 5
      }

      const pA = getScore(a.priority)
      const pB = getScore(b.priority)

      if (pA !== pB) return pA - pB
      return (a.rank || 0) - (b.rank || 0)
    })
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

      {/* GRILLE MASONRY (Asymétrique via react-masonry-css + Chaos Contrôlé) */}
      {filteredProjects.length === 0 ? (
        <div className="w-full h-32 flex items-center justify-center text-zinc-500 font-mono tracking-widest uppercase text-xs">
          Aucun projet pour cette catégorie
        </div>
      ) : (
        // Vraie Grid CSS (Bento Box), le grid-flow-dense fait remonter les blocs dans les trous
        <div className="w-full grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 auto-rows-[160px] md:auto-rows-[220px] xl:auto-rows-[280px] gap-[4px] grid-flow-dense pb-24">
            {filteredProjects.map((project, index) => {
              
              const isRotatedVertical = project.rotation === 90 || project.rotation === -90 || project.rotation === 270;
              const fallbackIsNativeVert = project.client?.toLowerCase().includes('reel') || project.client?.toLowerCase().includes('tiktok') || project.category?.toLowerCase().includes('reel') || project.category?.toLowerCase().includes('tiktok');
              const fallbackIsVertical = isRotatedVertical || fallbackIsNativeVert;

              const physicalFormat = verifiedFormats[project.id];
              const isVertical = physicalFormat ? physicalFormat === 'vertical' : fallbackIsVertical;

              // Formats "ZÉRO TROU NOIRS" : Les ratios de la grille correspondent aux ratios min max demandés.
              const getGridSpan = (isVert: boolean, i: number) => {
                 if (isVert) {
                    // VERTICAL (Portrait): Max = 2x3, Min = 1x2 (Tiktok ratio natif / Mobile ratio natif)
                    if (i % 4 === 0) return "col-span-2 row-span-3";
                    
                    // Vertical standard : 1 col par 2 row
                    return "col-span-1 row-span-2";
                 }
                 
                 // HORIZONTAL (Paysage): Max = 3x2, Min = 2x1 (Ciné)
                 if (i % 6 === 0) return "col-span-3 row-span-2"; 
                 
                 // Horizontal Standard (Cinéma 2x1):
                 return "col-span-2 row-span-1"; 
              }

              const spanClasses = getGridSpan(isVertical, index);

              return (
                <motion.div 
                  key={project.id}
                  layout="position"
                  initial={{ opacity: 0, scale: 0.9, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut", delay: (index % 10) * 0.05 }}
                  className={`relative w-full h-full ${spanClasses} ring-1 ring-white/20`}
                >
                  <ProjectCard 
                    project={project} 
                    priorityLoad={index < 8} 
                    globalIsMuted={globalIsMuted} 
                    onFormatLoaded={handleFormatLoaded}
                    spanData={spanClasses} // Injecte le texte des grid-spans
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

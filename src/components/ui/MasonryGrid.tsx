'use client'

import React, { useRef, useState, useMemo } from 'react'
import ProjectCard from './ProjectCard'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP)
}

interface Project {
  id: string
  title: string
  client: string
  description?: string
  main_video_url?: string
  carousel_urls?: string[]
  rank?: number
  forced_span?: string
  priority?: string // nouveau tag manuel
}

interface MasonryGridProps {
  projects: Project[]
}

export default function MasonryGrid({ projects }: MasonryGridProps) {
  const container = useRef<HTMLDivElement>(null)
  const [activeFilter, setActiveFilter] = useState('TOUT')
  const [globalIsMuted, setGlobalIsMuted] = useState(true)

  // Extraire les catégories uniques, en isolant le bouton TOUT
  const categories = useMemo(() => {
    if (!projects) return []
    const clients = projects.map(p => p.client?.trim().toUpperCase()).filter(Boolean)
    const uniqueClients = Array.from(new Set(clients))
    return uniqueClients.sort()
  }, [projects])

  // Filtrer ET Trier les projets (Priorité: TOP 3 > TOP 2 > TOP 1 > RAW > Reste)
  const filteredProjects = useMemo(() => {
    let result = [...projects]
    
    if (activeFilter !== 'TOUT') {
      result = result.filter(p => p.client?.trim().toUpperCase() === activeFilter)
    }

    // Le tri par tags explicites en BDD
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

      // Si priorités différentes, on trie (le plus petit chiffre en premier)
      if (pA !== pB) return pA - pB
      
      // À priorité égale, on garde le tri BDD d'origine
      return (a.rank || 0) - (b.rank || 0)
    })
  }, [projects, activeFilter])
  
  useGSAP(() => {
    // Si pas de projets, ou si filtré vide, ne rien faire
    if (!filteredProjects || filteredProjects.length === 0) return

    const cards = gsap.utils.toArray('.masonry-item') as HTMLElement[]
    
    // On nettoie les anciens styles si on re-filtre
    gsap.set(cards, { clearProps: 'all' })

    // Animation classique en cascade sans ScrollTrigger (qui cause des trous au changement de filtre avec les colonnes CSS)
    gsap.fromTo(cards, 
      { opacity: 0, scale: 0.95, y: 20 },
      {
        opacity: 1, 
        scale: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.03, // Cascade très rapide style Awwwards
        ease: 'power2.out',
      }
    )
  }, { scope: container, dependencies: [activeFilter, filteredProjects] })

  if (!projects || projects.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-zinc-500 font-mono tracking-widest uppercase">
        Aucun projet à afficher
      </div>
    )
  }

  return (
    <div ref={container} className="w-full max-w-[1800px] mx-auto px-4 py-12">
      
      {/* MENU FILTRES CATEGORIES EYECANNDY STYLE */}
      {categories.length > 0 && (
        <div className="flex flex-col items-center justify-center mb-16 sm:mb-24">
          
          {/* TOUT CENTRÉ EN HAUT */}
          <button
            onClick={() => setActiveFilter('TOUT')}
            className={`text-sm md:text-base font-sans font-black tracking-widest uppercase px-4 py-2 mb-8 ${
              activeFilter === 'TOUT' 
                ? 'text-white border-b-2 border-white' 
                : 'text-zinc-600 hover:text-zinc-300 border-b-2 border-transparent hover:border-zinc-700'
            }`}
          >
            ALL
          </button>

          {/* AUTRES CATEGORIES CENTREES EN DESSOUS */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 max-w-5xl mx-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`text-[10px] md:text-sm font-sans font-bold tracking-widest uppercase px-2 py-1 ${
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

      {/* GRILLE BENTO / TETRIS (CSS Grid Dense Packing) */}
      {filteredProjects.length === 0 ? (
        <div className="w-full h-32 flex items-center justify-center text-zinc-500 font-mono tracking-widest uppercase text-xs">
          Aucun projet pour cette catégorie
        </div>
      ) : (
        /* Dense: Les cellules comblent automatiquement les trous laissés par les gros spans */
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 grid-flow-dense auto-rows-[200px] md:auto-rows-[250px] lg:auto-rows-[300px] gap-2 sm:gap-4 w-full">
          {filteredProjects.map((project, index) => {
            // L'astuce Bento : Le Grid Parent doit absolument détenir le spanClass !
            let spanClass = project.forced_span
            
            // Si l'admin n'a pas forcé de taille depuis le dashboard, on garde l'aléatoire Tetris
            if (!spanClass) {
              const hash = project.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
              const type = hash % 5 
              
              spanClass = 'col-span-1 row-span-1'
              if (type === 0) spanClass = 'col-span-2 row-span-1' // Rectangle horizontal
              else if (type === 1) spanClass = 'col-span-1 row-span-2' // Rectangle vertical
              else if (type === 2) spanClass = 'col-span-2 row-span-2' // Gros carré impactant
            }

            return (
              <div key={project.id} className={`shadow-2xl h-full w-full overflow-hidden ${spanClass}`}>
                <ProjectCard project={project} priorityLoad={index < 8} globalIsMuted={globalIsMuted} />
              </div>
            )
          })}
        </div>
      )}

      {/* Bouton global Unmute / Mute (Flottant bottom right) */}
      <button 
        onClick={() => setGlobalIsMuted(!globalIsMuted)}
        className="fixed bottom-6 right-6 z-50 bg-black border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900 px-4 py-3 font-sans font-bold text-[10px] sm:text-xs uppercase tracking-widest transition-colors shadow-2xl"
      >
        {globalIsMuted ? '🔇 SOUND OFF' : '🔊 SOUND ON'}
      </button>
    </div>
  )
}

'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import ReelItem from './ReelItem';
import { Database } from '@/types/supabase';

interface MobileReelFeedProps {
  projects: Database['public']['Tables']['projects']['Row'][];
}

export default function MobileReelFeed({ projects }: MobileReelFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  
  // NOUVEAU: Muted PAR DÉFAUT pour bypasser l'Autoplay strict de iOS Safari
  const [isGlobalMuted, setIsGlobalMuted] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);

  // GESTION DES CATÉGORIES
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  
  // Extraire les catégories uniques existantes
  const categories = useMemo(() => {
    const cats = projects.map(p => p.category).filter(Boolean) as string[];
    const uniqueCats = Array.from(new Set(cats));
    return ['ALL', ...uniqueCats];
  }, [projects]);

  // Filtrer les projets actifs
  const filteredProjects = useMemo(() => {
    if (activeCategory === 'ALL') return projects;
    return projects.filter(p => p.category === activeCategory);
  }, [projects, activeCategory]);

  // Fonction d'observation (Intersection Observer) : Savoir quelle vidéo est à l'écran
  useEffect(() => {
    const observerOptions = {
      root: containerRef.current,
      rootMargin: '0px',
      // Trigger quand 60% de la vidéo est visible
      threshold: 0.6,
    };

    const handleIntersect: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = Number(entry.target.getAttribute('data-index'));
          setActiveIndex(index);
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersect, observerOptions);
    
    // Attacher l'observer à chaque "slide"
    if (containerRef.current) {
        const slides = containerRef.current.querySelectorAll('.reel-slide');
        slides.forEach((slide) => observer.observe(slide));
    }

    return () => observer.disconnect();
  }, [filteredProjects]); // Refresh quand les filtres changent

  // Reste au top quand on change de catégorie
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'instant' });
      setTimeout(() => setActiveIndex(0), 0);
    }
  }, [activeCategory]);

  // Toggle du bouton "Son" spécifique
  const toggleGlobalMute = () => {
    setHasInteracted(true);
    setIsGlobalMuted(!isGlobalMuted);
  };

  // Au permier Tap n'importe où, si on a jamais intéragi, on dé-mute tout et on enregistre l'interaction !
  const handleAnyInteraction = () => {
    if (!hasInteracted) {
      setHasInteracted(true);
      setIsGlobalMuted(false); 
    }
  };

  if (!projects || projects.length === 0) return null;

  return (
    <div 
      ref={containerRef}
      className="w-full h-[100dvh] bg-black overflow-y-scroll snap-y snap-mandatory scroll-smooth relative"
      // Pour éviter le fameux bounce effect élastique sur iOS (overscroll)
      style={{ overscrollBehaviorY: 'none' }}
    >
      
      {/* HEADER MINIMALISTE & FILTRES CATÉGORIES */}
      <div className="absolute top-0 left-0 w-full z-50 pointer-events-auto bg-gradient-to-b from-black/80 via-black/30 to-transparent pb-10">
        <div className="px-4 pt-6 pb-2 flex justify-between items-center mix-blend-difference pointer-events-none">
          <h1 className="text-[10px] font-sans font-black text-white tracking-[0.3em] uppercase opacity-90">
               GOTREAL.
          </h1>
          <span className="text-white font-mono text-[10px] tracking-widest opacity-60">
              {activeIndex + 1} / {filteredProjects.length}
          </span>
        </div>
        
        {/* Catégories Scrollables */}
        <div className="px-4 flex gap-3 overflow-x-auto no-scrollbar items-center mask-image-[linear-gradient(to_right,white_80%,transparent)]">
            {categories.map((cat) => (
                <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-mono tracking-widest uppercase transition-colors ${
                        activeCategory === cat 
                          ? 'bg-white text-black font-bold' 
                          : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                    }`}
                >
                    {cat}
                </button>
            ))}
        </div>
      </div>

      {filteredProjects.length === 0 && (
         <div className="w-full h-full flex items-center justify-center pointer-events-none">
             <p className="text-white/50 text-xs font-mono tracking-widest uppercase">AUCUN PROJET</p>
         </div>
      )}

      {filteredProjects.map((project, index) => (
        <div key={project.id} className="reel-slide w-full h-[100dvh] flex-shrink-0" data-index={index}>
            <ReelItem 
                project={project} 
                isActive={activeIndex === index}
                isMuted={isGlobalMuted}
                toggleMute={toggleGlobalMute}
                onInteract={handleAnyInteraction}
            />
        </div>
      ))}
    </div>
  );
}

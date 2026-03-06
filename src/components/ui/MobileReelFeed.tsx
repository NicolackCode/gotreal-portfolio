'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import ReelItem from './ReelItem';
import { Database } from '@/types/supabase';

interface MobileReelFeedProps {
  projects: Database['public']['Tables']['projects']['Row'][];
}

export default function MobileReelFeed({ projects }: MobileReelFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0); // Le projet au centre (pour le son et le compteur)
  const [visibleIndices, setVisibleIndices] = useState<number[]>([0]); // Les projets visibles (pour la lecture simultanée)
  
  // NOUVEAU: Muted PAR DÉFAUT pour bypasser l'Autoplay strict de iOS Safari
  const [isGlobalMuted, setIsGlobalMuted] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);

  // VÉRIFICATION DE LA SESSION : Si l'utilisateur vient de naviguer sur le site, l'Autoplay Unmuted est autorisé 
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('gotreal_interacted') === 'true') {
      setTimeout(() => {
        setIsGlobalMuted(false);
        setHasInteracted(true);
      }, 0);
    }
  }, []);

  // GESTION DU MASQUAGE AUTOMATIQUE DU HEADER (Façon TikTok/Insta)
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollY = useRef(0);

  const handleUserActivity = (e?: React.UIEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    setIsHeaderVisible(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setIsHeaderVisible(false);
    }, 2500); // Cache le header après 2.5s d'inactivité
    
    // NOUVEAU : Communication Scroll vers PublicHeader
    if (e && 'currentTarget' in e) {
      const currentY = (e.currentTarget as HTMLDivElement).scrollTop;
      if (currentY > lastScrollY.current + 10) {
        window.dispatchEvent(new CustomEvent('gotreal_header_hide'));
      } else if (currentY < lastScrollY.current - 10) {
        window.dispatchEvent(new CustomEvent('gotreal_header_show'));
      }
      lastScrollY.current = currentY;
    }
  };

  // Initier le timeout dès le montage
  useEffect(() => {
    scrollTimeoutRef.current = setTimeout(() => {
      setIsHeaderVisible(false);
    }, 2500);
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    }
  }, []);

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
    // ---- Observer 1 : Savoir QUELS projets sont visibles (1% minimum) pour lire la vidéo
    const visibilityObserver = new IntersectionObserver((entries) => {
      setVisibleIndices(prev => {
        let next = [...prev];
        entries.forEach((entry) => {
          const index = Number(entry.target.getAttribute('data-index'));
          if (entry.isIntersecting) {
            if (!next.includes(index)) next.push(index);
          } else {
            next = next.filter(i => i !== index);
          }
        });
        return next;
      });
    }, { root: containerRef.current, rootMargin: '0px', threshold: 0.01 });

    // ---- Observer 2 : Savoir QUEL projet est le focus central (60%) pour le son et le compteur
    const focusObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = Number(entry.target.getAttribute('data-index'));
          setActiveIndex(index);
        }
      });
    }, { root: containerRef.current, rootMargin: '0px', threshold: 0.60 });
    
    // Attacher l'observer à chaque "slide"
    if (containerRef.current) {
        const slides = containerRef.current.querySelectorAll('.reel-slide');
        slides.forEach((slide) => {
           visibilityObserver.observe(slide);
           focusObserver.observe(slide);
        });
    }

    return () => {
       visibilityObserver.disconnect();
       focusObserver.disconnect();
    };
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
    handleUserActivity(); // Fait réapparaître le Header au tap
    if (!hasInteracted) {
      setHasInteracted(true);
      setIsGlobalMuted(false); 
    }
  };

  // Scroll automatique et fluide vers la vidéo suivante
  const scrollToNext = (currentIndex: number) => {
    if (containerRef.current) {
        const slides = containerRef.current.querySelectorAll('.reel-slide');
        if (currentIndex < slides.length - 1) {
            const nextSlide = slides[currentIndex + 1] as HTMLElement;
            containerRef.current.scrollTo({
                top: nextSlide.offsetTop,
                behavior: 'smooth'
            });
        }
    }
  };

  if (!projects || projects.length === 0) return null;

  return (
    <div 
      ref={containerRef}
      className="w-full h-[100dvh] bg-black overflow-y-scroll snap-y snap-mandatory scroll-smooth relative"
      // Pour éviter le fameux bounce effect élastique sur iOS (overscroll)
      style={{ overscrollBehaviorY: 'none' }}
      onScroll={handleUserActivity}
      onTouchMove={handleUserActivity}
    >
      
      {/* HEADER MINIMALISTE & FILTRES CATÉGORIES (AUTO-HIDE) */}
      <div 
        className={`fixed top-0 left-0 w-full z-40 pointer-events-none bg-gradient-to-b from-black/90 via-black/50 to-transparent pt-[72px] pb-8 transition-transform duration-500 will-change-transform ${
          isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="px-4 pb-3 flex justify-end items-center mix-blend-difference">
          <span className="text-white font-mono text-[10px] tracking-widest opacity-80 decoration-white/20">
              {activeIndex + 1} / {filteredProjects.length}
          </span>
        </div>
        
        {/* Catégories Scrollables */}
        <div className="px-4 flex gap-3 overflow-x-auto no-scrollbar items-center mask-image-[linear-gradient(to_right,white_80%,transparent)] pointer-events-auto pl-4">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[9px] sm:text-[10px] font-mono tracking-widest uppercase transition-all shadow-md ${
                  activeCategory === cat 
                    ? 'bg-white text-black font-bold border-transparent' 
                    : 'bg-black/50 text-white backdrop-blur border border-white/10 hover:bg-white/20'
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

      {filteredProjects.map((project, index) => {
        // Préchargement de la vidéo précédente et suivante pour éviter le flash noir
        const isAdjacent = Math.abs(activeIndex - index) <= 1;
        const isFocused = activeIndex === index;
        const isVisible = visibleIndices.includes(index);

        return (
          <div key={project.id} className="reel-slide w-full h-[100dvh] flex-shrink-0" data-index={index}>
              <ReelItem 
                  project={project} 
                  isActive={isFocused}
                  isVisible={isVisible}
                  isAdjacent={isAdjacent}
                  isMuted={isGlobalMuted}
                  toggleMute={toggleGlobalMute}
                  onInteract={handleAnyInteraction}
                  onVideoEnd={() => scrollToNext(index)}
              />
          </div>
        )
      })}
    </div>
  );
}

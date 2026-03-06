'use client';

import React, { useRef, useState, useEffect } from 'react';
import ReelItem from './ReelItem';
import { Database } from '@/types/supabase';

interface MobileReelFeedProps {
  projects: Database['public']['Tables']['projects']['Row'][];
}

export default function MobileReelFeed({ projects }: MobileReelFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  
  // Par défaut, mute = false. L'utilisateur a cliqué sur un bouton depuis la Home = Autoplay Unmuted devrait passer !
  const [isGlobalMuted, setIsGlobalMuted] = useState(false);

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
  }, [projects]);

  const toggleGlobalMute = () => {
    setIsGlobalMuted(!isGlobalMuted);
  };

  if (!projects || projects.length === 0) return null;

  return (
    <div 
      ref={containerRef}
      className="w-full h-[100dvh] bg-black overflow-y-scroll snap-y snap-mandatory scroll-smooth relative"
      // Pour éviter le fameux bounce effect élastique sur iOS (overscroll)
      style={{ overscrollBehaviorY: 'none' }}
    >
      
      {/* HEADER FLOTTANT : Logo Gauteh */}
      <div className="absolute top-0 left-0 w-full px-6 py-6 sm:py-8 flex justify-between items-center z-50 pointer-events-none mix-blend-difference bg-gradient-to-b from-black/80 to-transparent">
        <h1 className="text-sm font-sans font-black text-white tracking-[0.3em] uppercase opacity-90">
             GOTREAL.
        </h1>
        {/* Optionnel un index d'image : */}
        <span className="text-white font-mono text-[10px] tracking-widest opacity-60">
            {activeIndex + 1} / {projects.length}
        </span>
      </div>

      {projects.map((project, index) => (
        <div key={project.id} className="reel-slide w-full h-[100dvh] flex-shrink-0" data-index={index}>
            <ReelItem 
                project={project} 
                isActive={activeIndex === index}
                isMuted={isGlobalMuted}
                toggleMute={toggleGlobalMute}
            />
        </div>
      ))}
    </div>
  );
}

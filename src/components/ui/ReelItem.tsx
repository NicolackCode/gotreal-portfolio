import React, { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import Hls from 'hls.js';
import { Database } from '@/types/supabase';

interface ReelItemProps {
  project: Database['public']['Tables']['projects']['Row'];
  isActive: boolean;
  isVisible: boolean;
  isAdjacent?: boolean;
  isMuted: boolean;
  toggleMute: () => void;
  onInteract: () => void;
  onVideoEnd?: () => void;
}

export default function ReelItem({ project, isActive, isVisible, isAdjacent = false, isMuted, toggleMute, onInteract, onVideoEnd }: ReelItemProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);

  // Initialisation HLS Conditionnelle pour économiser la RAM
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive || isAdjacent) {
      if (project.main_video_url?.includes('.m3u8') && Hls.isSupported()) {
        if (!hlsRef.current) {
          const hls = new Hls({ capLevelToPlayerSize: false, startLevel: 0 });
          hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
            let bestLevel = -1;
            let maxRes = 0;
            data.levels.forEach((level, index) => {
              const res = Math.max(level.width, level.height);
              if (res <= 1920 && res > maxRes) {
                maxRes = res;
                bestLevel = index;
              }
            });
            if (bestLevel !== -1) hls.autoLevelCapping = bestLevel;
          });
          hls.loadSource(project.main_video_url);
          hls.attachMedia(video);
          hlsRef.current = hls;
        }
      } else {
        // Fallback pour iOS Safari (Native HLS) ou MP4
        if (project.main_video_url?.includes('.m3u8') && video.canPlayType('application/vnd.apple.mpegurl')) {
          if (video.src !== project.main_video_url) video.src = project.main_video_url;
        } else {
          if (video.src !== project.video_url) video.src = project.video_url || "";
        }
      }
    } else {
      // Destruction de l'instance si la vidéo sort du scope adjacent
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    }
  }, [isActive, isAdjacent, project.main_video_url, project.video_url]);

  // NOUVEAU : Silent Preroll (Forcer la mise en cache de la vidéo suivante sur iOS/Mobile)
  const hasPrerolled = useRef(false);

  useEffect(() => {
    if (!videoRef.current) return;
    
    // Si la vidéo vient de se charger "à côté" mais qu'elle n'est pas encore visible
    if (isAdjacent && !isVisible && !hasPrerolled.current) {
      hasPrerolled.current = true; // On ne le fait qu'une fois
      const video = videoRef.current;
      
      const wasMuted = video.muted;
      video.muted = true; // Mute obligatoire pour l'Autoplay
      
      const playPromise = video.play();
      if (playPromise !== undefined) {
          playPromise.then(() => {
              // Dès que le cache de lecture s'est enclenché, on stoppe net
              video.pause();
              video.muted = wasMuted;
          }).catch(() => {
              // Ignore poliment les bloqueurs sévères
          });
      }
    }
    
    // Reset le preroll si la vidéo s'éloigne (pour le refaire plus tard si l'user revient)
    if (!isAdjacent) {
      hasPrerolled.current = false;
    }
  }, [isAdjacent, isVisible]);

  // Gérer la lecture / pause en fonction du scroll (isVisible -> Lecture fluide dès 1% d'affichage)
  useEffect(() => {
    if (!videoRef.current) return;

    if (isVisible) {
      if (videoRef.current.paused) {
          // Rembobiner seulement si on vient vraiment de l'activer (wow effect sur le swipe)
          videoRef.current.currentTime = 0; 
          
          videoRef.current.play()
            .then(() => setIsPlaying(true))
            .catch(() => {
              // L'Autoplay Unmuted été bloqué par le téléphone (sans doute Battery Saver ou Safari strict)
              // On le mute de force et on relance pour garantir l'image.
              if (videoRef.current) {
                videoRef.current.muted = true;
                videoRef.current.play()
                  .then(() => setIsPlaying(true))
                  .catch(() => setIsPlaying(false)); // Là on déclare forfait
              }
            });
      }
    } else {
      videoRef.current.pause();
      // setTimeout to avoid synchronous setState inside useEffect warning
      setTimeout(() => setIsPlaying(false), 0);
    }
  }, [isVisible]);

  // Synchroniser le mute parent avec la balise vidéo : SEULE la vidéo 'isActive' (centrée) a le droit de parler
  useEffect(() => {
    if (videoRef.current) {
      // Si on est focus, on applique le global Muted.
      // Si on ne l'est pas (et qu'on joue en parallèle dans le coin), on force le mute !
      videoRef.current.muted = isActive ? isMuted : true;
    }
  }, [isMuted, isActive]);

  // EFFET AMBILIGHT (Copie de la vidéo sur un Canvas basse résolution fluoté par CSS GPU)
  useEffect(() => {
    let animationFrameId: number;
    let lastDrawTime = 0;
    
    const drawAmbilight = (time: number) => {
      if (!isActive || !isPlaying || !videoRef.current || !bgCanvasRef.current) return;
      
      // Throttle à ~15fps pour ne consommer aucune ressource Mobile
      if (time - lastDrawTime > 66) {
        const video = videoRef.current;
        const canvas = bgCanvasRef.current;
        const ctx = canvas.getContext('2d');
        
        if (ctx && video.videoWidth > 0) {
          if (canvas.width !== 64) {
             canvas.width = 64;
             canvas.height = Math.floor(64 * (video.videoHeight / video.videoWidth));
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
        lastDrawTime = time;
      }
      
      animationFrameId = requestAnimationFrame(drawAmbilight);
    };
    
    if (isActive && isPlaying) {
      animationFrameId = requestAnimationFrame(drawAmbilight);
    }
    
    return () => cancelAnimationFrame(animationFrameId);
  }, [isActive, isPlaying]);

  // Toggle Lecture/Pause on Click complet sur l'écran et DÉCLENCHEMENT GLOBAL DU SON
  const handleScreenClick = (e: React.MouseEvent) => {
    // Si on clique sur un bouton ou lien, on ne fait pas pause
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return;

    // Déclencher le hook parent (démarre le son global si c'est le 1er tap)
    onInteract();

    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => setIsPlaying(true));
      }
    }
  };

  return (
    <div 
      className="relative w-full h-[100dvh] snap-center overflow-hidden bg-black"
      onClick={handleScreenClick}
    >
      {/* 1. LECTURE VIDÉO : Mode Ambilight (flou en background + contenu clean par dessus) */}
      
      {/* 1A. Background Flou pour masquer le noir (Précieux pour les clips 16:9) */}
      <div className="absolute inset-0 w-full h-full scale-110 opacity-30 select-none pointer-events-none transform-gpu overflow-hidden">
         {/* Poster static (visible pendant le chargement) */}
         <div 
           className="absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-1000"
           style={{ backgroundImage: `url(${project.thumbnail_url})`, filter: 'blur(30px) brightness(0.6)' }}
         />
         {/* Canvas Vidéo Flou (L'Ambilight) */}
         <canvas 
            ref={bgCanvasRef}
            className={`absolute inset-0 w-full h-full object-cover blur-[40px] brightness-[0.6] transition-opacity duration-1000 ${isPlaying ? 'opacity-100' : 'opacity-0'}`}
         />
      </div>

      {/* 1B. Vidéo principale (Cover sur mobile / Contain sur tablette et +) */}
      {/* On n'utilise plus les marges forcées, mais une div responsive pour cadrer.
          Sur mobile, la vidéo plonge sous le texte (object-cover ou contain naturel sans marge interne énorme). */}
      <div className="absolute inset-0 pt-[80px] sm:pt-0 flex items-center justify-center pointer-events-none overflow-hidden">
         <video 
            ref={videoRef}
            poster={project.thumbnail_url || undefined}
            className="w-full h-full object-cover md:object-contain transform-gpu"
            playsInline
            muted={isMuted}
            crossOrigin="anonymous"
            preload={isActive || isAdjacent ? "auto" : "none"} // Auto-charge l'immédiatement précédent/suivant
            onEnded={onVideoEnd}
         />
      </div>

      {/* 2. OVERLAY ASSOMBRISSEMENT BAS (Pour lire le texte) */}
      <div className="absolute bottom-0 left-0 w-full h-[35%] sm:h-1/2 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none z-10" />

      {/* 3. INTERFACE UTILISATEUR (Textes & Boutons) */}
      {/* Placé le plus bas possible : pb-2 pour frôler le bord de l'écran en bas */}
      <div 
         className="absolute bottom-0 left-0 w-full px-4 pt-10 flex z-20 pointer-events-auto items-end"
         style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        
        {/* Colonne Left : Les Infos */}
        <div className="flex-1 flex flex-col justify-end pr-4 sm:pr-8">
          
          {/* Badge Client/Catégorie */}
          <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
            <span className="bg-white/10 backdrop-blur-md px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-[9px] sm:text-[10px] text-white font-mono uppercase tracking-widest border border-white/20 shadow-xl">
              {project.category || 'FILM'}
            </span>
          </div>

          <Link href={project.slug ? `/project/${project.slug}` : `/project/${encodeURIComponent(project.title)}`}>
            <h2 className="text-xl sm:text-3xl font-sans font-black text-white uppercase tracking-tighter leading-none mb-1 shadow-sm drop-shadow-md cursor-pointer hover:text-pink-400 transition-colors">
              {project.title}
            </h2>
          </Link>

          <h3 className="text-[10px] sm:text-[12px] font-mono font-bold text-zinc-300 uppercase tracking-widest shadow-sm drop-shadow-md mb-2 sm:mb-3">
            {project.client}
          </h3>

          {/* Description courte rétractable */}
          {project.description && (
            <div className={`mt-0 sm:mt-2 ${showMetadata ? '' : 'line-clamp-2'}`}>
                <p 
                  className="text-[10px] sm:text-xs font-sans text-white/70 font-medium cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); setShowMetadata(!showMetadata); }}
                >
                  {project.description}
                  {!showMetadata && <span className="text-white ml-2">...Plus</span>}
                </p>
            </div>
          )}
        </div>

        {/* Colonne Right : Actions Verticales type Tiktok */}
        <div className="flex flex-col items-center justify-end gap-3 sm:gap-6 pb-1 sm:pb-2">
           
           {/* Bouton Voir le projet (Bouton flotant Eye) */}
           <Link href={project.slug ? `/project/${project.slug}` : `/project/${encodeURIComponent(project.title)}`}>
              <button 
                className="w-9 h-9 sm:w-12 sm:h-12 bg-zinc-900/60 backdrop-blur border border-white/10 rounded-full flex items-center justify-center text-white focus:outline-none"
                title="Voir le projet dans son format complet"
              >
                  {/* Icône Oeil simple CSS ou Lucide si on importe (Plutôt un bouton "GO" minimaliste) */}
                  <span className="font-sans font-black text-[9px] sm:text-xs uppercase text-pink-500 tracking-tighter shadow-xl">GO</span>
              </button>
           </Link>

           {/* Bouton Mute */}
           <button 
             onClick={(e) => { e.stopPropagation(); toggleMute(); }}
             className="w-9 h-9 sm:w-12 sm:h-12 bg-zinc-900/60 backdrop-blur border border-white/10 rounded-full flex items-center justify-center text-white focus:outline-none focus:ring-2 focus:ring-white transition-transform active:scale-90"
           >
              {isMuted ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 sm:w-[20px] sm:h-[20px]">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <line x1="23" y1="9" x2="17" y2="15"></line>
                  <line x1="17" y1="9" x2="23" y2="15"></line>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-[20px] sm:h-[20px]">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                </svg>
              )}
           </button>
        </div>

      </div>

      {/* OVERLAY INDICATEUR PAUSE (Superposé au centre quand on met pause manuellement) */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <div className="w-20 h-20 bg-black/40 backdrop-blur flex items-center justify-center rounded-full pl-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white opacity-80">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </div>
        </div>
      )}

    </div>
  );
}

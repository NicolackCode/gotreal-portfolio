'use client'

import React, { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'

export default function HeroVideoBackground({ videoUrls }: { videoUrls: string[] }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [currentUrl, setCurrentUrl] = useState<string>('')
  const [isMuted, setIsMuted] = useState(true)
  const [volume, setVolume] = useState(1)
  
  // Historique des dernières vidéos pour éviter la répétition rapide
  const recentUrlsRef = useRef<string[]>([])

  useEffect(() => {
    // Restaurer l'état global du son si déjà défini
    const savedGlobalMuted = localStorage.getItem('gotreal_global_muted')
    if (savedGlobalMuted === 'false') {
      setIsMuted(false)
    }

    const savedGlobalVolume = localStorage.getItem('gotreal_global_volume')
    if (savedGlobalVolume !== null) {
      setVolume(parseFloat(savedGlobalVolume))
    }

    if (videoUrls && videoUrls.length > 0) {
       // Laisser le paramètre [0] en priorité absolue pour le prank ou l'ordre choisi au backend
       setCurrentUrl(videoUrls[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handleGlobalInteraction = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      
      // On ignore le bouton de mute lui-même
      if (target.closest('#mute-btn-hero')) return;
      
      // Si on clique sur un lien ou un autre bouton -> on active juste le son sans zapper
      const isButtonOrLink = target.closest('button') || target.closest('a');
      
      if (isButtonOrLink) {
         setIsMuted(false);
         localStorage.setItem('gotreal_global_muted', 'false');
         return;
      }

      // Si c'est un clic "dans le vide" :
      // 1. Zapping de la vidéo !
      if (videoUrls.length > 1) {
         setCurrentUrl(prev => {
             // 1. On retire l'historique des 5 (ou moins) dernières vidéos lues.
             let others = videoUrls.filter(url => url !== prev && !recentUrlsRef.current.includes(url));
             
             // 2. Si l'historique est trop strict et masque toutes les vidéos (ex: y'a que 4 vidéos dispos sur la BDD totale)
             // alors on fallback sur un mode d'anti-doublon simple qui cherche juste à zapper la boucle actuelle.
             if (others.length === 0) {
                 others = videoUrls.filter(url => url !== prev);
             }

             if (others.length === 0) return prev; // Anti-freeze final
             
             const randomIndex = Math.floor(Math.random() * others.length);
             const nextVid = others[randomIndex];

             // On sauvegarde le passif
             recentUrlsRef.current.push(nextVid);
             if (recentUrlsRef.current.length > 5) {
                // On retire les plus vieilles (first in, first out)
                recentUrlsRef.current.shift();
             }

             return nextVid;
         });
      }

      // 2. Le son s'allume automatiquement quand on commence à "jouer" avec l'écran (et reste allumé)
      setIsMuted(false);
      localStorage.setItem('gotreal_global_muted', 'false');
    }
    
    document.addEventListener('click', handleGlobalInteraction)
    document.addEventListener('touchstart', handleGlobalInteraction)
    
    return () => {
      document.removeEventListener('click', handleGlobalInteraction)
      document.removeEventListener('touchstart', handleGlobalInteraction)
    }
  }, [videoUrls])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !currentUrl) return

    let hls: Hls | null = null

    if (Hls.isSupported() && currentUrl.includes('.m3u8')) {
      hls = new Hls({ autoStartLoad: true, capLevelToPlayerSize: false, startPosition: 2 })
      hls.loadSource(currentUrl)
      hls.attachMedia(video)
      
      hls.on(Hls.Events.MANIFEST_PARSED, function () {
         video.play().catch(e => console.warn("Auto-play prevented", e))
      })
    } else {
      // Fallback for native Safari or generic MP4s
      // Bypass de l'Autoplay Policy
      video.playsInline = true
      
      video.src = currentUrl
      video.load()

      // Mécanisme de Retry en cas de blocage strict
      const playPromise = video.play()
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          console.warn("Auto-play prevented (first try). Retrying aggressively...", e)
          // Deuxième tentative forcée
          video.muted = true
          video.play().catch(e2 => console.error("Auto-play strictly blocked by browser", e2))
        })
      }
    }

    return () => {
      if (hls) {
        hls.destroy()
      }
    }
  }, [currentUrl])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.volume = volume;
    }
  }, [isMuted, volume])

  return (
    <>
      <video 
        ref={videoRef}
        autoPlay 
        loop 
        muted={isMuted}
        playsInline
        crossOrigin="anonymous"
        className="w-full h-full object-cover"
      />
      {/* Contrôle de Volume Moderne (Flottant bottom right) */}
      <div 
        id="mute-btn-hero"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-zinc-950/80 backdrop-blur-md border border-zinc-800/80 px-4 py-2.5 rounded-full shadow-2xl group transition-all"
        onPointerDownCapture={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={(e) => {
            e.stopPropagation()
            const nextMuted = !isMuted
            setIsMuted(nextMuted)
            localStorage.setItem('gotreal_global_muted', nextMuted ? 'true' : 'false')
          }}
          className="text-zinc-400 hover:text-white transition-colors"
        >
          {isMuted || volume === 0 ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
          )}
        </button>
        
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.01" 
          value={isMuted ? 0 : volume}
          onChange={(e) => {
             e.stopPropagation();
             const newVol = parseFloat(e.target.value);
             setVolume(newVol);
             localStorage.setItem('gotreal_global_volume', newVol.toString());
             if (newVol > 0 && isMuted) {
                setIsMuted(false);
                localStorage.setItem('gotreal_global_muted', 'false');
             } else if (newVol === 0 && !isMuted) {
                setIsMuted(true);
                localStorage.setItem('gotreal_global_muted', 'true');
             }
          }}
          className="w-24 h-1.5 rounded-full appearance-none cursor-pointer outline-none transition-all duration-300 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:transition-colors"
          style={{ background: `linear-gradient(to right, white ${(isMuted ? 0 : volume) * 100}%, #3f3f46 ${(isMuted ? 0 : volume) * 100}%)` }}
        />
      </div>
    </>
  )
}

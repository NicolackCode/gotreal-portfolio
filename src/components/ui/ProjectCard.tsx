import React, { useRef, useState, useEffect } from 'react'
import TransitionLink from '@/components/transition/TransitionLink'
import Hls from 'hls.js'
import { motion } from 'framer-motion'

interface Project {
  id: string;
  title: string;
  slug?: string;
  category: string;
  client?: string;
  main_video_url?: string;
  thumbnail_url?: string;
  rotation?: number;
}

export default function ProjectCard({ 
  project, 
  priorityLoad = false, 
  globalIsMuted = true,
  onFormatLoaded
}: { 
  project: Project, 
  priorityLoad?: boolean, 
  globalIsMuted?: boolean,
  onFormatLoaded?: (id: string, format: 'vertical' | 'horizontal') => void,
  spanData?: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLAnchorElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const hlsRef = useRef<Hls | null>(null)

  const isRotatedVertical = project.rotation === 90 || project.rotation === -90 || project.rotation === 270

  const handleLoadedMetadata = () => {
    if (videoRef.current && onFormatLoaded) {
       const vw = videoRef.current.videoWidth
       const vh = videoRef.current.videoHeight
       if (vw && vh) {
          let isVert = false;
          if (isRotatedVertical) {
             // Si la vidéo a été tournée post-prod de 90°, sa physique est inversée
             isVert = vw > vh; // une vidéo 1920x1080 (horiz) tournée à 90 devieent un 1080x1920 (vert)
          } else {
             isVert = vh > vw;
          }
          // On prévient le parent de la vraie forme validée par physique
          onFormatLoaded(project.id, isVert ? 'vertical' : 'horizontal');
       }
    }
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video || !project.main_video_url) return

    if (project.main_video_url.includes('.m3u8') && Hls.isSupported()) {
      const hls = new Hls({
        capLevelToPlayerSize: false,
        startLevel: 0 
      })
      hlsRef.current = hls
      
      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        // Limitation à 1080p maximum
        let bestLevel = -1;
        let maxRes = 0;
        data.levels.forEach((level, index) => {
          const res = Math.max(level.width, level.height);
          // On cherche la meilleure résolution, mais qui ne dépasse pas 1920 (pour du 1920x1080 ou 1080x1920)
          if (res <= 1920 && res > maxRes) {
            maxRes = res;
            bestLevel = index;
          }
        });
        if (bestLevel !== -1) {
          hls.autoLevelCapping = bestLevel;
        }
      });

      hls.loadSource(project.main_video_url)
      hls.attachMedia(video)
    } else {
      video.src = project.main_video_url
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [project.main_video_url])

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && videoRef.current) {
          // Si c'est du HLS, on peut se permettre de pré-jouer en muet dans la grille car c'est léger.
          // Si c'est un fichier MP4 brut, on interdit l'autoplay simultané pour éviter la saturation réseau,
          // on gardera seulement le Play au hover.
          if (project.main_video_url?.includes('.m3u8')) {
            videoRef.current.play().catch(() => {})
          }
        } else if (videoRef.current) {
          videoRef.current.pause()
        }
      })
    }, { threshold: 0.1, rootMargin: '100px' })

    const currentContainer = containerRef.current
    if (currentContainer) observer.observe(currentContainer)

    return () => {
       if (currentContainer) observer.unobserve(currentContainer)
    }
  }, [project.main_video_url])

  const handleMouseEnter = () => {
    setIsHovered(true)
    if (videoRef.current) {
      if (!globalIsMuted) {
        videoRef.current.muted = false
        videoRef.current.volume = 1
      }
      
      const playPromise = videoRef.current.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          if (videoRef.current) {
            videoRef.current.muted = true
            videoRef.current.play().catch(() => {})
          }
        })
      }
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    if (videoRef.current) {
      videoRef.current.muted = true
    }
  }

  return (
    <TransitionLink 
      href={project.slug ? `/project/${project.slug}` : `/project/${encodeURIComponent(project.title)}`}
      ref={containerRef}
      className={`block w-full h-full outline-none`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div 
        // Effet Eyecannndy : Le cadre scale légèrement et luit en rose au hover
        whileHover={{ scale: 1.03, zIndex: 10 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative w-full h-full overflow-hidden bg-zinc-950 rounded-2xl group shadow-[0_0_0_transparent] hover:shadow-[0_0_20px_rgba(236,72,153,0.35)]"
      >
        {project.main_video_url ? (
          <div 
            className="absolute inset-0 w-full h-full origin-center transition-transform duration-700 ease-out group-hover:scale-[1.05]"
            style={{
               '--rot': project.rotation ? `${project.rotation}deg` : '0deg',
               '--base-scl': isRotatedVertical ? '1.78' : '1',
               transform: `rotate(var(--rot)) scale(var(--base-scl))`,
            } as React.CSSProperties}
          >
            <video
              ref={videoRef}
              onLoadedMetadata={handleLoadedMetadata}
              loop
              muted
              playsInline
              poster={project.thumbnail_url}
              preload={priorityLoad ? "auto" : "metadata"}
              className="absolute inset-0 w-full h-full object-cover transform-gpu"
            />
          </div>
        ) : (
           <div className="w-full h-full flex items-center justify-center font-mono text-xs text-zinc-700 uppercase">
             Media Indisponible
           </div>
        )}
        
        {/* Assombrissement qui disparaît au passage (Focus on the video) - Reduit de 50% à 20-30% pour qu'on voit mieux les vidéos */}
        <div className={`absolute inset-0 bg-black/30 transition-opacity duration-300 pointer-events-none z-10 ${isHovered ? 'opacity-0' : 'opacity-100'}`} />

        {/* Détails textuels qui apparaissent au bottom-left */}
        <div className="absolute inset-0 p-4 sm:p-6 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 bg-gradient-to-t from-black/80 via-transparent pointer-events-none rounded-2xl">
          <h3 className={`text-white font-sans font-black uppercase tracking-tighter leading-none mb-1 shadow-sm drop-shadow-md text-xl sm:text-3xl`}>
            {project.title}
          </h3>
          <p className="text-pink-400 text-[10px] sm:text-xs font-mono uppercase tracking-widest shadow-sm drop-shadow-sm font-bold">
            {project.client || project.category} {project.category && project.client && project.category !== project.client ? `• ${project.category}` : ''}
          </p>
        </div>
        
        {/* Bordure subtile au hover faon Neon */}
        <div className="absolute inset-0 border-2 border-transparent group-hover:border-pink-500/50 rounded-2xl transition-colors duration-300 pointer-events-none z-30" />
      </motion.div>
    </TransitionLink>
  )
}

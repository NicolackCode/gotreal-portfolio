import React, { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import Hls from 'hls.js'

interface Project {
  id: string;
  title: string;
  slug?: string;
  client: string;
  main_video_url?: string;
  rotation?: number;
}

export default function ProjectCard({ project, priorityLoad = false, globalIsMuted = true }: { project: Project, priorityLoad?: boolean, globalIsMuted?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLAnchorElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const hlsRef = useRef<Hls | null>(null)

  // Initialisation de la source vidéo (MP4 ou HLS)
  useEffect(() => {
    const video = videoRef.current
    if (!video || !project.main_video_url) return

    if (project.main_video_url.includes('.m3u8') && Hls.isSupported()) {
      const hls = new Hls({
        capLevelToPlayerSize: false, // DANGEROUS on vertical videos: Forces incorrect aspect ratio cropping based on wrapper!
        startLevel: 0 // Force la plus basse qualité au démarrage pour économiser la bande passante
      })
      hlsRef.current = hls
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

  // Intersection Observer pour ne jouer la vidéo que si elle est visible à l'écran (opti de perf vitale)
  useEffect(() => {
    // La priorité absolue est de ne jamais écouter "isHovered" sinon
    // l'Observer se détache puis se réattache, forçant un appel .play()
    // unmuted que Google Chrome bloque et jette ! Le bug venait de là !
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && videoRef.current) {
          // Si on est visible, on fait tourner la vidéo. Si elle est muette (par défaut), ça passe.
          videoRef.current.play().catch(() => {})
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
  }, []) // AUCUNE dépendance.

  // Gestion du SURVOL de souris = Tente d'UNMUTE le son
  const handleMouseEnter = () => {
    setIsHovered(true)
    if (videoRef.current) {
      // On tente d'activer le son uniquement si l'utilisateur a autorisé l'audio globalement
      if (!globalIsMuted) {
        videoRef.current.muted = false
        videoRef.current.volume = 1
      }
      
      // On relance explicitement le play() car le navigateur met la vidéo en pause
      // s'il refuse l'activation du son (Politique Autoplay : "User didn't interact")
      const playPromise = videoRef.current.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Si le navigateur bloque le son, on coupe le son pour au moins garder l'image animée !
          if (videoRef.current) {
            videoRef.current.muted = true
            videoRef.current.play().catch(() => {}) // relance silencieuse
          }
        })
      }
    }
  }

  // Fin du survol = REMUTE le son
  const handleMouseLeave = () => {
    setIsHovered(false)
    if (videoRef.current) {
      videoRef.current.muted = true
    }
  }

  // Astuce Bento: transféré au parent (MasonryGrid)
  return (
    <Link 
      href={project.slug ? `/project/${project.slug}` : `/project/${encodeURIComponent(project.title)}`}
      ref={containerRef}
      className={`group relative block w-full h-full overflow-hidden bg-black border border-zinc-900 cursor-pointer`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
        {project.main_video_url ? (
          <div className="absolute inset-0 overflow-hidden">
            <video
              ref={videoRef}
              loop
              muted // Strictement muet à l'initialisation pour le navigateur
              playsInline
              preload={priorityLoad ? "auto" : "metadata"}
              style={{
                 '--rot': project.rotation ? `${project.rotation}deg` : '0deg',
                 '--base-scl': (project.rotation === 90 || project.rotation === -90) ? '1.35' : '1',
                 '--hover-scl': (project.rotation === 90 || project.rotation === -90) ? '1.40' : '1.05',
                 transform: `rotate(var(--rot)) scale(var(--base-scl))`,
              } as React.CSSProperties}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 ease-[cubic-bezier(0.19,1,0.22,1)] hover:z-10 group-hover:[transform:rotate(var(--rot))_scale(var(--hover-scl))]"
            />
          </div>
        ) : (
           <div className="w-full h-full min-h-[250px] bg-zinc-900 flex items-center justify-center font-mono text-xs text-zinc-700 uppercase">
             Media Indisponible
           </div>
        )}
        
        {/* Assombrissement par défaut */}
        <div className={`absolute inset-0 bg-black/40 transition-opacity duration-500 pointer-events-none ${isHovered ? 'opacity-0' : 'opacity-100'}`} />
      </div>

      {/* Titres Brutalist */}
      <div className="absolute inset-0 p-6 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-none z-10 bg-black/60 pointer-events-none">
        <h3 className="text-white text-2xl sm:text-4xl font-sans font-black uppercase tracking-tighter leading-none mb-2">
          {project.title}
        </h3>
        <p className="text-zinc-400 text-xs sm:text-sm font-mono uppercase tracking-[0.2em]">
          {project.client}
        </p>
      </div>
    </Link>
  )
}

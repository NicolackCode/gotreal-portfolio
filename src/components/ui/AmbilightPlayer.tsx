'use client'

import { useState, useEffect, useRef } from 'react'

type Project = {
  id: string
  title: string
  client: string
  video_url: string
}

export default function AmbilightPlayer({ projects }: { projects: Project[] }) {
  const [currentIndex, setCurrentIndex] = useState(0) // Variable réactivée pour naviguer entre Main Video et Carrousel
  const mode = 2; // Force mode Hardcore nativement pour toutes les vidéos
  const [isMuted, setIsMuted] = useState(true)
  const [isPlaying, setIsPlaying] = useState(true)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const displayCanvasRef = useRef<HTMLCanvasElement>(null)
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafId = useRef<number | null>(null)

  // ---- CINEMATIC BARS REFS ----
  const cinematicStateRef = useRef<number>(1) // 1 = Fermé (barres visibles), 0 = Ouvert (barres cachées)
  const energySustainRef = useRef<number>(0)  // Jauge de maintien de la violence

  // ---- AUDIO API REFS ----
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)

  const currentProject = projects[currentIndex] || null

  // ---- AMBILIGHT LOGIC PORTED FROM V1 ----
  useEffect(() => {
    if (!videoRef.current || !displayCanvasRef.current) return

    const video = videoRef.current
    const canvas = displayCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Setup sample canvas
    // Résolution augmentée pour éviter l'effet "pixelisé degueux" sur le Blur CSS
    const SAMPLE_W = 192
    const SAMPLE_H = 108
    if (!sampleCanvasRef.current) {
      const sCanvas = document.createElement('canvas')
      sCanvas.width = SAMPLE_W
      sCanvas.height = SAMPLE_H
      sampleCanvasRef.current = sCanvas
    }
    const sampleCtx = sampleCanvasRef.current.getContext('2d', { willReadFrequently: true })
    if (!sampleCtx) return

    let frameCount = 0
    const startTime = performance.now()

    const rgba = ([r, g, b]: number[], a: number) => `rgba(${r},${g},${b},${a})`

    const sampleZone = (x: number, y: number, w: number, h: number) => {
      const sx = Math.floor(x * SAMPLE_W), sy = Math.floor(y * SAMPLE_H)
      const sw = Math.max(1, Math.floor(w * SAMPLE_W)), sh = Math.max(1, Math.floor(h * SAMPLE_H))
      const d = sampleCtx.getImageData(sx, sy, sw, sh).data
      let r = 0, g = 0, b = 0, n = 0
      for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++ }
      return n ? [r / n | 0, g / n | 0, b / n | 0] : [0, 0, 0]
    }

    const drawChillV3 = (W: number, H: number, audioData: Uint8Array | null) => {
      // Calcul du volume global (RMS rudimentaire)
      let volume = 0;
      if (audioData) {
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) sum += audioData[i];
        volume = sum / audioData.length; // 0 à 255
      }
      
      const col = sampleZone(0.1, 0.1, 0.8, 0.8) // dominant
      ctx.globalCompositeOperation = 'lighter'
      
      // Le rayon et l'opacité pulsent doucement avec le volume global
      const baseRadius = W * 0.4
      const pulseRadius = baseRadius + (volume / 255) * (W * 0.2)
      
      const g = ctx.createRadialGradient(W / 2, H / 2, W * 0.1, W / 2, H / 2, pulseRadius)
      g.addColorStop(0, rgba(col, 0.9 + (volume / 255) * 0.1))
      g.addColorStop(1, rgba(col, 0))
      
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
      ctx.globalCompositeOperation = 'source-over'
    }

    const drawKineticV3 = (W: number, H: number, t: number, audioData: Uint8Array | null) => {
      ctx.globalCompositeOperation = 'screen'
      // Sépare les médiums (voix, synthés env indices 5 à 15 sur 64)
      let midPower = 0;
      if (audioData) {
        let sum = 0;
        for (let i = 5; i < 20; i++) sum += audioData[i];
        midPower = sum / 15; // 0-255
      }

      for (let i = 0; i < 3; i++) {
        const phase = (i / 3) * Math.PI * 2 + (t * 0.5)
        const col = sampleZone(0.2 + i * 0.3, 0.2 + i * 0.3, 0.2, 0.2)
        
        // Mouvement élargit par les mediums
        const radiusExp = 0.3 + (midPower / 255) * 0.4
        const px = W / 2 + Math.cos(phase) * (W * radiusExp)
        const py = H / 2 + Math.sin(phase * 1.5) * (H * radiusExp)
        
        const r = W * 0.5 + (midPower / 255) * (W * 0.2)
        const g = ctx.createRadialGradient(px, py, 0, px, py, r)
        g.addColorStop(0, rgba(col, 0.8))
        g.addColorStop(0.5, rgba(col, 0.3))
        g.addColorStop(1, rgba(col, 0))
        ctx.fillStyle = g
        ctx.fillRect(0, 0, W, H)
      }
      ctx.globalCompositeOperation = 'source-over'
    }

    // ====== ARCHITECTURE V6 : RENDU SIMPLE ======
    // Fond Ambiant réactif au son, sans effets par-dessus.
    const drawHardcoreFinal = (ctx: CanvasRenderingContext2D, W: number, H: number, audioData: Uint8Array | null) => {
      let kickPower = 0;
      if (audioData) {
        let sum = 0;
        for (let i = 0; i <= 5; i++) sum += audioData[i];
        kickPower = sum / 6; 
      }

      // ---- COUCHE Z-0 : FOND AMBIANT (ctx) ----
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 0.2 + (kickPower / 255) * 0.5 
      if (sampleCanvasRef.current) {
        ctx.drawImage(sampleCanvasRef.current, 0, 0, W, H)
        if (kickPower > 200) {
           const shift = (kickPower - 200) * 0.8
           ctx.globalAlpha = 0.5
           ctx.globalCompositeOperation = 'screen' 
           ctx.drawImage(sampleCanvasRef.current, shift, 0, W, H) 
           ctx.drawImage(sampleCanvasRef.current, -shift, 0, W, H)
        }
      }
      ctx.globalAlpha = 1.0

      // ---- MACHINE A ETATS : LETTERBOX DYNAMIQUE ----
      // Jauge d'énergie (ne réagit qu'aux explosions sonores extrêmes)
      if (kickPower > 220) { // Seuil énorme, nécessite une basse ou un bruit assourdissant
        energySustainRef.current = Math.min(1.0, energySustainRef.current + 0.05); // On remplit la jauge
      } else {
        energySustainRef.current = Math.max(0.0, energySustainRef.current - 0.01); // On la vide doucement
      }

      // Il faut une jauge quasi-pleine (maintien de l'explosion) pour commencer à ouvrir les bandes
      const targetState = energySustainRef.current > 0.8 ? 0.0 : 1.0;
      
      // Interpolation TRÈS FLUIDE (Lerp) pour un mouvement smooth de la disparition/réapparition
      cinematicStateRef.current += (targetState - cinematicStateRef.current) * 0.01;

      // Effet Cinématique : Bandes noires qui glissent hors de l'écran (Translation Y)
      const barHeight = Math.floor(H * 0.12);
      const barOffset = barHeight * (1.0 - cinematicStateRef.current);

      ctx.fillStyle = '#000000';
      // Bande du Haut
      ctx.fillRect(0, -barOffset, W, barHeight);
      // Bande du Bas
      ctx.fillRect(0, H - barHeight + barOffset, W, barHeight);
    }

    const draw = () => {
      const W = canvas.width = window.innerWidth
      const H = canvas.height = window.innerHeight
      const t = (performance.now() - startTime) / 1000

      ctx.clearRect(0, 0, W, H)
      try {
        sampleCtx.drawImage(video, 0, 0, SAMPLE_W, SAMPLE_H)
      } catch { return }

      // Get Audio Data si existant
      if (analyserRef.current && dataArrayRef.current) {
         // @ts-expect-error Typescript ArrayBuffer mismatch with Uint8Array strict cast
         analyserRef.current.getByteFrequencyData(new Uint8Array(dataArrayRef.current.buffer))
      }

      if (mode === 0) drawChillV3(W, H, dataArrayRef.current)
      else if (mode === 1) drawKineticV3(W, H, t, dataArrayRef.current)
      else if (mode === 2) drawHardcoreFinal(ctx, W, H, dataArrayRef.current)
    }

    const loop = () => {
      rafId.current = requestAnimationFrame(loop)
      if (video.paused || video.readyState < 2) return
      frameCount++
      const throttle = mode === 1 ? 1 : 3
      if (frameCount % throttle !== 0) return
      draw()
    }

    loop()

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current)
    }
  }, [mode]) 
  // removed currentIndex from deps as we disabled the slider functionality for standalone pages

  // ---- STATE TEMPS ET PROGRESSION ----
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // ---- IDLE TIMER ----
  const [isIdle, setIsIdle] = useState(false)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const resetIdleTimer = () => {
      setIsIdle(false)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => {
        setIsIdle(true)
      }, 4000)
    }

    // Lancer au démarrage
    resetIdleTimer()

    window.addEventListener('mousemove', resetIdleTimer)
    window.addEventListener('mousedown', resetIdleTimer)
    window.addEventListener('keydown', resetIdleTimer)
    window.addEventListener('touchstart', resetIdleTimer)

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      window.removeEventListener('mousemove', resetIdleTimer)
      window.removeEventListener('mousedown', resetIdleTimer)
      window.removeEventListener('keydown', resetIdleTimer)
      window.removeEventListener('touchstart', resetIdleTimer)
      document.body.classList.remove('video-idle')
    }
  }, [])

  useEffect(() => {
    if (isIdle) {
      document.body.classList.add('video-idle')
    } else {
      document.body.classList.remove('video-idle')
    }
  }, [isIdle])

  // Ecouteurs sur la vidéo
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handleLoadedMetadata = () => setDuration(video.duration)
    
    // Si la vidéo est déjà chargée dans le cache, forcer l'init pour éviter le bug de la progress bar
    if (video.readyState >= 1) {
      setDuration(video.duration)
      setCurrentTime(video.currentTime)
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [currentIndex]) // Se ré-attache si la vidéo change

  const gainNodeRef = useRef<GainNode | null>(null)

  // ---- AUDIO INIT & CONTROLS ----
  const initAudio = () => {
    if (!videoRef.current || audioCtxRef.current) return;
    try {
      // Create context (requires user interaction, exactly what togglePlay provides)
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128; // Small fftSize = 64 frequency bins, perfect for our kicks/mids extraction
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

      const gainNode = ctx.createGain();
      gainNodeRef.current = gainNode;
      // Initialize with volume mapped to state (0 if isMuted, else 1)
      gainNode.gain.value = isMuted ? 0 : volume;

      // On force la vidéo source à volume 100% pour l'analyse !
      videoRef.current.muted = false; // Unmute nativement
      videoRef.current.volume = 1.0;  // 100% level

      // Create source ONLY ONCE to avoid "already connected" exceptions
      const source = ctx.createMediaElementSource(videoRef.current);
      sourceRef.current = source;
      
      source.connect(analyser);
      analyser.connect(gainNode);
      gainNode.connect(ctx.destination);
    } catch (err) {
      console.warn("AudioContext setup failed:", err);
    }
  }

  // Hook global pour initialiser l'audio à la moindre interaction (plus besoin de Play/Mute manuels pour démarrer l'analyse)
  useEffect(() => {
    const startAudioContext = () => {
      initAudio();
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      // Detach listeners immediately after execution
      window.removeEventListener('click', startAudioContext);
      window.removeEventListener('touchstart', startAudioContext);
      window.removeEventListener('keydown', startAudioContext);
    };

    window.addEventListener('click', startAudioContext);
    window.addEventListener('touchstart', startAudioContext);
    window.addEventListener('keydown', startAudioContext);

    return () => {
      window.removeEventListener('click', startAudioContext);
      window.removeEventListener('touchstart', startAudioContext);
      window.removeEventListener('keydown', startAudioContext);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const togglePlay = () => {
    initAudio() // Initialization at first click
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause()
      else videoRef.current.play()
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = () => {
    initAudio() // Initialization at first click if not done
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    
    // We handle the actual hearing volume via GainNode while keeping the video playing at 100% volume natively for good analysis
    if (videoRef.current) {
      // Ensure native player is unmuted so WebAudio receives the massive signal
      videoRef.current.muted = false;
      videoRef.current.volume = 1.0;
      
      const nextMuted = !isMuted;
      setIsMuted(nextMuted);

      if (gainNodeRef.current) {
         if (nextMuted) {
            gainNodeRef.current.gain.value = 0;
         } else {
            const nextVol = volume === 0 ? 1 : volume;
            setVolume(nextVol);
            gainNodeRef.current.gain.value = nextVol;
         }
      }
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current || !duration) return
    const newTime = (parseFloat(e.target.value) / 100) * duration
    videoRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      const container = document.getElementById('ambilight-fullscreen-container')
      if (container) {
        container.requestFullscreen().catch((err) => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
        setIsFullscreen(true)
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false)
    }
  }

  // Effect to listen to ESC key exiting fullscreen natively
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Format mm:ss
  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00"
    const m = Math.floor(time / 60).toString().padStart(2, '0')
    const s = Math.floor(time % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentIndex((prev) => (prev + 1) % projects.length)
  }
  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentIndex((prev) => (prev - 1 + projects.length) % projects.length)
  }

  const progressPercent = duration ? (currentTime / duration) * 100 : 0

  if (!projects.length) {
    return <div className="flex items-center justify-center w-full h-screen text-zinc-500">Aucun projet trouvé.</div>
  }

  return (
    <div className="relative w-full h-screen flex items-center justify-center overflow-hidden bg-black group" id="ambilight-fullscreen-container">
      
      {/* Z-0 : Ambilight Canvas Background (Flou Environnemental) */}
      <canvas 
        ref={displayCanvasRef} 
        id="ambilight-canvas"
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
        style={{ 
          filter: mode === 0 ? 'blur(40px) brightness(1.2)' 
                : mode === 1 ? 'blur(20px) brightness(1.2)' 
                : 'blur(60px) brightness(0.6) saturate(1.5)',
          transition: 'filter 1s ease-in-out'
        }} 
      />



      {/* Flèches de Navigation Intra-Lecteur (Si plusieurs vidéos) */}
      {projects.length > 1 && (
        <>
          {/* Flèche Gauche */}
          <button 
            onClick={handlePrev}
            className={`absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-40 text-white/80 hover:text-white drop-shadow-lg transition-all p-4 hidden md:block duration-500 ${isIdle ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'}`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="square">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          {/* Flèche Droite */}
          <button 
            onClick={handleNext}
            className={`absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-40 text-white/80 hover:text-white drop-shadow-lg transition-all p-4 hidden md:block duration-500 ${isIdle ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'}`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="square">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </>
      )}

      {/* Main Video (100% Opacité) */}
      <div 
        className={`relative z-10 w-full h-full flex flex-col justify-center items-center cursor-pointer select-none transition-all duration-700 ${isFullscreen ? 'p-0' : 'pt-32 pb-32 px-12 md:px-24 md:pt-40 md:pb-36'}`}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
      >
        <video 
          ref={videoRef}
          src={currentProject?.video_url}
          className="max-h-full max-w-full object-contain shadow-2xl transition-all duration-700 ease-in-out"
          autoPlay
          loop
          muted={true} // Obligé pour l'autoplay, mais déverrouillé silencieusement par le WebAudio
          playsInline
          crossOrigin="anonymous" 
        />
      </div>

      {/* Titre Absolu Premium centré au dessus (Optionnel, ou caché pour l'épure V1) */}
      <div className={`absolute top-12 left-1/2 -translate-x-1/2 z-20 pointer-events-none mix-blend-difference hidden md:block transition-opacity duration-500 ${isIdle ? 'opacity-0' : 'opacity-80 group-hover:opacity-100'}`}>
        <div className="flex flex-col items-center">
          <h2 className="text-sm font-sans uppercase tracking-[0.5em] text-white">
            {currentProject?.title}
          </h2>
          {projects.length > 1 && (
            <span className="text-[10px] font-mono text-zinc-500 mt-2 tracking-widest">
               {currentIndex + 1} / {projects.length}
            </span>
          )}
        </div>
      </div>

      {/* BARRE DE CONTROL V1 EXACT REPLICA */}
      <div className={`absolute bottom-8 md:bottom-12 left-0 w-full px-6 lg:px-16 z-30 transition-opacity duration-500 ${isIdle ? 'opacity-0 pointer-events-none' : 'opacity-100 xl:opacity-0 group-hover:opacity-100'}`}>
        <div className="flex flex-col gap-4">
          
          {/* Progress Bar interactive draggable */}
          <div className="w-full relative flex items-center h-2 group/progress">
            <input 
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={progressPercent}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            {/* Base Bar */}
            <div className="w-full h-[2px] bg-white/20 pointer-events-none group-hover/progress:h-1 transition-all" />
            {/* Fill Bar */}
            <div 
              className="absolute left-0 h-[2px] bg-cyan-400 pointer-events-none group-hover/progress:h-1 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Contrôles textes Monospace espacés */}
          <div className="flex justify-between items-center w-full font-mono text-[10px] md:text-xs tracking-widest text-zinc-300">
             
             {/* Left: LECTURE 00:00 / 00:00 */}
             <div className="flex items-center gap-6">
                <button 
                  onClick={togglePlay} 
                  className="hover:text-white transition-colors uppercase font-bold"
                >
                  {isPlaying ? 'PAUSE' : 'LECTURE'}
                </button>
                <div className="tabular-nums hidden sm:block">
                  <span className="text-white font-bold">{formatTime(currentTime)}</span> 
                  <span className="opacity-50 mx-1">/</span> 
                  <span className="opacity-50">{formatTime(duration)}</span>
                </div>
             </div>

             {/* Center (Mobile Only) Navigation Arrows */}
             {projects.length > 1 && (
                <div className="flex items-center gap-4 md:hidden">
                  <button onClick={handlePrev} className="px-2 hover:text-white">{'<'}</button>
                  <span className="text-zinc-500">{currentIndex + 1}/{projects.length}</span>
                  <button onClick={handleNext} className="px-2 hover:text-white">{'>'}</button>
                </div>
             )}

             {/* Right: SOUND OFF, PLEIN ECRAN, AMBILIGHT */}
             <div className="flex items-center gap-6 md:gap-10 uppercase font-bold">
                
                {/* Volume Control Group */}
                <div className="flex items-center gap-2 group/volume">
                  <button 
                    onClick={toggleMute} 
                    className="hover:text-white transition-colors"
                  >
                    <span className="hidden sm:inline">SOUND </span>
                    <span className="sm:hidden">VOL </span>
                    {isMuted ? 'OFF' : 'ON'}
                  </button>
                  <div className="w-0 overflow-hidden group-hover/volume:w-16 transition-all duration-300 flex items-center">
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.01" 
                      value={isMuted ? 0 : volume}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value)
                        setVolume(val)
                        const shouldMute = val === 0
                        setIsMuted(shouldMute)
                        
                        // ONLY update WebAudio gain, never the actual video file volume
                        if (gainNodeRef.current) {
                           gainNodeRef.current.gain.value = val;
                        }
                        if (videoRef.current) {
                           videoRef.current.muted = false; // Ensure raw output is alive
                           videoRef.current.volume = 1.0; 
                        }
                      }}
                      className="w-16 h-[4px] bg-zinc-700 appearance-none cursor-pointer outline-none accent-white"
                      style={{
                        background: `linear-gradient(to right, #fff ${(isMuted ? 0 : volume) * 100}%, #3f3f46 ${(isMuted ? 0 : volume) * 100}%)`,
                      }}
                    />
                  </div>
                </div>
                
                {/* Bouton Plein Écran déplacé à l'extrême droite */}
                <button 
                  onClick={toggleFullscreen} 
                  className="hover:text-white transition-colors hidden sm:block"
                >
                  PLEIN ÉCRAN
                </button>
             </div>
          </div>

        </div>
      </div>

    </div>
  )
}

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { gsap } from 'gsap'

type Project = {
  id: string
  title: string
  client: string
  video_url: string
}

export default function AmbilightPlayer({ projects }: { projects: Project[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [mode, setMode] = useState<number>(0)
  const [isMuted, setIsMuted] = useState(true)
  const [isPlaying, setIsPlaying] = useState(true)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const displayCanvasRef = useRef<HTMLCanvasElement>(null)
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null)
  
  const rafId = useRef<number | null>(null)

  const currentProject = projects[currentIndex] || null

  // ---- AMBILIGHT LOGIC PORTED FROM V1 ----
  useEffect(() => {
    if (!videoRef.current || !displayCanvasRef.current) return

    const video = videoRef.current
    const canvas = displayCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Setup sample canvas
    const SAMPLE_W = 24
    const SAMPLE_H = 14
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

    const drawHalo = (W: number, H: number) => {
      const col = sampleZone(0.1, 0.1, 0.8, 0.8) // dominant
      ctx.globalCompositeOperation = 'lighter'
      const g = ctx.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.8)
      g.addColorStop(0, rgba(col, 0.9))
      g.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
      ctx.globalCompositeOperation = 'source-over'
    }

    const drawFlux = (W: number, H: number, t: number) => {
      ctx.globalCompositeOperation = 'screen'
      for (let i = 0; i < 3; i++) {
        const phase = (i / 3) * Math.PI * 2 + (t * 0.5)
        const col = sampleZone(0.3 + i * 0.2, 0.5, 0.2, 0.2)
        const px = W / 2 + Math.cos(phase) * (W * 0.4)
        const py = H / 2 + Math.sin(phase * 1.5) * (H * 0.4)
        const r = W * 0.6
        const g = ctx.createRadialGradient(px, py, 0, px, py, r)
        g.addColorStop(0, rgba(col, 0.8))
        g.addColorStop(0.5, rgba(col, 0.3))
        g.addColorStop(1, rgba(col, 0))
        ctx.fillStyle = g
        ctx.fillRect(0, 0, W, H)
      }
      ctx.globalCompositeOperation = 'source-over'
    }

    const drawNeon = (W: number, H: number, t: number) => {
      const d = sampleCtx.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data
      const pts = []
      for (let j = 0; j < SAMPLE_H; j++) {
        for (let i = 0; i < SAMPLE_W; i++) {
          const idx = (j * SAMPLE_W + i) * 4
          const r = d[idx], g = d[idx + 1], b = d[idx + 2]
          const lum = 0.299 * r + 0.587 * g + 0.114 * b
          const sat = Math.max(r, g, b) - Math.min(r, g, b)
          const score = lum * 0.6 + sat * 0.8
          if (score > 80) pts.push({ x: i / SAMPLE_W, y: j / SAMPLE_H, r, g, b, score })
        }
      }
      pts.sort((a, b) => b.score - a.score)
      const hotspots = pts.slice(0, 5)

      ctx.globalCompositeOperation = 'lighter'
      for (const pt of hotspots) {
        const sx = pt.x * W, sy = pt.y * H
        const pulse = 0.5 + 0.5 * Math.sin(t * 15 + pt.x * 20)
        const alpha = (pt.score / 255) * pulse
        const col = [pt.r, pt.g, pt.b]
        const coreCol = [Math.min(255, pt.r + 150), Math.min(255, pt.g + 150), Math.min(255, pt.b + 150)]
        const targets = [[0, sy], [W, sy], [sx, 0], [sx, H]]

        for (const [tx, ty] of targets) {
          const gOuter = ctx.createLinearGradient(sx, sy, tx, ty)
          gOuter.addColorStop(0, rgba(col, alpha * 0.3)); gOuter.addColorStop(1, rgba(col, 0))
          ctx.strokeStyle = gOuter; ctx.lineWidth = 15 + pulse * 10; ctx.lineCap = 'round'
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty); ctx.stroke()

          const gMid = ctx.createLinearGradient(sx, sy, tx, ty)
          gMid.addColorStop(0, rgba(col, alpha * 0.7)); gMid.addColorStop(1, rgba(col, 0))
          ctx.strokeStyle = gMid; ctx.lineWidth = 6 + pulse * 4
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty); ctx.stroke()

          const gCore = ctx.createLinearGradient(sx, sy, tx, ty)
          gCore.addColorStop(0, rgba(coreCol, alpha)); gCore.addColorStop(0.7, rgba(col, 0))
          ctx.strokeStyle = gCore; ctx.lineWidth = 2
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty); ctx.stroke()
        }
      }
      ctx.globalCompositeOperation = 'source-over'
    }

    const draw = () => {
      const W = canvas.width = window.innerWidth
      const H = canvas.height = window.innerHeight
      const t = (performance.now() - startTime) / 1000

      ctx.clearRect(0, 0, W, H)
      try {
        sampleCtx.drawImage(video, 0, 0, SAMPLE_W, SAMPLE_H)
      } catch (e) { return }

      if (mode === 0) drawHalo(W, H)
      else if (mode === 1) drawFlux(W, H, t)
      else if (mode === 2) drawNeon(W, H, t)
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
  }, [mode, currentIndex]) 
  // currentIndex in deps to re-trigger if video changes (tho the ref remains same, it forces a fresh loop context if needed)

  // ---- CONTROLS ----
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause()
      else videoRef.current.play()
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleNext = () => setCurrentIndex((prev) => (prev + 1) % projects.length)
  const handlePrev = () => setCurrentIndex((prev) => (prev - 1 + projects.length) % projects.length)

  if (!projects.length) {
    return <div className="flex items-center justify-center w-full h-screen text-zinc-500">Aucun projet trouvé.</div>
  }

  return (
    <div className="relative w-full h-screen flex items-center justify-center overflow-hidden bg-black">
      
      {/* Ambilight Canvas Background */}
      <canvas 
        ref={displayCanvasRef} 
        id="ambilight-canvas"
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
        style={{ filter: 'blur(30px) brightness(1.2)' }} // Adding CSS blur to boost the effect safely
      />

      {/* Main Video */}
      <div className="relative z-10 w-full max-w-[80vw] mx-auto aspect-video cursor-pointer select-none" onClick={handleNext}>
        <video 
          ref={videoRef}
          src={currentProject?.video_url}
          className="w-full h-full object-cover rounded-sm shadow-2xl transition-all duration-700 ease-in-out"
          autoPlay
          loop
          muted={isMuted}
          playsInline
          crossOrigin="anonymous" // Very important for getting image data on Canvas
        />
      </div>

      {/* Bottom CielRose Timeline / Controls */}
      <div className="absolute bottom-0 left-0 w-full p-6 lg:p-10 z-20 flex flex-col gap-4">
        
        {/* Ambilight Toggles & Controls */}
        <div className="flex justify-between items-end w-full">
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl md:text-5xl font-sans font-bold uppercase tracking-tighter text-white mix-blend-difference">
              {currentProject?.title}
            </h2>
            <p className="text-sm font-mono text-zinc-400 uppercase tracking-widest">{currentProject?.client}</p>
          </div>

          <div className="flex items-center gap-6 font-mono text-[10px] sm:text-xs">
            {/* Ambilight modes */}
            <div className="flex items-center gap-3 border border-zinc-800 p-2 bg-black/50 backdrop-blur-md">
              <span className="text-zinc-500 uppercase">Ambilight:</span>
              <button onClick={() => setMode(0)} className={`${mode === 0 ? 'text-white font-bold' : 'text-zinc-600 hover:text-zinc-400'}`}>HALO</button>
              <button onClick={() => setMode(1)} className={`${mode === 1 ? 'text-white font-bold' : 'text-zinc-600 hover:text-zinc-400'}`}>FLUX</button>
              <button onClick={() => setMode(2)} className={`${mode === 2 ? 'text-white font-bold' : 'text-zinc-600 hover:text-zinc-400'}`}>NÉON</button>
            </div>

            {/* Video Controls */}
            <div className="flex gap-4">
               <button onClick={toggleMute} className="hover:text-zinc-400 transition-colors uppercase">
                 SON: {isMuted ? 'OFF' : 'ON'}
               </button>
               <button onClick={togglePlay} className="hover:text-zinc-400 transition-colors uppercase">
                 {isPlaying ? 'PAUSE' : 'PLAY'}
               </button>
            </div>
          </div>
        </div>

        {/* Timeline Slider CielRose replica */}
        <div className="w-full flex items-center mt-4 border-t border-zinc-800/50 pt-4">
          <div className="flex overflow-x-auto no-scrollbar gap-8 w-full text-xs font-mono text-zinc-600">
            {projects.map((proj, idx) => (
              <button 
                key={proj.id} 
                onClick={() => setCurrentIndex(idx)}
                className={`flex-shrink-0 transition-colors hover:text-white ${idx === currentIndex ? 'text-white font-bold' : ''}`}
              >
                {(idx + 1).toString().padStart(2, '0')}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

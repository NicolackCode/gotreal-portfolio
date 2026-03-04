'use client'

import { useEffect, useState, useRef } from 'react'
import { gsap } from 'gsap'

export default function InitialLoader() {
  const [shouldShow, setShouldShow] = useState(true)
  const loaderRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLHeadingElement>(null)
  
  useEffect(() => {
    // Vérifier si c'est la première visite de la session
    const hasPlayed = sessionStorage.getItem('gotreal_intro_played')
    
    if (hasPlayed) {
      setShouldShow(false)
      return
    }

    if (!loaderRef.current || !textRef.current) return

    // Empêcher le scroll le temps de l'animation
    document.body.style.overflow = 'hidden'

    const tl = gsap.timeline({
      onComplete: () => {
        sessionStorage.setItem('gotreal_intro_played', 'true')
        setShouldShow(false)
        document.body.style.overflow = '' // Restaurer le scroll
      }
    })

    // Animation Brutaliste "Monolithe"
    tl.to(textRef.current, {
      opacity: 1,
      duration: 1,
      ease: "power2.out"
    })
    .to(textRef.current, {
      scale: 1.05,
      duration: 1.5,
      ease: "power1.inOut"
    }, "-=0.5")
    .to(textRef.current, {
      opacity: 0,
      filter: "blur(10px)",
      duration: 0.8,
      ease: "power2.in"
    })
    .to(loaderRef.current, {
      yPercent: -100, // Le bloc monte brutalement comme un store
      duration: 1,
      ease: "expo.inOut"
    }, "-=0.4")

    return () => {
      tl.kill()
      document.body.style.overflow = ''
    }
  }, [])

  if (!shouldShow) return null

  return (
    <div 
      ref={loaderRef}
      className="fixed inset-0 z-[999] bg-black flex flex-col items-center justify-center pointer-events-auto"
    >
      <h1 
        ref={textRef}
        className="text-[15vw] md:text-[12vw] font-sans font-black text-white uppercase tracking-tighter leading-none opacity-0"
      >
        GOTREAL
      </h1>
      <div className="absolute bottom-12 font-mono text-xs uppercase tracking-[0.4em] text-zinc-600 opacity-50 animate-pulse">
        Chargement...
      </div>
    </div>
  )
}

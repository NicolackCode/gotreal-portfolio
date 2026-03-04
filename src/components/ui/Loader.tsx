'use client'

import React, { useRef, useState, useEffect } from 'react'
import { gsap } from 'gsap'

export default function Loader() {
  const loaderRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const [isReady, setIsReady] = useState(false)

  // Simulation d'un temps de chargement court le temps que l'app "hydrate"
  useEffect(() => {
    // Si déjà chargé dans la session (via session storage par ex), on peut skipper,
    // mais ici on va le faire à chaque mount principal ou refresh
    const ctx = gsap.context(() => {
      // Animation d'entrée du texte
      gsap.from(textRef.current, {
        y: 20,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
      })

      // Timeline de sortie
      const tl = gsap.timeline({
        delay: 1.5, // Le loader reste 1.5s à l'écran
        onComplete: () => setIsReady(true) // On cache le dom
      })

      tl.to(textRef.current, {
        y: -20,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.in',
      }).to(loaderRef.current, {
        yPercent: -100, // Le loader slide vers le haut (type rideau)
        duration: 1.2,
        ease: 'expo.inOut',
      }, "-=0.2")

    }, loaderRef)

    return () => ctx.revert()
  }, [])

  if (isReady) return null

  return (
    <div 
      ref={loaderRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black text-white pointer-events-none"
    >
      <div className="overflow-hidden">
        <div 
          ref={textRef} 
          className="text-sm md:text-base uppercase tracking-[0.5em] font-mono opacity-100"
        >
          Loading 
        </div>
      </div>
    </div>
  )
}

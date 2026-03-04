'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

export default function Template({ children }: { children: React.ReactNode }) {
  const overlay1Ref = useRef<HTMLDivElement>(null)
  const overlay2Ref = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const tl = gsap.timeline()
    
    // Animation de balayage de l'écran façon Ciel Rose (Rideau double)
    if (overlay1Ref.current && overlay2Ref.current) {
      // Pour éviter tout lag, on force les styles initiaux
      gsap.set([overlay1Ref.current, overlay2Ref.current], { top: 0, height: '100vh' })
      
      tl.to(overlay1Ref.current, {
        top: '100vh', height: 0, duration: 0.7, ease: "expo.inOut"
      })
      .to(overlay2Ref.current, {
        top: '100vh', height: 0, duration: 0.7, ease: "expo.inOut"
      }, "-=0.55")
    }

    return () => {
      tl.kill()
    }
  }, [])

  return (
    <>
      {/* Rideau 1 (Dark Zinc) */}
      <div 
        ref={overlay1Ref}
        className="fixed inset-0 z-[801] bg-zinc-900 pointer-events-none"
        style={{ top: 0, height: '100vh' }}
      />
      {/* Rideau 2 (Blanc / Flash Brut) */}
      <div 
        ref={overlay2Ref}
        className="fixed inset-0 z-[800] bg-zinc-100 pointer-events-none"
        style={{ top: 0, height: '100vh' }}
      />
      
      {children}
    </>
  )
}

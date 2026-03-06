'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

interface TransitionContextProps {
  navigate: (href: string) => void
}

const TransitionContext = createContext<TransitionContextProps>({
  navigate: () => {},
})

export const useTransitionContext = () => useContext(TransitionContext)

export function TransitionProvider({ children }: { children: React.ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false)
  const [progress, setProgress] = useState(0)
  const pathname = usePathname()
  const router = useRouter()

  // TRACKING D'INTERACTION GLOBAL (Pour autoriser le son des Reels)
  useEffect(() => {
    const markInteracted = () => {
      sessionStorage.setItem('gotreal_interacted', 'true')
    }
    window.addEventListener('click', markInteracted, { once: true })
    window.addEventListener('touchstart', markInteracted, { once: true })
    return () => {
      window.removeEventListener('click', markInteracted)
      window.removeEventListener('touchstart', markInteracted)
    }
  }, [])

  const navigate = (href: string) => {
    // Si on est déjà sur la page, ne rien faire
    if (href === pathname) return 
    
    setIsNavigating(true)
    setProgress(0)
    
    // Attendre que l'animation d'entrée du loader masque l'écran (0.4s) avant de forcer Next.js à charger la longue page
    setTimeout(() => {
      router.push(href)
    }, 450)

    // Faux chargement (ProgressBar) garanti pendant la transition
    const duration = 1200 // 1.2 secondes de transition imposées pour l'esthétique
    const interval = 30
    const steps = duration / interval
    let currentStep = 0

    const timer = setInterval(() => {
      currentStep++
      const percentage = Math.min(Math.round((currentStep / steps) * 100), 100)
      setProgress(percentage)

      if (currentStep >= steps) {
        clearInterval(timer)
        setTimeout(() => {
          setIsNavigating(false)
        }, 200) // Maintien court à 100% avant disparition
      }
    }, interval)
  }

  return (
    <TransitionContext.Provider value={{ navigate }}>
      {children}
      
      {/* Navigation Loader Super Clean (GOTREAL Overlay) */}
      <AnimatePresence>
        {isNavigating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="fixed inset-0 z-[100000] bg-black flex flex-col items-center justify-center pointer-events-auto"
          >
            {/* Effet monolithe */}
            <motion.h1 
              initial={{ filter: "blur(10px)", scale: 0.95 }}
              animate={{ filter: "blur(0px)", scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="text-[12vw] md:text-[8vw] font-sans font-black text-white uppercase tracking-tighter leading-none mix-blend-difference"
            >
              GOTREAL
            </motion.h1>

            {/* Bottom UI : Compteur progressif */}
            <div className="absolute bottom-24 w-full px-8 md:px-24 flex flex-col items-center gap-4">
              <motion.div 
                exit={{ opacity: 0 }}
                className="font-mono text-sm md:text-base uppercase tracking-[0.4em] text-zinc-500"
              >
                {progress.toString().padStart(3, '0')}% REC
              </motion.div>
              
              {/* Barre de progression ultra-fine minimaliste */}
              <div className="w-full max-w-sm h-[1px] bg-white/20 relative overflow-hidden">
                <motion.div
                  className="absolute top-0 left-0 bottom-0 bg-white"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.1, ease: 'linear' }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </TransitionContext.Provider>
  )
}

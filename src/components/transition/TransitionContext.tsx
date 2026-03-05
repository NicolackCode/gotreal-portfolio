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
  const pathname = usePathname()
  const router = useRouter()

  // Fermer le loader après que le pathname ait changé (et que Nextjs ait hydraté la nouvelle page).
  useEffect(() => {
    if (isNavigating) {
      setTimeout(() => {
        setIsNavigating(false)
      }, 500)
    }
  }, [pathname, isNavigating])

  const navigate = (href: string) => {
    // Si on est déjà sur la page, ne rien faire
    if (href === pathname) return 
    
    setIsNavigating(true)
    
    // Attendre que l'animation d'entrée du loader masque l'écran (0.4s) avant de forcer Next.js à charger la longue page
    setTimeout(() => {
      router.push(href)
    }, 450)
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

            <div className="absolute bottom-24 w-full flex flex-col items-center gap-4">
              <motion.div 
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                className="font-mono text-xs md:text-sm uppercase tracking-[0.4em] text-zinc-500"
              >
                CHARGEMENT...
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </TransitionContext.Provider>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function InitialLoader() {
  const [shouldShow, setShouldShow] = useState(true)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Vérifier si c'est la première visite de la session
    const hasPlayed = sessionStorage.getItem('gotreal_intro_played')
    
    if (hasPlayed) {
      setShouldShow(false)
      return
    }

    // Empêcher le scroll pendant le preloader
    document.body.style.overflow = 'hidden'

    // Simuler le chargement des assets (1.5 secondes)
    const duration = 1500
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
          setShouldShow(false)
          sessionStorage.setItem('gotreal_intro_played', 'true')
          document.body.style.overflow = ''
        }, 400) // Léger maintien à 100% pour la perception
      }
    }, interval)

    return () => {
      clearInterval(timer)
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[999] bg-black flex flex-col items-center justify-center pointer-events-auto"
        >
          {/* Logo Central (Effet monolithe) */}
          <motion.h1
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.05, opacity: 0, filter: "blur(5px)" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-[12vw] md:text-[8vw] font-sans font-black text-white uppercase tracking-tighter leading-none"
          >
            GOTREAL
          </motion.h1>

          {/* Bottom UI : Compteur progressif style caméra/technique */}
          <div className="absolute bottom-24 w-full px-8 md:px-24 flex flex-col items-center gap-4">
            <motion.div 
              exit={{ opacity: 0 }}
              className="font-mono text-sm md:text-base uppercase tracking-[0.4em] text-white/70"
            >
              {progress.toString().padStart(3, '0')}% REC
            </motion.div>
            
            {/* Barre de progression ultra-fine minimaliste (façon Ciel Rose) */}
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
  )
}

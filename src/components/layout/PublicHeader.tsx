'use client'

import { useState, useEffect } from 'react'
import { motion, useScroll, useMotionValueEvent } from 'framer-motion'
import TransitionLink from '@/components/transition/TransitionLink'

export default function PublicHeader() {
  const [isOpen, setIsOpen] = useState(false)
  const [isIdle, setIsIdle] = useState(false)
  const [isExternalHidden, setIsExternalHidden] = useState(false)

  const { scrollY } = useScroll()
  const [isScrolledDown, setIsScrolledDown] = useState(false)

  // Gestion de l'inactivité (Idle Timer) et du scroll
  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const handleActivity = () => {
      // Au moindre événement (hors scroll direct géré par framer-motion), on réaffiche le header (sauf si on scroll vers le bas)
      setIsIdle(false)
      clearTimeout(timeoutId)
      
      // On masque après 2.5 secondes d'inactivité
      timeoutId = setTimeout(() => {
        setIsIdle(true)
      }, 2500)
    }

    // Initialisation
    handleActivity()

    // Écoute des événements utilisateurs globaux
    window.addEventListener('mousemove', handleActivity)
    window.addEventListener('click', handleActivity)
    window.addEventListener('touchstart', handleActivity, { passive: true })
    window.addEventListener('keydown', handleActivity)

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('click', handleActivity)
      window.removeEventListener('touchstart', handleActivity)
      window.removeEventListener('keydown', handleActivity)
    }
  }, [])

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious()
    
    // Si la page est tout en haut, le header est toujours visible
    if (latest <= 50) {
      setIsScrolledDown(false)
      setIsIdle(false) // On reset l'inactivité aussi
      return
    }
    
    // Si on scrolle vers le bas (et qu'on a un peu dépassé le top) : on masque
    if (previous !== undefined && latest > previous! && latest > 50) {
      setIsScrolledDown(true)
    } else {
      // Si on scrolle vers le haut : on affiche et on reset le timer d'idle
      setIsScrolledDown(false)
      setIsIdle(false)
    }
  })

  // Support pour les conteneurs à scroll interne (ex: MobileReelFeed)
  useEffect(() => {
    const handleHide = () => setIsExternalHidden(true)
    const handleShow = () => setIsExternalHidden(false)

    window.addEventListener('gotreal_header_hide', handleHide)
    window.addEventListener('gotreal_header_show', handleShow)

    return () => {
      window.removeEventListener('gotreal_header_hide', handleHide)
      window.removeEventListener('gotreal_header_show', handleShow)
    }
  }, [])

  // Le header est masqué si on est idle, scrollé vers le bas (ou caché par un événement externe) 
  // ET que le menu principal n'est pas ouvert
  const isHeaderHidden = (isIdle || isScrolledDown || isExternalHidden) && !isOpen

  return (
    <>
      <motion.header 
        variants={{
          visible: { y: 0, opacity: 1 },
          hidden: { y: "-100%", opacity: 0 }
        }}
        initial="visible"
        animate={isHeaderHidden ? "hidden" : "visible"}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="fixed top-0 left-0 w-full z-50 flex justify-between items-center py-4 px-6 lg:py-5 lg:px-10 backdrop-blur-md bg-black/60 pointer-events-none"
      >
        
        {/* LOGO TITLE MASSIVE */}
        <div className="flex flex-col pointer-events-auto">
          <TransitionLink 
            href="/" 
            className="text-2xl md:text-3xl font-sans font-black tracking-tighter uppercase hover:opacity-70 transition-opacity text-white leading-none"
            onClick={() => setIsOpen(false)}
          >
            GOTREAL
          </TransitionLink>
          <span className="text-[9px] md:text-[10px] font-mono uppercase tracking-[0.3em] opacity-80 mt-1.5 text-white leading-none">
            DIRECTOR & DOP
          </span>
        </div>
        
        {/* MENUS BURGER BUTTON */}
        <button 
          onClick={() => setIsOpen(true)}
          className="pointer-events-auto text-sm md:text-base font-sans font-bold uppercase tracking-widest hover:opacity-70 transition-opacity text-white"
        >
          [ MENU ]
        </button>
      </motion.header>

      {/* FULL SCREEN OVERLAY MENU - BRUTALIST STYLE */}
      <div 
        className={`fixed inset-0 bg-black z-[100] text-white flex flex-col justify-between p-6 lg:p-10 transition-transform duration-500 will-change-transform ${
          isOpen ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="flex justify-between items-start">
          <div className="text-2xl md:text-3xl font-sans font-black tracking-tighter uppercase opacity-50">
            GOTREAL
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-xs md:text-sm font-sans font-bold uppercase tracking-widest hover:text-zinc-500 transition-colors"
          >
            [ FERMER ]
          </button>
        </div>

        <nav className="flex flex-col gap-8 md:gap-12 mt-20">
          <TransitionLink 
            href="/all-projects" 
            onClick={() => setIsOpen(false)}
            className="text-5xl md:text-7xl lg:text-8xl font-sans font-black uppercase tracking-tighter hover:text-zinc-500 transition-colors origin-left hover:scale-[1.02]"
          >
            PROJETS.
          </TransitionLink>
          <TransitionLink 
            href="/about" 
            onClick={() => setIsOpen(false)}
            className="text-5xl md:text-7xl lg:text-8xl font-sans font-black uppercase tracking-tighter hover:text-zinc-500 transition-colors origin-left hover:scale-[1.02]"
          >
            À PROPOS.
          </TransitionLink>
          <a 
            href="mailto:gotrealisation@gmail.com?subject=Nouvelle collaboration / Demande de projet&body=Bonjour Gauthier,%0A%0AJe te contacte pour évoquer un futur projet avec toi...%0A%0A[Détaille ici ton besoin, le style, les dates...]" 
            onClick={() => setIsOpen(false)}
            className="text-5xl md:text-7xl lg:text-8xl font-sans font-black uppercase tracking-tighter hover:text-zinc-500 transition-colors origin-left hover:scale-[1.02]"
          >
            CONTACT.
          </a>
        </nav>

        <div className="flex justify-between items-end pb-8">
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 max-w-[200px]">
            PUBLICITÉS, CLIPS MUSICAUX ET FILMS.
          </span>
          <a 
            href="https://instagram.com/gotreaaal" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs font-mono uppercase tracking-widest border border-zinc-700 px-4 py-2 hover:bg-white hover:text-black transition-colors"
          >
            INSTAGRAM
          </a>
        </div>
      </div>
    </>
  )
}


import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import TransitionLink from '@/components/transition/TransitionLink'
import HeroVideoBackground from '@/components/ui/HeroVideoBackground'

export const revalidate = 0 

export default async function HomePage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() }
      }
    }
  )

  // On récupère les URLs et priorités des projets visibles
  const { data: projectsData } = await supabase
    .from('projects')
    .select('main_video_url, priority')
    .eq('is_visible', true)
    .not('main_video_url', 'is', null)

  const fallbackList = ['https://storage.googleapis.com/gotreal-assets/demo.mp4']
  
  let bgVideosList = fallbackList
  if (projectsData && projectsData.length > 0) {
    // 1. Essayer de récupérer uniquement la crème de la crème (TOP 1)
    const top1Videos = projectsData.filter(p => p.priority === 'TOP 1').map(p => p.main_video_url)
    
    // 2. Si y'a aucun TOP 1, on prend tout ce qui existe pour pas faire crasher
    if (top1Videos.length > 0) {
       bgVideosList = top1Videos as string[]
    } else {
       bgVideosList = projectsData.map(p => p.main_video_url) as string[]
    }
  }

  return (
    <main className="relative w-full h-screen overflow-hidden bg-black flex items-center justify-center">
      {/* BACKGROUND VIDEO */}
      <div className="absolute inset-0 w-full h-full z-0 opacity-60">
        <HeroVideoBackground videoUrls={bgVideosList} />
        {/* Overlay pour assombrir ou ajouter du grain (vibe cinematic) */}
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* BIG FAT LOGO CENTER */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center pointer-events-none mix-blend-difference">
        <h1 className="text-white text-[12vw] leading-none font-sans font-black uppercase tracking-tighter">
          GOTREAL
        </h1>
        <p className="mt-2 font-mono text-zinc-400 text-xs sm:text-sm tracking-[0.4em] uppercase">
          Director & DOP
        </p>
      </div>

      {/* BOUTON CATCHY VERS LA GALERIE */}
      <div className="absolute bottom-12 left-0 right-0 flex justify-center z-20">
        <TransitionLink 
          href="/all-projects" 
          className="text-white font-sans font-bold text-xs uppercase tracking-widest border border-zinc-700 px-8 py-4 hover:bg-white hover:text-black transition-colors"
        >
          Découvrir les Projets
        </TransitionLink>
      </div>
    </main>
  )
}

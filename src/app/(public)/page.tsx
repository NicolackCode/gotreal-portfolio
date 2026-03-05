import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
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

  // On récupère les URLs des projets visibles
  const { data: projectsData } = await supabase
    .from('projects')
    .select('main_video_url')
    .eq('is_visible', true)
    .not('main_video_url', 'is', null)

  const fallbackList = ['https://storage.googleapis.com/gotreal-assets/demo.mp4']
  const bgVideosList = projectsData && projectsData.length > 0 
    ? projectsData.map(p => p.main_video_url) 
    : fallbackList

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
        <Link 
          href="/all-projects" 
          className="text-white font-sans font-bold text-xs uppercase tracking-widest border border-zinc-700 px-8 py-4 hover:bg-white hover:text-black transition-colors"
        >
          Découvrir les Projets
        </Link>
      </div>
    </main>
  )
}

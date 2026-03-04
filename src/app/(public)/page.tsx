import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'

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

  // On récupère juste le meilleur projet ou un projet aléatoire pour servir de Background vidéo (V1)
  // Ou on fixe une URL par défaut (le fameux showreel). Ici, on prend le premier qui a un main_video_url.
  const { data: projectsData } = await supabase
    .from('projects')
    .select('main_video_url')
    .not('main_video_url', 'is', null)
    .limit(1)

  const bgVideo = projectsData?.[0]?.main_video_url || 'https://storage.googleapis.com/gotreal-assets/demo.mp4' // Fallback si vide

  return (
    <main className="relative w-full h-screen overflow-hidden bg-black flex items-center justify-center">
      {/* BACKGROUND VIDEO */}
      <div className="absolute inset-0 w-full h-full z-0 opacity-60">
        <video 
          src={bgVideo} 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="w-full h-full object-cover"
        />
        {/* Overlay pour assombrir ou ajouter du grain (vibe cinematic) */}
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* BIG FAT LOGO CENTER */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center pointer-events-none">
        <h1 className="text-white text-7xl md:text-9xl font-sans font-black uppercase tracking-widest mix-blend-difference opacity-90 drop-shadow-2xl">
          GOTREAL
        </h1>
        <p className="mt-6 font-mono text-zinc-300 text-xs md:text-sm tracking-[0.3em] uppercase mix-blend-difference">
          Director, DOP & Editor
        </p>
      </div>

      {/* BOUTON CATCHY VERS LA GALERIE */}
      <div className="absolute bottom-12 left-0 right-0 flex justify-center z-20">
        <Link 
          href="/all-projects" 
          className="text-white font-mono text-xs uppercase tracking-[0.2em] border border-white/30 px-8 py-3 hover:bg-white hover:text-black transition-all duration-500 backdrop-blur-sm"
        >
          Découvrir les Projets
        </Link>
      </div>
    </main>
  )
}

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import MasonryGrid from '@/components/ui/MasonryGrid'

export const revalidate = 0 // Pas de cache statique / live update admin

export default async function AllProjectsPage() {
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

  const { data: projectsData, error } = await supabase
    .from('projects')
    .select('*')
    .order('rank', { ascending: true })

  if (error) {
    console.error("Erreur de récupération BDD sur /(public)/all-projects/page.tsx", error)
  }

  return (
    <main className="min-h-screen bg-black pt-32 pb-12 selection:bg-pink-500/30">
      
      {/* HEADER DE LA GALERIE (EYECANDY STYLE) */}
      <div className="w-full max-w-[1800px] mx-auto px-4 md:px-8 xl:px-12 mb-12">
        <h1 className="text-4xl sm:text-6xl md:text-8xl lg:text-[10rem] font-sans font-black text-white uppercase tracking-tighter leading-none mb-4 mix-blend-difference">
          ARCHIVES
        </h1>
        <p className="font-mono text-zinc-500 text-[10px] sm:text-xs uppercase tracking-[0.2em] max-w-lg">
          UNE SÉLECTION DE PROJETS COMMERCIAUX, CLIPS MUSICAUX ET CRÉATIFS. 
        </p>
      </div>

      {/* GRILLE DES PROJETS (FULL WIDTH 100VW BORD À BORD) */}
      <div className="relative z-10 w-full overflow-hidden">
        <MasonryGrid projects={projectsData || []} />
      </div>
      
      {/* FOOTER PUBLIC */}
      <footer className="w-full border-t border-zinc-900 py-12 text-center mt-20">
        <p className="font-sans font-bold text-zinc-500 text-[10px] md:text-xs uppercase tracking-[0.3em]">
           © {new Date().getFullYear()} GOTREAL - TOUS DROITS RÉSERVÉS.
        </p>
      </footer>
    </main>
  )
}

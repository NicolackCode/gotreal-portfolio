import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import DraggableGrid from '@/components/admin/DraggableGrid'

export const revalidate = 0 // Jamais de cache pour cette page d'admin

export default async function AdminGridPage() {
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

  // Vérification de sécurité
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (sessionError || !session) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 font-mono mb-4">Vous n&apos;êtes pas connecté.</p>
          <Link href="/admin/login" className="text-white hover:text-zinc-400 font-mono underline">
            Aller page de connexion
          </Link>
        </div>
      </div>
    )
  }

  // Récupérer tous les projets classés par rang (ou ID si pas de rang)
  const { data: projectsData, error } = await supabase
    .from('projects')
    .select(`
      id,
      title,
      category,
      client,
      carousel_urls,
      main_video_url,
      thumbnail_url,
      rank,
      rotation,
      forced_span,
      is_visible,
      slug
    `)
    .order('rank', { ascending: true })

  if (error) {
    console.error("Erreur de récupération BDD sur /admin/grid/page.tsx", error)
  }

  return (
    <div className="min-h-screen bg-black pt-32 pb-12 selection:bg-pink-500/30">
      
      {/* HEADER DE LA GALERIE (EYECANDY STYLE - ADMIN COPY) */}
      <div className="w-full max-w-[1800px] mx-auto px-4 md:px-8 xl:px-12 mb-12 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-6xl md:text-8xl lg:text-[10rem] font-sans font-black text-red-600 uppercase tracking-tighter leading-none mb-4 mix-blend-difference">
            ADMIN
          </h1>
          <p className="font-mono text-zinc-500 text-[10px] sm:text-xs uppercase tracking-[0.2em] max-w-lg mb-4">
            Glissez et déposez vos vidéos pour ré-organiser la galerie publique.
          </p>
        </div>
        
        <Link 
          href="/admin/dashboard" 
          className="bg-red-900/20 border border-red-500/50 hover:bg-red-900/40 text-red-500 px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors inline-block text-center mt-2 md:mt-4 whitespace-nowrap h-fit"
        >
          &larr; RETOUR DASHBOARD
        </Link>
      </div>

      {/* COMPOSANT DRAGGABLE INTERACTIF */}
      <DraggableGrid initialProjects={projectsData || []} />
      
    </div>
  )
}

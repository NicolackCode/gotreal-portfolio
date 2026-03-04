import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import AmbilightPlayer from '@/components/ui/AmbilightPlayer'

export const revalidate = 0 

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
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

  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !project) {
    return notFound()
  }

  let carouselItems: string[] = []
  if (project.carousel_urls) {
    if (typeof project.carousel_urls === 'string') {
      try { carouselItems = JSON.parse(project.carousel_urls) } catch { /* ignore */ }
    } else if (Array.isArray(project.carousel_urls)) {
      carouselItems = project.carousel_urls
    }
  }

  // Adapter au format attendu par AmbilightPlayer
  const mainProject = {
    id: project.id,
    title: project.title,
    client: project.client,
    video_url: project.main_video_url || ''
  }

  // Création du array hybride avec TOUTES les vidéos du projet pour la nav intra-lecteur
  const allPlayerProjects = [
    mainProject,
    ...carouselItems.map((url, index) => ({
      id: `${project.id}-carousel-${index}`,
      title: project.title,
      client: project.client,
      video_url: url
    }))
  ]

  return (
    <main className="min-h-screen bg-black text-white relative">
      
      {/* BOUTON RETOUR (Mix blend, z-40 pour passer SOUS la div Ambilight passée en Full Screen) */}
      <div id="project-back-button" className="absolute top-24 lg:top-32 left-8 z-40 pointer-events-auto mix-blend-difference hidden md:block">
        <Link href="/all-projects" className="text-xs font-mono uppercase tracking-[0.2em] text-white hover:text-zinc-400 border-b-2 border-transparent hover:border-white transition-all pb-1">
          ← Retour à la galerie
        </Link>
      </div>

      {/* ZONE HERO AMBILIGHT */}
      {project.main_video_url && (
         // L'AmbilightPlayer fait h-screen par défaut.
        <section className="relative w-full h-screen z-10">
          <AmbilightPlayer projects={allPlayerProjects} />
        </section>
      )}

      {/* ZONE CONTENU ADDITIONNEL (Description / Carousel) */}
      <section className="relative z-20 bg-black pt-24 pb-32">
        <div className="w-full max-w-[1800px] mx-auto px-6 lg:px-12">
          
          {/* DESCRIPTION */}
          {project.description && (
            <div className="w-full lg:w-2/3 xl:w-1/2 mb-32">
               <h3 className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-600 mb-6">À PROPOS DU PROJET</h3>
               <div className="text-zinc-300 font-sans text-lg md:text-2xl leading-relaxed md:leading-normal font-light">
                 {project.description}
               </div>
            </div>
          )}

          {/* CAROUSEL DES VIDEOS */}
          {carouselItems && carouselItems.length > 0 && (
            <div className="space-y-12">
              <h3 className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-600 border-b border-zinc-900 pb-4">
                Extraits Additionnels & Déclinaisons
              </h3>
              
              {/* Conteneur défilant horizontalement */}
              <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-4 md:gap-8 pb-8 -mx-6 px-6 lg:-mx-12 lg:px-12 items-center">
                {carouselItems.map((url, i) => (
                  <div 
                    key={i} 
                    className="flex-none h-[50vh] md:h-[60vh] xl:h-[70vh] max-w-[90vw] bg-transparent border border-zinc-900 relative group overflow-hidden snap-center rounded-sm"
                  >
                     <video 
                       src={url}
                       controls
                       preload="metadata"
                       className="w-auto h-full object-contain group-hover:scale-[1.02] transition-transform duration-700"
                     />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </section>
      
      {/* FOOTER PUBLIC */}
      <footer className="w-full border-t border-zinc-900 py-12 text-center relative z-20 bg-black">
        <p className="font-mono text-zinc-600 text-[10px] uppercase tracking-widest">
           © {new Date().getFullYear()} GOTREAL - All Rights Reserved.
        </p>
      </footer>
    </main>
  )
}

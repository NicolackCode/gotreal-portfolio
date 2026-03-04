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
    <main className="min-h-screen bg-black pt-24 pb-12">
      {/* GRILLE DES PROJETS */}
      <div className="relative z-10">
        <MasonryGrid projects={projectsData || []} />
      </div>
      
      {/* FOOTER PUBLIC */}
      <footer className="w-full border-t border-zinc-900 py-12 text-center mt-20">
        <p className="font-mono text-zinc-600 text-[10px] md:text-xs uppercase tracking-widest">
           © {new Date().getFullYear()} GOTREAL - All Rights Reserved.
        </p>
      </footer>
    </main>
  )
}

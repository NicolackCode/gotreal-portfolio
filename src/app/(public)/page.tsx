import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import AmbilightPlayer from '@/components/ui/AmbilightPlayer'

export const revalidate = 0 // On empêche la mise en cache statique pour voir les nouveaux projets directement

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

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('rank', { ascending: true })

  return (
    <main className="relative w-full h-screen overflow-hidden bg-black">
      <AmbilightPlayer projects={projects || []} />
    </main>
  )
}

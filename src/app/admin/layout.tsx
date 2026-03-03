'use client'

import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono flex flex-col">
      <header className="border-b border-zinc-800 bg-zinc-950 p-4 flex justify-between items-center z-50">
        <div className="flex gap-6 items-center">
          <Link href="/admin/dashboard" className="text-xl tracking-widest uppercase font-bold text-white hover:text-zinc-400 transition-colors">
            GOTREAL
          </Link>
          <nav className="text-sm tracking-widest text-zinc-500 uppercase flex gap-4 hidden sm:flex">
            <Link href="/admin/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
            <Link href="/admin/media" className="hover:text-white transition-colors">Media Library</Link>
          </nav>
        </div>
        <button 
          onClick={handleSignOut}
          className="text-xs tracking-wider uppercase border border-zinc-700 px-4 py-2 hover:bg-white hover:text-black transition-colors"
        >
          Sign Out
        </button>
      </header>
      
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}

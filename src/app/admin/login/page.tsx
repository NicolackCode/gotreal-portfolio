'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/admin/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 font-mono">
      <div className="w-full max-w-md border border-zinc-800 bg-zinc-950 p-8 rounded-sm">
        <h1 className="text-2xl mb-8 text-center uppercase tracking-widest text-[#E0E0E0]">GOTREAL ADMINISTRATION</h1>
        
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-2">Email Access</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black border border-zinc-700 px-4 py-3 text-sm focus:outline-none focus:border-white transition-colors"
              required
            />
          </div>
          
          <div>
            <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-zinc-700 px-4 py-3 text-sm focus:outline-none focus:border-white transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black uppercase tracking-widest text-sm py-4 font-bold hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Enter Platform'}
          </button>
        </form>
      </div>
    </div>
  )
}

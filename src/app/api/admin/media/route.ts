import { Storage } from '@google-cloud/storage'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: {
    client_email: process.env.GCP_CLIENT_EMAIL,
    private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
})

const bucket = storage.bucket(process.env.GCP_BUCKET_NAME || '')

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {}
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Liste des fichiers dans le bucket (limité à un nombre raisonnable, par ex 100)
    const [files] = await bucket.getFiles()

    const medias = files.map(file => ({
      name: file.name,
      url: `https://storage.googleapis.com/${process.env.GCP_BUCKET_NAME}/${file.name}`,
      updated: file.metadata.updated,
      size: file.metadata.size
    })).filter(file => !file.name.endsWith('/')) // Ne pas inclure les dossiers
       .sort((a, b) => new Date(b.updated || 0).getTime() - new Date(a.updated || 0).getTime())

    return NextResponse.json({ medias })
  } catch (err) {
    console.error('Failed to list medias:', err)
    return NextResponse.json({ error: 'Failed to list media' }, { status: 500 })
  }
}

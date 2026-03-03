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

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    
    // 1. Vérification auth
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
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Extraire les métadonnées de la requête
    const { filename, contentType } = await req.json()
    if (!filename) {
      return NextResponse.json({ error: 'No filename provided' }, { status: 400 })
    }

    // Nom de fichier 100% sécurisé (UUID) pour éviter tout caractère illégal dans l'URL signée
    const fileExtension = filename.split('.').pop() || 'mp4'
    const uniqueId = crypto.randomUUID()
    const fileDestination = `videos/${Date.now()}_${uniqueId}.${fileExtension}`
    
    const file = bucket.file(fileDestination)
    
    // 3. Générer une URL signée (valide 15 minutes) pour l'upload direct
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000,
      contentType: contentType, // Doit correspondre
    })

    // 4. Construire l'URL publique finale
    const publicUrl = `https://storage.googleapis.com/${process.env.GCP_BUCKET_NAME}/${fileDestination}`

    return NextResponse.json({ signedUrl, publicUrl })

  } catch (error) {
    console.error('GCP Signed URL Error:', error)
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 })
  }
}


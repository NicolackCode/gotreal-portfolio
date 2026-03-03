import { Storage } from '@google-cloud/storage'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Initialisation du client Google Cloud Storage
// On reconstruit la clé privée car elle peut contenir des \n littéraux
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
    
    // 1. Vérification de la sécurité (Est-ce bien l'Admin ?)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Traitement du fichier uploadé
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file received' }, { status: 400 })
    }

    // 3. Préparation pour Google Cloud
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Nom de fichier unique pour éviter les conflits (timestamp + nom original nettoyé)
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')
    const fileName = `videos/${Date.now()}-${safeName}`
    
    const blob = bucket.file(fileName)
    
    // 4. Upload vers le Bucket
    await new Promise((resolve, reject) => {
      const blobStream = blob.createWriteStream({
        resumable: false, // Plus sûr pour les fichiers uploadés via stream Buffer serverless
        contentType: file.type,
      })

      blobStream.on('error', (err) => reject(err))
      blobStream.on('finish', () => resolve(true))
      blobStream.end(buffer)
    })

    // 5. Générer l'URL Publique (suppose que le bucket gotreal-assets est configuré en lecture publique)
    const publicUrl = `https://storage.googleapis.com/${process.env.GCP_BUCKET_NAME}/${fileName}`

    return NextResponse.json({ url: publicUrl })

  } catch (error) {
    console.error('GCP Upload Error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

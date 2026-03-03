'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type ProjectData = {
  id?: string
  title?: string
  client?: string
  description?: string
  video_url?: string
}

type ProjectFormProps = {
  project?: ProjectData | null
  onClose: () => void
  onSuccess: () => void
}

type MediaItem = {
  name: string
  url: string
  updated?: string
  size?: string
}

export default function ProjectForm({ project, onClose, onSuccess }: ProjectFormProps) {
  const [title, setTitle] = useState(project?.title || '')
  const [client, setClient] = useState(project?.client || '')
  const [description] = useState(project?.description || '') // eslint-disable-next-line @typescript-eslint/no-unused-vars
  
  const [uploadMode, setUploadMode] = useState<'new' | 'existing'>('existing')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string>(project?.video_url || '')
  
  const [mediaList, setMediaList] = useState<MediaItem[]>([])
  const [loadingMedia, setLoadingMedia] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function fetchMedia() {
      setLoadingMedia(true)
      try {
        const res = await fetch('/api/admin/media')
        if (res.ok) {
          const data = await res.json()
          setMediaList(data.medias || [])
        }
      } catch (err) {
        console.error(err)
      }
      setLoadingMedia(false)
    }
    fetchMedia()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUploading(true)

    try {
      let videoUrl = selectedMediaUrl

      // Si l'admin a uploadé une nouvelle vidéo
      if (uploadMode === 'new' && videoFile) {
        // 1. Demander l'URL de dépôt à notre serveur (URL Signée)
        const initRes = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: videoFile.name,
            contentType: videoFile.type
          })
        })
        
        if (!initRes.ok) throw new Error('Failed to get GCP upload ticket.')
        const { signedUrl, publicUrl } = await initRes.json()

        // 2. Envoyer le fichier directement à Google Cloud
        const uploadRes = await fetch(signedUrl, {
          method: 'PUT',
          body: videoFile,
          headers: {
            'Content-Type': videoFile.type
          }
        })

        if (!uploadRes.ok) throw new Error('Direct upload to GCP failed.')
        videoUrl = publicUrl
      }

      const projectData = {
        title,
        client,
        description,
        video_url: videoUrl || ''
      }

      if (project?.id) {
        await supabase.from('projects').update(projectData).eq('id', project.id)
      } else {
        await supabase.from('projects').insert([projectData])
      }

      onSuccess()
    } catch (err) {
      alert('Error updating project. See console.')
      console.error(err)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 overflow-y-auto pt-20 pb-20">
      <div className="bg-zinc-950 border border-zinc-800 p-8 w-full max-w-2xl text-white font-mono my-auto">
        <h2 className="text-xl uppercase tracking-widest font-bold mb-6">
          {project ? 'Modifier le projet' : 'Nouveau Projet'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase text-zinc-500 mb-1">Titre</label>
              <input 
                type="text" 
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-black border border-zinc-700 p-2 focus:border-white outline-none" 
              />
            </div>
            
            <div>
              <label className="block text-xs uppercase text-zinc-500 mb-1">Client / Marque</label>
              <input 
                type="text" 
                value={client}
                onChange={e => setClient(e.target.value)}
                className="w-full bg-black border border-zinc-700 p-2 focus:border-white outline-none" 
              />
            </div>
          </div>

          <div className="border border-zinc-800 p-4 bg-black">
            <div className="flex gap-4 mb-4 border-b border-zinc-800 pb-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm uppercase tracking-wider text-zinc-300">
                <input 
                  type="radio" 
                  checked={uploadMode === 'existing'} 
                  onChange={() => setUploadMode('existing')}
                />
                Média Existant (Bucket)
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm uppercase tracking-wider text-zinc-300">
                <input 
                  type="radio" 
                  checked={uploadMode === 'new'} 
                  onChange={() => setUploadMode('new')}
                />
                Uploader une Vidéo
              </label>
            </div>

            {uploadMode === 'existing' ? (
              <div>
                {loadingMedia ? (
                  <p className="text-sm text-zinc-500 uppercase">Chargement des médias...</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-2 border border-zinc-800 p-2">
                    {mediaList.map((media) => (
                      <div 
                        key={media.name}
                        onClick={() => setSelectedMediaUrl(media.url)}
                        className={`p-2 cursor-pointer text-xs truncate transition-colors ${selectedMediaUrl === media.url ? 'bg-white text-black font-bold' : 'hover:bg-zinc-900 text-zinc-400'}`}
                      >
                        {media.name}
                      </div>
                    ))}
                    {mediaList.length === 0 && <p className="text-xs text-zinc-500">Bucket vide.</p>}
                  </div>
                )}
                {selectedMediaUrl && <p className="text-xs mt-2 truncate text-green-400 border border-green-900 bg-green-950/20 p-2">Sélectionné: {selectedMediaUrl}</p>}
              </div>
            ) : (
              <div>
                <input 
                  type="file" 
                  accept="video/mp4,video/webm"
                  onChange={e => setVideoFile(e.target.files?.[0] || null)}
                  className="w-full bg-black border border-zinc-700 p-2 focus:border-white outline-none text-sm" 
                  required={uploadMode === 'new'}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-4 mt-8">
            <button 
              type="button" 
              onClick={onClose}
              disabled={isUploading}
              className="px-6 py-2 uppercase tracking-wider text-sm border border-zinc-700 hover:text-white text-zinc-400 transition-colors"
            >
              Annuler
            </button>
            <button 
              type="submit"
              disabled={isUploading || (uploadMode === 'existing' && !selectedMediaUrl) || (uploadMode === 'new' && !videoFile)}
              className="px-6 py-2 uppercase tracking-wider text-sm bg-white text-black font-bold hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              {isUploading ? 'Sauvegarde...' : 'Enregistrer le projet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

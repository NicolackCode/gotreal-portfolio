'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type ProjectData = {
  id?: string
  title?: string
  client?: string
  description?: string
  main_video_url?: string
  carousel_urls?: string | string[]
  rank?: number
  priority?: string
  slug?: string
  rotation?: number
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
  // Parse carousel if it was stored as string instead of Array (workaround constraint)
  let initialCarousel: string[] = []
  if (project?.carousel_urls) {
    if (typeof project.carousel_urls === 'string') {
      try {
        initialCarousel = JSON.parse(project.carousel_urls)
      } catch {
        initialCarousel = []
      }
    } else if (Array.isArray(project.carousel_urls)) {
      initialCarousel = project.carousel_urls
    }
  }

  const [title, setTitle] = useState(project?.title || '')
  const [client, setClient] = useState(project?.client || '')
  const [rank, setRank] = useState(project?.rank || 0)
  const [priority, setPriority] = useState(project?.priority || '')
  const [rotation, setRotation] = useState(project?.rotation || 0)
  
  // States des vidéos
  const [mainVideoUrl, setMainVideoUrl] = useState<string>(project?.main_video_url || '')
  const [carouselUrls, setCarouselUrls] = useState<string[]>(initialCarousel)
  
  // Mode de sélection (main vs carousel) pour UI
  const [selectingFor, setSelectingFor] = useState<'main' | 'carousel'>('main')
  
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

  const handleSelectMedia = (url: string) => {
    if (selectingFor === 'main') {
      setMainVideoUrl(url)
    } else {
      if (!carouselUrls.includes(url)) {
        setCarouselUrls([...carouselUrls, url])
      }
    }
  }

  const handleRemoveCarouselVideo = (urlToRemove: string) => {
    setCarouselUrls(prev => prev.filter(url => url !== urlToRemove))
  }

  // Helper function pour générer le slug
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD') // Sépare les accents
      .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
      .replace(/[^a-z0-9]+/g, '-') // Remplace par des tirets
      .replace(/^-+|-+$/g, '') // Enlève tirets début/fin
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUploading(true)

    try {
      const expectedSlug = generateSlug(title)
      
      const projectData = {
        title,
        slug: expectedSlug,
        client,
        description: project?.description || '',
        rank,
        priority: priority || null,
        rotation,
        main_video_url: mainVideoUrl,
        video_url: mainVideoUrl, // Patcher la contrainte NOT NULL de l'ancienne DB
        carousel_urls: JSON.stringify(carouselUrls) // Stocker en string si la colonne est type Text
      }

      if (project?.id) {
        await supabase.from('projects').update(projectData).eq('id', project.id)
      } else {
        await supabase.from('projects').insert([projectData])
      }

      onSuccess()
    } catch (err: unknown) {
      alert(`Erreur d'édition : ${err instanceof Error ? err.message : String(err)}`)
      console.error(err)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 overflow-y-auto pt-20 pb-20">
      <div className="bg-zinc-950 border border-zinc-800 p-8 w-full max-w-4xl text-white font-mono my-auto flex gap-8">
        
        {/* Colonne de gauche: Formulaire textuel & current state */}
        <div className="flex-1 space-y-6">
          <h2 className="text-xl uppercase tracking-widest font-bold mb-6">
            {project ? 'Modifier le projet' : 'Nouveau Projet'}
          </h2>

          <div className="space-y-4">
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
            
            <div>
              <label className="block text-xs uppercase text-zinc-500 mb-1">Rang d&apos;affichage (1 = Premier)</label>
              <input 
                type="number" 
                value={rank}
                onChange={e => setRank(parseInt(e.target.value) || 0)}
                className="w-full bg-black border border-zinc-700 p-2 focus:border-white outline-none" 
              />
            </div>
            
            <div>
              <label className="block text-xs uppercase text-zinc-500 mb-1">Badge Privilège (Optionnel)</label>
              <select 
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full bg-black border border-zinc-700 p-2 focus:border-white outline-none text-zinc-300" 
              >
                <option value="">Aucun Poids (Tri Normal)</option>
                <option value="TOP 1">TOP 1 (Priorité MAX)</option>
                <option value="TOP 2">TOP 2 (Très Haute)</option>
                <option value="TOP 3">TOP 3 (Haute)</option>
                <option value="RAW">RAW (Intermédiaire)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs uppercase text-zinc-500 mb-1">Rotation Vidéo (en degrés)</label>
              <select 
                value={rotation}
                onChange={e => setRotation(parseInt(e.target.value) || 0)}
                className="w-full bg-black border border-zinc-700 p-2 focus:border-white outline-none text-zinc-300" 
              >
                <option value="0">0° (Normale)</option>
                <option value="90">90° (Tourner à droite)</option>
                <option value="180">180° (À l&apos;envers)</option>
                <option value="-90">-90° (Tourner à gauche)</option>
              </select>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-zinc-800">
            <div>
              <label className="block text-xs uppercase text-green-500 mb-1 font-bold">Vidéo Principale (Master)</label>
              {mainVideoUrl ? (
                <div className="flex items-center justify-between bg-green-950/20 border border-green-900 p-2 text-xs text-green-400 break-all">
                  <span>{mainVideoUrl.split('/').pop()}</span>
                  <button type="button" onClick={() => setMainVideoUrl('')} className="text-zinc-500 hover:text-red-500 px-2 ml-2">X</button>
                </div>
              ) : (
                <div className="text-xs text-zinc-600 italic">Aucune vidéo sélectionnée</div>
              )}
            </div>

            <div>
              <label className="block text-xs uppercase text-blue-500 mb-1 font-bold">Vidéos Additionnelles (Carrousel)</label>
              {carouselUrls.length > 0 ? (
                <div className="space-y-2">
                  {carouselUrls.map(url => (
                    <div key={url} className="flex items-center justify-between bg-blue-950/20 border border-blue-900 p-2 text-xs text-blue-400 break-all">
                       <span>{url.split('/').pop()}</span>
                       <button type="button" onClick={() => handleRemoveCarouselVideo(url)} className="text-zinc-500 hover:text-red-500 px-2 ml-2">X</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-zinc-600 italic">Aucune vidéo dans le carrousel</div>
              )}
            </div>
          </div>
          
          <div className="flex justify-start gap-4 mt-8 pt-8 border-t border-zinc-800">
            <button 
              type="button" 
              onClick={onClose}
              disabled={isUploading}
              className="px-6 py-2 uppercase tracking-wider text-sm border border-zinc-700 hover:text-white text-zinc-400 transition-colors"
            >
              Annuler
            </button>
            <button 
              onClick={handleSubmit}
              disabled={isUploading || !mainVideoUrl}
              className="px-6 py-2 uppercase tracking-wider text-sm bg-white text-black font-bold hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              {isUploading ? 'Sauvegarde...' : 'Enregistrer'}
            </button>
          </div>
        </div>

        {/* Colonne de droite: Médiathèque */}
        <div className="flex-1 bg-black border border-zinc-800 p-4 flex flex-col h-[600px]">
          <h3 className="text-sm uppercase tracking-widest text-zinc-400 mb-4 pb-2 border-b border-zinc-800">
            Bibliothèque Cloud
          </h3>

          <div className="flex gap-4 mb-4">
             <button 
               type="button"
               onClick={() => setSelectingFor('main')}
               className={`flex-1 py-2 text-xs uppercase tracking-wider transition-colors ${selectingFor === 'main' ? 'bg-green-600 text-white font-bold' : 'border border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}
             >
               Set Master
             </button>
             <button 
               type="button"
               onClick={() => setSelectingFor('carousel')}
               className={`flex-1 py-2 text-xs uppercase tracking-wider transition-colors ${selectingFor === 'carousel' ? 'bg-blue-600 text-white font-bold' : 'border border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}
             >
               Add to Carrousel
             </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1">
            {loadingMedia ? (
              <p className="text-sm text-zinc-500 uppercase p-4 text-center">Chargement...</p>
            ) : mediaList.length === 0 ? (
              <p className="text-xs text-zinc-500 p-4 text-center">Bucket vide ou erreur de lecture.</p>
            ) : (
              mediaList.map((media) => {
                const isMain = mainVideoUrl === media.url
                const isCarousel = carouselUrls.includes(media.url)
                
                let fileClass = 'text-zinc-400 hover:bg-zinc-900'
                if (isMain) fileClass = 'bg-green-950/40 text-green-400 border-l border-green-500 font-bold'
                else if (isCarousel) fileClass = 'bg-blue-950/40 text-blue-400 border-l border-blue-500'

                return (
                  <div 
                    key={media.name}
                    onClick={() => handleSelectMedia(media.url)}
                    className={`p-2 cursor-pointer text-xs truncate transition-colors px-3 ${fileClass}`}
                    title={media.name}
                  >
                    {media.name}
                  </div>
                )
              })
            )}
          </div>
          
          <div className="mt-4 pt-4 border-t border-zinc-800 text-xs text-zinc-500">
            * Clic sur un fichier Cloud pour l&apos;assigner à la sélection active. Actuellement l&apos;envoi de fichier depuis l&apos;UI locale est désactivé au profit de la sélection directe depuis le bucket pour le mapping V1.
          </div>
        </div>

      </div>
    </div>
  )
}

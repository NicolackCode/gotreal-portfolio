'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import Hls from 'hls.js'

type ProjectData = {
  id?: string
  title?: string
  category?: string
  client?: string
  description?: string
  main_video_url?: string
  carousel_urls?: string | string[]
  rank?: number
  priority?: string
  slug?: string
  rotation?: number
  thumbnail_url?: string
}

type ProjectFormProps = {
  project?: ProjectData | null
  onClose: () => void
  onSuccess: () => void
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
  const [category, setCategory] = useState(project?.category || '')
  const [client, setClient] = useState(project?.client || '')
  const [description, setDescription] = useState(project?.description || '')
  const [rank, setRank] = useState(project?.rank || 0)
  const [priority, setPriority] = useState(project?.priority || '')
  const [rotation, setRotation] = useState(project?.rotation || 0)
  
  // States des vidéos
  const [mainVideoUrl, setMainVideoUrl] = useState<string>(project?.main_video_url || '')
  const [thumbnailUrl, setThumbnailUrl] = useState<string>(project?.thumbnail_url || '')
  const [carouselUrls, setCarouselUrls] = useState<string[]>(initialCarousel)
  
  // Mode de sélection (main vs carousel) pour UI
  const [selectingFor, setSelectingFor] = useState<'main' | 'carousel'>('main')
  
  const [isUploading, setIsUploading] = useState(false)
  const supabase = createClient()
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // 📸 Utilitaire : Générer une miniature Canvas depuis un fichier Vidéo local
  const generateThumbnailFromVideo = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.autoplay = false
      video.muted = true
      video.playsInline = true
      video.src = URL.createObjectURL(file)

      video.onloadedmetadata = () => {
        // Avancer à 1 seconde ou à la moitié si vidéo courte
        video.currentTime = Math.min(1, video.duration / 2)
      }

      video.onseeked = () => {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          canvas.toBlob((blob) => {
            if (blob) {
              const fileName = file.name.replace(/\.[^/.]+$/, "") + "_thumbnail.jpg"
              const thumbnailFile = new File([blob], fileName, { type: 'image/jpeg' })
              resolve(thumbnailFile)
            } else {
              reject(new Error('Canvas toBlob failed'))
            }
          }, 'image/jpeg', 0.8) // Qualité 80%
        } else {
          reject(new Error('Pas de contexte Canvas'))
        }
        URL.revokeObjectURL(video.src)
      }

      video.onerror = (e) => {
        URL.revokeObjectURL(video.src)
        reject(e)
      }
    })
  }
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingMedia(true)
    setUploadError(null)

    try {
      // Si c'est pour la vidéo Master, on tente de générer la miniature d'abord
      let thumbnailFile: File | null = null
      if (selectingFor === 'main' && file.type.startsWith('video/')) {
         try {
           thumbnailFile = await generateThumbnailFromVideo(file)
         } catch (e) {
           console.warn("Impossible de générer la miniature (vidéo non supportée ou erreur locale)", e)
         }
      }

      // 1. Demander une URL signée au backend pour la vidéo (ou l'image carrousel)
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type })
      })

      if (!res.ok) {
        throw new Error('Erreur lors de la génération de l\'URL d\'upload')
      }

      const { signedUrl, publicUrl } = await res.json()

      // 2. Transférer le fichier (upload direct)
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      })

      if (!uploadRes.ok) {
        throw new Error('Erreur lors du transfert vers le serveur clould')
      }

      // Si miniature générée, on l'upload aussi !
      let finalThumbnailUrl = ''
      if (thumbnailFile) {
         const thumbRes = await fetch('/api/admin/upload', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ filename: thumbnailFile.name, contentType: thumbnailFile.type })
         })
         
         if (thumbRes.ok) {
             const { signedUrl: thumbSignedUrl, publicUrl: thumbPublicUrl } = await thumbRes.json()
             const thumbUploadRes = await fetch(thumbSignedUrl, {
               method: 'PUT',
               headers: { 'Content-Type': thumbnailFile.type },
               body: thumbnailFile
             })
             
             if (thumbUploadRes.ok) {
                finalThumbnailUrl = thumbPublicUrl
             }
         }
      }

      // 3. Mettre à jour l'état local dans le formulaire
      if (selectingFor === 'main') {
        setMainVideoUrl(publicUrl)
        if (finalThumbnailUrl) {
           setThumbnailUrl(finalThumbnailUrl)
        }
      } else {
        if (!carouselUrls.includes(publicUrl)) {
          setCarouselUrls([...carouselUrls, publicUrl])
        }
      }

    } catch (error) {
      console.error("Upload failed", error)
      setUploadError(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setIsUploadingMedia(false)
      // Reset input value pour permettre d'uploader le même fichier 2 fois si besoin
      e.target.value = ''
    }
  }

  // Mini-player pour preview la Master Video
  const videoRef = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    let hls: Hls | null = null
    if (mainVideoUrl && videoRef.current) {
       if (mainVideoUrl.includes('.m3u8') && Hls.isSupported()) {
          hls = new Hls({ autoStartLoad: true, startPosition: 0.1 })
          hls.loadSource(mainVideoUrl)
          hls.attachMedia(videoRef.current)
       } else {
          videoRef.current.src = `${mainVideoUrl}#t=0.1`
       }
    }
    return () => { if (hls) hls.destroy() }
  }, [mainVideoUrl])

  // Géré via l'upload
  // const handleSelectMedia = (url: string) => {...}

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

  const formatFriendlyName = (fullUrl: string) => {
    // Si ce n'est pas une URL, on return brut
    if (!fullUrl) return "Aucun fichier sélectionné"
    
    // Extrait le nom du répertoire ou du fichier
    // ex: https://storage.googleapis.com/.../Captations_Live/[RAW]_ANSWR.../v0/prog_index.m3u8
    // On veut "[RAW]_ANSWR..." ou au moins la fin clean.
    const parts = fullUrl.split('/');
    if (fullUrl.includes('.m3u8')) {
      // Pour les master playlists, le nom pertinent est 2 ou 3 dossiers au dessus généralement
      // ou on regarde si qq chose se termine par .m3u8 et on prend le parent.
      const m3u8Index = parts.findIndex(p => p.endsWith('.m3u8'));
      if (m3u8Index > 1) {
          // Si le parent immédiat est v0 ou hls, on prend le parent de ça
          if (parts[m3u8Index - 1] === 'v0' || parts[m3u8Index - 1] === 'hls' || parts[m3u8Index - 1] === 'v1' || parts[m3u8Index - 1] === 'v2') {
             return parts[m3u8Index - 2];
          }
          return parts[m3u8Index - 1];
      }
    }
    return parts[parts.length - 1]; // Fallback : juste le nom du fichier.
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUploading(true)

    try {
      const expectedSlug = generateSlug(title)
      
      const projectData = {
        title,
        slug: expectedSlug,
        category: category,
        client: client,
        description: description,
        rank,
        priority: priority || null,
        rotation,
        thumbnail_url: thumbnailUrl,
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
    <div className="fixed inset-0 bg-zinc-950 flex flex-col md:flex-row z-50 overflow-hidden animate-fade-in font-mono text-white">
      
      {/* Colonne de gauche: Formulaire Complet pleine hauteur */}
      <div className="flex-[1.5] flex flex-col overflow-y-auto custom-scrollbar p-6 sm:p-12 relative h-full bg-zinc-[950] border-r border-zinc-800 shadow-[20px_0_50px_rgba(0,0,0,0.5)] z-10">
        
        {/* Header Formulaire */}
        <div className="flex items-center justify-between mb-10 pb-6 border-b border-zinc-900">
          <h2 className="text-2xl sm:text-4xl uppercase tracking-[0.2em] font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500">
            {project ? 'ÉDITEUR' : 'CRÉATION'}
          </h2>
          <button 
             onClick={onClose} 
             className="text-zinc-600 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 w-10 h-10 rounded-full flex items-center justify-center transition-all"
          >
             ✕
          </button>
        </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase text-zinc-500 mb-1">Titre</label>
              <input 
                type="text" 
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg focus:border-cyan-500 focus:bg-zinc-800/50 transition-colors outline-none text-sm placeholder:text-zinc-600 shadow-inner" 
                placeholder="Ex: Titre du clip..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase text-zinc-500 mb-1.5 font-bold tracking-widest">Catégorie</label>
                <input 
                  type="text" 
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg focus:border-cyan-500 focus:bg-zinc-800/50 transition-colors outline-none text-sm shadow-inner" 
                />
              </div>
              
              <div>
                <label className="block text-[10px] uppercase text-zinc-500 mb-1.5 font-bold tracking-widest">Client / Marque</label>
                <input 
                  type="text" 
                  value={client}
                  onChange={e => setClient(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg focus:border-cyan-500 focus:bg-zinc-800/50 transition-colors outline-none text-sm shadow-inner" 
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase text-zinc-500 mb-1.5 font-bold tracking-widest">Description</label>
              <textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg focus:border-cyan-500 focus:bg-zinc-800/50 transition-colors outline-none text-sm placeholder:text-zinc-600 shadow-inner min-h-[100px] resize-y custom-scrollbar" 
                placeholder="Détails du projet, crédits..."
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
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase text-zinc-500 mb-1.5 font-bold tracking-widest">Badge</label>
                <select 
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg focus:border-cyan-500 transition-colors outline-none text-sm text-zinc-300 shadow-inner" 
                >
                  <option value="">Standard</option>
                  <option value="TOP 1">TOP 1 (Priorité MAX)</option>
                  <option value="TOP 2">TOP 2</option>
                  <option value="TOP 3">TOP 3</option>
                  <option value="RAW">RAW</option>
                </select>
              </div>
              
              <div>
                <label className="block text-[10px] uppercase text-zinc-500 mb-1.5 font-bold tracking-widest">Rotation</label>
                <select 
                  value={rotation}
                  onChange={e => setRotation(parseInt(e.target.value) || 0)}
                  className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg focus:border-cyan-500 transition-colors outline-none text-sm text-zinc-300 shadow-inner" 
                >
                  <option value="0">0° (Normale)</option>
                  <option value="90">90° (Droite)</option>
                  <option value="180">180° (Envers)</option>
                  <option value="-90">-90° (Gauche)</option>
                </select>
              </div>
            </div>
          </div>

          {/* VISUAL PREVIEW & MEDIA ASSIGNMENT : Plus Grand */}
          <div className="space-y-6 pt-10 mt-10 border-t border-zinc-900">
            <div>
              <label className="block text-[10px] uppercase text-cyan-500 mb-3 font-black tracking-[0.3em]">Master Vidéo</label>
              {mainVideoUrl ? (
                <div className="flex flex-col gap-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 shadow-inner">
                   <div className="w-full h-[25vh] bg-black rounded-xl overflow-hidden relative shadow-md">
                      <video ref={videoRef} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                      <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />
                      
                      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end gap-4">
                         <div className="flex-1 min-w-0">
                           <p className="text-[9px] text-cyan-500 font-bold tracking-widest uppercase mb-1 drop-shadow-md">Fichier Assigné :</p>
                           <p className="text-sm sm:text-base text-white font-bold truncate drop-shadow-md">{formatFriendlyName(mainVideoUrl)}</p>
                         </div>
                         <button type="button" onClick={() => setMainVideoUrl('')} className="bg-red-500/90 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg px-4 py-2 hover:bg-red-500 transition-colors shadow-lg flex-shrink-0">
                            ✕ DÉTACHER
                         </button>
                      </div>
                   </div>
                </div>
              ) : (
                <div className="h-[25vh] rounded-2xl border-2 border-dashed border-zinc-800 bg-zinc-900/20 flex flex-col items-center justify-center text-zinc-600 gap-4 hover:border-zinc-700 hover:bg-zinc-900/40 transition-colors">
                   <span className="text-4xl opacity-50">📂</span>
                   <span className="text-sm uppercase tracking-widest font-bold text-center px-4">Sélectionnez le fichier Source à droite dans la librairie</span>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-zinc-900/50">
              <label className="block text-[10px] uppercase text-zinc-500 mb-3 font-bold tracking-widest">Contenu Carrousel</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 {carouselUrls.length > 0 ? (
                   carouselUrls.map(url => (
                     <div key={url} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-300 shadow-sm group hover:border-zinc-700 transition-colors">
                        <span className="truncate mr-4 text-[10px] tracking-wide font-bold">{formatFriendlyName(url)}</span>
                        <button type="button" onClick={() => handleRemoveCarouselVideo(url)} className="text-zinc-600 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-all bg-zinc-950 rounded relative group-hover:scale-110 flex-shrink-0">✕</button>
                     </div>
                   ))
                 ) : (
                   <div className="col-span-full text-[10px] text-zinc-600 italic uppercase tracking-widest bg-zinc-900/20 border border-zinc-800/50 rounded-lg p-4 text-center">Aucune vidéo additionnelle définie</div>
                 )}
              </div>
            </div>
          </div>
          
          {/* CONTROL BUTTONS (Plus besoin du sticky car on gère l'overflow de la colonne) */}
          <div className="flex justify-between items-center mt-12 pt-8 border-t border-zinc-900">
            <button 
              type="button" 
              onClick={onClose}
              disabled={isUploading}
              className="px-6 py-4 uppercase tracking-widest text-xs font-bold border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900 text-zinc-500 hover:text-white rounded-xl transition-all"
            >
              Annuler
            </button>
            <button 
              onClick={handleSubmit}
              disabled={isUploading || !mainVideoUrl}
              className="px-10 py-4 uppercase tracking-widest text-xs bg-cyan-500 hover:bg-cyan-400 text-black font-black rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_rgba(34,211,238,0.3)] disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none"
            >
              {isUploading ? 'Sauvegarde...' : 'VALIDER ET ENREGISTRER'}
            </button>
          </div>
        </div>

        {/* Colonne de droite: Import Direct */}
        <div className="flex-1 bg-black flex flex-col h-full relative z-0">
          <div className="p-6 sm:p-12 pb-6 flex flex-col h-full border-l border-zinc-900 shadow-inner bg-gradient-to-b from-zinc-950 to-black">
             <div className="flex items-end justify-between mb-8 pb-6 border-b border-zinc-900">
               <div>
                  <h3 className="text-xl uppercase tracking-widest font-black text-white flex items-center gap-3">
                    Importer un Média
                  </h3>
                  <p className="text-[10px] text-zinc-500 mt-2 uppercase tracking-wide">Transféré directement vers le Cloud sécurisé.</p>
               </div>
             </div>

            <div className="flex gap-2 mb-8 relative z-10 p-1.5 bg-zinc-900 border border-zinc-800 rounded-xl">
               <button 
                 type="button"
                 onClick={() => setSelectingFor('main')}
                 className={`flex-1 py-3 text-[10px] uppercase tracking-widest rounded-lg transition-all font-bold ${selectingFor === 'main' ? 'bg-cyan-500 text-black shadow-lg' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'}`}
               >
                 ASSIGNER MASTER (Video principale)
               </button>
               <button 
                 type="button"
                 onClick={() => setSelectingFor('carousel')}
                 className={`flex-1 py-3 text-[10px] uppercase tracking-widest rounded-lg transition-all font-bold ${selectingFor === 'carousel' ? 'bg-cyan-500 text-black shadow-lg' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'}`}
               >
                 ASSIGNER AU CARROUSEL
               </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar relative z-10 pr-4 flex flex-col">
              
              {/* Zone Upload Drag&Drop */}
              <div className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 transition-colors text-center ${isUploadingMedia ? 'border-cyan-500 bg-cyan-500/10' : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/60'}`}>
                {isUploadingMedia ? (
                  <div className="flex flex-col items-center gap-6">
                    <div className="w-12 h-12 border-4 border-zinc-800 border-t-cyan-500 rounded-full animate-spin" />
                    <div className="flex flex-col gap-1">
                      <span className="text-sm uppercase font-bold tracking-[0.2em] text-cyan-500">Transfert en cours...</span>
                      <span className="text-[10px] text-zinc-500">Ne fermez pas cette page.</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="text-5xl opacity-40 mb-6 drop-shadow-md">📤</span>
                    <p className="text-sm font-bold text-white uppercase tracking-widest mb-2">Sélectionner un fichier</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-8">.mp4, .mov, ou images supportés</p>
                    
                    <label className="bg-white hover:bg-zinc-200 text-black text-xs font-black uppercase tracking-widest px-8 py-4 rounded-xl hover:scale-105 transition-transform cursor-pointer shadow-xl">
                      Parcourir votre ordinateur
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="video/mp4,video/quicktime,image/*" 
                        onChange={handleFileUpload} 
                        disabled={isUploadingMedia}
                      />
                    </label>
                  </>
                )}
              </div>

              {/* Affichage Error */}
              {uploadError && (
                 <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs p-4 rounded-xl text-center font-bold uppercase tracking-widest">
                    {uploadError}
                 </div>
              )}

            </div>
          </div>
        </div>

    </div>
  )
}

'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

type ProjectFormProps = {
  project?: any
  onClose: () => void
  onSuccess: () => void
}

export default function ProjectForm({ project, onClose, onSuccess }: ProjectFormProps) {
  const [title, setTitle] = useState(project?.title || '')
  const [client, setClient] = useState(project?.client || '')
  const [description, setDescription] = useState(project?.description || '')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUploading(true)

    try {
      let videoUrl = project?.video_url

      // Si l'admin a uploadé une nouvelle vidéo, on l'envoie via notre API route vers GCP
      if (videoFile) {
        const formData = new FormData()
        formData.append('file', videoFile)
        
        const uploadRes = await fetch('/api/admin/upload', {
          method: 'POST',
          body: formData
        })
        
        if (!uploadRes.ok) throw new Error('Video upload to GCP failed')
        const uploadData = await uploadRes.json()
        videoUrl = uploadData.url
      }

      const projectData = {
        title,
        client,
        description,
        video_url: videoUrl || ''
      }

      if (project?.id) {
        // Update
        await supabase.from('projects').update(projectData).eq('id', project.id)
      } else {
        // Insert
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
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-950 border border-zinc-800 p-8 w-full max-w-2xl text-white font-mono">
        <h2 className="text-xl uppercase tracking-widest font-bold mb-6">
          {project ? 'Edit Project' : 'New Project'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase text-zinc-500 mb-1">Title</label>
            <input 
              type="text" 
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-black border border-zinc-700 p-2 focus:border-white outline-none" 
            />
          </div>
          
          <div>
            <label className="block text-xs uppercase text-zinc-500 mb-1">Client / Brand</label>
            <input 
              type="text" 
              value={client}
              onChange={e => setClient(e.target.value)}
              className="w-full bg-black border border-zinc-700 p-2 focus:border-white outline-none" 
            />
          </div>

          <div>
            <label className="block text-xs uppercase text-zinc-500 mb-1">Video File (Google Cloud Upload)</label>
            <input 
              type="file" 
              accept="video/mp4,video/webm"
              onChange={e => setVideoFile(e.target.files?.[0] || null)}
              className="w-full bg-black border border-zinc-700 p-2 focus:border-white outline-none text-sm" 
              required={!project} // Required seulement si nouveau projet
            />
            {project?.video_url && !videoFile && (
              <p className="text-xs text-zinc-500 mt-1">Current: {project.video_url}</p>
            )}
          </div>

          <div className="flex justify-end gap-4 mt-8">
            <button 
              type="button" 
              onClick={onClose}
              disabled={isUploading}
              className="px-6 py-2 uppercase tracking-wider text-sm border border-zinc-700 hover:text-white text-zinc-400 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isUploading}
              className="px-6 py-2 uppercase tracking-wider text-sm bg-white text-black font-bold hover:bg-zinc-200 transition-colors"
            >
              {isUploading ? 'Uploading & Saving...' : 'Save Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

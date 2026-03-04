'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import ProjectForm from '@/components/admin/ProjectForm'
import GridEditor from './GridEditor'

export default function DashboardPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentEditProject, setCurrentEditProject] = useState<any | null>(null)
  
  const supabase = createClient()

  const loadProjects = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('client', { ascending: true })
      .order('rank', { ascending: true })

    if (error) {
      console.error("Supabase loadProjects error:", error.message, error.details)
    }

    if (!error && data) {
      setProjects(data)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    loadProjects()
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEdit = (project: any) => {
    setCurrentEditProject(project)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${title} ?`)) {
      await supabase.from('projects').delete().eq('id', id)
      loadProjects()
    }
  }

  return (
    <div className="space-y-8">
      {/* EN TÊTE / ACTIONS PRINCIPALES */}
      <div className="flex flex-col sm:flex-row gap-4 border-b border-zinc-800 mb-8 pb-4 items-center justify-between">
        <p className="text-zinc-500 uppercase tracking-widest text-xs">Vue consolidée d&apos;édition</p>
        <div className="flex gap-4">
           <button 
             onClick={() => {
               setCurrentEditProject(null)
               setIsFormOpen(true)
             }}
             className="bg-white text-black px-4 py-2 text-sm uppercase font-bold hover:bg-zinc-200 transition-colors"
           >
             + Nouveau Projet
           </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-zinc-500 uppercase tracking-widest text-sm">
          Chargement...
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 uppercase tracking-widest text-sm border border-dashed border-zinc-800">
          Aucun projet trouvé. Créez-en un ou importez vos projets.
        </div>
      ) : (
        <GridEditor 
          initialProjects={projects!} 
          onUpdate={loadProjects} 
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {isFormOpen && (
        <ProjectForm 
          project={currentEditProject}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => {
            setIsFormOpen(false)
            loadProjects()
          }}
        />
      )}
    </div>
  )
}


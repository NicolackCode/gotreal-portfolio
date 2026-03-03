'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import ProjectForm from '@/components/admin/ProjectForm'

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
      .order('rank', { ascending: true })

    if (!error && data) {
      setProjects(data)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

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
      <div>
        <h1 className="text-3xl uppercase tracking-widest font-bold mb-2">Portfolio GOTREAL</h1>
        <p className="text-zinc-400 text-sm">Gérez l&apos;ordre et l&apos;affichage des vidéos sur la page d&apos;accueil.</p>
      </div>

      <div className="bg-zinc-950 border border-zinc-800 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg uppercase tracking-wider">Vidéos Actives</h2>
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

        {loading ? (
          <div className="text-center py-12 text-zinc-500 uppercase tracking-widest text-sm">
            Chargement...
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 uppercase tracking-widest text-sm border border-dashed border-zinc-800">
            Aucun projet trouvé. Créez-en un.
          </div>
        ) : (
          <ul className="space-y-2">
            {projects.map((proj) => (
              <li key={proj.id} className="border border-zinc-800 p-4 flex justify-between items-center bg-black hover:bg-zinc-900 transition-colors">
                <div>
                  <h3 className="uppercase tracking-wider font-bold">{proj.title}</h3>
                  <p className="text-xs text-zinc-500 mt-1">{proj.client}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEdit(proj)}
                    className="text-xs text-zinc-400 hover:text-white uppercase tracking-wider px-2 py-1"
                  >
                    Modifier
                  </button>
                  <button 
                    onClick={() => handleDelete(proj.id, proj.title)}
                    className="text-xs text-red-500 hover:text-red-400 uppercase tracking-wider px-2 py-1"
                  >
                    Suppr
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

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


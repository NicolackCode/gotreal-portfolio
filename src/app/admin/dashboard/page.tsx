'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import ProjectForm from '@/components/admin/ProjectForm'

export default function DashboardPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [currentEditProject, setCurrentEditProject] = useState<any | null>(null)
  
  const supabase = createClient()

  const loadProjects = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('rank', { ascending: true })

    if (!error && data) {
      setProjects(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const handleEdit = (project: any) => {
    setCurrentEditProject(project)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete ${title}?`)) {
      await supabase.from('projects').delete().eq('id', id)
      loadProjects()
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl uppercase tracking-widest font-bold mb-2">Projects Overview</h1>
        <p className="text-zinc-400 text-sm">Gérez l'ordre et l'affichage des vidéos sur la page d'accueil.</p>
      </div>

      <div className="bg-zinc-950 border border-zinc-800 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg uppercase tracking-wider">Active Projects List</h2>
          <button 
            onClick={() => {
              setCurrentEditProject(null)
              setIsFormOpen(true)
            }}
            className="bg-white text-black px-4 py-2 text-sm uppercase font-bold hover:bg-zinc-200 transition-colors"
          >
            + New Project
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-zinc-500 uppercase tracking-widest text-sm">
            Loading data...
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 uppercase tracking-widest text-sm border border-dashed border-zinc-800">
            No projects found. Create one.
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
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(proj.id, proj.title)}
                    className="text-xs text-red-500 hover:text-red-400 uppercase tracking-wider px-2 py-1"
                  >
                    Del
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

'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import ProjectForm from '@/components/admin/ProjectForm'

interface Project {
  id: string;
  title: string;
  category: string;
  client?: string;
  description: string;
  main_video_url: string;
  carousel_urls: string[];
  rank: number;
}

export default function MediaPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [currentEditProject, setCurrentEditProject] = useState<Project | null>(null)
  
  const supabase = createClient()

  const loadProjects = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('rank', { ascending: true })

    if (!error && data) {
      setProjects(data as Project[])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const handleEdit = (project: Project) => {
    setCurrentEditProject(project)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${title} ?`)) {
      await supabase.from('projects').delete().eq('id', id)
      loadProjects()
    }
  }

  // Grouper les projets par Catégorie
  const groupedProjects = projects.reduce((acc, project) => {
    const category = project.category || 'Sans Catégorie'
    if (!acc[category]) acc[category] = []
    acc[category].push(project)
    return acc
  }, {} as Record<string, Project[]>)

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl uppercase tracking-widest font-bold mb-2">Médiathèque Visuelle</h1>
          <p className="text-zinc-400 text-sm">Gérez et visualisez vos projets classés par catégorie.</p>
        </div>
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
          Chargement de la galerie...
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 uppercase tracking-widest text-sm border border-dashed border-zinc-800">
          Aucune vidéo trouvée.
        </div>
      ) : (
        <div className="space-y-12">
          {Object.entries(groupedProjects).map(([category, categoryProjects]) => (
            <div key={category} className="space-y-4">
              <h2 className="text-xl uppercase tracking-widest border-b border-zinc-800 pb-2 text-zinc-300">
                {category} <span className="text-zinc-600 text-sm ml-2">({categoryProjects.length})</span>
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryProjects.map((proj) => (
                  <div 
                    key={proj.id} 
                    className="group bg-zinc-950 border border-zinc-800 overflow-hidden relative cursor-pointer flex flex-col transition-all hover:border-zinc-500"
                    onClick={() => handleEdit(proj)}
                  >
                    {/* Zone d'aperçu Vidéo (16:9) */}
                    <div className="relative aspect-video bg-black w-full overflow-hidden">
                      {proj.main_video_url ? (
                        <video 
                          src={`${proj.main_video_url}#t=3`}
                          muted
                          loop
                          playsInline
                          preload="metadata"
                          className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                          onMouseEnter={(e) => e.currentTarget.play()}
                          onMouseLeave={(e) => {
                            e.currentTarget.pause()
                            e.currentTarget.currentTime = 3
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs uppercase bg-zinc-900 font-mono">
                          Aucune Vidéo Associée
                        </div>
                      )}
                      
                      {/* Badge Carrousel */}
                      {proj.carousel_urls && proj.carousel_urls.length > 0 && (
                        <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 text-[10px] text-white uppercase font-bold border border-zinc-700">
                         +{proj.carousel_urls.length} media
                        </div>
                      )}
                    </div>

                    {/* Infos bas de carte */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="uppercase tracking-wider font-bold text-sm truncate">{proj.title}</h3>
                        <p className="text-xs text-zinc-500 mt-1">Rang d&apos;affichage: <span className="text-zinc-300 font-mono">{proj.rank}</span></p>
                      </div>
                      
                      <div className="flex gap-4 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs text-white uppercase tracking-wider underline underline-offset-4">Éditer</span>
                        <button 
                          className="text-xs text-red-500 hover:text-red-400 uppercase tracking-wider underline underline-offset-4"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(proj.id, proj.title);
                          }}
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
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

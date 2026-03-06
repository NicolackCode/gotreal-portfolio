'use client'

import React, { useState, useCallback, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable'
import { SortableProjectCard } from './SortableProjectCard'
import { updateProjectsGridRank, createGadget, deleteGadget } from '@/app/actions/grid-actions'
import ProjectForm from '@/components/admin/ProjectForm'

export interface Project {
  id: string
  title: string
  category: string
  client?: string
  main_video_url?: string
  carousel_urls?: string[]
  thumbnail_url?: string
  rotation?: number
  forced_span?: string
}

// Reproduction de la grille de la home
const GridContainer = ({ children }: { children: React.ReactNode }) => (
  // Grille super fine (24 colonnes) pour un contrôle maximal. grid-flow-dense pour boucher les trous
  <div className="w-full grid grid-cols-6 md:grid-cols-12 xl:grid-cols-24 gap-[4px] auto-rows-[20px] grid-flow-dense pb-24">
    {children}
  </div>
)

export default function DraggableGrid({ initialProjects }: { initialProjects: Project[] }) {
  const [items, setItems] = useState<Project[]>(initialProjects)
  
  // NOUVEAU : État du Filtre Catégorie
  const [activeFilter, setActiveFilter] = useState('TOUT')
  
  // Historique pour l'Undo/Redo
  const [history, setHistory] = useState<Project[][]>([initialProjects])
  const [historyIndex, setHistoryIndex] = useState(0)

  // Status sauvegarde
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  // Édition
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [currentEditProject, setCurrentEditProject] = useState<Project | null>(null)
  
  // Gadget
  const [isCreatingGadget, setIsCreatingGadget] = useState(false)

  // Configuration DndKit Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 5, // 5px de tolérance pour cliquer sans dragger
        }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Extraire les catégories via useMemo (identique à All Projects)
  const categories = React.useMemo(() => {
    if (!items) return []
    const catList = items.map(p => (p.category || p.client)?.trim().toUpperCase()).filter((c): c is string => Boolean(c))
    const uniqueCat = Array.from(new Set(catList))
    return uniqueCat.sort()
  }, [items])

  // Gestion du Drag&Drop : On insère l'item à sa nouvelle place et on enregistre l'historique
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id)
        const newIndex = items.findIndex(item => item.id === over.id)
        
        const newItems = arrayMove(items, oldIndex, newIndex)
        
        // Pousse dans l'historique (efface le futur si on était revenu en arrière)
        const nextHistory = history.slice(0, historyIndex + 1)
        nextHistory.push(newItems)
        setHistory(nextHistory)
        setHistoryIndex(nextHistory.length - 1)

        setSaveStatus(null)
        return newItems
      })
    }
  }, [history, historyIndex])

  // --- ACTIONS PANNEAU DE CONTRÔLE ---
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1)
      setItems(history[historyIndex - 1])
      setSaveStatus(null)
    }
  }, [historyIndex, history])

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1)
      setItems(history[historyIndex + 1])
      setSaveStatus(null)
    }
  }, [historyIndex, history])

  const handleReset = () => {
    setItems(initialProjects)
    setHistory([initialProjects])
    setHistoryIndex(0)
    setSaveStatus(null)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus('Sauvegarde en cours...')
    
    // On extrait les infos nécessaires
    const updatesData = items.map(item => ({ id: item.id, forced_span: item.forced_span }))
    
    const res = await updateProjectsGridRank(updatesData)
    
    if (res.success) {
       setSaveStatus('✅ Sauvegarde avec succès ! La grille publique est à jour.')
    } else {
       setSaveStatus(`❌ Erreur: ${res.error}`)
    }
    
    setIsSaving(false)
  }

  const handleAddGadget = async () => {
     setIsCreatingGadget(true)
     setSaveStatus('Création du gadget système...')
     
     const res = await createGadget()
     if (res.success && res.project) {
        setSaveStatus('✅ Gadget ajouté ! Il est tout en bas.')
        // On ajoute le bloc à la fin du state local
        const newItems = [...items, res.project]
        setItems(newItems)
        const nextHistory = history.slice(0, historyIndex + 1)
        nextHistory.push(newItems)
        setHistory(nextHistory)
        setHistoryIndex(nextHistory.length - 1)
     } else {
        setSaveStatus(`❌ Erreur: ${res.error}`)
     }
     
     setIsCreatingGadget(false)
  }

  // Support Clavier Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Mac
      if (e.metaKey && e.shiftKey && e.key === 'z') { e.preventDefault(); handleRedo(); }
      else if (e.metaKey && e.key === 'z') { e.preventDefault(); handleUndo(); }
      // PC
      else if (e.ctrlKey && e.key === 'y') { e.preventDefault(); handleRedo(); }
      else if (e.ctrlKey && e.key === 'z') { e.preventDefault(); handleUndo(); }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo])

  const hasUnsavedChanges = JSON.stringify(items.map(i => i.id)) !== JSON.stringify(initialProjects.map(i => i.id))

  return (
    <div>
      {/* MENU FILTRES CATEGORIES (Même design que la vue publique) */}
      {categories.length > 0 && (
        <div className="flex flex-col items-center justify-center mb-8 px-4">
          <button
            onClick={() => setActiveFilter('TOUT')}
            className={`text-sm md:text-base font-sans font-black tracking-widest uppercase px-4 py-2 mb-8 transition-colors ${
              activeFilter === 'TOUT' 
                ? 'text-white border-b-2 border-red-500' // Rouge pour l'admin
                : 'text-zinc-600 hover:text-zinc-300 border-b-2 border-transparent hover:border-zinc-700'
            }`}
          >
            TOUT
          </button>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 w-full px-4">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`text-[10px] md:text-xs font-sans font-bold tracking-widest uppercase px-1 py-1 transition-colors ${
                  activeFilter === cat 
                    ? 'text-white border-b-2 border-red-500' // Rouge pour l'admin 
                    : 'text-zinc-600 hover:text-zinc-300 border-b-2 border-transparent hover:border-zinc-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TOOLBAR CONTROLES FIXE */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur border border-zinc-800 p-4 mb-8 flex flex-wrap items-center justify-between gap-4 shadow-2xl w-full">
        <div className="flex items-center gap-2">
           <button 
             onClick={handleUndo} 
             disabled={historyIndex === 0}
             className="px-3 py-2 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed font-mono text-xs text-white"
             title="Ctrl+Z"
           >
             &#x21BA; ANNULER
           </button>
           <button 
             onClick={handleRedo} 
             disabled={historyIndex === history.length - 1}
             className="px-3 py-2 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed font-mono text-xs text-white"
             title="Ctrl+Y"
           >
             &#x21BB; RÉTABLIR
           </button>
           <button 
             onClick={handleReset} 
             disabled={!hasUnsavedChanges}
             className="px-3 py-2 ml-4 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed font-mono text-xs uppercase"
           >
             Réinitialiser DB
           </button>
        </div>

        <div className="flex items-center gap-4">
           {saveStatus && (
              <span className={`font-mono text-xs ${saveStatus.includes('✅') ? 'text-green-400' : saveStatus.includes('❌') ? 'text-red-400' : 'text-zinc-400 animate-pulse'}`}>
                 {saveStatus}
              </span>
           )}
           <button 
             onClick={handleAddGadget} 
             disabled={isCreatingGadget}
             className="px-4 py-2 border border-blue-500/50 text-blue-400 hover:bg-blue-900/30 hover:text-blue-300 font-mono text-xs uppercase transition-colors disabled:opacity-50"
             title="Ajouter un bloc fictif pour boucher un trou"
           >
             {isCreatingGadget ? 'MOLDING...' : '+ AJOUTER GADGET'}
           </button>
           <button 
             onClick={handleSave} 
             disabled={!hasUnsavedChanges || isSaving}
             className="px-6 py-2 bg-white text-black font-black font-sans text-xs sm:text-sm uppercase tracking-widest hover:bg-gray-200 disabled:bg-zinc-700 disabled:text-zinc-500 transition-colors"
           >
             {isSaving ? 'SAUVEGARDE...' : 'PUBLIER LA GRILLE'}
           </button>
        </div>
      </div>

      {/* DND KIT WRAPPER */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map(i => i.id)}
          strategy={rectSortingStrategy} // ESSENTIEL POUR GRILLE 2D CSS GRID !
        >
          <GridContainer>
            {items.map((project, index) => {
              const matchesFilter = activeFilter === 'TOUT' || (project.category || project.client)?.trim().toUpperCase() === activeFilter;
              
              return (
                <SortableProjectCard 
                  key={project.id} 
                  id={project.id} 
                  project={project} 
                  index={index} // l'index est primordial pour que la carte calcule sa propre taille Bento
                  isActive={matchesFilter} // Filtre d'opacité
                  onEdit={(p) => {
                    setCurrentEditProject(p as Project)
                    setIsFormOpen(true)
                  }}
                  onResize={(id, newSpan, isFinal) => {
                    setItems(prevItems => {
                      const newItems = prevItems.map(p => p.id === id ? { ...p, forced_span: newSpan } : p)
                      
                      if (isFinal) {
                         // Pousse dans l'historique
                         const nextHistory = history.slice(0, historyIndex + 1)
                         nextHistory.push(newItems)
                         setHistory(nextHistory)
                         setHistoryIndex(nextHistory.length - 1)
                      }
                      
                      return newItems
                    })
                    setSaveStatus(null)
                  }}
                  onDeleteGadget={async (idToDelete) => {
                     if (!window.confirm("Supprimer ce gadget vide ?")) return;
                     
                     // Construit le nouvel array sans le gadget à supprimer (Optimistic UI)
                     const newItems = items.filter(p => p.id !== idToDelete);
                     setItems(newItems);
                     
                     setSaveStatus('Suppression côté serveur...');
                     const res = await deleteGadget(idToDelete);
                     
                     if (res.success) {
                        setSaveStatus('✅ Gadget supprimé avec succès.');
                        // Enregistrement dans l'historique Ctrl+Z
                        const nextHistory = history.slice(0, historyIndex + 1);
                        nextHistory.push(newItems);
                        setHistory(nextHistory);
                        setHistoryIndex(nextHistory.length - 1);
                     } else {
                        setSaveStatus(`❌ Erreur lors de la suppression: ${res.error}`);
                     }
                  }}
                />
              )
            })}
          </GridContainer>
        </SortableContext>
      </DndContext>

      {/* FORMULAIRE D'ÉDITION */}
      {isFormOpen && (
        <ProjectForm
          project={currentEditProject}
          onClose={() => {
            setIsFormOpen(false)
            setCurrentEditProject(null)
          }}
          onSuccess={() => {
            // Recharge douce de la page pour rafraîchir les modifications serveur (image, etc)
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}

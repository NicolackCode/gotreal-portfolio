'use client'

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Reprend l'interface requise par DndKit
interface SortableProjectCardProps {
  id: string
  project: {
    id: string
    title: string
    category: string
    client?: string
    main_video_url?: string
    carousel_urls?: string[]
    thumbnail_url?: string
    rotation?: number
  }
  index: number // Très important pour connaitre la taille (algoritme Bento)
  isActive?: boolean // NOUVEAU: Permet de griser la carte si elle ne matche pas le filtre externe
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEdit?: (project: any) => void
}

const getGridSpanAdmin = (isVert: boolean, i: number) => {
   if (isVert) {
      // VERTICAL (Portrait): Max = 2x3, Min = 1x2
      if (i % 4 === 0) return "col-span-2 row-span-3"
      return "col-span-1 row-span-2"
   }
   // HORIZONTAL (Paysage): Max = 3x2, Min = 2x1
   if (i % 6 === 0) return "col-span-3 row-span-2"
   return "col-span-2 row-span-1"
}

export function SortableProjectCard({ id, project, index, isActive = true, onEdit }: SortableProjectCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.8 : (isActive ? 1 : 0.2), // Grise la carte si !isActive
    filter: isActive ? 'none' : 'grayscale(100%)', // Sature encore plus l'effet "non-sélectionné"
  }

  // Calcul du format basé sur BDD + Fallbacks (Exactement comme la Home)
  const isRotatedVertical = project.rotation === 90 || project.rotation === -90 || project.rotation === 270;
  const fallbackIsNativeVert = project.client?.toLowerCase().includes('reel') || project.client?.toLowerCase().includes('tiktok') || project.category?.toLowerCase().includes('reel') || project.category?.toLowerCase().includes('tiktok');
  const isVertical = isRotatedVertical || fallbackIsNativeVert;

  const spanClasses = getGridSpanAdmin(isVertical, index);
  
  // Utilisation d'une miniature si existante, sinon noir
  const getThumbnail = () => {
    if (!project.carousel_urls || !Array.isArray(project.carousel_urls) || project.carousel_urls.length === 0) return null;
    
    // On trouve la première image Jpg/Pn/Webp
    const imgUrl = project.carousel_urls.find(u => 
       u && (
         u.toLowerCase().endsWith('.jpg') || 
         u.toLowerCase().endsWith('.jpeg') || 
         u.toLowerCase().endsWith('.png') || 
         u.toLowerCase().endsWith('.webp')
       )
    );
    return imgUrl || null;
  }
  
  const thumbnail = project.thumbnail_url || getThumbnail();

  // --- VIDEO ENTIEREMENT SUPPRIMÉE EN ADMIN POUR DES PERFORMANCES TOTALES ---
  // L'admin ne sert qu'à trier. Inutile de charger 40 flux HLS en simultané et de faire exploser la RAM.
  // Seule la miniature est utilisée.

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative cursor-grab active:cursor-grabbing w-full h-full bg-zinc-900 border ${isDragging ? 'border-pink-500 shadow-2xl scale-105' : 'border-zinc-800 hover:border-zinc-600'} transition-colors overflow-hidden ${spanClasses}`}
    >
      {/* BACKGROUND IMAGE (Preview hyper fluide et statique) */}
      {thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbnail} alt={project.title} className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-screen pointer-events-none" />
      ) : (
         <div className="absolute inset-0 bg-gradient-to-tr from-zinc-900 to-zinc-800" />
      )}
      
      {/* INFOS PROJET */}
      <div className="absolute inset-x-2 bottom-2 text-white pointer-events-none">
        <p className="font-sans font-black text-xs md:text-sm uppercase leading-tight truncate">
            {project.title}
        </p>
        <p className="font-mono text-[8px] md:text-[10px] text-zinc-400 capitalize">
            {project.client || project.category || 'Non classé'}
        </p>
      </div>

      {/* MODE DEBUG SOFT ADMIN : Affiche les métadonnées de Grille (Bento Size) */}
      <div className="absolute bottom-2 right-2 z-40 bg-black/50 backdrop-blur-sm text-white/50 text-[8px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded pointer-events-none uppercase tracking-widest transition-opacity group-hover:opacity-0 group-hover:z-0">
        {spanClasses.split(' ').map((c: string) => c.replace('col-span-', 'C').replace('row-span-', 'R').replace('md:', '').replace('xl:', '')).join(', ')}
      </div>

      {/* BOUTON EDIT */}
      {onEdit && (
        <button
          className="absolute top-2 right-2 z-50 bg-black/80 hover:bg-white text-white hover:text-black p-2 border border-zinc-700 transition-colors cursor-pointer pointer-events-auto shadow-xl"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(project);
          }}
          onPointerDown={(e) => e.stopPropagation()} // Important pour empêcher DndKit de prendre le focus
        >
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      )}

    </div>
  )
}

'use client'

import React, { useState, useEffect } from 'react'
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
    forced_span?: string
  }
  index: number // Très important pour connaitre la taille (algoritme Bento)
  isActive?: boolean // NOUVEAU: Permet de griser la carte si elle ne matche pas le filtre externe
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEdit?: (project: any) => void
  onResize?: (id: string, newSpan: string, isFinal: boolean) => void
  onDeleteGadget?: (id: string) => void
  autoPackedSpan?: string // Span injecté dynamiquement par le Liquid Fill algorithmique
}

const getGridSpanAdmin = (isVert: boolean) => {
   if (isVert) {
      // VERTICAL (Portrait 9:16): 4 colonnes, la hauteur sera calculée à la volée.
      return "col-span-2 md:col-span-4" 
   }
   // HORIZONTAL (Paysage 16:9): 8 colonnes, la hauteur sera calculée à la volée.
   return "col-span-4 md:col-span-8"
}

// Transforme la chaine "col-span-X row-span-Y" en variables CSS pour contourner le purger de Tailwind
const parseSpanStyles = (spanString: string): React.CSSProperties => {
  const vars: Record<string, string> = {};
  if (!spanString) return vars;
  const parts = spanString.trim().split(/\s+/);
  for (const part of parts) {
    const colMatch = part.match(/^(?:(md|xl):)?col-span-(\d+)$/);
    if (colMatch) {
      const prefix = colMatch[1] ? `--${colMatch[1]}-col-span` : '--col-span';
      vars[prefix] = colMatch[2];
    }
    const rowMatch = part.match(/^(?:(md|xl):)?row-span-(\d+)$/);
    if (rowMatch) {
      const prefix = rowMatch[1] ? `--${rowMatch[1]}-row-span` : '--row-span';
      vars[prefix] = rowMatch[2];
    }
  }
  return vars as React.CSSProperties;
}

export function SortableProjectCard({ id, project, isActive = true, onEdit, onResize, onDeleteGadget, autoPackedSpan }: SortableProjectCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id })

  const [naturalVertical, setNaturalVertical] = useState<boolean | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isHovered && project.category === 'GADGET' && (e.key === 'Delete' || e.key === 'Backspace')) {
        if (onDeleteGadget) {
           onDeleteGadget(project.id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHovered, project.category, project.id, onDeleteGadget]);


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
  const fallbackIsVertical = isRotatedVertical || fallbackIsNativeVert;

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

  useEffect(() => {
    if (thumbnail) {
      const img = new Image();
      img.onload = () => {
         // Détecte physiquement si l'image est verticale pour un respect 1:1 de la home
         let isVert = false;
         if (isRotatedVertical) {
             isVert = img.naturalWidth > img.naturalHeight; // Inversé
         } else {
             isVert = img.naturalHeight > img.naturalWidth;
         }
         setNaturalVertical(isVert);
      };
      img.src = thumbnail;
    }
  }, [thumbnail, isRotatedVertical]);

  const isVertical = naturalVertical !== null ? naturalVertical : fallbackIsVertical;

  // Priorité absolue au Span généré par le Bin Packing dynamique pour les Gadgets, sinon forced_span BDD, sinon naturel.
  const spanClasses = autoPackedSpan || project.forced_span || getGridSpanAdmin(isVertical);
  
  // NOUVEAU: Logique de redimensionnement de la carte (Handle) AVEC RATIO VERROUILLÉ ET COMPENSATION
  const [isResizing, setIsResizing] = useState(false);
  const [resizeOffset, setResizeOffset] = useState({ x: 0, y: 0 }); // Offset visuel pour les drags Haut/Gauche
  
  // On récupère ou on génère le Span X et Y
  // Analyse de la classe "spanClasses" courante
  const matchCols = spanClasses.match(/col-[xs-]*span-(\d+)/);
  const matchRows = spanClasses.match(/row-[xs-]*span-(\d+)/);
  
  // Par défaut, X est extrait. 
  // ATTENTION: La queue 'md:col-span-4' prime sur 'col-span-2' dans admin desktop.
  const desktopColMatch = spanClasses.match(/md:col-span-(\d+)/);
  const currentCols = desktopColMatch ? parseInt(desktopColMatch[1], 10) : (matchCols ? parseInt(matchCols[1], 10) : (isVertical ? 4 : 8));
  
  // On retient le ratio (le facteur Y par rapport à X)
  const ratioFactor = isVertical ? 1.77 : 0.56;
  const rowUnitColMapping = 4; // 1 colonne de largeur = ~4 rows de hauteur (80px x 20px)
  const defaultCalculatedRows = Math.round(currentCols * rowUnitColMapping * ratioFactor);
  
  const currentRows = matchRows ? parseInt(matchRows[1], 10) : defaultCalculatedRows;

  // dirX/dirY : -1 pour drag vers le Haut ou la Gauche, 1 pour drag Bas ou Droite.
  const handleResizePointerDown = (e: React.PointerEvent, dirX: number, dirY: number) => {
     e.stopPropagation(); 
     e.currentTarget.setPointerCapture(e.pointerId); 
     setIsResizing(true);
     
     const startX = e.clientX;
     const startY = e.clientY;
     let scaleCols = currentCols;
     let scaleRows = currentRows;

     // Drag X proportionnel à la taille courante de la colonne en CSS Grid !
     const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
     const dragSensitivityX = Math.max(20, rect.width / currentCols); 
     const rowSizeInPixels = 24; // auto-rows-[20px] + gap-[4px]

     // Fonction d'aide pour générer un Grid Span responsive sûr (évite que Desktop casse Mobile)
     const getResponsiveSpan = (cols: number, rows: number) => {
         const mobileCols = Math.max(1, Math.min(6, Math.round(cols / 4)));
         const mobileRows = Math.max(1, Math.round(rows / 4));
         const mdCols = Math.max(1, Math.min(12, Math.round(cols / 2)));
         const mdRows = Math.max(1, Math.round(rows / 2));
         return `col-span-${mobileCols} row-span-${mobileRows} md:col-span-${mdCols} md:row-span-${mdRows} xl:col-span-${cols} xl:row-span-${rows}`;
     };

     const handlePointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        
        let newCols = currentCols;
        let newRows = currentRows;

        if (project.category === 'GADGET') {
           // RESIZE 100% LIBRE POUR LES GADGETS (Aucun verrou de ratio)
           const distanceCols = Math.round((deltaX * dirX) / dragSensitivityX);
           const distanceRows = Math.round((deltaY * dirY) / rowSizeInPixels);
           
           newCols = Math.max(1, Math.min(24, currentCols + distanceCols)); 
           newRows = Math.max(2, currentRows + distanceRows); // Minimum 2 rows
        } else {
           // RESIZE VERROUILLÉ MATHÉMATIQUEMENT POUR LES VIDÉOS (Lock-Ratio)
           const distanceAxisX = Math.round((deltaX * dirX) / dragSensitivityX);
           const distanceAxisY = Math.round((deltaY * dirY) / (dragSensitivityX * ratioFactor)); 
           const addCols = Math.max(distanceAxisX, distanceAxisY); // On prend la plus grande intention
           
           newCols = Math.max(2, Math.min(24, currentCols + addCols));
           newRows = Math.round(newCols * rowUnitColMapping * ratioFactor);
        }

        if (newCols !== scaleCols || newRows !== scaleRows) {
           scaleCols = newCols;
           scaleRows = newRows;
           
           if (onResize) {
               // Persiste proprement les directives Mobile, Tablet et Desktop proportionnellement
               onResize(id, getResponsiveSpan(newCols, newRows), false); 
           }
        }
     };

     const handlePointerUp = (upEvent: PointerEvent) => {
        setIsResizing(false);
        setResizeOffset({ x: 0, y: 0 }); // On relâche l'élastique
        (upEvent.target as Element)?.releasePointerCapture(upEvent.pointerId);
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
        
        if (onResize) {
            onResize(id, getResponsiveSpan(scaleCols, scaleRows), true); 
        }
     };

     window.addEventListener('pointermove', handlePointerMove);
     window.addEventListener('pointerup', handlePointerUp);
     window.addEventListener('pointercancel', handlePointerUp);
  };
  // --- VIDEO ENTIEREMENT SUPPRIMÉE EN ADMIN POUR DES PERFORMANCES TOTALES ---
  // L'admin ne sert qu'à trier. Inutile de charger 40 flux HLS en simultané et de faire exploser la RAM.
  // Seule la miniature est utilisée.

  // --- FIN DE L'ASPECT RATIO FORCE ---
  // On utilise l'injection de classe spanClasses contenant les Rows !
  // Si ce n'est pas encore enregistré par le drag en DB, on force dynamiquement les rows injectées
  
  const finalClasses = project.forced_span || `col-span-${currentCols} row-span-${currentRows}`;
  
  const combinedStyle = {
    ...style,
    ...parseSpanStyles(finalClasses),
    transform: isResizing && (resizeOffset.x !== 0 || resizeOffset.y !== 0) 
                  ? `translate3d(${resizeOffset.x}px, ${resizeOffset.y}px, 0) ${style.transform}`
                  : style.transform,
  }

  return (
    <div
      ref={setNodeRef}
      style={combinedStyle}
      {...attributes}
      {...listeners}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`project-card-span relative cursor-grab active:cursor-grabbing w-full h-full bg-zinc-900 border ${isDragging ? 'border-pink-500 shadow-2xl scale-105' : 'border-zinc-800 hover:border-zinc-600'} transition-colors overflow-hidden group`}
    >
      {/* CONTENU CONDITIONNEL : GADGET vs PROJET CLASSIQUE */}
      {project.category === 'GADGET' ? (
         // DESIGN GADGET (SCI-FI)
         <div className="absolute inset-0 bg-zinc-900/80 flex flex-col justify-between p-2 pointer-events-none group-hover:bg-zinc-800 transition-colors">
            {/* Top bar avec bouton Delete */}
            <div className="flex justify-between items-start w-full pointer-events-auto">
                <div className="text-[8px] md:text-[10px] font-mono text-zinc-500 uppercase tracking-widest pointer-events-none">
                   {project.title}
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-red-500/80 animate-pulse pointer-events-none" />
                   {onDeleteGadget && (
                     <button
                       className="text-white hover:text-red-500 bg-red-900/50 hover:bg-black p-2 transition-all z-50 cursor-pointer shadow-xl rounded pointer-events-auto"
                       onClick={(e) => { e.stopPropagation(); onDeleteGadget(project.id); }}
                       onPointerDown={(e) => e.stopPropagation()}
                       title="Supprimer définitivement ce GADGET"
                     >
                        <svg className="w-4 h-4 md:w-5 md:h-5 drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                     </button>
                   )}
                </div>
            </div>
            
            {/* Centre décoratif */}
            <div className="flex-1 flex items-center justify-center opacity-20">
               <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
               </svg>
            </div>
            
            {/* Bottom bar */}
            <div className="absolute font-mono text-zinc-600 uppercase bottom-2 left-1/2 -translate-x-1/2 min-w-max border border-zinc-800 bg-black/50 backdrop-blur rounded px-2 text-[6px]">
               [ HOVER + SUPPR (DEL) POUR EFFACER ]
            </div>
         </div>
      ) : (
         // DESIGN PROJET CLASSIQUE
         <>
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
         </>
      )}

      {/* MODE DEBUG SOFT ADMIN : Affiche les colonnes et lignes */}
      <div className="absolute bottom-2 right-2 z-40 bg-black/50 backdrop-blur-sm text-white/50 text-[8px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded pointer-events-none uppercase tracking-widest transition-opacity group-hover:opacity-0 group-hover:z-0">
        {finalClasses}
      </div>

      {/* BOUTON EDIT (Désactivé pour les Gadgets) */}
      {onEdit && project.category !== 'GADGET' && (
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

      {/* POIGNÉES DE REDIMENSIONNEMENT (BOTTOM-RIGHT SEULEMENT, DÉSACTIVÉ POUR LES GADGETS LIQUIDES) */}
      {onResize && project.category !== 'GADGET' && (
        <>
          {/* Bottom Right */}
          <div 
             className={`absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize z-50 flex items-end justify-end p-1 transition-colors ${isResizing ? 'text-pink-500' : 'text-zinc-500 hover:text-white'}`}
             style={{ touchAction: 'none' }}
             onPointerDown={(e) => handleResizePointerDown(e, 1, 1)}
             title="Redimensionner la tuile"
          >
             <svg className="w-3 h-3 md:w-4 md:h-4 opacity-70" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22 22H10L22 10zM22 6L6 22H2L22 2z" />
             </svg>
          </div>
        </>
      )}

    </div>
  )
}

"use client";

import React, { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@/lib/supabase";

import { Project } from "./page";

// Fonction utilitaire de Score traduite pour le DB field
const getPriority = (priorityTag?: string) => {
  if (!priorityTag) return 5;
  if (priorityTag === "TOP 1") return 1;
  if (priorityTag === "TOP 2") return 2;
  if (priorityTag === "TOP 3") return 3;
  if (priorityTag === "RAW") return 4;
  return 5;
};

interface GridEditorProps {
  initialProjects: Project[];
  onUpdate: () => void;
  onEdit: (project: Project) => void;
  onDelete: (id: string, title: string) => void;
  onToggleVisibility: (id: string, currentVisible: boolean) => void;
  searchQuery: string;
}

// Composant interne pour une ligne sortable moderne
function SortableItem({
  project,
  onEdit,
  onDelete,
  onToggleVisibility,
}: {
  project: Project;
  onEdit: (p: Project) => void;
  onDelete: (id: string, title: string) => void;
  onToggleVisibility: (id: string, currentVisible: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  // Thumbnail Engine Ultraléger (Zero Video)
  const getThumbnail = () => {
    if (!project.carousel_urls || !Array.isArray(project.carousel_urls) || project.carousel_urls.length === 0) return null;
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center justify-between p-3 mb-3 bg-zinc-950/40 hover:bg-zinc-900 border ${isDragging ? "border-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.3)]" : "border-zinc-800 hover:border-zinc-700"} rounded-xl transition-all duration-200 overflow-hidden relative`}
    >
      <div className="flex items-center gap-5 flex-1 relative z-10">
        {/* Poignée de drag */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab text-zinc-600 hover:text-white px-2 cursor-grab active:cursor-grabbing text-xl"
        >
          ⋮⋮
        </div>

        {/* THUMBNAIL VISUEL SUPER FLUIDE */}
        <div className="relative w-24 h-14 bg-zinc-900 rounded-md overflow-hidden flex-shrink-0 shadow-inner group-hover:shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-shadow">
           {thumbnail ? (
             // eslint-disable-next-line @next/next/no-img-element
             <img src={thumbnail} alt={project.title} className="w-full h-full object-cover" />
           ) : (
             <div className="w-full h-full flex flex-col items-center justify-center text-[7px] text-zinc-600 uppercase tracking-widest bg-zinc-950 font-mono">
                Pas d&apos;image
             </div>
           )}
           {project.is_visible === false && (
             <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[1px]">
                <span className="text-[10px] uppercase font-bold text-zinc-500">Caché</span>
             </div>
           )}
        </div>

        {/* METADATA */}
        <div className="flex flex-col justify-center gap-1">
          <div className="flex items-center gap-2">
            <h3 className={`text-sm font-black uppercase tracking-wider ${project.is_visible === false ? 'text-zinc-600 line-through decoration-zinc-800' : 'text-zinc-100 group-hover:text-white transition-colors'}`}>
              {project.title}
            </h3>
            {getPriority(project.priority) === 1 && (
              <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded-sm bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 shadow-[0_0_8px_rgba(250,204,21,0.1)]">
                TOP 1
              </span>
            )}
            {getPriority(project.priority) === 2 && (
              <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded-sm bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                TOP 2
              </span>
            )}
            {getPriority(project.priority) === 3 && (
              <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded-sm bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
                TOP 3
              </span>
            )}
            {getPriority(project.priority) === 4 && (
              <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded-sm bg-orange-500/10 text-orange-500 border border-orange-500/20">
                RAW
              </span>
            )}
          </div>
          <p className="text-[10px] text-pink-500/70 font-mono uppercase tracking-widest drop-shadow-sm font-bold">
             {project.client}
          </p>
        </div>
      </div>

      {/* BOUTONS ACTIONS MODERNES */}
      <div className="flex items-center gap-2 relative z-10 opacity-60 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onEdit(project)}
          className="text-[10px] font-bold text-zinc-300 hover:text-cyan-300 uppercase tracking-widest px-3 py-1.5 bg-zinc-800/50 hover:bg-cyan-900/30 rounded-md transition-colors border border-transparent hover:border-cyan-800/50 backdrop-blur-sm"
        >
          Éditer
        </button>

        <button
          type="button"
          title={project.is_visible !== false ? "Cacher" : "Afficher"}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onToggleVisibility(project.id, project.is_visible !== false)}
          className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-md transition-colors border backdrop-blur-sm ${project.is_visible !== false ? "text-zinc-400 hover:text-zinc-200 bg-zinc-800/50 hover:bg-zinc-700/50 border-transparent hover:border-zinc-600" : "text-zinc-600 bg-black border-zinc-900 hover:text-white hover:border-zinc-700"}`}
        >
          {project.is_visible !== false ? "👁️ Hide" : "👁️‍🗨️ Unhide"}
        </button>

        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onDelete(project.id, project.title)}
          className="text-[10px] font-bold text-red-500/80 hover:text-red-400 uppercase tracking-widest px-3 py-1.5 bg-red-950/20 hover:bg-red-900/40 rounded-md transition-colors border border-transparent hover:border-red-900/50 backdrop-blur-sm ml-2"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function GridEditor({
  initialProjects,
  onUpdate,
  onEdit,
  onDelete,
  onToggleVisibility,
  searchQuery,
}: GridEditorProps) {
  const [projects, setProjects] = useState<Project[]>([]);

  // Sync when parent initialProjects change (e.g. after a DB fetch)
  useEffect(() => {
    setProjects(
      [...initialProjects].sort((a, b) => {
        const pA = getPriority(a.priority);
        const pB = getPriority(b.priority);
        if (pA !== pB) return pA - pB;
        return (a.rank || 0) - (b.rank || 0);
      }),
    );
  }, [initialProjects]);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setProjects((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };



  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Regrouper mentalement par catégorie pour s'assurer que le "rank" (l'ordre) repart de 1 par catégorie
      // ou bien on garde un rank global ? L'utilisateur veut trier dans l'ordre d'affichage.
      // Sauvegardons l'index + 1 globalement pour l'instant : l'ordre DndKit respectera l'ordre de la liste.
      // Si la liste est divisée en catégories, il faut stocker l'index+1 par rapport à la catégorie ou global.
      // On va faire Rank = index + 1 de la liste totale.
      for (const [index, p] of projects.entries()) {
        const { error } = await supabase
          .from("projects")
          .update({
            rank: index + 1,
            // (forced_span supprimé)
          })
          .eq("id", p.id);

        if (error) throw error;
      }

      alert("✅ Mur sauvegardé avec succès ! (Ordre et Tailles)");
      onUpdate(); // Refresh de la page principale
    } catch (err: unknown) {
      alert(
        `Erreur de sauvegarde: ${err instanceof Error ? err.message : String(err)}`,
      );
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Grouper les projets par catégories pour l'affichage visuel (le champ 'client' sert de 'catégorie' dans la BDD)
  const categories = Array.from(
    new Set(projects.map((p) => p.client || "Sans Catégorie")),
  ).sort();

  const displayedProjects = projects.filter((p) => {
    const matchesCategory =
      activeFilter === "all" || (p.client || "Sans Catégorie") === activeFilter;
    const matchesSearch =
      !searchQuery ||
      p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.client?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="bg-zinc-950 border border-zinc-800 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-4">
            <h2 className="text-lg uppercase tracking-wider text-white">
              Organisation de la Grille
            </h2>
            {isSaving && (
              <span className="text-xs text-yellow-500 animate-pulse">
                Sauvegarde...
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Glissez-déposez pour réorganiser. Assignez des tailles pour sculpter
            le mur.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-white text-black px-4 py-2 text-sm uppercase font-bold hover:bg-zinc-200 transition-colors disabled:opacity-50"
        >
          {isSaving ? "Sauvegarde..." : "Sauvegarder l'ordre"}
        </button>
      </div>

      <div className="flex gap-2 flex-wrap mb-8 pb-4 border-b border-zinc-800">
        <button
          onClick={() => setActiveFilter("all")}
          className={`uppercase tracking-widest text-xs font-bold px-4 py-2 transition-colors ${activeFilter === "all" ? "bg-cyan-400 text-black" : "bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white"}`}
        >
          Tous les projets
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            className={`uppercase tracking-widest text-xs font-bold px-4 py-2 transition-colors ${activeFilter === cat ? "bg-cyan-400 text-black" : "bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white"}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={displayedProjects.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {displayedProjects.map((project) => (
              <SortableItem
                key={project.id}
                project={project}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleVisibility={onToggleVisibility}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

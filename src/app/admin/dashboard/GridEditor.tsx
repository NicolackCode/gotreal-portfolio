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

interface Project {
  id: string;
  title: string;
  client: string;
  rank: number;
  forced_span?: string;
  main_video_url?: string;
  priority?: string;
  is_visible?: boolean;
}

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

// Composant interne pour une ligne sortable
function SortableItem({
  project,
  onSpanChange,
  onEdit,
  onDelete,
  onToggleVisibility,
}: {
  project: Project;
  onSpanChange: (id: string, val: string) => void;
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
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-4 mb-2 bg-zinc-900 border ${isDragging ? "border-white" : "border-zinc-800"} rounded-md`}
    >
      <div className="flex items-center gap-4 flex-1">
        {/* Poignée de drag */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab text-zinc-500 hover:text-white px-2"
        >
          ☰
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              {project.title}
            </h3>
            {getPriority(project.priority) === 1 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500 border border-yellow-500/30">
                TOP 1
              </span>
            )}
            {getPriority(project.priority) === 2 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-500/20 text-green-500 border border-green-500/30">
                TOP 2
              </span>
            )}
            {getPriority(project.priority) === 3 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-500 border border-blue-500/30">
                TOP 3
              </span>
            )}
            {getPriority(project.priority) === 4 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-500 border border-orange-500/30">
                RAW
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-zinc-500 uppercase">{project.client}</p>
            {project.is_visible === false && (
              <span className="text-[9px] px-1 border border-zinc-700 bg-zinc-800 text-zinc-400 rounded-sm italic">
                Caché
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="text-xs text-zinc-400 font-mono">Format :</label>
        <select
          value={project.forced_span || ""}
          onChange={(e) => onSpanChange(project.id, e.target.value)}
          className="bg-black border border-zinc-700 text-xs text-white p-2 rounded outline-none"
        >
          <option value="">Auto (Aléatoire)</option>
          <option value="col-span-1 row-span-1">Standard (Carré)</option>
          <option value="col-span-2 row-span-1">Très Large (Horizontal)</option>
          <option value="col-span-1 row-span-2">Très Haut (Vertical)</option>
          <option value="col-span-2 row-span-2">Masstoc (Énorme)</option>
        </select>

        {/* BOUTONS ACTIONS */}
        <div className="flex gap-2 ml-4 pl-4 border-l border-zinc-800">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onEdit(project)}
            className="text-xs text-zinc-400 hover:text-white uppercase tracking-wider px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
          >
            Éditer
          </button>

          <button
            type="button"
            title={
              project.is_visible !== false
                ? "Cacher le projet"
                : "Rendre visible"
            }
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() =>
              onToggleVisibility(project.id, project.is_visible !== false)
            }
            className={`text-xs uppercase tracking-wider px-2 py-1 rounded transition-colors ${project.is_visible !== false ? "text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700" : "text-zinc-600 bg-zinc-950 border border-zinc-800 hover:text-white hover:bg-zinc-800"}`}
          >
            {project.is_visible !== false ? "👁️" : "👁️‍🗨️"}
          </button>

          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onDelete(project.id, project.title)}
            className="text-xs text-red-500 hover:text-red-400 uppercase tracking-wider px-2 py-1 bg-red-950/30 hover:bg-red-900/50 rounded transition-colors"
          >
            Supprimer
          </button>
        </div>
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

  const handleSpanChange = (id: string, newSpan: string) => {
    setProjects((items) =>
      items.map((p) => (p.id === id ? { ...p, forced_span: newSpan } : p)),
    );
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
            forced_span: p.forced_span || null,
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
                onSpanChange={handleSpanChange}
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

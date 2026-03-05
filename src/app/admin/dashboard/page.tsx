"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import ProjectForm from "@/components/admin/ProjectForm";
import GridEditor from "./GridEditor";

export default function DashboardPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [projects, setProjects] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentEditProject, setCurrentEditProject] = useState<any | null>(
    null,
  );

  const supabase = createClient();

  const loadProjects = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("client", { ascending: true })
      .order("rank", { ascending: true });

    if (error) {
      console.error(
        "Supabase loadProjects error:",
        error.message,
        error.details,
      );
    }

    if (!error && data) {
      setProjects(data);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    loadProjects();
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEdit = (project: any) => {
    setCurrentEditProject(project);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${title} ?`)) {
      await supabase.from("projects").delete().eq("id", id);
      loadProjects();
    }
  };

  const handleToggleVisibility = async (
    id: string,
    currentVisible: boolean,
  ) => {
    const { error } = await supabase
      .from("projects")
      .update({ is_visible: !currentVisible })
      .eq("id", id);

    if (error) {
      alert(
        "Erreur lors de la modification de la visibilité : " + error.message,
      );
    } else {
      loadProjects();
    }
  };

  return (
    <div className="space-y-8">
      {/* EN TÊTE / ACTIONS PRINCIPALES */}
      <div className="flex flex-col sm:flex-row gap-4 border-b border-zinc-800 mb-8 pb-4 items-center justify-between">
        <p className="text-zinc-500 uppercase tracking-widest text-xs hidden md:block">
          Vue consolidée d&apos;édition
        </p>

        <div className="flex-1 max-w-md w-full relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Rechercher un projet, un client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm px-10 py-2.5 outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => {
              setCurrentEditProject(null);
              setIsFormOpen(true);
            }}
            className="bg-white text-black px-4 py-2 text-sm uppercase font-bold hover:bg-zinc-200 transition-colors whitespace-nowrap"
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
          initialProjects={projects}
          searchQuery={searchQuery}
          onUpdate={loadProjects}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleVisibility={handleToggleVisibility}
        />
      )}

      {isFormOpen && (
        <ProjectForm
          project={currentEditProject}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => {
            setIsFormOpen(false);
            loadProjects();
          }}
        />
      )}
    </div>
  );
}

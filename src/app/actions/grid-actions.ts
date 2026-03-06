'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function updateProjectsGridRank(updatesData: { id: string, forced_span?: string }[]) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() }
      }
    }
  )

  // Vérification de la session Admin
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (sessionError || !session) {
    return { success: false, error: "Non autorisé" }
  }

  try {
    // Supabase JS n'a pas de UPSERT de masse simple pour n'éditer qu'une seule colonne en se basant sur un tableau de string.
    // On va donc préparer un tableau d'objets avec id et le nouveau rank.
    // IMPORTANT : On fait des requêtes séquentielles rapides ou un Promise.all pour mettre à jour la colonne cible.
    
    const updates = updatesData.map((item, index) => {
       // Le rank = index de l'array pour que ce soit dans l'ordre du glisser/déposer
       return supabase
        .from('projects')
        .update({ rank: index, forced_span: item.forced_span || null })
        .eq('id', item.id);
    });

    const results = await Promise.all(updates);

    // Vérifier s'il y a eu une erreur dans le lot
    const hasError = results.some(res => res.error !== null);
    
    if (hasError) {
       console.error("Erreur lors de la mise à jour de la BDD :", results.find(r => r.error)?.error);
       return { success: false, error: "Erreur lors de la sauvegarde d'un ou plusieurs projets." }
    }

    // Succès ! On revalide les pages publiques
    revalidatePath('/all-projects');
    revalidatePath('/');
    
    return { success: true }
  } catch (error: unknown) {
    console.error("Crash lors de la sauvegarde :", error)
    return { success: false, error: error instanceof Error ? error.message : "Erreur interne serveur" }
  }
}

export async function createGadget() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() }
      }
    }
  )

  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (sessionError || !session) {
    return { success: false, error: "Non autorisé" }
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .insert([
        { 
          title: `SYS.GADGET_${Math.floor(Math.random() * 1000)}`,
          client: 'GADGET',  // Notre identifiant magique pour le design
          category: 'GADGET',
          video_url: '',     // Champ requis en Base De Données !
          slug: `sys-gadget-${Math.floor(Math.random() * 10000)}`, // Champ requis !
          rank: 999, // On le met tout à la fin par défaut
          is_visible: true,
          forced_span: 'col-span-1 row-span-2 md:col-span-1 md:row-span-2 xl:col-span-1 xl:row-span-2' // Plus petit possible
        }
      ])
      .select()
      .single()

    if (error) {
      console.error("ERREUR SUPABASE INSERT GADGET:", JSON.stringify(error, null, 2))
      throw error
    }

    revalidatePath('/admin/grid')
    revalidatePath('/all-projects')
    
    return { success: true, project: data }
  } catch (error: unknown) {
    console.error("Erreur serveur complète :", error)
    return { success: false, error: error instanceof Error ? error.message : "Erreur serveur interne" }
  }
}

export async function deleteGadget(id: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )

  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (sessionError || !session) {
    return { success: false, error: "Non autorisé" }
  }

  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('category', 'GADGET')

    if (error) {
       console.error("ERREUR SUPABASE DELETE GADGET:", JSON.stringify(error, null, 2))
       throw error
    }

    revalidatePath('/admin/grid')
    revalidatePath('/all-projects')
    
    return { success: true }
  } catch (error: unknown) {
    console.error("Erreur destruction gadget complète :", error)
    return { success: false, error: error instanceof Error ? error.message : "Erreur serveur interne" }
  }
}

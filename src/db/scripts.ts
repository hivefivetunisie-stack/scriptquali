import { db } from './index.ts';
import { scripts, embeddings } from './schema.ts';
import { eq, desc } from 'drizzle-orm';
import { ScriptItem } from '../types.js';
import { getSupabase, mapRowToScript, mapScriptToRow } from './supabase.ts';

// Query Layer: get all scripts
export async function getAllScriptsFromDb(): Promise<ScriptItem[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('scripts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map(mapRowToScript);
      }
      if (error) {
        console.warn('[Supabase] Erreur lecture scripts, repli Cloud SQL:', error.message);
      }
    } catch (sbErr) {
      console.warn('[Supabase] Exception lecture scripts, repli Cloud SQL:', sbErr);
    }
  }

  // Fallback to Cloud SQL
  try {
    const rows = await db.select().from(scripts).orderBy(desc(scripts.createdAt));
    const items = rows.map(r => ({
      id: r.id,
      title: r.title,
      type: r.type as 'script' | 'objection',
      category: r.category,
      content: r.content,
      objectionText: r.objectionText || undefined,
      responseTemplate: r.responseTemplate || undefined,
      steps: (r.steps as string[]) || undefined,
      stepContents: (r.stepContents as string[]) || undefined,
      tips: (r.tips as string[]) || undefined,
      keywords: (r.keywords as string[]) || undefined,
      associatedObjections: (r.associatedObjections as string[]) || undefined,
      isHighlighted: !!r.isHighlighted,
      createdAt: r.createdAt,
      author: r.author,
    }));

    // If Supabase is connected but empty, try syncing items to Supabase
    if (supabase && items.length > 0) {
      syncScriptsToSupabase(items).catch(() => {});
    }

    return items;
  } catch (error) {
    console.error("Database query failed (getAllScriptsFromDb):", error);
    throw new Error("Impossible de récupérer les scripts de la base de données.", { cause: error });
  }
}

// Background helper to sync items to Supabase
async function syncScriptsToSupabase(items: ScriptItem[]) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    const rows = items.map(mapScriptToRow);
    const { error } = await supabase.from('scripts').upsert(rows, { onConflict: 'id' });
    if (error) {
      if (error.code === '42501') {
        console.warn('[Supabase RLS] Synchronisation en attente : Row Level Security bloque l\'écriture avec la clé anon. Désactivez RLS ou ajoutez une politique pour autoriser les écritures.');
      } else {
        console.warn('[Supabase] Sync error:', error.message);
      }
    } else {
      console.log(`[Supabase] Synchronisation réussie de ${rows.length} scripts vers Supabase !`);
    }
  } catch (err: any) {
    console.warn('[Supabase] Sync exception:', err?.message || err);
  }
}

// Query Layer: insert or replace a script
export async function saveScriptToDb(item: ScriptItem): Promise<ScriptItem> {
  // 1. Try upserting to Supabase
  const supabase = getSupabase();
  if (supabase) {
    try {
      const row = mapScriptToRow(item);
      const { error } = await supabase.from('scripts').upsert(row, { onConflict: 'id' });
      if (error) {
        if (error.code === '42501') {
          console.warn('[Supabase RLS] Écriture bloquée par Row Level Security avec la clé anon. Sauvegarde assurée sur Cloud SQL.');
        } else {
          console.warn('[Supabase] Erreur d\'écriture:', error.message);
        }
      } else {
        console.log(`[Supabase] Script ${item.id} sauvegardé avec succès dans Supabase.`);
      }
    } catch (sbErr) {
      console.warn('[Supabase] Exception d\'écriture:', sbErr);
    }
  }

  // 2. Always persist to Cloud SQL as primary/backup
  try {
    await db.insert(scripts)
      .values({
        id: item.id,
        title: item.title,
        type: item.type,
        category: item.category,
        content: item.content,
        objectionText: item.objectionText || null,
        responseTemplate: item.responseTemplate || null,
        steps: item.steps || null,
        stepContents: item.stepContents || null,
        tips: item.tips || null,
        keywords: item.keywords || null,
        author: item.author || 'Système',
        associatedObjections: item.associatedObjections || null,
        isHighlighted: !!item.isHighlighted,
        createdAt: item.createdAt,
      })
      .onConflictDoUpdate({
        target: scripts.id,
        set: {
          title: item.title,
          type: item.type,
          category: item.category,
          content: item.content,
          objectionText: item.objectionText || null,
          responseTemplate: item.responseTemplate || null,
          steps: item.steps || null,
          stepContents: item.stepContents || null,
          tips: item.tips || null,
          keywords: item.keywords || null,
          author: item.author || 'Système',
          associatedObjections: item.associatedObjections || null,
          isHighlighted: !!item.isHighlighted,
        },
      });

    return item;
  } catch (error) {
    console.error("Database query failed (saveScriptToDb):", error);
    throw new Error("Impossible d'enregistrer le script dans la base de données.", { cause: error });
  }
}

// Query Layer: delete a script
export async function deleteScriptFromDb(id: string): Promise<boolean> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('scripts').delete().eq('id', id);
    } catch (e) {
      console.warn('[Supabase] Erreur suppression script:', e);
    }
  }

  try {
    await db.delete(scripts).where(eq(scripts.id, id));
    return true;
  } catch (error) {
    console.error("Database query failed (deleteScriptFromDb):", error);
    throw new Error("Impossible de supprimer le script de la base de données.", { cause: error });
  }
}

// Query Layer: get all vector embeddings
export async function getAllEmbeddingsFromDb(): Promise<Record<string, number[]>> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('embeddings').select('*');
      if (!error && Array.isArray(data) && data.length > 0) {
        const map: Record<string, number[]> = {};
        for (const r of data) {
          if (Array.isArray(r.vector)) {
            map[r.id] = r.vector;
          }
        }
        return map;
      }
    } catch (e) {
      console.warn('[Supabase] Erreur lecture embeddings:', e);
    }
  }

  try {
    const rows = await db.select().from(embeddings);
    const map: Record<string, number[]> = {};
    for (const r of rows) {
      if (Array.isArray(r.vector)) {
        map[r.id] = r.vector;
      }
    }
    return map;
  } catch (error) {
    console.error("Database query failed (getAllEmbeddingsFromDb):", error);
    return {};
  }
}

// Query Layer: save embedding
export async function saveEmbeddingToDb(id: string, vector: number[]): Promise<void> {
  if (!id || !vector || !Array.isArray(vector) || vector.length === 0) {
    console.warn(`[saveEmbeddingToDb] Vecteur d'embedding invalide ou vide ignoré pour l'ID: ${id}`);
    return;
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('embeddings').upsert({ id, vector }, { onConflict: 'id' });
    } catch (e) {
      console.warn('[Supabase] Erreur sauvegarde embedding:', e);
    }
  }

  try {
    await db.insert(embeddings)
      .values({
        id,
        vector,
      })
      .onConflictDoUpdate({
        target: embeddings.id,
        set: {
          vector,
        },
      });
  } catch (error) {
    console.error("Database query failed (saveEmbeddingToDb):", error);
  }
}

// Query Layer: delete embedding
export async function deleteEmbeddingFromDb(id: string): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('embeddings').delete().eq('id', id);
    } catch (e) {
      console.warn('[Supabase] Erreur suppression embedding:', e);
    }
  }

  try {
    await db.delete(embeddings).where(eq(embeddings.id, id));
  } catch (error) {
    console.error("Database query failed (deleteEmbeddingFromDb):", error);
  }
}

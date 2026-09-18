import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './index.ts';
import { scripts, embeddings } from './schema.ts';
import { ScriptItem } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
const SCRIPTS_FILE = path.join(ROOT_DIR, 'data/scripts.json');
const EMBEDDINGS_FILE = path.join(ROOT_DIR, 'data/embeddings.json');

export async function seedDatabaseIfEmpty() {
  try {
    const existing = await db.select().from(scripts).limit(1);
    if (existing.length > 0) {
      console.log(`[Cloud SQL] La base contient déjà ${existing.length}+ entrées. Aucune initialisation requise.`);
      return;
    }

    console.log('[Cloud SQL] Base de données vide détectée. Démarrage de la migration des scripts initiaux...');
    let initialList: ScriptItem[] = [];
    if (fs.existsSync(SCRIPTS_FILE)) {
      initialList = JSON.parse(fs.readFileSync(SCRIPTS_FILE, 'utf-8'));
    }

    for (const item of initialList) {
      await db.insert(scripts).values({
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
        createdAt: item.createdAt || new Date().toISOString(),
      }).onConflictDoNothing();
    }

    // Check if embeddings file exists to migrate
    if (fs.existsSync(EMBEDDINGS_FILE)) {
      try {
        const storedEmbeddings: Record<string, number[]> = JSON.parse(fs.readFileSync(EMBEDDINGS_FILE, 'utf-8'));
        for (const [id, vector] of Object.entries(storedEmbeddings)) {
          if (Array.isArray(vector)) {
            await db.insert(embeddings).values({
              id,
              vector,
            }).onConflictDoNothing();
          }
        }
        console.log('[Cloud SQL] Migration des embeddings vectoriels existants effectuée.');
      } catch (embErr) {
        console.warn('[Cloud SQL] Erreur lors de la migration des embeddings:', embErr);
      }
    }

    console.log(`[Cloud SQL] Succès : ${initialList.length} scripts et guides migrés avec succès vers PostgreSQL.`);
  } catch (error) {
    console.error('[Cloud SQL] Erreur lors du peuplement initial de la base de données:', error);
  }
}

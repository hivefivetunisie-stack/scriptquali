/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ItemType = 'script' | 'objection';

export interface ScriptItem {
  id: string;
  title: string;
  type: ItemType; // 'script' (script de vente / conversationnel) or 'objection' (traitement d'objection)
  category: string; // e.g., "Télévente", "Fidélisation", "Négociation", "Service Client", "Support"
  content: string; // Core markdown text or detailed explanation
  objectionText?: string; // If type is 'objection', what the client says (e.g., "C'est trop cher !")
  responseTemplate?: string; // If type is 'objection', what the agent should reply
  steps?: string[]; // Flow of conversation steps (e.g., ["Salutations", "Découverte", "Argumentation"])
  stepContents?: string[]; // Flow of corresponding conversational texts for each step
  tips?: string[]; // Helpful hints (e.g., "Parler d'une voix calme", "Ne pas couper de parole")
  keywords?: string[]; // Quick tags
  createdAt: string;
  author: string;
  associatedObjections?: string[]; // ID references to linked objection treatments
  isHighlighted?: boolean; // Admin highlighted / pinned for agents
}

// Server-side database schema
export interface SearchResult {
  item: ScriptItem;
  score: number; // For TF-IDF or Vector Cosine Similarity
  isVector: boolean; // True if semantic match, false if physical keyword match
}

// Interface for embedded scripts saved in our vector index
export interface EmbeddingItem {
  id: string;
  vector: number[]; // 768-dim embedding from gemini-embedding-2-preview
}

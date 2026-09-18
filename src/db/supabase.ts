import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ScriptItem } from '../types.js';

const defaultUrl = 'https://vzkmvgheahzaasemdplw.supabase.co';
const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6a212Z2hlYWh6YWFzZW1kcGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3MjkyNzksImV4cCI6MjEwNTMwNTI3OX0.d_Zg6R7MRKzxxuCfySkXp5x7w6IPhudKLDp9HUC73Ww';

const supabaseUrl = process.env.SUPABASE_URL || defaultUrl;
const supabaseKey = process.env.SUPABASE_KEY || defaultKey;

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseKey) return null;
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false }
      });
    } catch (e) {
      console.error('[Supabase] Initialisation error:', e);
      return null;
    }
  }
  return supabaseInstance;
}

// Convert DB snake_case record to frontend camelCase ScriptItem
export function mapRowToScript(r: any): ScriptItem {
  return {
    id: r.id,
    title: r.title,
    type: r.type,
    category: r.category,
    content: r.content,
    objectionText: r.objection_text || undefined,
    responseTemplate: r.response_template || undefined,
    steps: Array.isArray(r.steps) ? r.steps : undefined,
    stepContents: Array.isArray(r.step_contents) ? r.step_contents : undefined,
    tips: Array.isArray(r.tips) ? r.tips : undefined,
    keywords: Array.isArray(r.keywords) ? r.keywords : undefined,
    associatedObjections: Array.isArray(r.associated_objections) ? r.associated_objections : undefined,
    isHighlighted: !!r.is_highlighted,
    createdAt: r.created_at,
    author: r.author || 'Système',
  };
}

// Convert ScriptItem to Supabase row format
export function mapScriptToRow(item: ScriptItem) {
  return {
    id: item.id,
    title: item.title,
    type: item.type,
    category: item.category,
    content: item.content,
    objection_text: item.objectionText || null,
    response_template: item.responseTemplate || null,
    steps: item.steps || null,
    step_contents: item.stepContents || null,
    tips: item.tips || null,
    keywords: item.keywords || null,
    associated_objections: item.associatedObjections || null,
    is_highlighted: !!item.isHighlighted,
    created_at: item.createdAt,
    author: item.author || 'Système',
  };
}

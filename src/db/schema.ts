import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

// PostgreSQL schema for Call Scripts & Objections
export const scripts = pgTable('scripts', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  type: text('type').notNull(), // 'script' | 'objection'
  category: text('category').notNull(),
  content: text('content').notNull(),
  objectionText: text('objection_text'),
  responseTemplate: text('response_template'),
  steps: jsonb('steps').$type<string[]>(),
  stepContents: jsonb('step_contents').$type<string[]>(),
  tips: jsonb('tips').$type<string[]>(),
  keywords: jsonb('keywords').$type<string[]>(),
  author: text('author').notNull().default('Système'),
  associatedObjections: jsonb('associated_objections').$type<string[]>(),
  isHighlighted: boolean('is_highlighted').default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Embeddings table for Vector & Semantic Search
export const embeddings = pgTable('embeddings', {
  id: text('id').primaryKey().references(() => scripts.id, { onDelete: 'cascade' }),
  vector: jsonb('vector').$type<number[]>().notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

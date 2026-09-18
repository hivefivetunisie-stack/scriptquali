/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ScriptItem } from '../types.ts';
import { FileText, Sparkles, MessageSquare, Star, Eye, Edit2, Trash2 } from 'lucide-react';

interface ScriptCardProps {
  key?: any;
  item: ScriptItem;
  score?: number;
  highlightedQuery?: string;
  isAdmin?: boolean;
  onClick: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  onToggleHighlight?: () => void;
}

export default function ScriptCard({ 
  item, 
  score, 
  highlightedQuery, 
  isAdmin = false, 
  onClick, 
  onEdit, 
  onDelete, 
  onToggleHighlight 
}: ScriptCardProps) {
  // Format relevance score for semantic matches
  const relevancePercent = score && score < 1.0 ? Math.round(score * 100) : null;

  return (
    <div
      id={`script-card-${item.id}`}
      onClick={onClick}
      className={`group relative cursor-pointer bg-white border rounded-2xl p-5 transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between h-full ${
        item.isHighlighted 
          ? 'border-amber-400 ring-2 ring-amber-100 bg-amber-50/10' 
          : 'border-slate-200 hover:border-indigo-300'
      }`}
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-tight uppercase border ${
              item.type === 'script'
                ? 'bg-blue-50 text-blue-600 border-blue-100'
                : 'bg-amber-50 text-amber-605 border-amber-100'
            }`}>
              {item.type === 'script' ? (
                <FileText className="w-3 h-3" />
              ) : (
                <MessageSquare className="w-3 h-3" />
              )}
              {item.type === 'script' ? 'Script' : 'Objection'}
            </span>

            {item.isHighlighted && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-600" />
                Mis en avant
              </span>
            )}
          </div>

          <span className="text-[10px] bg-slate-100 text-slate-650 border border-slate-200 px-2 py-0.5 rounded font-bold font-sans">
            {item.category}
          </span>
        </div>

        {/* AI Relevance Indicator if active vector search */}
        {relevancePercent && relevancePercent > 30 && (
          <div className="absolute top-4 right-4 flex items-center gap-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded shadow-xs">
            <Sparkles className="w-2.5 h-2.5" />
            IA {relevancePercent}%
          </div>
        )}

        {/* Title */}
        <h3 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug mb-2 font-sans">
          {item.title}
        </h3>

        {/* Highlight Objection specific preview */}
        {item.type === 'objection' && item.objectionText && (
          <div className="bg-rose-50/40 border border-rose-100/50 rounded-xl p-3 mb-3 text-xs text-rose-800 leading-relaxed italic font-sans font-medium">
            &ldquo;{item.objectionText}&rdquo;
          </div>
        )}

        {/* Short Text Preview */}
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-4 line-clamp-3">
          {item.content}
        </p>
      </div>

      {/* Footer information */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-slate-450 text-[11px] mt-auto">
        <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
          <span className={`w-1.5 h-1.5 rounded-full ${item.isHighlighted ? 'bg-amber-400' : 'bg-slate-300'}`}></span>
          <span>{item.author}</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Quick toggle highlight for Admins */}
          {isAdmin && onToggleHighlight && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleHighlight();
              }}
              title={item.isHighlighted ? "Retirer de la mise en avant" : "Mettre en avant"}
              className={`p-1 rounded transition-colors ${
                item.isHighlighted 
                  ? 'text-amber-500 hover:bg-amber-50' 
                  : 'text-slate-300 hover:text-amber-500 hover:bg-slate-50'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${item.isHighlighted ? 'fill-amber-400' : ''}`} />
            </button>
          )}

          {/* Edit for Admin */}
          {isAdmin && onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              title="Modifier"
              className="text-slate-400 hover:text-indigo-600 transition-colors p-1 rounded hover:bg-slate-50"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            title="Consulter"
            className="text-slate-400 hover:text-indigo-500 transition-colors p-1 rounded hover:bg-slate-50"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          
          {/* Delete for Admin inside the card */}
          {isAdmin && (
            <button
              id={`btn-del-${item.id}`}
              title="Supprimer"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-slate-300 hover:text-rose-600 transition-colors p-1 rounded hover:bg-rose-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

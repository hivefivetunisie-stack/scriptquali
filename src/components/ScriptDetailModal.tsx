/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ScriptItem } from '../types.ts';
import { 
  X, Copy, Check, Info, Sparkles, BookOpen, Clock, 
  Lightbulb, MessageSquare, ShieldAlert, List, Play, CheckCircle,
  Edit2, Save, Plus, Trash2, ChevronUp, ChevronDown, CheckSquare, Square
} from 'lucide-react';

interface ScriptDetailModalProps {
  item: ScriptItem;
  isOpen: boolean;
  onClose: () => void;
  allScripts?: ScriptItem[];
  isAdmin?: boolean;
  onSave?: (scriptData: Partial<ScriptItem>, id?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export default function ScriptDetailModal({ 
  item, 
  isOpen, 
  onClose, 
  allScripts = [], 
  isAdmin = false,
  onSave,
  onDelete
}: ScriptDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const [openObjectionId, setOpenObjectionId] = useState<string | null>(null);
  
  // Interactive Step Wizard state
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [viewMode, setViewMode] = useState<'stepped' | 'global'>('stepped');
  const [activeObjectionOverlay, setActiveObjectionOverlay] = useState<ScriptItem | null>(null);
  const [stepCopied, setStepCopied] = useState(false);
  const [overlayCopied, setOverlayCopied] = useState(false);

  // Admin Direct Editing states
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editObjectionText, setEditObjectionText] = useState('');
  const [editResponseTemplate, setEditResponseTemplate] = useState('');
  const [editSteps, setEditSteps] = useState<string[]>([]);
  const [editStepContents, setEditStepContents] = useState<string[]>([]);
  const [editTips, setEditTips] = useState<string[]>([]);
  const [editKeywordsText, setEditKeywordsText] = useState('');
  const [editLinkedObjections, setEditLinkedObjections] = useState<string[]>([]);
  const [editIsHighlighted, setEditIsHighlighted] = useState(false);
  const [isSavingDirectly, setIsSavingDirectly] = useState(false);

  // Auto-switch viewMode if there are actually steps & stepContents
  useEffect(() => {
    if (item.type === 'script' && item.steps && item.steps.length > 0) {
      setViewMode('stepped');
    } else {
      setViewMode('global');
    }
    setActiveStepIdx(0);
    setActiveObjectionOverlay(null);

    // Initialize edit states
    setEditTitle(item.title || '');
    setEditCategory(item.category || '');
    setEditContent(item.content || '');
    setEditObjectionText(item.objectionText || '');
    setEditResponseTemplate(item.responseTemplate || '');
    setEditSteps(item.steps ? [...item.steps] : []);
    setEditStepContents(item.stepContents ? [...item.stepContents] : []);
    setEditTips(item.tips ? [...item.tips] : []);
    setEditKeywordsText(item.keywords ? item.keywords.join(', ') : '');
    setEditLinkedObjections(item.associatedObjections ? [...item.associatedObjections] : []);
    setEditIsHighlighted(!!item.isHighlighted);
    setIsEditing(false);
  }, [item, isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    const textToCopy = item.type === 'objection' && item.responseTemplate 
      ? item.responseTemplate 
      : item.content;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Find linked objections
  const linkedObjections = allScripts.filter(s => 
    s.type === 'objection' && item.associatedObjections?.includes(s.id)
  );

  const objectionTemplates = allScripts.filter(s => s.type === 'objection');

  // Interactive Edit Modifiers
  const handleEditAddStep = () => {
    setEditSteps([...editSteps, `Étape ${editSteps.length + 1}`]);
    setEditStepContents([...editStepContents, 'Verbatim dialogue à réciter oralement...']);
  };

  const handleEditRemoveStep = (index: number) => {
    setEditSteps(editSteps.filter((_, i) => i !== index));
    setEditStepContents(editStepContents.filter((_, i) => i !== index));
    if (activeStepIdx >= editSteps.length - 1 && activeStepIdx > 0) {
      setActiveStepIdx(editSteps.length - 2);
    }
  };

  const handleEditStepTitleChange = (index: number, val: string) => {
    const updated = [...editSteps];
    updated[index] = val;
    setEditSteps(updated);
  };

  const handleEditStepContentChange = (index: number, val: string) => {
    const updated = [...editStepContents];
    updated[index] = val;
    setEditStepContents(updated);
  };

  const handleMoveStepUp = (index: number) => {
    if (index === 0) return;
    const sCopy = [...editSteps];
    const cCopy = [...editStepContents];
    
    const tempStep = sCopy[index];
    sCopy[index] = sCopy[index - 1];
    sCopy[index - 1] = tempStep;

    const tempCont = cCopy[index];
    cCopy[index] = cCopy[index - 1];
    cCopy[index - 1] = tempCont;

    setEditSteps(sCopy);
    setEditStepContents(cCopy);
  };

  const handleMoveStepDown = (index: number) => {
    if (index === editSteps.length - 1) return;
    const sCopy = [...editSteps];
    const cCopy = [...editStepContents];

    const tempStep = sCopy[index];
    sCopy[index] = sCopy[index + 1];
    sCopy[index + 1] = tempStep;

    const tempCont = cCopy[index];
    cCopy[index] = cCopy[index + 1];
    cCopy[index + 1] = tempCont;

    setEditSteps(sCopy);
    setEditStepContents(cCopy);
  };

  const handleEditAddTip = () => {
    setEditTips([...editTips, 'Conseil pratique d\'élocution...']);
  };

  const handleEditRemoveTip = (index: number) => {
    setEditTips(editTips.filter((_, i) => i !== index));
  };

  const handleEditTipChange = (index: number, val: string) => {
    const updated = [...editTips];
    updated[index] = val;
    setEditTips(updated);
  };

  const handleDirectSave = async () => {
    if (!onSave) return;
    setIsSavingDirectly(true);
    
    const kwArray = editKeywordsText
      ? editKeywordsText.split(',').map(s => s.trim().toLowerCase()).filter(s => s.length > 0)
      : [];

    const updatedItem: Partial<ScriptItem> = {
      title: editTitle.trim(),
      category: editCategory.trim() || 'Script',
      content: editContent.trim(),
      type: item.type,
      author: item.author || 'Administration',
      isHighlighted: editIsHighlighted
    };

    if (item.type === 'script') {
      updatedItem.steps = editSteps.map(s => s.trim()).filter(s => s.length > 0);
      updatedItem.stepContents = editStepContents;
      updatedItem.associatedObjections = editLinkedObjections;
    } else {
      updatedItem.objectionText = editObjectionText.trim();
      updatedItem.responseTemplate = editResponseTemplate.trim();
    }

    if (editTips.length > 0) {
      updatedItem.tips = editTips.map(t => t.trim()).filter(t => t.length > 0);
    } else {
      updatedItem.tips = [];
    }

    if (kwArray.length > 0) {
      updatedItem.keywords = kwArray;
    }

    try {
      await onSave(updatedItem, item.id);
      setIsEditing(false);
    } catch (err) {
      console.error("Échec de la sauvegarde directe :", err);
    } finally {
      setIsSavingDirectly(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
      ></div>

      <div className="absolute inset-y-0 right-0 max-w-full pl-10 flex">
        <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col h-full rounded-l-3xl overflow-hidden border-l border-slate-150">
          
          {/* Header */}
          <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-850 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded text-[10px] font-extrabold tracking-wide uppercase ${
                item.type === 'script' ? 'bg-emerald-500 text-slate-900' : 'bg-indigo-505 text-white bg-indigo-600'
              }`}>
                {item.type === 'script' ? 'SCRIPT DE CAMPAGNE' : 'TRAITEMENT D\'OBJECTION'}
              </span>
              <span className="text-xs text-slate-300 font-mono">
                {isEditing ? 'Édition active' : item.category}
              </span>
            </div>

            <div className="flex items-center gap-2.5 select-none">
              {isAdmin && onSave && (
                <button
                  type="button"
                  id="direct-edit-toggle"
                  onClick={() => setIsEditing(!isEditing)}
                  className={`px-3 py-1.5 rounded-xl text-xxs font-black uppercase tracking-wider border flex items-center gap-1.5 transition-all cursor-pointer ${
                    isEditing
                      ? 'bg-amber-500 text-slate-950 border-amber-600 font-extrabold shadow-xs'
                      : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                  }`}
                >
                  <Edit2 className="w-3 h-3" />
                  {isEditing ? 'Lecture' : 'Édition Directe 🔧'}
                </button>
              )}

              <button
                id="close-detail-modal"
                onClick={onClose}
                className="rounded-full p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/40">
            
            {isEditing ? (
              /* =========================================
                 ADMIN DIRECT EDITING LAYOUT
                 ========================================= */
              <div className="space-y-5 animate-fadeIn">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-2">
                  <span className="text-lg">⚙️</span>
                  <div>
                    <span className="font-bold block mb-0.5">Console de Modification Administrative</span>
                    Les changements apportés ci-dessous seront ré-indexés structurellement et sémantiquement dans la base de données vectorielle Gemini.
                  </div>
                </div>

                {/* Form Elements */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Titre de la fiche</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition shadow-3xs"
                    placeholder="Titre..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Thématique / Catégorie</label>
                    <input
                      type="text"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition shadow-3xs"
                      placeholder="Thématique..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Auteur</label>
                    <span className="w-full block bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-500 leading-normal font-medium select-none">
                      {item.author || 'Système Admin'}
                    </span>
                  </div>
                </div>

                {/* Highlight toggle */}
                <div className="flex items-center gap-2 py-1 select-none">
                  <input
                    id="edit-is-highlighted"
                    type="checkbox"
                    checked={editIsHighlighted}
                    onChange={(e) => setEditIsHighlighted(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                  />
                  <label htmlFor="edit-is-highlighted" className="text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1.5">
                    📌 Pincer / Épingler cette fiche en vedette pour les agents
                  </label>
                </div>

                {/* OBJECTION SPECIFIC EDITING */}
                {item.type === 'objection' && (
                  <div className="space-y-4 border-t border-slate-200 pt-4">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1 bg-red-50/50 p-2 rounded text-rose-700">
                      🚨 Paramètres du traitement d'objection
                    </h4>

                    <div>
                      <label className="block text-[10px] font-black text-slate-550 uppercase tracking-wider mb-1">Phrase exacte formulée par le client</label>
                      <textarea
                        value={editObjectionText}
                        onChange={(e) => setEditObjectionText(e.target.value)}
                        rows={4}
                        className="w-full text-sm font-semibold bg-white border border-rose-200 rounded-xl px-3.5 py-2.5 text-rose-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:bg-white transition leading-relaxed"
                        placeholder="Ex: C'est trop cher !..."
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-550 uppercase tracking-wider mb-1">Contre-argumentation d'élocution active</label>
                      <textarea
                        value={editResponseTemplate}
                        onChange={(e) => setEditResponseTemplate(e.target.value)}
                        rows={12}
                        className="w-full text-sm font-semibold bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition leading-relaxed font-sans"
                        placeholder="Insérez le texte exact que l'agent doit lire de vive voix..."
                      />
                    </div>
                  </div>
                )}

                {/* SCRIPT STEPS SEQUENCE EDITING */}
                {item.type === 'script' && (
                  <div className="space-y-4 border-t border-slate-200 pt-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-850 uppercase tracking-wider flex items-center gap-1 bg-emerald-50/60 px-3 py-1.5 rounded-lg text-emerald-700 font-sans">
                        📁 Séquence Conversationnelle et Textes Étape par Étape
                      </h4>
                      <button
                        type="button"
                        onClick={handleEditAddStep}
                        className="text-xxs text-emerald-600 hover:text-emerald-700 font-black uppercase flex items-center gap-0.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded"
                      >
                        <Plus className="w-3 h-3" /> Ajouter Étape
                      </button>
                    </div>

                    <p className="text-[10.5px] text-slate-500 leading-normal">
                      Ces étapes s'affichent de façon séquentielle sur la console d'appel de l'agent. Vous pouvez réordonner les étapes grâce aux flèches, modifier le titre de l'étape ou insérer sa citation verbatim de dialogue.
                    </p>

                    <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                      {editSteps.map((st, i) => (
                        <div key={i} className="p-4 bg-white border border-slate-200/80 rounded-2xl space-y-3 relative shadow-3xs hover:border-slate-300">
                          <div className="flex items-center justify-between select-none">
                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100/60 px-2 py-0.5 rounded uppercase font-mono tracking-wider">
                              Étape {i + 1}
                            </span>
                            
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={i === 0}
                                onClick={() => handleMoveStepUp(i)}
                                className={`p-1 rounded transition border ${i === 0 ? 'text-slate-205 border-slate-100 bg-slate-50 opacity-40' : 'text-slate-600 border-slate-250 hover:bg-slate-50 active:scale-95'}`}
                                title="Monter"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={i === editSteps.length - 1}
                                onClick={() => handleMoveStepDown(i)}
                                className={`p-1 rounded transition border ${i === editSteps.length - 1 ? 'text-slate-205 border-slate-100 bg-slate-50 opacity-40' : 'text-slate-600 border-slate-250 hover:bg-slate-50 active:scale-95'}`}
                                title="Descendre"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditRemoveStep(i)}
                                className="text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 p-1 rounded transition"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <input
                              type="text"
                              value={st}
                              onChange={(e) => handleEditStepTitleChange(i, e.target.value)}
                              placeholder={`Titre de l'étape... (ex: Prise de contact)`}
                              className="w-full text-xs font-bold bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition"
                            />
                            <textarea
                              value={editStepContents[i] || ''}
                              onChange={(e) => handleEditStepContentChange(i, e.target.value)}
                              placeholder="Texte verbatim que l'agent doit lire de vive voix pour cette étape..."
                              rows={10}
                              className="w-full text-sm font-semibold bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-hidden focus:border-indigo-600 focus:bg-white transition leading-relaxed shadow-sm"
                            />
                          </div>
                        </div>
                      ))}
                      
                      {editSteps.length === 0 && (
                        <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-505">
                          Aucune étape définie. Ajoutez en une pour faire une séquence conversationnelle.
                        </div>
                      )}
                    </div>

                    {/* Associated objections relationship linking */}
                    {objectionTemplates.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Associer des fiches d'objections d'appels</label>
                        <p className="text-[10px] text-slate-400">Cochez les objections typiques associées à cette thématique pour qu'elles s'épinglent sur l'écran d'appel des agents :</p>
                        <div className="bg-white border border-slate-200 rounded-xl max-h-40 overflow-y-auto p-3 space-y-1.5 shadow-inner">
                          {objectionTemplates.map(obj => {
                            const isChecked = editLinkedObjections.includes(obj.id);
                            return (
                              <label key={obj.id} className="flex items-start gap-2 text-xs text-slate-700 hover:text-slate-950 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setEditLinkedObjections([...editLinkedObjections, obj.id]);
                                    } else {
                                      setEditLinkedObjections(editLinkedObjections.filter(id => id !== obj.id));
                                    }
                                  }}
                                  className="w-3.5 h-3.5 rounded text-indigo-650 border-slate-300 mt-0.5"
                                />
                                <div className="leading-tight">
                                  <span className="font-bold block text-slate-800">{obj.title}</span>
                                  {obj.objectionText && (
                                    <span className="text-[10px] text-slate-400 block truncate italic">&ldquo;{obj.objectionText}&rdquo;</span>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                 {/* Content description for both */}
                 <div className="space-y-1 border-t border-slate-200 pt-4">
                   <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                     {item.type === 'script' ? 'Résumé complet / Explications du dossier' : 'Analyse de l\'objection (Contexte/Notice)'}
                   </label>
                   <textarea
                     value={editContent}
                     onChange={(e) => setEditContent(e.target.value)}
                     rows={10}
                     className="w-full text-sm font-semibold bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition leading-relaxed"
                     placeholder="Description théorique..."
                   />
                 </div>

                {/* Interactive Tips Editor */}
                <div className="space-y-3.5 border-t border-slate-200 pt-4">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Conseils vocaux & Posture d'expert</label>
                    <button
                      type="button"
                      onClick={handleEditAddTip}
                      className="text-[10px] font-black text-amber-700 uppercase tracking-wider bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-0.5"
                    >
                      <Plus className="w-2.5 h-2.5" /> Ajouter conseil
                    </button>
                  </div>

                  <div className="space-y-2">
                    {editTips.map((tip, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={tip}
                          onChange={(e) => handleEditTipChange(idx, e.target.value)}
                          className="flex-1 text-xs bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleEditRemoveTip(idx)}
                          className="text-rose-505 text-rose-500 hover:text-white hover:bg-rose-500 border border-rose-200 hover:border-transparent rounded-xl p-2 transition shrink-0 bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Keywords Tag edit */}
                <div className="space-y-1.5 border-t border-slate-200 pt-4">
                  <label className="block text-[10px] font-black text-slate-550 uppercase tracking-wider">Mots-clefs sémantiques (séparés par des virgules)</label>
                  <input
                    type="text"
                    value={editKeywordsText}
                    onChange={(e) => setEditKeywordsText(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800"
                    placeholder="cfsi, agroecologie, faim, senegal"
                  />
                </div>

                {/* DIRECT DELETION DRAWER FOR ADMINS */}
                {onDelete && (
                  <div className="bg-rose-50 rounded-2xl border border-rose-200 p-4 shrink-0 flex items-center justify-between select-none">
                    <div>
                      <span className="font-extrabold text-xs text-rose-800 block">⚠️ Zone d'Élimination Directe</span>
                      <span className="text-[10px] text-rose-650 block">Cette action effacera définitivement ce document des serveurs du pôle.</span>
                    </div>
                    <button
                      type="button"
                      id="direct-delete-btn"
                      onClick={async () => {
                        if (window.confirm("CONFIRMATION REQUISE : Supprimer définitivement cette fiche commerciale ?Cette opération de vidage est irréversible.")) {
                          await onDelete(item.id);
                          onClose();
                        }
                      }}
                      className="px-4 py-2 bg-rose-650 hover:bg-rose-700 bg-rose-600 text-white font-black text-xxs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Supprimer la fiche
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* =========================================
                 STANDARD LECTURE / WIZARD MODE
                 ========================================= */
              <div className="space-y-6">
                {/* Title Section */}
                <div>
                  <h2 className="text-xl font-bold text-slate-900 leading-snug">
                    {item.title}
                  </h2>
                  <p className="text-xxs text-slate-400 mt-1 uppercase font-mono tracking-widest font-black">
                    Enregistré le {new Date(item.createdAt).toLocaleDateString('fr-FR', { dateStyle: 'long' })} &bull; Origine : {item.author}
                  </p>
                </div>

                {/* Toggle View Mode for Scripts with Steps */}
                {item.type === 'script' && item.steps && item.steps.length > 0 && (
                  <div className="flex items-center justify-between p-1 bg-slate-100 rounded-xl max-w-md border border-slate-200 shadow-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode('stepped');
                        setActiveObjectionOverlay(null);
                      }}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                        viewMode === 'stepped' 
                          ? 'bg-white text-indigo-700 shadow-sm' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 shrink-0 text-indigo-505" />
                      Mode Étape par Étape
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('global')}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                        viewMode === 'global' 
                          ? 'bg-white text-indigo-700 shadow-sm' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <List className="w-3.5 h-3.5 shrink-0" />
                      Guide Complet
                    </button>
                  </div>
                )}

                {/* If objection: Highlight the customer's quote */}
                {item.type === 'objection' && item.objectionText && (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-5 shadow-xs">
                    <span className="text-[10px] font-bold text-rose-500 tracking-wider uppercase block mb-1">
                      Objection typique formulée par le client :
                    </span>
                    <p className="text-sm font-semibold text-rose-900 italic">
                      &ldquo;{item.objectionText}&rdquo;
                    </p>
                  </div>
                )}

                {/* Render based on viewMode */}
                {viewMode === 'stepped' && item.type === 'script' && item.steps && item.steps.length > 0 ? (
                  // STEPPED WIZARD MODE
                  <div className="space-y-6 animate-fadeIn">
                    
                    {/* Visual Step Stepper Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-xxs font-extrabold text-indigo-600 uppercase tracking-widest font-mono">
                          Progression de l'appel
                        </span>
                        <span className="text-xxs font-bold text-slate-500">
                          Étape {activeStepIdx + 1} / {item.steps.length}
                        </span>
                      </div>
                      
                      {/* Stepper bubbles (Scrollable horizontally) */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 pt-1 px-1 scrollbar-thin">
                        {item.steps.map((st, idx) => {
                          const isActive = activeStepIdx === idx;
                          const isPassed = idx < activeStepIdx;
                          return (
                            <button
                              key={idx}
                              id={`step-btn-${idx}`}
                              type="button"
                              onClick={() => {
                                setActiveStepIdx(idx);
                                setActiveObjectionOverlay(null);
                              }}
                              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xxs font-bold transition-all duration-150 ${
                                isActive 
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm scale-102'
                                  : isPassed 
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              <span className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                                isActive 
                                  ? 'bg-white text-indigo-700'
                                  : isPassed 
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                                {idx + 1}
                              </span>
                              <span className="truncate max-w-[120px]">{st}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sub-step central prompt board */}
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-md flex flex-col">
                      {/* Card Step Title Header */}
                      <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
                        <span className="text-xxs font-extrabold text-indigo-600 uppercase tracking-widest font-mono font-sans font-black">
                          Dialogue suggéré pour l'étape {activeStepIdx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-850 bg-white border border-slate-200 px-3 py-1 rounded-lg shadow-2xs">
                          {item.steps[activeStepIdx]}
                        </span>
                      </div>

                      {/* Dialogue Terminal Board */}
                      <div className="p-6 bg-slate-900 text-slate-100 min-h-[360px] md:min-h-[420px] flex flex-col justify-between relative">
                        
                        {activeObjectionOverlay ? (
                          <div className="space-y-4 animate-fadeIn">
                            {/* Objection overlay Header */}
                            <div className="flex items-center justify-between bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3 py-2 rounded-lg shadow-inner select-none">
                              <span className="text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                                OBJECTION ACTIVÉE &bull; {activeObjectionOverlay.title}
                              </span>
                              <button
                                type="button" 
                                onClick={() => setActiveObjectionOverlay(null)}
                                className="text-[10px] font-bold text-rose-300 hover:text-white underline hover:no-underline transition cursor-pointer"
                              >
                                Retourner au script &times;
                              </button>
                            </div>
                            
                            <div className="text-sm text-rose-200 bg-rose-950/40 p-3 rounded-lg border border-rose-900/30 font-sans">
                              <span className="font-bold block text-[10px] text-rose-400 mb-0.5 select-none">L'interlocuteur a formulé l'objection :</span>
                              &ldquo;{activeObjectionOverlay.objectionText}&rdquo;
                            </div>

                            <div className="text-lg md:text-xl text-emerald-300 leading-relaxed font-bold bg-slate-950 border border-slate-800 rounded-xl p-5 select-all whitespace-pre-wrap font-sans">
                              {activeObjectionOverlay.responseTemplate || activeObjectionOverlay.content}
                            </div>
                          </div>
                        ) : (
                          // Main step dialog text
                          <div className="space-y-4 animate-fadeIn">
                            <div className="text-xs text-indigo-300 font-extrabold uppercase tracking-widest flex items-center gap-1 mb-1 bg-indigo-950/30 px-2.5 py-1 rounded-md self-start select-none">
                              🗣️ À réciter de vive voix :
                            </div>
                            <div className="text-lg md:text-xl lg:text-2xl text-emerald-300 leading-relaxed font-bold whitespace-pre-wrap select-all font-sans">
                              {item.stepContents && item.stepContents[activeStepIdx] 
                                ? item.stepContents[activeStepIdx] 
                                : item.content}
                            </div>
                          </div>
                        )}

                        {/* Copier overlay or Step dialogue and footer */}
                        <div className="mt-6 pt-4 border-t border-slate-850 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 italic">
                            {activeObjectionOverlay 
                              ? "Copiez cette contre-objection si vous rédigez par écrit pour le client" 
                              : "Cliquez pour copier la trame de dialogue"}
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              const textToCopy = activeObjectionOverlay 
                                ? (activeObjectionOverlay.responseTemplate || activeObjectionOverlay.content)
                                : (item.stepContents && item.stepContents[activeStepIdx] ? item.stepContents[activeStepIdx] : item.content);
                              
                              navigator.clipboard.writeText(textToCopy);
                              
                              if (activeObjectionOverlay) {
                                setOverlayCopied(true);
                                setTimeout(() => setOverlayCopied(false), 2000);
                              } else {
                                setStepCopied(true);
                                setTimeout(() => setStepCopied(false), 2000);
                              }
                            }}
                            className="inline-flex items-center gap-1 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-505 rounded-xl transition shadow-sm active:scale-98"
                          >
                            {(activeObjectionOverlay ? overlayCopied : stepCopied) ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                 dialogue Copié !
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                Copier le dialogue
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Previous / Next Actions Footer */}
                      <div className="bg-slate-50 border-t border-slate-200 px-5 py-4 flex items-center justify-between select-none">
                        <button
                          type="button"
                          onClick={() => {
                            if (activeStepIdx > 0) {
                              setActiveStepIdx(prev => prev - 1);
                              setActiveObjectionOverlay(null);
                            }
                          }}
                          disabled={activeStepIdx === 0}
                          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                            activeStepIdx === 0 
                              ? 'opacity-40 bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                              : 'bg-white hover:bg-slate-150 text-slate-705 border border-slate-200 hover:border-slate-300 shadow-3xs'
                          }`}
                        >
                          &larr; Étape précédente
                        </button>

                        {activeObjectionOverlay && (
                          <button
                            type="button"
                            onClick={() => setActiveObjectionOverlay(null)}
                            className="text-xs bg-slate-200/80 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg border border-slate-300 transition"
                          >
                            Reprendre la trame principale
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            if (activeStepIdx < (item.steps?.length || 1) - 1) {
                              setActiveStepIdx(prev => prev + 1);
                              setActiveObjectionOverlay(null);
                            }
                          }}
                          disabled={activeStepIdx === (item.steps?.length || 1) - 1}
                          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                            activeStepIdx === (item.steps?.length || 1) - 1 
                              ? 'opacity-40 bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                              : 'bg-indigo-600 hover:bg-indigo-505 text-white shadow-xs hover:shadow-md cursor-pointer'
                          }`}
                        >
                          Étape suivante &rarr;
                        </button>
                      </div>
                    </div>

                    {/* Instant objection rebuttals tray for easy navigation! */}
                    {linkedObjections.length > 0 && (
                      <div className="space-y-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                        <div className="flex items-center justify-between select-none">
                          <h4 className="text-xxs font-extrabold text-rose-500 uppercase tracking-widest flex items-center gap-1.5 font-sans font-black">
                            <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse shrink-0" /> 
                            🚨 Si le prospect formule une objection :
                          </h4>
                          {activeObjectionOverlay && (
                            <button
                              type="button" 
                              onClick={() => setActiveObjectionOverlay(null)}
                              className="text-xxs text-indigo-600 font-extrabold hover:underline cursor-pointer"
                            >
                              Fermer la réponse &times;
                            </button>
                          )}
                        </div>
                        
                        <p className="text-[11px] text-slate-500 leading-normal select-none">
                          Cliquez instantanément sur le bouton de l'objection pour afficher la réplique exacte dans le panneau de lecture ci-dessus :
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {linkedObjections.map((obj) => {
                            const isOverlayActive = activeObjectionOverlay?.id === obj.id;
                            return (
                              <button
                                key={obj.id}
                                type="button"
                                onClick={() => {
                                  if (isOverlayActive) {
                                    setActiveObjectionOverlay(null);
                                  } else {
                                    setActiveObjectionOverlay(obj);
                                  }
                                }}
                                className={`text-left p-3 rounded-xl border text-xs transition duration-150 flex flex-col justify-between ${
                                  isOverlayActive 
                                    ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-205' 
                                    : 'bg-white hover:bg-rose-50/20 border-slate-200/80 hover:border-slate-350 shadow-3xs'
                                }`}
                              >
                                <div className="flex items-center justify-between w-full select-none">
                                  <span className="font-extrabold text-[9px] text-rose-500 block uppercase font-mono tracking-wider">
                                    {obj.category}
                                  </span>
                                  {isOverlayActive && (
                                    <span className="text-[10px] text-rose-600 font-bold bg-rose-100/60 px-1.5 py-0.5 rounded">
                                      Affiché
                                    </span>
                                  )}
                                </div>
                                <span className="font-bold text-slate-800 mt-1 line-clamp-1">
                                  {obj.title}
                                </span>
                                <span className="text-[10px] text-slate-500 italic line-clamp-1 mt-0.5">
                                  &ldquo;{obj.objectionText || obj.content}&rdquo;
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  </div>
                ) : (
                  // GLOBAL MARKDOWN OR STANDARD COMPREHENSIVE VIEW
                  <div className="space-y-6 animate-fadeIn">
                    
                    {/* Standard comprehensive sheet card */}
                    <div className="relative bg-white border border-slate-100 rounded-2xl p-6 shadow-xs">
                      <div className="flex items-center justify-between mb-3 select-none">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                            <MessageSquare className="w-4 h-4" />
                          </div>
                          <h3 className="text-xs font-bold text-slate-900 tracking-wide">
                            {item.type === 'objection' ? "Trame de réponse suggérée" : "Texte complet de la trame"}
                          </h3>
                        </div>
                        
                        <button
                          id="btn-copy-template"
                          onClick={handleCopy}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-medium text-slate-600 hover:text-indigo-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              Copié !
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Copier la trame
                            </>
                          )}
                        </button>
                      </div>

                      <div id="speak-content" className="text-sm text-slate-800 leading-relaxed max-h-96 overflow-y-auto p-4 bg-slate-50 rounded-xl border border-slate-150 select-all font-sans whitespace-pre-wrap">
                        {item.type === 'objection' && item.responseTemplate ? item.responseTemplate : item.content}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2 italic text-right select-none">
                        Conseil : double-cliquez pour copier ou de façon globale à l'aide du bouton.
                      </p>
                    </div>

                    {/* Context / Explication if type is objection */}
                    {item.type === 'objection' && item.content && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 select-none font-sans">
                          <BookOpen className="w-3.5 h-3.5 text-slate-400" /> Analyse de l'objection
                        </h4>
                        <p className="text-xs text-slate-605 leading-relaxed bg-white border border-slate-200 rounded-xl p-4 shadow-3xs">
                          {item.content}
                        </p>
                      </div>
                    )}

                    {/* Linked objections folded items for general view */}
                    {item.type === 'script' && linkedObjections.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 select-none font-sans">
                          <MessageSquare className="w-3.5 h-3.5 text-amber-500" /> Traitements d'Objections associés
                        </h4>
                        <div className="bg-white border border-slate-200 border-slate-150 rounded-2xl p-4 space-y-2.5 shadow-3xs">
                          <p className="text-[11px] text-slate-500 leading-snug select-none">
                            Les donateurs pour cette association formulent souvent ces objections durant l'appel. Cliquez pour déplier la réplique instantanément :
                          </p>
                          <div className="space-y-2">
                            {linkedObjections.map((obj) => {
                              const isOpen = openObjectionId === obj.id;
                              return (
                                <div key={obj.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-3xs transition-all">
                                  <button
                                    type="button"
                                    onClick={() => setOpenObjectionId(isOpen ? null : obj.id)}
                                    className="w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs font-semibold text-slate-800 hover:bg-slate-50 transition"
                                  >
                                    <span className="flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                      {obj.title}
                                    </span>
                                    <span className="text-[10px] text-indigo-650 font-bold hover:underline">
                                      {isOpen ? 'Masquer' : 'Déplier la réplique'}
                                    </span>
                                  </button>

                                  {isOpen && (
                                    <div className="px-3.5 pb-3.5 pt-1.5 border-t border-slate-100 bg-slate-50 space-y-2 select-all">
                                      {obj.objectionText && (
                                        <p className="text-[11px] text-rose-800 italic bg-rose-50 border border-rose-100 rounded-lg p-2 font-sans font-medium">
                                          &ldquo;{obj.objectionText}&rdquo;
                                        </p>
                                      )}
                                      <div className="relative">
                                        <p className="text-xs text-slate-705 bg-white border border-slate-200 rounded-xl p-3 font-sans whitespace-pre-wrap font-semibold leading-relaxed">
                                          {obj.responseTemplate || obj.content}
                                        </p>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            navigator.clipboard.writeText(obj.responseTemplate || obj.content);
                                            alert("Réplique copiée !");
                                          }}
                                          className="absolute top-2 right-2 p-1 bg-slate-100 hover:bg-emerald-50 text-slate-405 border border-slate-200 rounded-md transition"
                                          title="Copier la réplique"
                                        >
                                          <Copy className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Vertical lists for recommendations */}
                    {item.steps && item.steps.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 select-none font-sans">
                          <Clock className="w-3.5 h-3.5 text-slate-400" /> Séquence d'appel complète
                        </h4>
                        
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-3xs">
                          {item.steps.map((step, index) => (
                            <div key={index} className="flex gap-3 items-start last:mb-0">
                              <div className="flex flex-col items-center select-none">
                                <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-150 flex items-center justify-center text-xs font-bold shrink-0">
                                  {index + 1}
                                </div>
                                {index < item.steps!.length - 1 && (
                                  <div className="w-0.5 bg-slate-100 h-8 mt-1"></div>
                                )}
                              </div>
                              <div className="pt-0.5">
                                <p className="text-xs text-slate-750 font-bold">{step}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {/* Posture & Expert Tips (Global for both stepped / global modes!) */}
                {item.tips && item.tips.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 select-none font-sans">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Posture vocale & Conseils d'expert pour cette trame
                    </h4>
                    <div className="bg-amber-55 bg-amber-50/40 border border-amber-100 rounded-2xl p-5 space-y-2.5 shadow-3xs">
                      {item.tips.map((tip, idx) => (
                        <div key={idx} className="flex gap-2 items-start text-xs text-amber-900">
                          <span className="text-amber-500 mt-0.5 font-bold">&bull;</span>
                          <p className="leading-relaxed font-semibold">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Keywords/Tags */}
                {item.keywords && item.keywords.length > 0 && (
                  <div className="pt-4 border-t border-slate-200 select-none">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Mots clefs d'indexation IA :</span>
                    <div className="flex flex-wrap gap-1.5">
                      {item.keywords.map(kw => (
                        <span key={kw} className="text-xxs bg-white text-slate-655 border border-slate-200 px-2.5 py-1 rounded-md font-bold shadow-3xs">
                          #{kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>

          {/* Footer controls */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex items-center justify-between shadow-inner select-none">
            {isEditing ? (
              <>
                <div className="flex items-center gap-1 text-slate-400 text-[11px] font-medium animate-fadeIn">
                  <Info className="w-4 h-4 text-slate-300" />
                  <span>Validation de la séquence requise.</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border border-slate-250 bg-white hover:bg-slate-50 text-slate-705 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    disabled={isSavingDirectly || !editTitle.trim() || !editContent.trim()}
                    onClick={handleDirectSave}
                    className="px-5 py-2 hover:bg-emerald-700 bg-emerald-600 text-white text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center gap-1 shadow cursor-pointer disabled:opacity-45"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isSavingDirectly ? 'Indexation...' : 'Sauvegarder'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                  <Info className="w-4 h-4 text-slate-300" />
                  <span>Double-cliquez pour copier les phrases.</span>
                </div>
                <button
                  id="close-bottom-btn"
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition shadow active:scale-98 cursor-pointer"
                >
                  Fermer la fiche
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

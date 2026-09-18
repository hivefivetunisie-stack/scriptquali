/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ScriptItem } from '../types.ts';
import { 
  X, Plus, Trash2, Star, ChevronUp, ChevronDown, 
  PhoneCall, ShieldAlert, Sparkles, Tag, Lightbulb, Link2, BookOpen
} from 'lucide-react';

interface CreateScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (scriptData: Partial<ScriptItem>, id?: string) => Promise<void>;
  categories: string[];
  allObjections?: ScriptItem[];
  editingItem?: ScriptItem | null;
}

export default function CreateScriptModal({ 
  isOpen, 
  onClose, 
  onSave, 
  categories, 
  allObjections = [], 
  editingItem = null 
}: CreateScriptModalProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'script' | 'objection'>('script');
  const [category, setCategory] = useState('Script');
  const [customCategory, setCustomCategory] = useState('');
  const [useCustomCategory, setUseCustomCategory] = useState(false);
  const [content, setContent] = useState('');
  const [objectionText, setObjectionText] = useState('');
  const [responseTemplate, setResponseTemplate] = useState('');
  
  // Custom states for list items
  const [steps, setSteps] = useState<string[]>(['Prise de contact']);
  const [stepContents, setStepContents] = useState<string[]>(['']);
  const [tips, setTips] = useState<string[]>(['']);
  const [keywordsText, setKeywordsText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Relationships and priorities
  const [linkedObjections, setLinkedObjections] = useState<string[]>([]);
  const [isHighlighted, setIsHighlighted] = useState(false);

  // Populate data if we are editing an item
  useEffect(() => {
    if (editingItem) {
      setTitle(editingItem.title || '');
      setType(editingItem.type || 'script');
      setCategory(editingItem.category || 'Script');
      setContent(editingItem.content || '');
      setObjectionText(editingItem.objectionText || '');
      setResponseTemplate(editingItem.responseTemplate || '');
      setSteps(editingItem.steps && editingItem.steps.length > 0 ? [...editingItem.steps] : ['Prise de contact']);
      setStepContents(
        editingItem.stepContents && editingItem.stepContents.length > 0 
          ? [...editingItem.stepContents] 
          : (editingItem.steps ? editingItem.steps.map(() => '') : [''])
      );
      setTips(editingItem.tips && editingItem.tips.length > 0 ? [...editingItem.tips] : ['']);
      setKeywordsText(editingItem.keywords ? editingItem.keywords.join(', ') : '');
      setLinkedObjections(editingItem.associatedObjections || []);
      setIsHighlighted(!!editingItem.isHighlighted);
      setUseCustomCategory(false);
    } else {
      setTitle('');
      setType('script');
      setCategory('Script');
      setContent('');
      setObjectionText('');
      setResponseTemplate('');
      setSteps(['Prise de contact']);
      setStepContents(['Bonjour Monsieur/Madame [Nom], je suis [Prénom] de l\'association...']);
      setTips(['Garder une élocution calme, chaleureuse et professionnelle.']);
      setKeywordsText('');
      setLinkedObjections([]);
      setIsHighlighted(false);
      setUseCustomCategory(false);
    }
  }, [editingItem, isOpen]);

  if (!isOpen) return null;

  const handleAddStep = () => {
    setSteps([...steps, `Étape ${steps.length + 1}`]);
    setStepContents([...stepContents, '']);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length <= 1) return;
    setSteps(steps.filter((_, i) => i !== index));
    setStepContents(stepContents.filter((_, i) => i !== index));
  };

  const handleStepChange = (index: number, val: string) => {
    const updated = [...steps];
    updated[index] = val;
    setSteps(updated);
  };

  const handleStepContentChange = (index: number, val: string) => {
    const updated = [...stepContents];
    updated[index] = val;
    setStepContents(updated);
  };

  const handleMoveStepUp = (index: number) => {
    if (index === 0) return;
    const sCopy = [...steps];
    const cCopy = [...stepContents];
    
    const tempStep = sCopy[index];
    sCopy[index] = sCopy[index - 1];
    sCopy[index - 1] = tempStep;

    const tempCont = cCopy[index];
    cCopy[index] = cCopy[index - 1];
    cCopy[index - 1] = tempCont;

    setSteps(sCopy);
    setStepContents(cCopy);
  };

  const handleMoveStepDown = (index: number) => {
    if (index === steps.length - 1) return;
    const sCopy = [...steps];
    const cCopy = [...stepContents];

    const tempStep = sCopy[index];
    sCopy[index] = sCopy[index + 1];
    sCopy[index + 1] = tempStep;

    const tempCont = cCopy[index];
    cCopy[index] = cCopy[index + 1];
    cCopy[index + 1] = tempCont;

    setSteps(sCopy);
    setStepContents(cCopy);
  };

  const handleAddTip = () => setTips([...tips, '']);
  const handleRemoveTip = (index: number) => {
    if (tips.length <= 1) {
      setTips(['']);
      return;
    }
    setTips(tips.filter((_, i) => i !== index));
  };
  const handleTipChange = (index: number, val: string) => {
    const updated = [...tips];
    updated[index] = val;
    setTips(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    const finalCategory = useCustomCategory ? customCategory.trim() : category;

    // Filter empty steps
    const finalizedSteps: string[] = [];
    const finalizedContents: string[] = [];
    steps.forEach((st, idx) => {
      const cleanSt = st.trim();
      if (cleanSt.length > 0) {
        finalizedSteps.push(cleanSt);
        finalizedContents.push((stepContents[idx] || '').trim());
      }
    });

    const data: Partial<ScriptItem> = {
      title: title.trim(),
      type,
      category: finalCategory || (type === 'script' ? 'Script' : 'Guide d\'objection'),
      content: content.trim(),
      objectionText: type === 'objection' ? objectionText.trim() : undefined,
      responseTemplate: type === 'objection' ? responseTemplate.trim() : undefined,
      steps: type === 'script' ? finalizedSteps : [],
      stepContents: type === 'script' ? finalizedContents : [],
      tips: tips.map(t => t.trim()).filter(t => t.length > 0),
      keywords: keywordsText.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0),
      associatedObjections: type === 'script' ? linkedObjections : [],
      isHighlighted,
      author: editingItem ? editingItem.author : 'Administration'
    };

    try {
      await onSave(data, editingItem?.id);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-hidden" 
      aria-labelledby="modal-title" 
      role="dialog" 
      aria-modal="true"
    >
      {/* Backdrop overlay */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Container with guaranteed flexbox scrolling and always-visible header and footer */}
      <div className="relative w-full max-w-3xl lg:max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 z-10">
        
        {/* Fixed Header */}
        <div className="flex-shrink-0 bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${type === 'script' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'}`}>
              {type === 'script' ? <PhoneCall className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            </div>
            <div>
              <h3 id="modal-title" className="text-sm font-bold tracking-wide uppercase font-sans text-white flex items-center gap-2">
                {editingItem ? 'Modifier le Document' : (type === 'script' ? 'Nouveau Script d\'Appel' : 'Nouvelle Fiche d\'Objection')}
              </h3>
              <p className="text-[11px] text-slate-400 font-normal">
                {type === 'script' 
                  ? 'Trame complète d\'appel de prospection ou collecte avec déroulé par étapes'
                  : 'Argumentaire de réponse rapide pour lever les réticences des prospects'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800 transition rounded-lg p-1.5 cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form enclosing scrollable body and sticky footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          
          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-slate-50/40">
            
            {/* Type selector */}
            {!editingItem && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Type d'élément à créer
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    id="type-script-btn"
                    type="button"
                    onClick={() => {
                      setType('script');
                      if (category === 'Guide d\'objection') setCategory('Script');
                    }}
                    className={`py-3 px-4 rounded-xl text-xs font-semibold border transition-all flex items-center gap-3 cursor-pointer text-left ${
                      type === 'script'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs ring-2 ring-emerald-500/20'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${type === 'script' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      <PhoneCall className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold block">Script d'Appel / Don</span>
                      <span className="text-[10px] text-slate-500 block font-normal">Déroulé séquentiel, dialogue d'appel et collecte</span>
                    </div>
                  </button>
                  <button
                    id="type-objection-btn"
                    type="button"
                    onClick={() => {
                      setType('objection');
                      if (category === 'Script') setCategory('Guide d\'objection');
                    }}
                    className={`py-3 px-4 rounded-xl text-xs font-semibold border transition-all flex items-center gap-3 cursor-pointer text-left ${
                      type === 'objection'
                        ? 'bg-indigo-50 text-indigo-800 border-indigo-300 shadow-xs ring-2 ring-indigo-500/20'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${type === 'objection' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold block">Traitement d'Objection</span>
                      <span className="text-[10px] text-slate-500 block font-normal">Contre-argumentation, parade et verbatim précis</span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Title & Category in 2 columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Titre {type === 'script' ? 'du script' : 'de l\'objection'} <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={type === 'script' ? "Ex: CFSI - Collecte de dons hivernale..." : "Ex: Objection - Manque de moyens / Budget serré"}
                  className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                />
              </div>

              {/* Category selection */}
              <div>
                <div className="flex justify-between items-center mb-1.5 select-none">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Thématique / Catégorie
                  </label>
                  <button
                    type="button"
                    onClick={() => setUseCustomCategory(!useCustomCategory)}
                    className="text-xxs text-indigo-600 hover:text-indigo-700 font-bold cursor-pointer"
                  >
                    {useCustomCategory ? 'Choisir existante' : '+ Nouvelle thématique'}
                  </button>
                </div>
                
                {useCustomCategory ? (
                  <input
                    id="input-custom-category"
                    type="text"
                    required
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Ex: Restos du Cœur, Solidarité, Conjoint..."
                    className="w-full text-xs bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                  />
                ) : (
                  <select
                    id="select-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition cursor-pointer"
                  >
                    {Array.from(new Set([...categories, "Script", "Guide d'objection", "Resensibilisation", "Conjoint", "Internet"])).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Objection Specific Fields */}
            {type === 'objection' && (
              <div className="space-y-4 p-4 bg-indigo-50/40 border border-indigo-100 rounded-2xl">
                <div>
                  <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1.5">
                    Citation exacte de l'objection prospect <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="input-objection-text"
                    required={type === 'objection'}
                    rows={2}
                    value={objectionText}
                    onChange={(e) => setObjectionText(e.target.value)}
                    placeholder="Ce que dit le prospect (Ex: « Je donne déjà à d'autres associations, je ne peux pas aider tout le monde ! »)"
                    className="w-full text-xs font-semibold bg-white border border-rose-200 rounded-xl px-4 py-2.5 text-rose-950 placeholder-slate-400 focus:outline-hidden focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1.5">
                    Trame de réplique orale suggérée pour l'agent <span className="text-indigo-600">*</span>
                  </label>
                  <textarea
                    id="input-response-template"
                    required={type === 'objection'}
                    rows={5}
                    value={responseTemplate}
                    onChange={(e) => setResponseTemplate(e.target.value)}
                    placeholder="Le verbatim exact mot-à-mot que le téléconseiller doit prononcer calmement pour désamorcer l'objection..."
                    className="w-full text-xs font-semibold bg-white border border-indigo-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* Content / General Script text */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {type === 'script' ? 'Résumé complet & Explication du dossier' : 'Notice d’analyse stratégique de l’objection'} <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="input-content"
                required
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={type === 'script' 
                  ? "Présentation globale de la campagne, objectifs de la collecte et cible d'appel..." 
                  : "Comment l'agent doit appréhender psychologiquement cette hésitation pour valoriser le prospect..."}
                className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition leading-relaxed"
              />
            </div>

            {/* Conversational Steps list mapping (Only for scripts!) */}
            {type === 'script' && (
              <div className="space-y-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-3xs">
                <div className="flex items-center justify-between select-none">
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-emerald-600" />
                      Séquence des étapes et dialogues de l'appel
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Chaque étape apparaît dans l'assistant d'appel de l'agent avec son titre et le dialogue verbatim associé.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 border border-emerald-200 rounded-xl transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter une étape
                  </button>
                </div>
                
                <div className="space-y-3 pt-1">
                  {steps.map((st, i) => (
                    <div key={i} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative hover:border-slate-300 transition">
                      <div className="flex items-center justify-between select-none">
                        <span className="text-[11px] font-black text-emerald-800 bg-emerald-100/70 border border-emerald-200 px-2.5 py-0.5 rounded-md uppercase font-mono">
                          Étape {i + 1}
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={i === 0}
                            onClick={() => handleMoveStepUp(i)}
                            className={`p-1 rounded-lg border text-xs ${i === 0 ? 'opacity-30 text-slate-400 border-slate-200 cursor-not-allowed' : 'text-slate-600 border-slate-200 hover:bg-white cursor-pointer'}`}
                            title="Monter cette étape"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={i === steps.length - 1}
                            onClick={() => handleMoveStepDown(i)}
                            className={`p-1 rounded-lg border text-xs ${i === steps.length - 1 ? 'opacity-30 text-slate-400 border-slate-200 cursor-not-allowed' : 'text-slate-600 border-slate-200 hover:bg-white cursor-pointer'}`}
                            title="Descendre cette étape"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          {steps.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveStep(i)}
                              className="text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 p-1 rounded-lg text-xs transition cursor-pointer ml-1"
                              title="Supprimer cette étape"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                            Titre de l'étape {i + 1}
                          </label>
                          <input
                            type="text"
                            required
                            value={st}
                            onChange={(e) => handleStepChange(i, e.target.value)}
                            placeholder={`Ex: Prise de contact, Présentation du projet, Clôture...`}
                            className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                            Verbatim / Dialogue récité de vive voix
                          </label>
                          <textarea
                            value={stepContents[i] || ''}
                            onChange={(e) => handleStepContentChange(i, e.target.value)}
                            placeholder={`Ex: « Bonjour Monsieur/Madame, je vous contacte au nom de l'association... »`}
                            rows={3}
                            className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 leading-relaxed"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expert Tips / Posture strategy list mapping */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-3">
              <div className="flex items-center justify-between select-none">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Posture vocale &amp; Conseils d'expert
                </label>
                <button
                  type="button"
                  onClick={handleAddTip}
                  className="text-xs text-amber-800 hover:text-amber-900 font-bold flex items-center gap-1 bg-amber-50 hover:bg-amber-100 px-3 py-1 border border-amber-200 rounded-xl transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Ajouter un conseil
                </button>
              </div>
              <div className="space-y-2">
                {tips.map((tp, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={tp}
                      onChange={(e) => handleTipChange(i, e.target.value)}
                      placeholder={`Conseil ${i + 1} (Ex: Marquer des pauses, sourire au téléphone, valider l'accord...)`}
                      className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 focus:outline-hidden focus:border-amber-500 focus:bg-white transition"
                    />
                    {tips.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTip(i)}
                        className="p-2 text-rose-500 hover:bg-rose-50 border border-rose-150 rounded-xl transition cursor-pointer"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Associated objections relationship mapping */}
            {type === 'script' && allObjections && allObjections.length > 0 && (
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-3">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 select-none">
                  <Link2 className="w-4 h-4 text-indigo-500" />
                  Lier des Traitements d'Objections Rapides
                </label>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-36 overflow-y-auto space-y-2 divide-y divide-slate-200/50">
                  {allObjections.map((obj) => (
                    <label key={obj.id} className="pt-2 first:pt-0 flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer hover:text-slate-900 select-none">
                      <input
                        type="checkbox"
                        checked={linkedObjections.includes(obj.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setLinkedObjections([...linkedObjections, obj.id]);
                          } else {
                            setLinkedObjections(linkedObjections.filter(id => id !== obj.id));
                          }
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-0.5 cursor-pointer"
                      />
                      <div className="leading-tight">
                        <span className="font-bold block text-slate-800">{obj.title}</span>
                        {obj.objectionText && (
                          <span className="text-[11px] text-slate-400 italic line-clamp-1 block">« {obj.objectionText} »</span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Keywords and Highlight Option */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {/* Keywords */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-slate-500" />
                  Mots-clés (recherche & indexation)
                </label>
                <input
                  id="input-keywords"
                  type="text"
                  value={keywordsText}
                  onChange={(e) => setKeywordsText(e.target.value)}
                  placeholder="Ex: don, inflation, rib, annuel, cfsi (séparés par virgules)"
                  className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 transition"
                />
              </div>

              {/* Highlight selection */}
              <div className="pt-2">
                <label className="flex items-center gap-3 p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-100/60 transition select-none">
                  <input
                    id="checkbox-highlight"
                    type="checkbox"
                    checked={isHighlighted}
                    onChange={(e) => setIsHighlighted(e.target.checked)}
                    className="rounded border-amber-400 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950 font-sans">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                    <span>Épingler en haut (Affichage prioritaire)</span>
                  </div>
                </label>
              </div>
            </div>

          </div>

          {/* Sticky Fixed Footer (ALWAYS VISIBLE) */}
          <div className="flex-shrink-0 px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4 select-none">
            <div className="text-[11px] text-slate-500 hidden sm:flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Indexation vectorielle et sémantique automatique</span>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                id="submit-new-script"
                type="submit"
                disabled={isSubmitting || !title.trim() || !content.trim()}
                className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sauvegarde...</span>
                  </>
                ) : (
                  <span>Enregistrer &amp; Indexer</span>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}

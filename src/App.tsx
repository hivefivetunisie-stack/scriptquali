/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, SlidersHorizontal, Plus, Sparkles, 
  HelpCircle, RotateCcw, MessageSquare, FileText,
  AlertCircle, ChevronDown, CheckCircle, Star,
  Copy, Check, Play, List, ShieldAlert, LogOut, Volume2, BookOpen, Lightbulb, Clock
} from 'lucide-react';
import UploadZone from './components/UploadZone.tsx';
import ScriptCard from './components/ScriptCard.tsx';
import ScriptDetailModal from './components/ScriptDetailModal.tsx';
import CreateScriptModal from './components/CreateScriptModal.tsx';
import { ScriptItem, SearchResult } from './types.ts';

export default function App() {
  const [scripts, setScripts] = useState<ScriptItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('auth_authenticated') === 'true';
  });
  const [userRole, setUserRole] = useState<'agent' | 'admin'>(() => {
    return (localStorage.getItem('auth_role') as 'agent' | 'admin') || 'agent';
  });
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Filtering & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [searchMode, setSearchMode] = useState<'hybrid' | 'vector' | 'fulltext'>('hybrid');
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [apiWarning, setApiWarning] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ScriptItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showConfigMenu, setShowConfigMenu] = useState(false);
  const [showUploadZone, setShowUploadZone] = useState(false); // Default to false so agent screen is super clean

  // Stats indicators
  const totalScriptsCount = scripts.filter(s => s.type === 'script').length;
  const totalObjectionsCount = scripts.filter(s => s.type === 'objection').length;
  const highlightedItems = scripts.filter(s => s.isHighlighted);

  // Agent dedicated view states
  const [activeScriptId, setActiveScriptId] = useState<string>('sc-cfsi');
  const [agentStepIdx, setAgentStepIdx] = useState<number>(0);
  const [agentObjectionSearch, setAgentObjectionSearch] = useState<string>('');
  const [agentSelectedObjection, setAgentSelectedObjection] = useState<ScriptItem | null>(null);
  const [agentDialogCopied, setAgentDialogCopied] = useState<boolean>(false);
  const [agentObjectionCopied, setAgentObjectionCopied] = useState<boolean>(false);
  const [agentActiveObjectionTab, setAgentActiveObjectionTab] = useState<string>('all');
  const [agentFontSize, setAgentFontSize] = useState<number>(24);

  // Automatically select the first script of type 'script' as the active script id at load
  useEffect(() => {
    const campaignScripts = scripts.filter(s => s.type === 'script');
    if (campaignScripts.length > 0) {
      const hasCfsi = campaignScripts.find(s => s.id === 'sc-cfsi');
      if (hasCfsi) {
        setActiveScriptId('sc-cfsi');
      } else {
        setActiveScriptId(campaignScripts[0].id);
      }
    }
  }, [scripts]);

  const handleCampaignChange = (id: string) => {
    setActiveScriptId(id);
    setAgentStepIdx(0);
    setAgentSelectedObjection(null);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = loginUsername.trim();
    const cleanPass = loginPassword.trim();

    if (cleanUser === 'Agent' && cleanPass === '123456') {
      setIsAuthenticated(true);
      setUserRole('agent');
      localStorage.setItem('auth_authenticated', 'true');
      localStorage.setItem('auth_role', 'agent');
      setAuthError(null);
    } else if (cleanUser === 'admin' && cleanPass === '123456789') {
      setIsAuthenticated(true);
      setUserRole('admin');
      localStorage.setItem('auth_authenticated', 'true');
      localStorage.setItem('auth_role', 'admin');
      setAuthError(null);
    } else {
      setAuthError("Saisie incorrecte. Admin: admin (123456789) | Agent: Agent (123456).");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole('agent');
    localStorage.removeItem('auth_authenticated');
    localStorage.removeItem('auth_role');
    setLoginUsername('');
    setLoginPassword('');
    setAuthError(null);
  };

  // Real-time server-sent events synchronization for admin and agent interface
  useEffect(() => {
    let sse: EventSource | null = null;
    let reconnectTimeout: any = null;

    function connectSSE() {
      console.log("[SSE] Connexion au flux de synchronisation en temps réel...");
      sse = new EventSource('/api/live-sync');

      sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'connected') {
            console.log("[SSE] " + data.message);
          } else if (data.type === 'create') {
            const newItem = data.payload;
            setScripts(prev => {
              // Avoid duplicate adds
              if (prev.some(s => s.id === newItem.id)) return prev;
              return [newItem, ...prev];
            });
          } else if (data.type === 'update') {
            const updatedItem = data.payload;
            setScripts(prev => prev.map(s => s.id === updatedItem.id ? updatedItem : s));
          } else if (data.type === 'delete') {
            const { id } = data.payload;
            setScripts(prev => prev.filter(s => s.id !== id));
          } else if (data.type === 'bulk') {
            const importedItems = data.payload;
            setScripts(prev => {
              const prevFiltered = prev.filter(s => !importedItems.some((imported: any) => imported.id === s.id));
              return [...importedItems, ...prevFiltered];
            });
          }
        } catch (err) {
          console.error("[SSE] Erreur parsing message:", err);
        }
      };

      sse.onerror = (err) => {
        console.warn("[SSE] Erreur ou déconnexion du flux, reconnexion dans 5s...", err);
        if (sse) {
          sse.close();
        }
        reconnectTimeout = setTimeout(connectSSE, 5000);
      };
    }

    connectSSE();

    return () => {
      if (sse) {
        sse.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  // Initial Fetching
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Run search query whenever filters, query text, or mode change
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      triggerSearch();
    }, 200);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, selectedCategory, selectedType, searchMode, scripts]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      // Fetch baseline list
      const res = await fetch('/api/scripts');
      if (res.ok) {
        const list = await res.json();
        setScripts(list);
      }

      // Fetch dynamic categories
      const catRes = await fetch('/api/categories');
      if (catRes.ok) {
        const cats = await catRes.json();
        setCategories(cats);
      }
    } catch (err) {
      console.error("Erreur de chargement initial:", err);
    } finally {
      setLoading(false);
    }
  };

  const triggerSearch = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          category: selectedCategory,
          type: selectedType,
          searchMode
        })
      });

      if (res.ok) {
        const results: SearchResult[] = await res.json();
        setSearchResults(results);
        setApiWarning(null); // Clear key warnings if search calls success
      } else {
        const data = await res.json();
        // If Gemini is not set up on sandbox startup, warn gently
        if (data.error && data.error.includes("GEMINI_API_KEY")) {
          setApiWarning("Recherche Plein Texte active. Configurez votre clé d'API dans de panneau de configuration 'Secrets' pour activer la puissance vectorielle de Gemini.");
        }
      }
    } catch (error) {
      console.error("La recherche à échoué :", error);
    } finally {
      setLoading(false);
    }
  };

  const [editingItem, setEditingItem] = useState<ScriptItem | null>(null);

  const handleManualSave = async (itemData: Partial<ScriptItem>, id?: string) => {
    try {
      const isEdit = !!id;
      const url = isEdit ? `/api/scripts/${id}` : '/api/scripts';
      const method = isEdit ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de l'enregistrement.");
      }

      const savedItem: ScriptItem = await res.json();
      
      if (isEdit) {
        setScripts(prev => prev.map(s => s.id === id ? savedItem : s));
        if (selectedItem && selectedItem.id === id) {
          setSelectedItem(savedItem);
        }
      } else {
        setScripts(prev => [savedItem, ...prev]);
      }
      
      // Update unique categories lists if new is used
      if (itemData.category && !categories.includes(itemData.category)) {
        setCategories(prev => [...prev, itemData.category!]);
      }
      setEditingItem(null);
    } catch (error: any) {
      alert(`Échec de l'enregistrement : ${error.message}`);
    }
  };

  const handleDeleteDirectly = async (id: string) => {
    try {
      const res = await fetch(`/api/scripts/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setScripts(prev => prev.filter(s => s.id !== id));
      }
    } catch (error) {
      console.error("Échec de la suppression directe:", error);
    }
  };

  const handleToggleHighlight = async (item: ScriptItem) => {
    try {
      const updatedStatus = !item.isHighlighted;
      const res = await fetch(`/api/scripts/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHighlighted: updatedStatus })
      });
      if (res.ok) {
        const updatedItem: ScriptItem = await res.json();
        setScripts(prev => prev.map(s => s.id === item.id ? updatedItem : s));
      }
    } catch (err) {
      console.error("Échec de la mise en avant :", err);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm("Êtes-vous certain de vouloir supprimer cette fiche d'appel ?")) {
      return;
    }

    try {
      const res = await fetch(`/api/scripts/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setScripts(prev => prev.filter(s => s.id !== id));
      }
    } catch (error) {
      console.error("Échec de la suppression:", error);
    }
  };

  const handleImportSuccess = (newImported: ScriptItem[]) => {
    // Append and reload
    setScripts(prev => [...newImported, ...prev]);
    
    // Extract any new categories that might have been automatically set
    fetchInitialData();
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedType('all');
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100 font-sans text-slate-900 px-4">
        <div className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-3xl overflow-hidden p-8 sm:p-10 space-y-7 transition-all">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
              Portail d'Accès Conseillers
            </h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Saisissez vos identifiants pour accéder à la base d'appel et d'objections d'associations.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="login-username" className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nom d'utilisateur
              </label>
              <input
                id="login-username"
                type="text"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Ex: Agent ou admin"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-850 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Mot de passe de session
              </label>
              <input
                id="login-password"
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-850 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition"
              />
            </div>

            {authError && (
              <div className="bg-rose-50 border border-rose-100 text-rose-800 rounded-xl p-3 text-xs font-semibold leading-relaxed">
                {authError}
              </div>
            )}

            <button
              id="btn-login"
              type="submit"
              className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md hover:shadow-lg transition cursor-pointer"
            >
              Déverrouiller l'accès
            </button>
          </form>

          <div className="border-t border-slate-100 pt-5 text-center space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450 block">Sessions autorisées</span>
            <div className="grid grid-cols-2 gap-2.5 text-[11px] text-slate-500">
              <div className="bg-slate-50 border border-slate-150 rounded-lg p-2.5 leading-normal">
                <span className="font-bold text-slate-700 block text-xs">PROV. AGENT</span>
                ID : <span className="font-semibold text-indigo-600 select-all">Agent</span><br/>
                PASS : <span className="font-semibold text-indigo-600 select-all">123456</span>
              </div>
              <div className="bg-slate-50 border border-slate-150 rounded-lg p-2.5 leading-normal">
                <span className="font-bold text-slate-700 block text-xs">ADMINISTRATEUR</span>
                ID : <span className="font-semibold text-amber-600 select-all">admin</span><br/>
                PASS : <span className="font-semibold text-amber-600 select-all">123456789</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (userRole === 'agent') {
    const campaignScripts = scripts.filter(s => s.type === 'script');
    const activeScript = scripts.find(s => s.id === activeScriptId) || campaignScripts[0];

    // Get linked and unlinked objections
    const linkedObjections = activeScript
      ? scripts.filter(s => s.type === 'objection' && activeScript.associatedObjections?.includes(s.id))
      : [];
    const otherObjections = activeScript
      ? scripts.filter(s => s.type === 'objection' && !activeScript.associatedObjections?.includes(s.id))
      : scripts.filter(s => s.type === 'objection');

    const allObjectionsForAgent = [...linkedObjections, ...otherObjections];
    const filteredObjections = allObjectionsForAgent.filter(obj => {
      const matchesSearch = agentObjectionSearch 
        ? (obj.title.toLowerCase().includes(agentObjectionSearch.toLowerCase()) || 
           obj.objectionText?.toLowerCase().includes(agentObjectionSearch.toLowerCase()) ||
           obj.content.toLowerCase().includes(agentObjectionSearch.toLowerCase()) ||
           (obj.responseTemplate && obj.responseTemplate.toLowerCase().includes(agentObjectionSearch.toLowerCase())) ||
           obj.category.toLowerCase().includes(agentObjectionSearch.toLowerCase()) ||
           (obj.keywords && obj.keywords.some(kw => kw.toLowerCase().includes(agentObjectionSearch.toLowerCase()))))
        : true;
        
      const matchesTab = agentActiveObjectionTab === 'all' 
        ? true 
        : obj.category.toLowerCase() === agentActiveObjectionTab.toLowerCase();
        
      return matchesSearch && matchesTab;
    });

    const objectionCategories = Array.from(new Set(allObjectionsForAgent.map(o => o.category)));

    const handleCopyAgentDialogue = (text: string) => {
      navigator.clipboard.writeText(text);
      setAgentDialogCopied(true);
      setTimeout(() => setAgentDialogCopied(false), 2000);
    };

    const handleCopyAgentObjection = (text: string) => {
      navigator.clipboard.writeText(text);
      setAgentObjectionCopied(true);
      setTimeout(() => setAgentObjectionCopied(false), 2000);
    };

    if (!activeScript) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 font-sans text-slate-800 p-8 text-center select-none">
          <div className="animate-spin h-8 w-8 text-indigo-600 mb-4" />
          <p className="text-sm font-semibold text-slate-600">Synchronisation des fiches d'appel en cours...</p>
        </div>
      );
    }

    const steps = activeScript.steps || [];
    const stepContents = activeScript.stepContents || [];

    return (
      <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
        {/* Header Bar */}
        <header className="h-16 shrink-0 bg-white border-b border-slate-200 flex items-center px-6 justify-between select-none shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-slate-900 font-extrabold text-sm tracking-tight flex items-center gap-1.5">
                SynergyCall Agent Workspace
              </span>
              <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider block">
                Console de Téléprospection en direct
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-750">Conseiller Session Active</span>
              <span className="text-[9px] text-emerald-600 bg-emerald-50 px-2.5 py-1 border border-emerald-100 rounded-lg font-extrabold flex items-center justify-end gap-1.5 uppercase font-mono tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Dispositif Écoute En Ligne
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Se déconnecter</span>
            </button>
          </div>
        </header>

        {/* Association Selector */}
        <section className="shrink-0 bg-white border-b border-slate-200 p-4 select-none shadow-3xs">
          <div className="max-w-7xl mx-auto space-y-2">
            <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest font-mono">
              📁 Choisissez votre Dossier d'Association ou de Campagne active :
            </p>
            <div className="flex flex-wrap gap-2.5">
              {campaignScripts.map((sc) => {
                const isActive = sc.id === activeScriptId;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => handleCampaignChange(sc.id)}
                    className={`text-left px-4 py-2 rounded-xl border transition-all duration-150 flex items-center gap-3 shadow-3xs group ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white border-indigo-750 font-bold ring-4 ring-indigo-500/10 scale-[1.01]'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {sc.title.includes("CFSI") ? "CFSI" : "TRAME"}
                    </div>
                    <div>
                      <h4 className={`text-xs font-bold leading-tight ${isActive ? 'text-white' : 'text-slate-800'}`}>
                        {sc.title}
                      </h4>
                      <p className={`text-[9px] font-medium leading-none mt-1 ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                        {sc.category} &bull; {sc.steps?.length || 0} étapes de conversion
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Main interactive Columns of Workspace */}
        <div className="flex-grow flex flex-col xl:flex-row overflow-hidden max-w-none w-full px-4 xl:px-6 gap-4">
          
          {/* LEFT COLUMN: INTERACTIVE TELEPROMPTER SCRIPT WITH LEFT SIDEBAR STEPPER */}
          <div className="flex-1 xl:w-[82%] flex flex-col xl:flex-row gap-4 p-4 overflow-hidden">
            
            {/* LATERALLY PLACED APPEL DISPATCH PANEL (ON THE LEFT) */}
            <div className="xl:w-44 w-full shrink-0 flex flex-col justify-between gap-4 bg-white border border-slate-200 p-3 rounded-2xl shadow-xs select-none overflow-y-auto">
              <div className="space-y-3.5">
                <div className="border-b border-slate-100 pb-2.5">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest font-mono flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5" />
                    SEQUENCE DIRECTE
                  </span>
                  <p className="text-[10px] text-slate-400 font-bold block mt-0.5 font-mono">
                    Étape {agentStepIdx + 1} sur {steps.length}
                  </p>
                </div>

                {steps.length > 0 ? (
                  <div className="space-y-2 max-h-[280px] xl:max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                    {steps.map((st, idx) => {
                      const isStepActive = agentStepIdx === idx;
                      const isStepPassed = idx < agentStepIdx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setAgentStepIdx(idx);
                            setAgentSelectedObjection(null);
                          }}
                          className={`w-full text-left flex items-start gap-2.5 p-2.5 rounded-xl border text-xs transition-all duration-150 cursor-pointer ${
                            isStepActive 
                              ? 'bg-indigo-600 border-indigo-600 text-white font-extrabold shadow-sm scale-[1.01]'
                              : isStepPassed 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-100 hover:bg-emerald-100/50 font-semibold'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 font-extrabold ${
                            isStepActive 
                              ? 'bg-white text-indigo-700'
                              : isStepPassed 
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-200 text-slate-500 border border-slate-300'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="leading-tight break-words">{st}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Aucune étape disponible</p>
                )}
              </div>

              {/* ACTION COMPONENT & ZOOM CONTROLS STACKED AT BOTTOM OF SIDEBAR */}
              <div className="space-y-4 pt-3 border-t border-slate-100">
                
                {/* ZOOM INTERACTIVE CONTROLS */}
                <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 text-center font-mono">
                    🔎 TAILLE TEXTE (Zoom) :
                  </span>
                  <div className="flex items-center justify-between gap-1">
                    <button
                      type="button"
                      onClick={() => setAgentFontSize(prev => Math.max(16, prev - 2))}
                      className="w-12 h-9 rounded-xl bg-white border border-slate-300 flex items-center justify-center font-bold text-slate-700 shadow-3xs hover:bg-slate-100 hover:border-slate-400 active:scale-95 cursor-pointer text-sm"
                      title="Diminuer la taille"
                    >
                      A-
                    </button>
                    <span className="text-xs font-black text-slate-800 font-mono tracking-wide px-2 bg-white py-1 rounded-lg border border-slate-100">
                      {agentFontSize}px
                    </span>
                    <button
                      type="button"
                      onClick={() => setAgentFontSize(prev => Math.min(48, prev + 2))}
                      className="w-12 h-9 rounded-xl bg-white border border-slate-300 flex items-center justify-center font-bold text-slate-700 shadow-3xs hover:bg-slate-100 hover:border-slate-400 active:scale-95 cursor-pointer text-sm"
                      title="Augmenter la taille"
                    >
                      A+
                    </button>
                  </div>
                </div>

                {/* STEP NAVIGATION ACTIONS */}
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (agentStepIdx > 0) {
                        setAgentStepIdx(prev => prev - 1);
                        setAgentSelectedObjection(null);
                      }
                    }}
                    disabled={agentStepIdx === 0}
                    className={`w-full py-3 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                      agentStepIdx === 0 
                        ? 'bg-slate-50 text-slate-400 border-slate-150 cursor-not-allowed opacity-50' 
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 active:scale-98'
                    }`}
                  >
                    &larr; Étape précédente
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (agentStepIdx < steps.length - 1) {
                        setAgentStepIdx(prev => prev + 1);
                        setAgentSelectedObjection(null);
                      }
                    }}
                    disabled={agentStepIdx === steps.length - 1}
                    className={`w-full py-3 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                      agentStepIdx === steps.length - 1 
                        ? 'bg-slate-50 text-slate-400 border-slate-205 cursor-not-allowed opacity-50' 
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-650 shadow-sm active:scale-98'
                    }`}
                  >
                    Étape suivante &rarr;
                  </button>

                  {agentSelectedObjection && (
                    <button
                      type="button"
                      onClick={() => setAgentSelectedObjection(null)}
                      className="w-full mt-1.5 py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[11px] rounded-xl border border-indigo-200 transition cursor-pointer text-center"
                    >
                      Reprendre la trame [X]
                    </button>
                  )}
                </div>

                {/* POSTURAL VOICE VOID TIPS (MOVED TO SIDEBAR BOTTOM) */}
                {activeScript.tips && activeScript.tips.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl space-y-1">
                    <span className="text-[9px] font-black text-amber-805 uppercase tracking-wider flex items-center gap-1 font-mono">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      CONSEIL COMPORTEMENT
                    </span>
                    <p className="text-[10.5px] text-amber-900 font-bold leading-relaxed italic">
                      &ldquo;{activeScript.tips[0]}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* MASSIVE SPEECH TELEPROMPTER SCREEN FRAME  (ON THE RIGHT) */}
            <div className="flex-1 flex flex-col justify-between overflow-hidden relative min-h-0 select-text">
              {agentSelectedObjection ? (
                /* Objection Response Overlay MODE - Extremely Visual Light Coral layout */
                <div className="flex-1 bg-rose-50/50 border-4 border-rose-500 rounded-3xl p-6 sm:p-8 flex flex-col justify-between overflow-hidden relative shadow-md">
                  
                  <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
                    {/* Simplified Header with Zoom Buttons built-in */}
                    <div className="flex justify-between items-center bg-rose-100 text-rose-800 border border-rose-200 px-4 py-2 rounded-xl shrink-0 select-none">
                      <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                        CONTRE-OBJECTION : {agentSelectedObjection.title}
                      </span>
                      
                      {/* Zoom Controls inside Objection Card */}
                      <div className="flex items-center gap-1 bg-white border border-rose-200 p-0.5 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setAgentFontSize(prev => Math.max(16, prev - 2))}
                          className="w-8 h-7 bg-slate-50 hover:bg-slate-250 text-slate-705 font-bold rounded flex items-center justify-center transition active:scale-95 cursor-pointer text-xs"
                          title="Diminuer la taille"
                        >
                          A-
                        </button>
                        <span className="text-[10px] font-black text-rose-900 font-mono px-1.5 shrink-0">
                          {agentFontSize}px
                        </span>
                        <button
                          type="button"
                          onClick={() => setAgentFontSize(prev => Math.min(48, prev + 2))}
                          className="w-8 h-7 bg-slate-50 hover:bg-slate-250 text-slate-705 font-bold rounded flex items-center justify-center transition active:scale-95 cursor-pointer text-xs"
                          title="Augmenter la taille"
                        >
                          A+
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setAgentSelectedObjection(null)}
                        className="text-[10.5px] font-bold text-rose-800 hover:text-white bg-rose-200 hover:bg-rose-600 border border-rose-350 px-2.5 py-1 rounded cursor-pointer transition select-none ml-2"
                      >
                        Retour &times;
                      </button>
                    </div>

                    {/* Typical complaint block */}
                    <div className="bg-amber-50 border-l-4 border-amber-500 rounded-xl p-4 shrink-0 shadow-3xs select-none">
                      <span className="text-[10px] font-black text-amber-805 uppercase tracking-widest block mb-1">Le client formule la remarque :</span>
                      <p className="text-sm font-bold text-amber-950 italic leading-relaxed">
                        &ldquo;{agentSelectedObjection.objectionText || agentSelectedObjection.title}&rdquo;
                      </p>
                    </div>

                    {/* Speech script text area: REMOVED unnecessary label for maximum vertical space! */}
                    <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin flex flex-col justify-center">
                      <div 
                        className="font-extrabold text-slate-900 leading-relaxed font-sans select-all my-4 whitespace-pre-wrap transition-all duration-150"
                        style={{ fontSize: `${agentFontSize}px` }}
                      >
                        {agentSelectedObjection.responseTemplate || agentSelectedObjection.content}
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                /* Main Script Dialogue step block - Gorgeous White-to-Slate layout with thick green border */
                <div className="flex-1 bg-white border-4 border-emerald-500 rounded-3xl p-6 sm:p-8 flex flex-col justify-between overflow-hidden relative shadow-md">
                  
                  <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
                    {/* Header bar: REMOVED the redundant labels and integrated Zoom Controls */}
                    <div className="flex justify-between items-center bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl shrink-0 select-none">
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 border border-emerald-200/50 rounded-md uppercase tracking-widest font-mono flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                        {steps[agentStepIdx] || "SALUTATION ET LIEN PRÉLIMINAIRE"}
                      </span>

                      {/* Prominent Zoom Component built directly inside the Teleprompter Card */}
                      <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setAgentFontSize(prev => Math.max(16, prev - 2))}
                          className="w-8 h-7 bg-slate-50 hover:bg-slate-200 text-slate-700 font-extrabold rounded flex items-center justify-center transition active:scale-95 cursor-pointer text-xs"
                          title="Diminuer la taille du texte"
                        >
                          A-
                        </button>
                        <span className="text-[10px] font-black text-slate-800 font-mono px-1.5 shrink-0">
                          {agentFontSize}px
                        </span>
                        <button
                          type="button"
                          onClick={() => setAgentFontSize(prev => Math.min(48, prev + 2))}
                          className="w-8 h-7 bg-slate-50 hover:bg-slate-200 text-slate-700 font-extrabold rounded flex items-center justify-center transition active:scale-95 cursor-pointer text-xs"
                          title="Augmenter la taille du texte"
                        >
                          A+
                        </button>
                      </div>
                    </div>

                    {/* Dialogue large teleprompter content: REMOVED the unnecessary secondary header for maximum text area */}
                    <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin flex flex-col justify-center">
                      <div 
                        className="font-extrabold text-slate-900 leading-relaxed font-sans select-all my-4 whitespace-pre-wrap transition-all duration-150"
                        style={{ fontSize: `${agentFontSize}px` }}
                      >
                        {stepContents[agentStepIdx] || activeScript.content}
                      </div>
                    </div>
                  </div>

                </div>
              )}

            </div>

          </div>

          {/* RIGHT COLUMN: LIST OF CONTRE-OBJECTIONS - Structured Clean Light Column */}
          <div className="xl:w-[18%] border-l border-slate-200 bg-slate-100/40 flex flex-col overflow-hidden p-4 space-y-4">
            
            {/* Search and filters header */}
            <div className="space-y-3 shrink-0 select-none">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-550" />
                  Boîte de Traitements d'Objections
                </h3>
                <p className="text-[10.5px] text-slate-500 mt-1 leading-snug font-medium">
                  Un doute formulé par le prospect ? Cliquez instantanément sur le bouton de l'objection pour dévoiler le contre-argumentaire millimétré.
                </p>
              </div>

              {/* Live search input filter */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  value={agentObjectionSearch}
                  onChange={(e) => setAgentObjectionSearch(e.target.value)}
                  placeholder="Rechercher une objection (conjoint, argent, faux)..."
                  className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition shadow-2xs"
                />
              </div>

              {/* Objection Horizontal Category Filters */}
              <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                <button
                  onClick={() => setAgentActiveObjectionTab('all')}
                  className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider transition cursor-pointer ${
                    agentActiveObjectionTab === 'all'
                      ? 'bg-rose-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200/60 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Toutes ({allObjectionsForAgent.length})
                </button>
                {objectionCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setAgentActiveObjectionTab(cat)}
                    className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider transition cursor-pointer ${
                      agentActiveObjectionTab.toLowerCase() === cat.toLowerCase()
                        ? 'bg-indigo-600 text-white font-extrabold'
                        : 'bg-white text-slate-600 border border-slate-200/60 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable list of objections */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              
              {/* Prioritaires badge row */}
              {agentObjectionSearch === '' && linkedObjections.length > 0 && (
                <div className="text-[9px] font-black text-rose-800 bg-rose-100 border border-rose-200 rounded px-2 w-fit uppercase mb-2 mr-auto select-none">
                  ⚡ Recommandées pour {activeScript.title.includes("CFSI") ? "Association CFSI" : activeScript.title}
                </div>
              )}

              {filteredObjections.length > 0 ? (
                filteredObjections.map((obj) => {
                  const isOverlayActive = agentSelectedObjection?.id === obj.id;
                  const isPrioritaire = activeScript.associatedObjections?.includes(obj.id);
                  
                  return (
                    <div
                      key={obj.id}
                      onClick={() => {
                        if (isOverlayActive) {
                          setAgentSelectedObjection(null);
                        } else {
                          setAgentSelectedObjection(obj);
                        }
                      }}
                      className={`text-left p-3.5 rounded-2xl border transition-all duration-150 cursor-pointer flex flex-col justify-between space-y-2.5 group ${
                        isOverlayActive 
                          ? 'bg-rose-50 border-rose-500 ring-4 ring-rose-500/10' 
                          : isPrioritaire
                            ? 'bg-amber-50 hover:bg-amber-100/50 border-amber-200 hover:border-amber-300 shadow-2xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200/80 hover:border-slate-350 shadow-3xs'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full select-none">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                          isOverlayActive
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : isPrioritaire 
                              ? 'bg-amber-100 text-amber-805 border-amber-200' 
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {obj.category}
                        </span>
                        
                        {isPrioritaire && (
                          <span className="text-[8px] font-black text-amber-705 font-mono block">
                            RECOMMANDÉE
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-xs font-black text-slate-800 leading-snug">
                          {obj.title}
                        </h4>
                        
                        {obj.objectionText && (
                          <p className={`text-[10.5px] italic leading-relaxed mt-1.5 p-2 rounded-lg font-medium ${
                            isOverlayActive ? 'bg-rose-100/40 text-rose-900 border border-rose-200/50' : 'bg-slate-50 border border-slate-150 text-slate-600'
                          }`}>
                            &ldquo;{obj.objectionText}&rdquo;
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 select-none">
                        <span className="text-[9px] text-slate-450 font-bold italic">
                          Auteur : {obj.author}
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyAgentObjection(obj.responseTemplate || obj.content);
                            }}
                            className="bg-slate-50 hover:bg-slate-100 text-slate-600 p-1.5 rounded-lg border border-slate-200 transition cursor-pointer"
                            title="Copier le texte"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          
                          <span className={`text-[10.5px] font-black ${
                            isOverlayActive ? 'text-rose-600 underline cursor-pointer' : 'text-indigo-600 group-hover:underline cursor-pointer'
                          }`}>
                            {isOverlayActive ? "Fermer &times;" : "Afficher &rarr;"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200 select-none">
                  <span className="text-xs font-bold block">Aucune contre-argumentation trouvée</span>
                  <span className="text-[10px] block mt-0.5 text-slate-400">Essayer d'autres mots clefs.</span>
                </div>
              )}

            </div>

          </div>

        </div>

        {/* Footer info bar */}
        <footer className="h-8 shrink-0 bg-slate-100 border-t border-slate-200 flex items-center px-6 text-[9.5px] text-slate-500 select-none shadow-[0_-1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-bold text-emerald-600 bg-white px-2 py-0.5 rounded border border-slate-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
              Workspace Agent Protégé
            </span>
            <span>&bull;</span>
            <span>Accès sécurisé réservé aux Téléconseillers de SynergyCall</span>
            <span>&bull;</span>
            <span>{filteredObjections.length} fiches d'objections prêtes à l'emploi</span>
          </div>
          <div className="ml-auto font-medium text-slate-400">
            <span>SynergyCall Hub v3.0</span>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-105 selection:text-indigo-900">
      
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-72 bg-slate-900 text-slate-350 flex flex-col border-r border-slate-800 shrink-0">
        <div className="p-6 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between lg:justify-start gap-3 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="text-white font-semibold text-base tracking-tight leading-tight flex items-center gap-1.5">
                    SynergyCall Hub
                  </h1>
                  <span className="text-[10px] font-mono font-medium tracking-wider bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded-sm uppercase mt-1 block">
                    Agent Center v3
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-3 px-3">Dossiers Principaux</div>
                <nav className="space-y-1">
                  <button
                    onClick={() => setSelectedType('all')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      selectedType === 'all'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                      Tous les Fichiers
                    </span>
                    <span className="text-[10px] font-mono bg-slate-950 px-1.5 py-0.5 rounded text-slate-400">{scripts.length}</span>
                  </button>

                  <button
                    onClick={() => setSelectedType('script')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      selectedType === 'script'
                        ? 'bg-indigo-600 text-white shadow-xs font-bold'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      Scripts d'Appel (Donations)
                    </span>
                    <span className="text-[10px] font-mono bg-slate-950 px-1.5 py-0.5 rounded text-slate-400">{totalScriptsCount}</span>
                  </button>

                  <button
                    onClick={() => setSelectedType('objection')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      selectedType === 'objection'
                        ? 'bg-amber-600 text-white shadow-xs font-bold'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      Traitements d'Objections
                    </span>
                    <span className="text-[10px] font-mono bg-slate-950 px-1.5 py-0.5 rounded text-slate-400">{totalObjectionsCount}</span>
                  </button>
                </nav>
              </div>

              <div>
                <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-2 px-3">Filtres par Thématique</div>
                <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors text-left ${
                      selectedCategory === 'all' ? 'text-white bg-slate-800 font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="w-2.5 h-2.5 border border-slate-600 bg-slate-100 rounded-full shrink-0"></div>
                    <span className="truncate">Toutes les thématiques</span>
                  </button>

                  {categories.map((cat, idx) => {
                    const dotColors = ['bg-blue-400', 'bg-emerald-400', 'bg-amber-400', 'bg-purple-400', 'bg-rose-400', 'bg-teal-400'];
                    const bulletColor = dotColors[idx % dotColors.length];
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors text-left ${
                          selectedCategory === cat ? 'text-white bg-slate-800 font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                        }`}
                      >
                        <div className={`w-2.5 h-2.5 ${bulletColor} rounded-full shrink-0`}></div>
                        <span className="truncate">{cat}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 mt-6 lg:mt-auto space-y-3 px-3 pb-6">
            {userRole === 'admin' ? (
              <>
                <button
                  onClick={() => setShowUploadZone(!showUploadZone)}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer ${
                    showUploadZone 
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold' 
                      : 'bg-slate-800 hover:bg-slate-705 text-slate-105 border border-slate-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                  {showUploadZone ? "Masquer OCR Dropzone" : "Indexation Word/PDF (OCR)"}
                </button>
                <p className="text-[10px] text-slate-500 text-center leading-normal">
                  Rôle : <span className="text-amber-500 font-bold">Administrateur</span>. Glissez vos fiches de prospection pour les indexer dans la base IA.
                </p>
              </>
            ) : (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Votre Profil</span>
                <span className="text-xs text-white font-bold block flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Conseiller (Agent)
                </span>
                <span className="text-[10px] text-slate-400 block pb-1">Lecture des fiches d'appels et d'objections</span>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-rose-950/40 border border-slate-800 hover:border-rose-900/40 transition-all cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Quitter la session
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 lg:h-screen lg:overflow-hidden">
        
        {/* Top Header / Search Area */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center px-6 sm:px-8 shrink-0 justify-between gap-4 z-10 shadow-xs">
          
          <div className="flex-1 max-w-2xl flex items-center gap-3">
            <div id="search-input-wrapper" className="relative flex-1">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                id="search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Recherche vectorielle plein texte (ex: 'objection prix trop cher')..."
                className="w-full pl-11 pr-4 py-2.5 bg-slate-100 border-none rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            {/* Config Mode Controls Selector */}
            <div className="relative shrink-0">
              <button
                id="search-mode-trigger"
                type="button"
                onClick={() => setShowConfigMenu(!showConfigMenu)}
                className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border-none rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Recherche : </span>
                <span className="text-indigo-600">
                  {searchMode === 'hybrid' ? 'Hybride IA' : searchMode === 'vector' ? 'Vectorielle' : 'Plein Texte'}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* Dropdown panel */}
              {showConfigMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-2.5 space-y-1 z-50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 mb-1">Moteur de recherche</p>
                  
                  <button
                    type="button"
                    onClick={() => { setSearchMode('hybrid'); setShowConfigMenu(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex flex-col transition cursor-pointer ${
                      searchMode === 'hybrid' ? 'bg-indigo-50 text-indigo-850' : 'hover:bg-slate-50 text-slate-650'
                    }`}
                  >
                    <span className="font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Hybride Vectoriel & Texte
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Associe l'intention de la question et la correspondance exacte.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setSearchMode('vector'); setShowConfigMenu(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex flex-col transition cursor-pointer ${
                      searchMode === 'vector' ? 'bg-indigo-50 text-indigo-850' : 'hover:bg-slate-50 text-slate-650'
                    }`}
                  >
                    <span className="font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Similarité Sémantique (Gemini)
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Trouve les réponses fondées sur le sens global et non sur les mots exacts.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setSearchMode('fulltext'); setShowConfigMenu(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex flex-col transition cursor-pointer ${
                      searchMode === 'fulltext' ? 'bg-indigo-50 text-indigo-850' : 'hover:bg-slate-50 text-slate-650'
                    }`}
                  >
                    <span className="font-semibold flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-500" /> Plein Texte Classique
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Recherche textuelle classique basée sur la correspondance de termes.</span>
                  </button>
                </div>
              )}
            </div>

            {/* Reset shortcut */}
            {(searchQuery || selectedCategory !== 'all' || selectedType !== 'all') && (
              <button
                onClick={resetFilters}
                title="Réinitialiser"
                className="p-2.5 bg-slate-100 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-500 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden sm:flex items-center gap-3 text-right">
              <div>
                <div className="text-xs font-bold text-slate-800">
                  {userRole === 'admin' ? 'Administrateur' : 'Conseiller Agent'}
                </div>
                <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider flex items-center justify-end gap-1 select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {userRole === 'admin' ? 'Contrôle Admin' : 'En Ligne'}
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs shadow-xs border border-white uppercase">
                {userRole === 'admin' ? 'AD' : 'AG'}
              </div>
            </div>

            {userRole === 'admin' && <div className="w-px h-6 bg-slate-200 hidden sm:block"></div>}

            {userRole === 'admin' && (
              <button
                id="btn-trigger-create"
                onClick={() => { setEditingItem(null); setIsCreateOpen(true); }}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer md:shrink-0"
              >
                <Plus className="w-4 h-4" />
                Nouveau Script / Objection
              </button>
            )}
          </div>

        </header>

        {/* Dynamic Alert Banner for missing API Keys */}
        {apiWarning && (
          <div className="bg-amber-500 text-slate-900 text-xs px-6 py-2 text-center font-medium flex items-center justify-center gap-2 border-b border-amber-600/20 shadow-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{apiWarning}</span>
          </div>
        )}

        {/* Scrollable Container body */}
        <div className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">Scripts d'Appels & Traitements</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Consultez et recherchez à la volée les fiches d'appel, de vente ou traitements opérationnels d'objections.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Affichage de <strong>{searchResults.length}</strong> / <strong>{scripts.length}</strong> verbatims</span>
            </div>
          </div>

          {/* Toggleable Document Upload Zone */}
          {showUploadZone && (
            <div className="transition-all duration-300">
              <UploadZone onImportSuccess={handleImportSuccess} />
            </div>
          )}

          {/* Highlighted items / Epinglés block */}
          {highlightedItems.length > 0 && (
            <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-lg border border-indigo-950 space-y-3.5">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1 px-2.5 bg-amber-400 text-slate-950 text-[10px] font-bold tracking-wide rounded uppercase flex items-center gap-1">
                    <Star className="w-3 h-3 fill-slate-950" />
                    À LA UNE (PRIORITAIRE)
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">
                    Traitements d'Objections mis en avant
                  </h3>
                </div>
                <span className="text-[10px] text-indigo-200 hidden md:inline">
                  Sélectionnés par l'Administrateur pour la campagne en cours
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {highlightedItems.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => setSelectedItem(item)}
                    className="p-3.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/30 rounded-xl transition cursor-pointer flex flex-col justify-between space-y-2 group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest bg-indigo-900/40 px-2 py-0.5 rounded border border-indigo-800/30">
                          {item.type === 'script' ? "SCRIPT D'APPEL" : "OBJECTION"}
                        </span>
                        <span className="text-[9px] text-slate-400 truncate max-w-[120px]">
                          {item.category}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition mt-1.5 leading-snug line-clamp-1">
                        {item.title}
                      </h4>
                      {item.objectionText && (
                        <p className="text-[11px] text-slate-300 italic line-clamp-2 mt-1 pl-1.5 border-l border-indigo-500/30 bg-white/5 p-1 rounded">
                          &ldquo;{item.objectionText}&rdquo;
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                      <span className="text-[9px] text-slate-400 font-medium">Auteur: {item.author || "Admin"}</span>
                      <span className="text-[10px] text-indigo-300 font-bold group-hover:underline flex items-center gap-0.5">
                        Consulter &rarr;
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results grid rendering */}
          {loading && searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <svg className="animate-spin h-8 w-8 text-indigo-600 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-xs text-slate-550 font-medium">Recherche et structuration des vecteurs...</p>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {searchResults.map(({ item, score }) => (
                <ScriptCard
                  key={item.id}
                  item={item}
                  score={score}
                  isAdmin={userRole === 'admin'}
                  onClick={() => setSelectedItem(item)}
                  onEdit={() => { setEditingItem(item); setIsCreateOpen(true); }}
                  onDelete={() => handleDeleteItem(item.id)}
                  onToggleHighlight={() => handleToggleHighlight(item)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-sm mx-auto flex flex-col items-center shadow-xs">
              <div className="w-12 h-12 bg-slate-50 border border-slate-150 rounded-full flex items-center justify-center text-slate-400 mb-4">
                <Search className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Aucun résultat trouvé</h4>
              <p className="text-xs text-slate-500 mt-1 mb-6 leading-relaxed">
                Aucune fiche commerciale ne correspond à vos thématiques ou termes &ldquo;{searchQuery}&rdquo;.
              </p>
              <button
                onClick={resetFilters}
                className="px-5 py-2 text-xs font-bold text-slate-700 hover:text-indigo-650 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
              >
                Réinitialiser la recherche
              </button>
            </div>
          )}

        </div>

        {/* Status footer bar */}
        <footer className="h-10 bg-white border-t border-slate-200 flex items-center px-6 text-[10px] text-slate-400 shrink-0 select-none">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
              Base de données vectorielle active
            </span>
            <span className="hidden sm:inline w-px h-3 bg-slate-200"></span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
              {scripts.length} documents indexés
            </span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span>Raccourci: <kbd className="bg-slate-100 text-slate-500 border border-slate-200 px-1 py-0.5 rounded text-[9px]">CMD + K</kbd> pour chercher</span>
          </div>
        </footer>

      </main>

      {/* Script Detailed Slideover drawer */}
      {selectedItem && (
        <ScriptDetailModal
          item={selectedItem}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          allScripts={scripts}
          isAdmin={userRole === 'admin'}
          onSave={handleManualSave}
          onDelete={handleDeleteDirectly}
        />
      )}

      {/* Manual Input Dialog Modal */}
      <CreateScriptModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingItem(null);
        }}
        onSave={handleManualSave}
        categories={categories}
        editingItem={editingItem}
        allObjections={scripts.filter(s => s.type === 'objection')}
      />

    </div>
  );
}

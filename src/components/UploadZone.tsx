/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Upload, FileUp, Sparkles, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { ScriptItem } from '../types.js';

interface UploadZoneProps {
  onImportSuccess: (imported: ScriptItem[]) => void;
}

type UploadState = 'idle' | 'uploading' | 'processing' | 'indexing' | 'success' | 'err';

export default function UploadZone({ onImportSuccess }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [selectedCategory, setSelectedCategory] = useState<string>('Script');
  const [progressText, setProgressText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categoriesWithInfo = [
    { id: 'Script', label: 'Script', desc: "La trame d'appel que l'agent utilise pour la prospection." },
    { id: "Guide d'objection", label: "Guide d'objection", desc: "Traitement général des objections et freins durant l'échange." },
    { id: "Resensibilisation", label: "Resensibilisation", desc: "Alternative de repli/baisse de don si le prospect refuse le montant proposé." },
    { id: "Conjoint", label: "Conjoint", desc: "Si le prospect souhaite consulter sa conjointe ou sa famille d'abord." },
    { id: "Internet", label: "Internet", desc: "Si le prospect veut donner sur internet, pour le convaincre de donner par courrier." }
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const uploadFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx' && ext !== 'txt') {
      setErrorMessage("Format de fichier non supporté. Veuillez sélectionner un document PDF (.pdf), Word (.docx) ou texte (.txt).");
      setUploadState('err');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', selectedCategory);

    setUploadState('uploading');
    setProgressText(`Envoi du fichier "${file.name}" en cours...`);
    setErrorMessage('');

    try {
      // Simulate steps for smoother UX transition
      setTimeout(() => {
        if (uploadState as any !== 'err') {
          setUploadState('processing');
          setProgressText("Gemini 3.5 Flash analyse le document... OCR et extraction active en cours.");
        }
      }, 1500);

      setTimeout(() => {
        if (uploadState as any !== 'err') {
          setUploadState('indexing');
          setProgressText("Vectorisation des scripts et indexation dans la base sémantique...");
        }
      }, 4500);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Une erreur s'est produite lors du traitement du document.");
      }

      const result = await response.json();
      
      setImportedCount(result.count);
      setUploadState('success');
      onImportSuccess(result.imported);
      
      // Clear after 4 seconds
      setTimeout(() => {
        setUploadState('idle');
      }, 6000);

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Impossible de traiter ce fichier. Veuillez vérifier vos secrets d'API ou tenter un fichier moins volumineux.");
      setUploadState('err');
    }
  };

  return (
    <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-emerald-500" />
        <h3 className="text-sm font-semibold text-slate-900">
          Importateur Intelligent (PDF, Word, TXT) par IA
        </h3>
      </div>
      
      <p className="text-xs text-slate-500 leading-relaxed mb-4">
        Glissez un document contenant vos fiches d'appels ou objections. Notre système utilise 
        <strong> Gemini 3.5 Flash</strong> pour OCR-iser pleinement le document (même scanné), 
        structurer les répliques adaptées et vectoriser automatiquement le contenu.
      </p>

      {uploadState === 'idle' && (
        <div className="space-y-4">
          <div className="space-y-1.5 bg-white border border-slate-200/60 p-4 rounded-xl shadow-xs">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
              📂 1. Sélectionnez la catégorie de destination pour ces fiches indexées :
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {categoriesWithInfo.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`p-3 text-left border rounded-xl transition flex flex-col justify-between h-full ${
                    selectedCategory === cat.id
                      ? 'bg-emerald-50/55 border-emerald-500 text-emerald-950 shadow-xs scale-[1.01]'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/60 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xs font-bold leading-none block mb-1 flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedCategory === cat.id ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                    {cat.label}
                  </span>
                  <span className="text-[10px] text-slate-500 leading-normal block">
                    {cat.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              📥 2. Téléversez le document (PDF, Word ou Texte) :
            </label>
            <div
              id="drop-zone"
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={handleButtonClick}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
                dragActive 
                  ? 'border-emerald-500 bg-emerald-50/40 shadow-inner' 
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <input
                id="file-upload-input"
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.txt"
                onChange={handleChange}
              />
              
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-full text-slate-400 group-hover:text-emerald-500 transition-colors">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700">
                    Glissez-déposez le document à classer dans <span className="text-emerald-600 font-bold underline font-sans">"{selectedCategory}"</span> ici, ou <span className="text-emerald-600 underline">parcourez vos dossiers</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Formats acceptés : PDF, DOCX (Word), TXT (Taille max: 10 Mo)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Uploading & Extraction step */}
      {(uploadState === 'uploading' || uploadState === 'processing' || uploadState === 'indexing') && (
        <div className="bg-white border border-slate-100 rounded-xl p-6 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
          
          <div className="space-y-1.5 w-full max-w-xs">
            <p className="text-xs font-semibold text-slate-800 tracking-wide">
              {uploadState === 'uploading' && "Téléversement..."}
              {uploadState === 'processing' && "Traitement OCR ..."}
              {uploadState === 'indexing' && "Structure & Vectorisation ..."}
            </p>
            
            <p className="text-[11px] text-slate-500 leading-relaxed italic">
              {progressText}
            </p>

            {/* Simulated nice bar */}
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-3">
              <div 
                className={`h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-1000 ${
                  uploadState === 'uploading' ? 'w-1/3' : 
                  uploadState === 'processing' ? 'w-2/3' : 'w-11/12'
                }`}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Success View */}
      {uploadState === 'success' && (
        <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-5 text-center flex flex-col items-center justify-center">
          <CheckCircle className="w-9 h-9 text-emerald-600 mb-2" />
          <h4 className="text-xs font-bold text-emerald-800">Importation réussie !</h4>
          <p className="text-[11px] text-emerald-700 mt-1 max-w-md">
            L'intelligence artificielle a détecté, indexé et vectorisé <strong>{importedCount} script(s) ou objection(s)</strong> à partir de votre document. Ils sont maintenant disponibles pour la recherche rapide.
          </p>
          <button
            onClick={() => setUploadState('idle')}
            className="mt-4 px-4 py-1.5 text-xxs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg transition-all"
          >
            Importer un autre fichier
          </button>
        </div>
      )}

      {/* Error View */}
      {uploadState === 'err' && (
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-5 text-center flex flex-col items-center justify-center">
          <AlertCircle className="w-9 h-9 text-rose-500 mb-2" />
          <h4 className="text-xs font-bold text-rose-800">Échec du traitement</h4>
          <p className="text-[11px] text-rose-700 mt-1 max-w-md leading-relaxed">
            {errorMessage}
          </p>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setUploadState('idle')}
              className="px-4 py-1.5 text-xxs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg transition"
            >
              Réessayer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useState, useRef } from 'react';
import { fetchModels, uploadModel } from '../services/supabase';
import { Model3D } from '../types';

interface ModelLibraryProps {
  onSelect: (modelUrl: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export const ModelLibrary: React.FC<ModelLibraryProps> = ({ onSelect, onClose, isOpen }) => {
  const [models, setModels] = useState<Model3D[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadModels();
    }
  }, [isOpen]);

  const loadModels = async () => {
    setIsLoading(true);
    try {
      const data = await fetchModels();
      setModels(data);
    } catch (error) {
      console.error("Failed to load models", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const newModel = await uploadModel(file);
      if (newModel) {
        setModels([newModel, ...models]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerUpload = () => fileInputRef.current?.click();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-zinc-900/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">📦</span> Model Library
          </h2>
          
          <div className="flex items-center gap-3">
             <button 
                onClick={triggerUpload}
                disabled={isUploading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold tracking-wider uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
                {isUploading ? (
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                      <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                    </svg>
                )}
                UPLOAD GLB
            </button>
            <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
            >
                ✕
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : models.length === 0 ? (
            <div className="text-center text-white/40 py-12">
              <p>No models found in the library.</p>
              <p className="text-sm mt-2">Add models to the 'models' table in Supabase.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => onSelect(model.url)}
                  className="group relative aspect-square rounded-lg overflow-hidden bg-zinc-800 border border-white/5 hover:border-purple-500/50 transition-all hover:scale-[1.02]"
                >
                  {model.thumbnail_url ? (
                    <img 
                      src={model.thumbnail_url} 
                      alt={model.name}
                      className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-purple-900/20 to-blue-900/20">
                      🧊
                    </div>
                  )}
                  
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                    <p className="text-sm font-medium text-white truncate">{model.name}</p>
                    {model.category && (
                      <p className="text-xs text-white/50 truncate">{model.category}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Hidden Input */}
        <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleUpload}
            accept=".glb"
            className="hidden"
        />
      </div>
    </div>
  );
};


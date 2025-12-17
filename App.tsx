
import React, { useState, useEffect, useRef } from 'react';
import { Upload, Settings, Download, Image as ImageIcon, RefreshCw, Trash2, Archive, Loader2, AlertCircle } from 'lucide-react';
import JSZip from 'jszip';
import { ImageCard } from './components/ImageCard';
import { 
  ImageFormat, 
  ProcessingStatus, 
  ProcessedImage, 
  ConversionSettings 
} from './types';
import { convertImageClientSide, downloadBlob, fileToDataURL } from './utils/converter';
import { generateImageAltText } from './services/geminiService';

const App: React.FC = () => {
  const [images, setImages] = useState<ProcessedImage[]>([]);
  // Global defaults for new images
  const [globalSettings, setGlobalSettings] = useState<ConversionSettings>({
    format: ImageFormat.WEBP,
    quality: 0.8
  });
  const [isDragOver, setIsDragOver] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Effect to process IDLE images automatically
  useEffect(() => {
    const processIdleImages = async () => {
      const idleImages = images.filter(img => img.status === ProcessingStatus.IDLE);
      
      if (idleImages.length === 0) return;

      // Mark as converting first to prevent double processing
      setImages(prev => prev.map(img => 
        img.status === ProcessingStatus.IDLE ? { ...img, status: ProcessingStatus.CONVERTING } : img
      ));

      // Process each image
      for (const img of idleImages) {
        try {
          const blob = await convertImageClientSide(
            img.originalFile, 
            img.settings.format, 
            img.settings.quality
          );
          
          setImages(prev => prev.map(p => {
            if (p.id === img.id) {
              // Revoke old URL if exists
              if (p.convertedUrl) URL.revokeObjectURL(p.convertedUrl);
              
              return {
                ...p,
                status: ProcessingStatus.COMPLETED,
                convertedBlob: blob,
                convertedUrl: URL.createObjectURL(blob),
                convertedSize: blob.size
              };
            }
            return p;
          }));
        } catch (error) {
          console.error(`Error converting ${img.id}:`, error);
          setImages(prev => prev.map(p => 
            p.id === img.id ? { ...p, status: ProcessingStatus.ERROR } : p
          ));
        }
      }
    };

    processIdleImages();
  }, [images]);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList) return;

    // Convert FileList to Array to ensure proper iteration
    const files = Array.from(fileList);
    const newImages: ProcessedImage[] = [];
    
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;

      try {
        const previewUrl = await fileToDataURL(file);
        
        newImages.push({
          id: crypto.randomUUID(), // Ensure unique ID
          originalFile: file,
          previewUrl,
          convertedBlob: null,
          convertedUrl: null,
          status: ProcessingStatus.IDLE, // This triggers the useEffect
          originalSize: file.size,
          convertedSize: 0,
          settings: { ...globalSettings }, // Copy global settings as initial defaults
          altText: undefined,
          isGeneratingAlt: false
        });
      } catch (err) {
        console.error("Error reading file", file.name, err);
      }
    }

    setImages(prev => [...prev, ...newImages]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = (id: string) => {
    setImages(prev => {
      const img = prev.find(p => p.id === id);
      if (img?.convertedUrl) URL.revokeObjectURL(img.convertedUrl);
      return prev.filter(p => p.id !== id);
    });
  };

  const handleDownload = (id: string) => {
    const img = images.find(p => p.id === id);
    if (img && img.convertedBlob) {
      // Use the ACTUAL blob type for extension to avoid corrupted files if browser fallback occurred
      const mime = img.convertedBlob.type; 
      let ext = mime.split('/')[1];
      if (ext === 'jpeg') ext = 'jpg';
      
      const name = img.originalFile.name.replace(/\.[^/.]+$/, "");
      downloadBlob(img.convertedBlob, `${name}_opti.${ext}`);
    }
  };

  const handleDownloadAllZip = async () => {
    const completedImages = images.filter(img => img.status === ProcessingStatus.COMPLETED && img.convertedBlob);
    if (completedImages.length === 0) return;

    setIsZipping(true);

    try {
      const zip = new JSZip();
      const usedNames = new Set<string>();

      completedImages.forEach(img => {
        if (!img.convertedBlob) return;

        // Determine correct extension
        const mime = img.convertedBlob.type; 
        let ext = mime.split('/')[1];
        if (ext === 'jpeg') ext = 'jpg';

        // Base name
        const baseName = img.originalFile.name.replace(/\.[^/.]+$/, "") + "_opti";
        let fileName = `${baseName}.${ext}`;

        // Handle duplicates
        let counter = 1;
        while (usedNames.has(fileName)) {
          fileName = `${baseName}_(${counter}).${ext}`;
          counter++;
        }
        usedNames.add(fileName);

        zip.file(fileName, img.convertedBlob);
      });

      const content = await zip.generateAsync({ type: "blob" });
      downloadBlob(content, "optipix_otimizadas.zip");
    } catch (error) {
      console.error("Failed to zip files", error);
      alert("Ocorreu um erro ao criar o arquivo ZIP.");
    } finally {
      setIsZipping(false);
    }
  };

  const handleGenerateAlt = async (id: string) => {
    setImages(prev => prev.map(p => p.id === id ? { ...p, isGeneratingAlt: true } : p));
    
    const img = images.find(p => p.id === id);
    if (!img) return;

    try {
      const altText = await generateImageAltText(img.previewUrl, img.originalFile.type);
      setImages(prev => prev.map(p => p.id === id ? { ...p, altText, isGeneratingAlt: false } : p));
    } catch (error) {
        setImages(prev => prev.map(p => p.id === id ? { ...p, isGeneratingAlt: false } : p));
        alert("Erro ao conectar com Gemini AI. Verifique sua chave de API.");
    }
  };

  // Fix: Completed the handleUpdateImageSettings function
  const handleUpdateImageSettings = (id: string, newSettings: Partial<ConversionSettings>) => {
    setImages(prev => prev.map(img => {
      if (img.id === id) {
        return {
          ...img,
          settings: { ...img.settings, ...newSettings },
          status: ProcessingStatus.IDLE
        };
      }
      return img;
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <ImageIcon className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">OptiPix <span className="text-blue-500">AI</span></h1>
          </div>
          
          <div className="flex items-center gap-4">
            {images.length > 0 && (
              <button 
                onClick={handleDownloadAllZip}
                disabled={isZipping || images.filter(img => img.status === ProcessingStatus.COMPLETED).length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-500 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-blue-900/20"
              >
                {isZipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                Download All (ZIP)
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 space-y-8">
        {/* Hero / Upload Zone */}
        {images.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-black text-white">Otimize suas imagens em segundos.</h2>
              <p className="text-slate-400 text-lg max-w-xl mx-auto">
                Converta para WEBP ou AVIF, reduza o tamanho sem perder qualidade e gere Alt Texts SEO automaticamente com Gemini AI.
              </p>
            </div>

            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                w-full max-w-2xl aspect-[2/1] rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-4
                ${isDragOver 
                  ? 'bg-blue-600/10 border-blue-500 scale-[1.02] shadow-2xl shadow-blue-500/20' 
                  : 'bg-slate-900/50 border-slate-700 hover:border-slate-600 hover:bg-slate-900/80'}
              `}
            >
              <div className="p-4 bg-slate-800 rounded-full">
                <Upload className={`w-8 h-8 ${isDragOver ? 'text-blue-400 animate-bounce' : 'text-slate-400'}`} />
              </div>
              <div className="space-y-1">
                <p className="text-xl font-semibold">Arraste e solte ou clique para selecionar</p>
                <p className="text-sm text-slate-500">Suporta PNG, JPG, WEBP e AVIF</p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
                multiple 
                accept="image/*" 
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Global Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Global Format:</span>
                  <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button 
                      onClick={() => setGlobalSettings(s => ({ ...s, format: ImageFormat.WEBP }))}
                      className={`px-3 py-1 text-xs font-bold rounded ${globalSettings.format === ImageFormat.WEBP ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      WEBP
                    </button>
                    <button 
                      onClick={() => setGlobalSettings(s => ({ ...s, format: ImageFormat.AVIF }))}
                      className={`px-3 py-1 text-xs font-bold rounded ${globalSettings.format === ImageFormat.AVIF ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      AVIF
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Global Quality:</span>
                  <input 
                    type="range" min="0.1" max="1.0" step="0.05" 
                    value={globalSettings.quality}
                    onChange={(e) => setGlobalSettings(s => ({ ...s, quality: parseFloat(e.target.value) }))}
                    className="w-32 accent-blue-500"
                  />
                  <span className="text-xs font-mono text-blue-400 font-bold">{Math.round(globalSettings.quality * 100)}%</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setImages([])}
                  className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg text-sm transition-colors"
                >
                  <Trash2 size={16} />
                  Limpar Todos
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  <Upload size={16} />
                  Adicionar Mais
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple accept="image/*" />
              </div>
            </div>

            {/* Images List */}
            <div className="grid grid-cols-1 gap-6">
              {images.map(image => (
                <ImageCard 
                  key={image.id}
                  image={image}
                  onRemove={handleRemove}
                  onDownload={handleDownload}
                  onGenerateAlt={handleGenerateAlt}
                  onUpdateSettings={handleUpdateImageSettings}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 p-8 text-center text-slate-600">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm">© 2024 OptiPix AI - Otimização de Imagens Inteligente</p>
          <div className="flex items-center gap-6">
             <span className="flex items-center gap-1.5 text-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                Powered by Gemini 3 Flash
             </span>
             <span className="text-xs">Privacidade Garantida: Processamento local no navegador</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Fix: Added missing default export
export default App;

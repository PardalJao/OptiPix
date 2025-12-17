import React, { useState } from 'react';
import { ProcessedImage, ProcessingStatus, ImageFormat, ConversionSettings } from '../types';
import { formatBytes } from '../utils/converter';
import { Loader2, Download, Trash2, Wand2, Check, AlertCircle } from 'lucide-react';

interface ImageCardProps {
  image: ProcessedImage;
  onRemove: (id: string) => void;
  onDownload: (id: string) => void;
  onGenerateAlt: (id: string) => void;
  onUpdateSettings: (id: string, settings: Partial<ConversionSettings>) => void;
}

export const ImageCard: React.FC<ImageCardProps> = ({ 
  image, 
  onRemove, 
  onDownload,
  onGenerateAlt,
  onUpdateSettings
}) => {
  const [showOriginal, setShowOriginal] = useState(false);

  const savingPercent = image.convertedSize > 0 
    ? Math.round(((image.originalSize - image.convertedSize) / image.originalSize) * 100)
    : 0;

  const isPositiveSaving = savingPercent > 0;

  const displayUrl = (image.status === ProcessingStatus.COMPLETED && image.convertedUrl && !showOriginal)
    ? image.convertedUrl
    : image.previewUrl;

  return (
    <div className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 shadow-lg flex flex-col md:flex-row h-auto min-h-[250px] md:h-64 transition-all hover:border-slate-600 group">
      
      {/* Preview Section */}
      <div 
        className="relative w-full md:w-64 h-64 md:h-full bg-slate-900 flex-shrink-0 cursor-crosshair overflow-hidden"
        onMouseDown={() => setShowOriginal(true)}
        onMouseUp={() => setShowOriginal(false)}
        onMouseLeave={() => setShowOriginal(false)}
        onTouchStart={() => setShowOriginal(true)}
        onTouchEnd={() => setShowOriginal(false)}
      >
        <div className="absolute inset-0 opacity-20" style={{ 
            backgroundImage: 'linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)',
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
        }}></div>

        <img 
          src={displayUrl} 
          alt="Preview" 
          className="relative w-full h-full object-contain z-10"
        />

        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
           {image.status === ProcessingStatus.CONVERTING && (
             <div className="bg-black/60 p-3 rounded-full backdrop-blur-sm">
               <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
             </div>
           )}
           {image.status === ProcessingStatus.ERROR && (
             <div className="bg-red-500/90 p-3 rounded-full">
                <AlertCircle className="w-8 h-8 text-white" />
             </div>
           )}
        </div>

        <div className="absolute top-2 left-2 z-20 pointer-events-none">
            {showOriginal ? (
                <span className="bg-blue-600/90 text-white text-xs px-2 py-1 rounded font-bold shadow-lg">ORIGINAL</span>
            ) : (
                <span className={`text-xs px-2 py-1 rounded font-bold shadow-lg text-white ${image.status === ProcessingStatus.COMPLETED ? 'bg-emerald-600/90' : 'bg-slate-700/80'}`}>
                    {image.status === ProcessingStatus.COMPLETED ? 'OTIMIZADA' : 'ORIGINAL'}
                </span>
            )}
        </div>

        {image.status === ProcessingStatus.COMPLETED && (
            <div className="absolute bottom-2 left-0 right-0 text-center z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="bg-black/70 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm">
                    Segure para comparar
                </span>
            </div>
        )}
      </div>

      <div className="flex-1 p-5 flex flex-col h-full">
        <div className="flex justify-between items-start mb-4">
          <div className="overflow-hidden">
             <h3 className="font-medium text-slate-200 truncate max-w-[250px] text-lg" title={image.originalFile.name}>
               {image.originalFile.name}
             </h3>
             <p className="text-xs text-slate-500 mt-1">{image.originalFile.type}</p>
          </div>
          <button 
            onClick={() => onRemove(image.id)}
            className="text-slate-500 hover:text-red-400 transition-colors p-1 hover:bg-slate-700 rounded"
            title="Remover"
          >
            <Trash2 size={20} />
          </button>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-slate-400 text-xs">Original</span>
                        <span className="text-slate-200 font-mono text-sm">{formatBytes(image.originalSize)}</span>
                    </div>
                    <div className="flex justify-between items-end">
                        <span className="text-slate-400 text-xs">Otimizada</span>
                        {image.status === ProcessingStatus.COMPLETED ? (
                            <div className="text-right">
                                <span className="block text-emerald-400 font-bold font-mono text-sm">{formatBytes(image.convertedSize)}</span>
                                <span className={`text-[10px] ${isPositiveSaving ? 'text-emerald-500' : 'text-amber-500'}`}>
                                    {isPositiveSaving ? `Economia de ${savingPercent}%` : `+${Math.abs(savingPercent)}% maior`}
                                </span>
                            </div>
                        ) : (
                            <span className="text-slate-600 text-sm">...</span>
                        )}
                    </div>
                </div>

                <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-700/50 min-h-[50px] flex items-center">
                    {image.altText ? (
                        <div className="flex items-start gap-2 w-full">
                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-slate-300 italic line-clamp-3 leading-relaxed">"{image.altText}"</p>
                        </div>
                    ) : (
                        <div className="flex justify-between items-center w-full">
                        <span className="text-xs text-slate-500">Alt Text (SEO)</span>
                        <button 
                            onClick={() => onGenerateAlt(image.id)}
                            disabled={image.isGeneratingAlt}
                            className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded text-xs transition-colors disabled:opacity-50"
                        >
                            {image.isGeneratingAlt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                            Gerar com AI
                        </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                 <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Formato</label>
                    <div className="flex bg-slate-900 p-1 rounded-lg">
                        <button 
                            onClick={() => onUpdateSettings(image.id, { format: ImageFormat.WEBP })}
                            className={`flex-1 py-1.5 text-xs font-medium rounded transition-all ${image.settings.format === ImageFormat.WEBP ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            WEBP
                        </button>
                        <button 
                            onClick={() => onUpdateSettings(image.id, { format: ImageFormat.AVIF })}
                            className={`flex-1 py-1.5 text-xs font-medium rounded transition-all ${image.settings.format === ImageFormat.AVIF ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            AVIF
                        </button>
                    </div>
                 </div>

                 <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Qualidade</label>
                        <span className="text-xs font-mono text-blue-400">{Math.round(image.settings.quality * 100)}%</span>
                    </div>
                    <input 
                        type="range" 
                        min="0.1" 
                        max="1.0" 
                        step="0.05"
                        value={image.settings.quality}
                        onChange={(e) => onUpdateSettings(image.id, { quality: parseFloat(e.target.value) })}
                        className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
                    />
                 </div>
            </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-end">
            <button
                onClick={() => onDownload(image.id)}
                disabled={image.status !== ProcessingStatus.COMPLETED}
                className="flex items-center gap-2 px-6 py-2 bg-slate-200 hover:bg-white text-slate-900 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-sm font-bold transition-all disabled:cursor-not-allowed shadow hover:shadow-lg hover:-translate-y-0.5"
            >
                <Download size={16} />
                Baixar
            </button>
        </div>
      </div>
    </div>
  );
};
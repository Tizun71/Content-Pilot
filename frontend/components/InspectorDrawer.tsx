import React from 'react';
import { Node } from 'reactflow';
import { X, Globe, Copy, ExternalLink, MessageCircle, Heart, Repeat, Share2, MoreHorizontal, Bookmark, Check, Calendar, Settings2, Terminal } from 'lucide-react';
import { CrawlResult, GeneratedPost } from '../types';

interface InspectorDrawerProps {
  node: Node | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InspectorDrawer: React.FC<InspectorDrawerProps> = ({ node, isOpen, onClose }) => {
  if (!node) return null;

  const { moduleType, status, config, output, error } = node.data;

  // Animation classes
  const drawerClasses = `fixed top-[130px] right-0 bottom-0 w-[400px] bg-[#18181b] border-l border-[#27272a] shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${
    isOpen ? 'translate-x-0' : 'translate-x-full'
  }`;

  const renderStatusBadge = () => {
    if (status === 'COMPLETED') return <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-500/20">COMPLETED</span>;
    if (status === 'RUNNING') return <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded text-[10px] font-bold border border-indigo-500/20 animate-pulse">RUNNING</span>;
    if (status === 'ERROR') return <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-[10px] font-bold border border-red-500/20">ERROR</span>;
    return <span className="bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded text-[10px] font-bold border border-zinc-700">IDLE</span>;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // --- Content Renderers ---

  const renderContent = () => {
    if (status === 'IDLE' || status === 'RUNNING') {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-zinc-500 gap-2">
            <div className={`w-8 h-8 rounded-full border-2 border-zinc-700 ${status === 'RUNNING' ? 'border-t-indigo-500 animate-spin' : ''}`}></div>
            <span className="text-xs uppercase tracking-wider">{status === 'RUNNING' ? 'Processing...' : 'Waiting to run...'}</span>
        </div>
      );
    }

    if (error) {
       return (
         <div className="p-4 bg-red-900/10 border border-red-900/30 rounded-md text-red-400 text-xs font-mono">
            Error: {error}
         </div>
       );
    }

    switch (moduleType) {
      case 'INPUT':
        return (
          <div className="space-y-4">
             <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500">User Command</label>
                <div className="mt-1 p-3 bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-200">
                   {config.inputValue || "No input provided"}
                </div>
             </div>
             {config.selectedImage && (
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500">Reference Image</label>
                  <div className="mt-1 border border-zinc-800 rounded-md overflow-hidden">
                    <img src={config.selectedImage} alt="Input" className="w-full object-contain bg-zinc-900" />
                  </div>
                </div>
             )}
          </div>
        );

      case 'SEARCH':
        const searchResult = output as CrawlResult;
        if (!searchResult) return null;
        return (
          <div className="space-y-6">
             <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block">AI Executive Summary</label>
                <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-md text-sm text-zinc-300 leading-relaxed font-sans">
                   {searchResult.summary}
                </div>
             </div>
             
             <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] uppercase font-bold text-zinc-500">References & Sources ({searchResult.sources.length})</label>
                </div>
                <div className="space-y-2">
                    {searchResult.sources.map((source, idx) => (
                        <a key={idx} href={source.uri} target="_blank" rel="noreferrer" className="flex items-start gap-3 p-3 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-indigo-500/30 rounded-md group transition-all">
                            <div className="mt-1 bg-zinc-700 p-1 rounded text-zinc-300 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 transition-colors">
                                <Globe className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold text-zinc-200 truncate group-hover:text-indigo-300 transition-colors">{source.title}</div>
                                <div className="text-[10px] text-zinc-500 font-mono truncate mt-0.5 flex items-center gap-1">
                                    {new URL(source.uri).hostname} <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
             </div>
          </div>
        );

      case 'WRITE':
        const post = output as GeneratedPost;
        if (!post) return null;
        return (
          <div className="space-y-6">
             <div className="grid grid-cols-2 gap-4">
                 <div className="p-2 bg-zinc-900 rounded border border-zinc-800">
                    <div className="text-[9px] text-zinc-500 uppercase">Tone</div>
                    <div className="text-xs text-zinc-300 font-medium">{config.tone}</div>
                 </div>
                 <div className="p-2 bg-zinc-900 rounded border border-zinc-800">
                    <div className="text-[9px] text-zinc-500 uppercase">Platform</div>
                    <div className="text-xs text-zinc-300 font-medium">{config.platform}</div>
                 </div>
             </div>

             <div>
                <div className="flex items-center justify-between mb-2">
                   <label className="text-[10px] uppercase font-bold text-zinc-500">Generated Content</label>
                   <button onClick={() => copyToClipboard(post.content)} className="text-zinc-500 hover:text-white flex items-center gap-1 text-[10px]">
                      <Copy className="w-3 h-3" /> Copy
                   </button>
                </div>
                <div className="p-4 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed font-sans shadow-inner">
                   {post.content}
                </div>
             </div>

             <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block">Detected Hashtags</label>
                <div className="flex flex-wrap gap-2">
                    {post.hashtags.map((tag, i) => (
                        <span key={i} className="px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs rounded-full">
                            {tag}
                        </span>
                    ))}
                </div>
             </div>

             <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block">Image Prompt Used</label>
                <div className="p-2 bg-zinc-800/50 border border-zinc-800 rounded text-xs text-zinc-400 font-mono italic">
                    "{post.imagePrompt}"
                </div>
             </div>
          </div>
        );

      case 'IMAGE':
        const images = output as string[];
        if (!images) return null;
        return (
          <div className="space-y-6">
            <div className="p-2 bg-zinc-900 rounded border border-zinc-800 mb-4">
                <div className="text-[9px] text-zinc-500 uppercase">Visual Style</div>
                <div className="text-xs text-zinc-300 font-medium">{config.imageStyle?.split('–')[0]}</div>
            </div>

            <div className="space-y-4">
                {images.map((img, i) => (
                    <div key={i} className="group relative rounded-lg overflow-hidden border border-zinc-700 bg-zinc-900 shadow-lg">
                        <img src={`data:image/png;base64,${img}`} className="w-full h-auto" />
                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button className="bg-black/60 backdrop-blur text-white p-1.5 rounded hover:bg-black" onClick={() => {
                              const link = document.createElement("a");
                              link.href = `data:image/png;base64,${img}`;
                              link.download = `generated-image-${i}.png`;
                              link.click();
                           }}>
                              <span className="text-[10px] font-bold">Download</span>
                           </button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur px-3 py-2 border-t border-white/10">
                            <span className="text-[10px] text-zinc-300 font-mono">Variation {i + 1}</span>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        );

      case 'PREVIEW':
      case 'PUBLISHER':
      case 'OUTPUT':
         // These generally reuse data from Context (Write/Image nodes), 
         // so we show a summary or raw JSON for debugging/transparency
         return (
            <div className="space-y-4">
                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded font-mono text-xs text-zinc-400 overflow-x-auto">
                    <pre>{JSON.stringify(output || {}, null, 2)}</pre>
                </div>
                <p className="text-xs text-zinc-500 italic text-center">
                    This module aggregates data from previous steps.
                </p>
            </div>
         );
    
      default:
        return <div className="text-zinc-500 text-sm">No details available for this module.</div>;
    }
  };

  return (
    <div className={drawerClasses}>
      {/* Header */}
      <div className="h-14 border-b border-[#27272a] flex items-center justify-between px-5 bg-[#18181b]">
        <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-zinc-100 tracking-wide uppercase">{moduleType} DETAILS</h2>
            {renderStatusBadge()}
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-1 hover:bg-zinc-800 rounded">
            <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="overflow-y-auto h-[calc(100%-3.5rem)] p-5 custom-scrollbar">
        {renderContent()}

        {/* Technical Config Footer */}
        {status !== 'IDLE' && (
            <div className="mt-8 pt-8 border-t border-dashed border-zinc-800">
                <div className="flex items-center gap-2 mb-3 text-zinc-500">
                    <Terminal className="w-3 h-3" />
                    <span className="text-[10px] uppercase font-bold">Technical Config</span>
                </div>
                <div className="bg-black/40 rounded p-3 font-mono text-[9px] text-zinc-500">
                    {JSON.stringify(config, null, 2)}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
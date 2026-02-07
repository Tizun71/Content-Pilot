import React, { memo, useRef, useState, useEffect } from 'react';
import { Handle, Position, NodeProps, EdgeProps, getBezierPath, BaseEdge, EdgeLabelRenderer, useReactFlow } from 'reactflow';
import { CrawlResult, GeneratedPost, ModuleInstance } from '../types';
import { loginWithTwitter, postTweet } from '../services/twitter';
import { Search, PenTool, Image as ImageIcon, Layout, Play, AlertCircle, CheckCircle, Loader2, Trash2, Settings2, Database, Globe, Cpu, Upload, X, ClipboardCheck, Eye, Heart, MessageCircle, Repeat, Share2, MoreHorizontal, Bookmark, Star, Palette, Calendar, ExternalLink, Send, ShieldCheck, Copy, Check, CheckSquare, Sparkles, Command, FileText, RefreshCcw, Clock, LogIn, Twitter } from 'lucide-react';

// Common types passed via Node data
interface NodeData {
  id: string; // We explicitly pass ID in data for easier access
  moduleType: ModuleInstance['type'];
  status: ModuleInstance['status'];
  config: ModuleInstance['config'];
  output?: any;
  error?: string;
  onUpdateConfig: (id: string, updates: any) => void;
  onDelete: (id: string) => void;
  onOrchestrate?: (intent: string) => void; 
}

// Styles
const getModuleStyles = (type: string) => {
  switch (type) {
    case 'INPUT': return { icon: <FileText className="w-3.5 h-3.5" />, label: 'Briefing Context' };
    case 'SEARCH': return { icon: <Globe className="w-3.5 h-3.5" />, label: 'Market Research' };
    case 'WRITE': return { icon: <PenTool className="w-3.5 h-3.5" />, label: 'Content Composer' };
    case 'IMAGE': return { icon: <ImageIcon className="w-3.5 h-3.5" />, label: 'Visual Synthesis' };
    case 'PREVIEW': return { icon: <Eye className="w-3.5 h-3.5" />, label: 'Audience Preview' };
    case 'PUBLISHER': return { icon: <Send className="w-3.5 h-3.5" />, label: 'Schedule & Publish' };
    case 'OUTPUT': return { icon: <Database className="w-3.5 h-3.5" />, label: 'Campaign Assets' };
    default: return { icon: <Cpu className="w-3.5 h-3.5" />, label: 'System Node' };
  }
};

// Generic Node Wrapper
const NodeShell: React.FC<{ data: NodeData; selected?: boolean; children: React.ReactNode; width?: string }> = ({ data, selected, children, width = "w-[280px]" }) => {
  const styles = getModuleStyles(data.moduleType);
  const isCore = ['INPUT', 'OUTPUT'].includes(data.moduleType);

  // Dynamic Theme Classes based on Status and Selection
  let borderClass = 'border-zinc-300';
  let ringClass = '';
  
  if (data.status === 'ERROR') {
    borderClass = '!border-red-500 bg-red-50/10';
  } else if (data.status === 'COMPLETED') {
    borderClass = 'border-emerald-500';
  } else if (data.status === 'RUNNING') {
    borderClass = 'border-indigo-400';
    ringClass = 'ring-2 ring-indigo-400/30';
  } else if (isCore) {
    borderClass = 'border-indigo-200';
  }

  // Selection Override (Blue Border)
  if (selected) {
    borderClass = '!border-blue-600';
    ringClass = 'ring-4 ring-blue-600/20';
  }

  return (
    <div className={`relative group ${width} transition-all duration-300`}>
      {/* Selection Checkmark Indicator */}
      {selected && (
        <div className="absolute -top-2 -right-2 z-50 bg-blue-600 text-white rounded-full p-0.5 shadow-md transform scale-100 transition-transform">
          <Check className="w-3 h-3" strokeWidth={3} />
        </div>
      )}

      {/* Handles */}
      {data.moduleType !== 'INPUT' && (
        <Handle type="target" position={Position.Top} className="!bg-zinc-400 !w-3 !h-3 !-top-1.5 !border-zinc-100" />
      )}
      
      {/* Node Container */}
      <div className={`relative border rounded-md overflow-hidden bg-white shadow-xl ${borderClass} ${ringClass}`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between px-3 py-2 border-b border-zinc-100 drag-handle 
          ${selected ? 'bg-blue-50/50' : 'bg-zinc-50'} transition-colors`}>
          <div className="flex items-center gap-3">
            <div className={`p-1 rounded border bg-white border-zinc-200 text-zinc-600`}>
              {styles.icon}
            </div>
            <span className={`font-bold text-[10px] uppercase tracking-wider ${selected ? 'text-blue-700' : 'text-zinc-700'}`}>
              {styles.label}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
             {data.status === 'RUNNING' && <Loader2 className={`w-3 h-3 animate-spin text-indigo-600`} />}
             {data.status === 'COMPLETED' && <CheckCircle className="w-3 h-3 text-emerald-500" />}
             {data.status === 'ERROR' && <AlertCircle className="w-3 h-3 text-red-500" />}
             
             {/* Only allow delete if not core */}
             {!isCore && (
                <button 
                    onClick={(e) => { e.stopPropagation(); data.onDelete(data.id); }}
                    className={`text-zinc-400 hover:text-red-500 transition-all p-1`}
                >
                <Trash2 className="w-3 h-3" />
                </button>
             )}
          </div>
        </div>

        {/* Body */}
        <div className={`p-3 space-y-3 bg-white`}>
          {children}
        </div>

        {/* Error */}
        {data.error && (
          <div className="px-3 py-1 bg-red-50 border-t border-red-100 text-[10px] text-red-600 font-mono">
            {data.error}
          </div>
        )}
      </div>

      {data.moduleType !== 'OUTPUT' && (
        <Handle type="source" position={Position.Bottom} className="!bg-zinc-400 !w-3 !h-3 !-bottom-1.5 !border-zinc-100" />
      )}
    </div>
  );
};

// -- Custom Edge Component --

export const DeletableEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) => {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = (evt: React.MouseEvent) => {
    evt.stopPropagation();
    setEdges((edges) => edges.filter((e) => e.id !== id));
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
          }}
          className="nodrag nopan group"
        >
          <button
            className="w-5 h-5 bg-zinc-100 border border-zinc-300 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 hover:border-red-500 hover:bg-white transition-all shadow-sm cursor-pointer"
            onClick={onEdgeClick}
            aria-label="Delete Connection"
            title="Remove connection"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

// -- Individual Node Components --

export const InputNode = memo(({ data, selected }: NodeProps<NodeData>) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        data.onUpdateConfig(data.id, { selectedImage: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    data.onUpdateConfig(data.id, { selectedImage: undefined });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <NodeShell data={data} selected={selected} width="w-[300px]">
        <div className="space-y-3">
            <div>
            <label className="block text-[9px] uppercase text-zinc-500 font-bold mb-1.5 flex items-center gap-1">
                <Command className="w-3 h-3" /> User Intent
            </label>
            <div className="bg-zinc-50 border border-zinc-200 rounded-sm p-2 text-[11px] text-zinc-800 font-medium font-mono min-h-[36px] flex items-center shadow-inner">
                {data.config.inputValue ? (
                    <span className="line-clamp-3">{data.config.inputValue}</span>
                ) : (
                    <span className="text-zinc-400 italic">Waiting for command...</span>
                )}
            </div>
            <p className="text-[8px] text-zinc-400 mt-1 pl-0.5">Edit this in the top Command Bar</p>
            </div>

            <div>
            <label className="block text-[9px] uppercase text-zinc-500 font-bold mb-1.5 flex items-center gap-1">
                <Upload className="w-3 h-3" /> Reference Asset
            </label>
            
            {!data.config.selectedImage ? (
                <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-16 border border-dashed border-zinc-300 hover:border-zinc-500 rounded-sm bg-zinc-50 flex flex-col items-center justify-center cursor-pointer transition-colors group"
                >
                <Upload className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 mb-1" />
                <span className="text-[9px] text-zinc-400 group-hover:text-zinc-600">Upload Image</span>
                </div>
            ) : (
                <div className="relative group">
                <img 
                    src={data.config.selectedImage} 
                    className="w-full h-24 object-cover rounded-sm border border-zinc-200 shadow-sm" 
                    alt="Input" 
                />
                <button 
                    onClick={clearImage}
                    className="absolute top-1 right-1 bg-white/80 text-zinc-800 p-1 rounded-sm backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                >
                    <X className="w-3 h-3" />
                </button>
                </div>
            )}
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange} 
            />
            </div>
        </div>
    </NodeShell>
  );
});

export const SearchNode = memo(({ data, selected }: NodeProps<NodeData>) => {
  const result = data.output as CrawlResult | undefined;
  return (
    <NodeShell data={data} selected={selected}>
      <p className="text-[9px] text-zinc-500 mb-2 font-medium">Real-time Data Source</p>
      {result && (
        <div className="bg-zinc-50 rounded-sm border border-zinc-200 p-2 max-h-40 overflow-y-auto custom-scrollbar nodrag shadow-inner">
          <div className="flex justify-between items-center mb-2 pb-1 border-b border-zinc-200">
             <span className="text-[9px] text-zinc-500 font-semibold">{result.sources.length} SOURCES</span>
          </div>
          
          <div className="space-y-1 mb-2">
            {result.sources.map((source, i) => (
                <a 
                    key={i} 
                    href={source.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block p-1.5 bg-white border border-zinc-200 rounded-sm hover:border-indigo-300 hover:shadow-sm transition-all group/link"
                >
                    <div className="flex items-start gap-1.5">
                        <div className="mt-0.5 text-zinc-400 group-hover/link:text-indigo-500">
                             <ExternalLink className="w-2.5 h-2.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[9px] font-semibold text-zinc-700 truncate group-hover/link:text-indigo-700">
                                {source.title}
                            </div>
                            <div className="text-[8px] text-zinc-400 truncate font-mono">
                                {new URL(source.uri).hostname}
                            </div>
                        </div>
                    </div>
                </a>
            ))}
          </div>

          <div className="pt-2 border-t border-zinc-200">
              <p className="text-[8px] uppercase font-bold text-zinc-400 mb-1">Executive Summary</p>
              <p className="text-[10px] text-zinc-600 leading-snug font-mono">
                {result.summary.substring(0, 150)}...
              </p>
          </div>
        </div>
      )}
    </NodeShell>
  );
});

export const WriteNode = memo(({ data, selected }: NodeProps<NodeData>) => {
  const result = data.output as GeneratedPost | undefined;
  
  const styles = [
    "Storytelling",
    "Educational / How-to",
    "Listicle",
    "Conversational / Casual",
    "Data-driven",
    "Problem-Solution",
    "Trend / Newsjacking"
  ];

  const languages = [
    "Vietnamese",
    "English",
    "Spanish",
    "French",
    "German",
    "Japanese",
    "Korean",
    "Chinese"
  ];

  const lengths = [
    "Short",
    "Medium",
    "Long"
  ];

  return (
    <NodeShell data={data} selected={selected}>
      <div className="space-y-2">
        {/* Removed Platform Selection - Locked to X (Twitter) */}
        <div>
          <label className="block text-[9px] uppercase text-zinc-500 font-bold mb-1.5">Target Platform</label>
          <div className="w-full bg-zinc-100 border border-zinc-200 rounded-sm p-1.5 text-[10px] text-zinc-500 font-mono flex items-center gap-2">
            <div className="bg-black text-white p-0.5 rounded-full"><Twitter className="w-2.5 h-2.5" /></div>
            X (Twitter)
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-[9px] uppercase text-zinc-500 font-bold mb-1.5">Language</label>
            <select
              value={data.config.language || 'English'}
              onChange={(e) => data.onUpdateConfig(data.id, { language: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-sm p-1.5 text-[10px] text-zinc-800 focus:outline-none focus:border-indigo-500 font-mono nodrag transition-all"
            >
              {languages.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
             <label className="block text-[9px] uppercase text-zinc-500 font-bold mb-1.5">Length</label>
             <select
               value={data.config.length || 'Medium'}
               onChange={(e) => data.onUpdateConfig(data.id, { length: e.target.value })}
               className="w-full bg-zinc-50 border border-zinc-200 rounded-sm p-1.5 text-[10px] text-zinc-800 focus:outline-none focus:border-indigo-500 font-mono nodrag transition-all"
             >
               {lengths.map(len => (
                 <option key={len} value={len}>{len}</option>
               ))}
             </select>
          </div>
        </div>

        <div>
          <label className="block text-[9px] uppercase text-zinc-500 font-bold mb-1.5">Tone & Voice</label>
          <select
            value={data.config.tone || 'Conversational / Casual'}
            onChange={(e) => data.onUpdateConfig(data.id, { tone: e.target.value })}
            className="w-full bg-zinc-50 border border-zinc-200 rounded-sm p-1.5 text-[10px] text-zinc-800 focus:outline-none focus:border-indigo-500 font-mono nodrag transition-all"
          >
            {styles.map(style => (
              <option key={style} value={style}>{style}</option>
            ))}
          </select>
        </div>
      </div>

      {result && (
        <div className="bg-zinc-50 rounded-sm border border-zinc-200 p-2 mt-2 nodrag shadow-inner">
          <p className="text-[10px] text-zinc-700 whitespace-pre-wrap leading-relaxed font-sans line-clamp-4">{result.content}</p>
        </div>
      )}
    </NodeShell>
  );
});

export const PreviewNode = memo(({ data, selected }: NodeProps<NodeData>) => {
  const context = data.output as any; // Context passed as output
  const post = context?.generatedPost;
  const images = context?.generatedImages || [];
  const firstImage = images.length > 0 ? `data:image/png;base64,${images[0]}` : null;
  // Locked to Twitter
  const mode = 'Twitter'; 

  return (
    <NodeShell data={data} selected={selected} width="w-[320px]">
      <div className="mb-3">
        <label className="block text-[9px] uppercase text-zinc-500 font-bold mb-1.5">Simulator</label>
         <div className="w-full bg-zinc-100 border border-zinc-200 rounded-sm p-1.5 text-[10px] text-zinc-500 font-mono flex items-center gap-2">
            <div className="bg-black text-white p-0.5 rounded-full"><Twitter className="w-2.5 h-2.5" /></div>
            X (Twitter)
          </div>
      </div>

      {!post ? (
        <div className="h-32 w-full bg-zinc-50 rounded-sm border border-dashed border-zinc-300 flex flex-col items-center justify-center text-zinc-400 gap-2">
            <Eye className="w-4 h-4" />
            <span className="text-[10px]">Awaiting content...</span>
        </div>
      ) : (
        <div className="nodrag">
            {/* Twitter Mockup - Only option available now */}
            <div className="bg-black text-white p-3 rounded-md font-sans text-[11px] leading-snug">
                <div className="flex gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-zinc-700 flex-shrink-0"></div>
                    <div>
                        <div className="flex items-center gap-1">
                            <span className="font-bold">Content Pilot</span>
                            <span className="text-zinc-500">@pilot_ai · 1m</span>
                        </div>
                        <div className="mt-0.5 whitespace-pre-wrap text-zinc-200">
                            {post.content}
                        </div>
                    </div>
                </div>
                {firstImage && (
                    <div className="ml-10 mb-2">
                            <img src={firstImage} className="rounded-xl border border-zinc-800 w-full object-cover max-h-48" />
                    </div>
                )}
                <div className="flex justify-between text-zinc-500 px-2 ml-8 mt-2">
                    <MessageCircle className="w-3.5 h-3.5" />
                    <Repeat className="w-3.5 h-3.5" />
                    <Heart className="w-3.5 h-3.5" />
                    <Share2 className="w-3.5 h-3.5" />
                </div>
            </div>
        </div>
      )}
    </NodeShell>
  );
});

export const PublisherNode = memo(({ data, selected }: NodeProps<NodeData>) => {
  const context = data.output as any;
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [postUrl, setPostUrl] = useState<string | null>(null);

  useEffect(() => {
    const autoPost = async () => {
      const hasToken = !!(data.config.twitterAccessToken || context?.twitterAccessToken);
      const hasContent = !!context?.generatedPost;
      
      // Only auto-post if authenticated, has content, and hasn't posted yet
      if (hasToken && hasContent && !posted && !posting && !error) {
        console.log('Auto-posting to Twitter...');
        await handlePostTweet();
      }
    };

    autoPost();
  }, [context?.generatedPost, data.config.twitterAccessToken, posted, posting]); // Trigger when content or auth changes

  // --- Twitter Logic ---
  const handleTwitterLogin = async (e: React.MouseEvent) => {
     e.stopPropagation();
     setAuthLoading(true);
     setError(null);
     try {
        const result = await loginWithTwitter();
        if (result.authenticated) {
          data.onUpdateConfig(data.id, { 
            twitterAccessToken: 'authenticated',
            twitterUser: result.user 
          });
        } else {
          throw new Error('Authentication failed');
        }
     } catch (e: any) {
        setError("X Login Failed: " + e.message);
     } finally {
        setAuthLoading(false);
     }
  };

  const handlePostTweet = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    const token = data.config.twitterAccessToken || context?.twitterAccessToken;
    if (!token) {
        setError("Not authenticated with X");
        return;
    }
    if (!context?.generatedPost) {
        setError("No content to post");
        return;
    }

    setPosting(true);
    setError(null);
    
    try {
        const result = await postTweet(
          context.generatedPost.content,
          context.generatedImages?.[0]
        );
        setPosted(true);
        setPostUrl(result.url);
        console.log('Posted successfully:', result.url);
    } catch (e: any) {
        setError("Failed to post: " + e.message);
        console.error('Post failed:', e);
    } finally {
        setPosting(false);
    }
  };

  const hasTwitterToken = !!(data.config.twitterAccessToken || context?.twitterAccessToken);

  return (
    <NodeShell data={data} selected={selected}>
      <div className="space-y-3">
        <p className="text-[9px] text-zinc-500 font-medium">
          Auto-Publish to X
        </p>

        {/* X (Twitter) Section */}
        <div className="p-2 bg-zinc-50 border border-zinc-200 rounded-sm">
             <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 bg-black rounded-full flex items-center justify-center text-white text-[8px] font-bold">X</div>
                    <span className="text-[10px] font-bold text-zinc-700">X (Twitter)</span>
                </div>
             </div>

             {!hasTwitterToken ? (
                 <button 
                    onClick={handleTwitterLogin}
                    disabled={authLoading}
                    className="w-full py-1.5 px-2 rounded-sm bg-black text-white text-[10px] font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
                 >
                    {authLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogIn className="w-3 h-3" />}
                    Sign in with X
                 </button>
             ) : (
                 <div className="flex items-center gap-1.5 p-1 bg-emerald-50 border border-emerald-100 rounded-sm text-emerald-700 text-[9px]">
                    <Check className="w-3 h-3" /> Connected
                    {data.config.twitterUser && (
                      <span className="text-[8px] text-zinc-500">@{data.config.twitterUser.username}</span>
                    )}
                 </div>
             )}
         </div>

        {/* Auto-Posting Status */}
        {posting && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-sm">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
            <span className="text-[10px] text-blue-700 font-medium">Auto-posting...</span>
          </div>
        )}

        {/* Success State */}
        {posted && postUrl && (
          <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-sm space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[10px] text-emerald-700 font-bold">Posted! 🎉</span>
            </div>
            <a
              href={postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[9px] text-blue-600 hover:text-blue-800 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-2.5 h-2.5" />
              View on Twitter
            </a>
          </div>
        )}

        {/* Error State with Retry */}
        {error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded-sm space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="text-[9px] text-red-700">{error}</span>
            </div>
            {hasTwitterToken && context?.generatedPost && (
              <button
                onClick={(e) => handlePostTweet(e)}
                disabled={posting}
                className="w-full py-1 px-2 rounded-sm bg-red-600 text-white text-[9px] font-bold hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
              >
                <RefreshCcw className="w-2.5 h-2.5" />
                Retry
              </button>
            )}
          </div>
        )}

        {/* Waiting State */}
        {!context?.generatedPost && (
           <div className="h-16 w-full bg-zinc-50 rounded-sm border border-dashed border-zinc-300 flex flex-col items-center justify-center text-zinc-400 gap-1">
             <Clock className="w-3.5 h-3.5" />
             <span className="text-[9px]">Awaiting content...</span>
           </div>
        )}

        {/* Content Preview (only if not posted) */}
        {context?.generatedPost && !posted && (
          <div className="p-2 bg-zinc-50 rounded-sm border border-zinc-200">
            <p className="text-[8px] uppercase font-bold text-zinc-400 mb-1">Preview</p>
            <p className="text-[9px] text-zinc-600 line-clamp-3 leading-snug">
              {context.generatedPost.content}
            </p>
          </div>
        )}
      </div>
    </NodeShell>
  );
});

export const ImageNode = memo(({ data, selected }: NodeProps<NodeData>) => {
  const images = data.output as string[] | undefined;
  
  const styles = [
    "Documentary / Behind-the-scenes – candid, real work, natural light",
    "UGC style – phone camera feel, imperfect, authentic",
    "Minimal & Clean – neutral colors, lots of whitespace, human focus",
    "Real people, real emotion – natural expression, no stock look",
    "Process-focused – workflow, brainstorming, planning boards",
    "Soft editorial – gentle light, subtle film tone, non-corporate",
    "Data + human – people analyzing real data, simple visuals",
    "Trust-first organic – realistic, unpolished, no ads vibe"
  ];

  return (
    <NodeShell data={data} selected={selected}>
      <div className="space-y-2">
        <div>
           <label className="block text-[9px] uppercase text-zinc-500 font-bold mb-1.5 flex items-center gap-1">
             <Palette className="w-3 h-3" /> Creative Direction
           </label>
           <select
            value={data.config.imageStyle || styles[2]} // Default to Minimal & Clean
            onChange={(e) => data.onUpdateConfig(data.id, { imageStyle: e.target.value })}
            className="w-full bg-zinc-50 border border-zinc-200 rounded-sm p-1.5 text-[10px] text-zinc-800 focus:outline-none focus:border-indigo-500 font-mono nodrag transition-all"
           >
            {styles.map(s => (
                <option key={s} value={s}>{s.split('–')[0].trim()}</option>
            ))}
           </select>
        </div>

        <div>
          <label className="block text-[9px] uppercase text-zinc-500 font-bold mb-1.5">Variations</label>
          <select
            value={data.config.imageCount || 3}
            onChange={(e) => data.onUpdateConfig(data.id, { imageCount: parseInt(e.target.value) })}
            className="w-full bg-zinc-50 border border-zinc-200 rounded-sm p-1.5 text-[10px] text-zinc-800 focus:outline-none focus:border-indigo-500 font-mono nodrag mb-2 transition-all"
          >
            {[1, 2, 3, 4].map(num => (
              <option key={num} value={num}>{num} Asset{num > 1 ? 's' : ''}</option>
            ))}
          </select>
        </div>
      </div>
      
      {images && images.length > 0 ? (
        <div className="grid grid-cols-2 gap-1.5">
          {images.map((base64, i) => (
             <div key={i} className="rounded-sm overflow-hidden border border-zinc-200 bg-zinc-100 aspect-square shadow-sm">
               <img src={`data:image/png;base64,${base64}`} alt={`Generated ${i}`} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" />
             </div>
          ))}
        </div>
      ) : (
        <div className="h-24 w-full bg-zinc-50 rounded-sm border border-dashed border-zinc-300 flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-zinc-300" />
        </div>
      )}
    </NodeShell>
  );
});

export const OutputNode = memo(({ data, selected }: NodeProps<NodeData>) => {
  const context = data.output as any;
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImgIndex, setCopiedImgIndex] = useState<number | null>(null);

  const handleCopyText = async () => {
    if (context?.generatedPost?.content) {
      await navigator.clipboard.writeText(context.generatedPost.content);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  const handleCopyImage = async (base64: string, index: number) => {
    try {
      const response = await fetch(`data:image/png;base64,${base64}`);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      setCopiedImgIndex(index);
      setTimeout(() => setCopiedImgIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy image:', err);
    }
  };
  
  return (
    <NodeShell data={data} selected={selected}>
       {!context ? (
         <div className="flex items-center justify-center h-6 text-[9px] text-zinc-400 uppercase tracking-widest">
           No Artifacts
         </div>
       ) : (
         <div className="space-y-2 nodrag">
            {context.generatedPost && (
               <div className="space-y-1">
                 <div className="flex items-center justify-between">
                    <div className="text-[8px] font-bold text-zinc-500 uppercase">Copy</div>
                    <button 
                      onClick={handleCopyText}
                      className="text-zinc-400 hover:text-indigo-500 transition-colors"
                      title="Copy text"
                    >
                      {copiedText ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                 </div>
                 <div className="p-2 bg-zinc-50 rounded-sm border border-zinc-200 text-[10px] text-zinc-700 leading-relaxed font-sans max-h-24 overflow-y-auto shadow-sm">
                    {context.generatedPost.content}
                 </div>
               </div>
            )}

             {context.generatedImages && (
               <div className="space-y-1">
                 <div className="text-[8px] font-bold text-zinc-500 uppercase">Assets</div>
                 <div className="grid grid-cols-2 gap-1.5">
                    {context.generatedImages.map((base64: string, i: number) => (
                      <div key={i} className="relative group/img">
                        <img src={`data:image/png;base64,${base64}`} className="w-full rounded-sm border border-zinc-200 shadow-sm" />
                        <button
                          onClick={() => handleCopyImage(base64, i)}
                          className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 rounded-sm text-white backdrop-blur-sm opacity-0 group-hover/img:opacity-100 transition-all"
                          title="Copy Image"
                        >
                           {copiedImgIndex === i ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                        </button>
                      </div>
                    ))}
                 </div>
               </div>
            )}
         </div>
       )}
    </NodeShell>
  );
});
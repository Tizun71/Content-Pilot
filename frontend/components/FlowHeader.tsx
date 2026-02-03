import React from 'react';
import { Node } from 'reactflow';
import { Zap, RotateCcw, Play, Loader2, ChevronRight, Power, Box, Globe, PenTool, Image as ImageIcon, Eye, Send, Database, LayoutTemplate } from 'lucide-react';

interface FlowHeaderProps {
  nodes: Node[];
  selectedNodeId: string | null;
  isRunning: boolean;
  onRun: () => void;
  onReset: () => void;
  onAutoLayout: () => void;
  onToggle: (id: string, e: React.MouseEvent) => void;
  onSelect: (id: string) => void;
}

const getModuleIcon = (type: string) => {
  switch (type) {
    case 'INPUT': return <Play className="w-4 h-4" />;
    case 'SEARCH': return <Globe className="w-4 h-4" />;
    case 'WRITE': return <PenTool className="w-4 h-4" />;
    case 'IMAGE': return <ImageIcon className="w-4 h-4" />;
    case 'PREVIEW': return <Eye className="w-4 h-4" />;
    case 'PUBLISHER': return <Send className="w-4 h-4" />;
    case 'OUTPUT': return <Database className="w-4 h-4" />;
    default: return <Box className="w-4 h-4" />;
  }
};

const getModuleLabel = (type: string) => {
   switch (type) {
    case 'INPUT': return 'Briefing';
    case 'SEARCH': return 'Research';
    case 'WRITE': return 'Composer';
    case 'IMAGE': return 'Visuals';
    case 'PREVIEW': return 'Preview';
    case 'PUBLISHER': return 'Publish';
    case 'OUTPUT': return 'Results';
    default: return type;
  }
};

export const FlowHeader: React.FC<FlowHeaderProps> = ({
  nodes,
  selectedNodeId,
  isRunning,
  onRun,
  onReset,
  onAutoLayout,
  onToggle,
  onSelect
}) => {
  return (
    <div className="h-32 bg-[#18181b] border-b border-[#27272a] z-50 flex flex-col shadow-xl relative">
      {/* Top Row: Branding & Actions */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-[#27272a]/50">
         <div className="flex items-center gap-3">
            <div className="p-1.5 bg-zinc-800 rounded-md border border-zinc-700">
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
            </div>
            <div>
                <h1 className="text-sm font-bold tracking-wider text-zinc-100 leading-none">CONTENT PILOT</h1>
                <span className="text-[9px] text-zinc-500 font-medium">Enterprise Engine</span>
            </div>
         </div>

         <div className="flex gap-2">
           <button 
              onClick={onAutoLayout}
              className="bg-[#27272a] border border-[#3f3f46] px-3 py-1.5 rounded-sm hover:bg-[#3f3f46] text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
              title="Auto Arrange Nodes"
           >
              <LayoutTemplate className="w-3.5 h-3.5" />
           </button>
           <button 
              onClick={onReset}
              className="bg-[#27272a] border border-[#3f3f46] px-3 py-1.5 rounded-sm hover:bg-[#3f3f46] text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
              title="Reset Flow"
           >
              <RotateCcw className="w-3.5 h-3.5" />
           </button>
           <button 
              onClick={onRun}
              disabled={isRunning}
              className={`px-4 py-1.5 rounded-sm font-bold text-xs flex items-center gap-2 border transition-all shadow-xl ${
                 isRunning ? 'bg-zinc-800 border-zinc-700 text-zinc-500' : 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500'
              }`}
           >
              {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              {isRunning ? 'EXECUTING...' : 'RUN FLOW'}
           </button>
         </div>
      </div>

      {/* Bottom Row: Pipeline Steps (Scrollable Header) */}
      <div className="flex-1 flex items-center px-4 overflow-x-auto no-scrollbar gap-1 relative bg-[#18181b]">
         {nodes.map((node, index) => {
             const isSelected = selectedNodeId === node.id;
             const isCompleted = node.data.status === 'COMPLETED';
             const isRunning = node.data.status === 'RUNNING';
             const isError = node.data.status === 'ERROR';
             const isEnabled = node.data.config.enabled !== false;
             const isMandatory = node.type === 'INPUT' || node.type === 'OUTPUT';
             
             return (
                <div key={node.id} className={`flex items-center flex-shrink-0 ${!isEnabled ? 'opacity-40 grayscale' : ''} transition-opacity`}>
                    <div className="relative group/wrapper">
                        
                        {!isMandatory && (
                            <button
                                onClick={(e) => onToggle(node.id, e)}
                                className={`absolute -top-2 -right-1 z-20 p-1 rounded-full shadow-md border transition-all scale-0 group-hover/wrapper:scale-100
                                    ${isEnabled ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-zinc-700 border-zinc-600 text-zinc-400'}`}
                                title={isEnabled ? "Disable Module" : "Enable Module"}
                            >
                                <Power className="w-2.5 h-2.5" />
                            </button>
                        )}

                        <button
                            onClick={() => onSelect(node.id)}
                            disabled={!isEnabled}
                            className={`group flex items-center gap-3 px-3 py-2 rounded-md border transition-all duration-200 relative
                                ${isSelected && isEnabled
                                    ? 'bg-blue-500/10 border-blue-500 ring-1 ring-blue-500/50' 
                                    : 'bg-zinc-800/30 border-transparent hover:bg-zinc-800 hover:border-zinc-700'}
                                ${!isEnabled ? 'cursor-not-allowed border-dashed border-zinc-700 bg-transparent' : ''}
                            `}
                        >
                            {isEnabled && (
                                <div className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full 
                                    ${isCompleted ? 'bg-emerald-500' : isRunning ? 'bg-amber-500 animate-pulse' : isError ? 'bg-red-500' : 'bg-transparent'}
                                `}></div>
                            )}

                            <div className={`p-1.5 rounded-md transition-colors 
                                ${isSelected && isEnabled ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-400 group-hover:text-zinc-300'}`}>
                                {getModuleIcon(node.data.moduleType)}
                            </div>
                            <div className="flex flex-col items-start">
                                <span className={`text-[9px] font-bold uppercase tracking-wider ${isSelected && isEnabled ? 'text-blue-400' : 'text-zinc-500'}`}>
                                    0{index + 1}
                                </span>
                                <span className={`text-xs font-semibold ${isSelected && isEnabled ? 'text-blue-100' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                                    {getModuleLabel(node.data.moduleType)}
                                </span>
                            </div>
                        </button>
                    </div>
                    
                    {index < nodes.length - 1 && (
                        <div className="w-6 h-px bg-zinc-800 mx-1 flex items-center justify-center">
                            <ChevronRight className="w-3 h-3 text-zinc-700" />
                        </div>
                    )}
                </div>
             );
         })}
      </div>
    </div>
  );
};
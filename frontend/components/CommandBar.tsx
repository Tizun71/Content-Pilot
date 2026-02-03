import React, { useRef } from 'react';
import { Sparkles, Loader2, Paperclip, X } from 'lucide-react';

interface CommandBarProps {
  inputValue: string;
  inputImage?: string | null;
  isPlanning: boolean;
  onInputChange: (value: string) => void;
  onImageUpload: (image: string | null) => void;
  onOrchestrate: () => void;
}

export const CommandBar: React.FC<CommandBarProps> = ({
  inputValue,
  inputImage,
  isPlanning,
  onInputChange,
  onImageUpload,
  onOrchestrate
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            onImageUpload(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
    // Reset value so same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-3xl z-50 px-4">
      <div className="relative group shadow-2xl transition-all duration-300 hover:scale-[1.01]">
        
        {/* Hidden File Input */}
        <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange} 
        />

        {/* Left Actions (Upload / Preview) */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex items-center">
             {inputImage ? (
                 <div className="relative group/thumb">
                     <img 
                        src={inputImage} 
                        className="w-10 h-10 rounded-lg object-cover border border-zinc-600 shadow-md" 
                        alt="Attachment" 
                     />
                     <button 
                        onClick={() => onImageUpload(null)}
                        className="absolute -top-1.5 -right-1.5 bg-zinc-900 text-zinc-400 hover:text-white rounded-full p-0.5 border border-zinc-700 opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                     >
                        <X className="w-3 h-3" />
                     </button>
                 </div>
             ) : (
                 <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 rounded-xl text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800/50 transition-all border border-transparent hover:border-zinc-700 group/btn"
                    title="Attach Reference Image"
                 >
                    <Paperclip className="w-5 h-5 group-hover/btn:rotate-45 transition-transform duration-300" />
                 </button>
             )}
        </div>
        
        {/* Input Field */}
        <input 
            type="text" 
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => { if(e.key === 'Enter') onOrchestrate(); }}
            placeholder={inputImage ? "Describe what to do with this image..." : "Describe your workflow goal (e.g., 'Analyze this trend and post')..."}
            className={`w-full bg-[#18181b]/95 backdrop-blur-xl border border-zinc-700/50 group-hover:border-indigo-500/50 focus:border-indigo-500 rounded-2xl py-5 pr-32 text-base text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-xl font-medium
                ${inputImage ? 'pl-16' : 'pl-16'} 
            `}
        />
        
        {/* Action Button */}
        <button 
            onClick={onOrchestrate}
            disabled={isPlanning || (!inputValue && !inputImage)}
            className={`absolute right-2 top-2 bottom-2 px-5 rounded-xl flex items-center gap-2 transition-all font-bold text-xs uppercase tracking-wider
                ${(!inputValue && !inputImage)
                    ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                }
            `}
        >
            {isPlanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 fill-current" />}
            {isPlanning ? 'Planning...' : 'Generate Plan'}
        </button>
      </div>
      
      {/* Helper Text */}
      <div className="text-center mt-3">
          <p className="text-[10px] text-zinc-500 font-medium tracking-wide uppercase opacity-0 group-hover:opacity-100 transition-opacity">
              Content Pilot • Powered by Gemini 1.5 Pro
          </p>
      </div>
    </div>
  );
};
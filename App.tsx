
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { optimizePrompt, checkConnection } from './services/geminiService.ts';
import { PromptAnalysis, HistoryItem } from './types.ts';
import { CyberButton, CyberPanel, SectionHeader, CyberAlert, CyberModal } from './components/CyberComponents.tsx';
import { AnalysisView } from './components/AnalysisView.tsx';

const SAMPLES = {
  en: "Write a short story about a robot who discovers music. [TONE: Emotional] [LENGTH: Short]",
  'pt-BR': "Escreva uma história curta sobre um robô que descobre a música. [TOM: Emocional] [TAMANHO: Curto]"
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [analysis, setAnalysis] = useState<PromptAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'pt-BR' | 'en'>('en');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isKernelLive, setIsKernelLive] = useState<boolean | null>(null);
  
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Check for API key and connectivity on mount
  useEffect(() => {
    const init = async () => {
      if (typeof window !== 'undefined' && (window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        setIsAuthenticated(hasKey);
        
        if (hasKey) {
          const alive = await checkConnection();
          setIsKernelLive(alive);
        }
      }
    };
    init();
  }, []);

  const detectedVars = useMemo(() => {
    const regex = /\[([A-Z0-9_]+)\]|\{\{([A-Z0-9_]+)\}\}|<([A-Z0-9_]+)>/gi;
    const matches = new Set<string>();
    let match;
    while ((match = regex.exec(inputPrompt)) !== null) {
      matches.add(match[1] || match[2] || match[3]);
    }
    return Array.from(matches);
  }, [inputPrompt]);

  useEffect(() => {
    setVariables(prev => {
      const next: Record<string, string> = {};
      detectedVars.forEach(v => { next[v] = prev[v] || ''; });
      return next;
    });
  }, [detectedVars]);

  const handleOptimize = async () => {
    if (!inputPrompt.trim()) return;
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await optimizePrompt(inputPrompt, language);
      if (result) {
        setAnalysis(result);
        const newItem: HistoryItem = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          originalPreview: result.originalText.substring(0, 40) + (result.originalText.length > 40 ? '...' : ''),
          optimizedPreview: result.optimizedPrompt.substring(0, 40) + (result.optimizedPrompt.length > 40 ? '...' : ''),
          score: result.score,
          fullAnalysis: result
        };
        setHistory(prev => [newItem, ...prev].slice(0, 20));
      }
    } catch (err: any) {
      const parts = (err.message || "NEURAL_LINK_FAILURE|Unexpected disconnection").split('|');
      const message = parts.length > 1 ? parts[1] : parts[0];
      setError(message);
      
      if (err.message?.includes("AUTH_FAILURE") || err.message?.includes("API key")) {
        setIsAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSample = () => {
    setInputPrompt(SAMPLES[language]);
    if (editorRef.current) editorRef.current.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleOptimize();
    }
  };

  const handleOpenKeySelector = async () => {
    if ((window as any).aistudio) {
      await (window as any).aistudio.openSelectKey();
      setIsAuthenticated(true);
      const alive = await checkConnection();
      setIsKernelLive(alive);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#e0e0e0] font-mono-tech selection:bg-[#39ff14] selection:text-black">
      <div className="fixed inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>
      
      <header className="relative z-10 border-b border-[#7b2cbf]/30 bg-black/80 p-4 sticky top-0 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#39ff14] clip-path-polygon flex items-center justify-center text-black font-bold shadow-[0_0_10px_#39ff14]">O</div>
            <div>
              <h1 className="text-lg font-header tracking-tighter text-white">ORION_IDE</h1>
              <span className="text-[8px] text-[#7b2cbf] block -mt-1 uppercase tracking-widest">Neural Prompt Engineering</span>
            </div>
          </div>
          
          <div className="flex gap-4 items-center">
             <select 
               value={language} 
               onChange={e => setLanguage(e.target.value as any)} 
               className="bg-black border border-[#7b2cbf]/50 text-[#39ff14] px-2 py-1 text-[10px] outline-none hover:border-[#39ff14] transition-colors"
             >
               <option value="en">ENG_US</option>
               <option value="pt-BR">POR_BR</option>
             </select>
             <button onClick={() => setShowHistory(true)} className="text-[10px] text-[#7b2cbf] hover:text-[#39ff14] transition-colors font-header">
               [HISTÓRICO]
             </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto p-6">
        {error && <CyberAlert title="KERNEL_REPORT" message={error} onClose={() => setError(null)} />}

        {analysis ? (
          <AnalysisView 
            analysis={analysis} 
            language={language} 
            variables={variables}
            onBack={() => setAnalysis(null)} 
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              <CyberPanel title="NEURAL_EDITOR">
                <div className="relative group">
                  <textarea 
                    ref={editorRef}
                    value={inputPrompt}
                    onChange={e => setInputPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={language === 'en' ? "Describe your intent... use [VARIABLES] to map inputs." : "Descreva sua intenção... use [VARIAVEIS] para mapear entradas."}
                    className="w-full h-[500px] bg-black/20 border-none outline-none resize-none p-4 text-[#39ff14] text-lg placeholder-[#39ff14]/10 custom-scrollbar font-mono-tech transition-all focus:bg-black/40"
                  />
                  {loading && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                      <div className="w-16 h-16 border-4 border-t-[#39ff14] border-transparent rounded-full animate-spin mb-4"></div>
                      <p className="text-[#39ff14] font-header text-sm tracking-widest animate-pulse">INITIATING_ENGINE_SCAN...</p>
                      <p className="text-gray-500 text-[10px] mt-2 font-mono-tech">Consulting Gemini 3 Pro (Project Orion)</p>
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4 flex gap-2">
                    <button 
                      onClick={loadSample}
                      className="bg-[#7b2cbf]/20 border border-[#7b2cbf]/40 px-3 py-1 text-[10px] text-[#7b2cbf] hover:bg-[#7b2cbf] hover:text-white transition-all uppercase tracking-tighter"
                    >
                      [LOAD_SAMPLE]
                    </button>
                  </div>
                  <div className="absolute bottom-4 right-4 text-[8px] text-gray-700 font-mono-tech uppercase pointer-events-none">
                    Kernel_Ready // Chars: {inputPrompt.length}
                  </div>
                </div>
                <div className="mt-4 flex justify-between items-center border-t border-[#7b2cbf]/20 pt-4">
                  <div className="flex flex-col">
                    <div className="text-[10px] text-gray-500 font-mono-tech uppercase">
                      {detectedVars.length > 0 ? `VARS_DETECTED: ${detectedVars.join(', ')}` : 'READY_FOR_INPUT'}
                    </div>
                    <div className="text-[8px] text-[#7b2cbf] font-mono-tech mt-1 animate-pulse">
                      SHORTCUT: <span className="text-gray-400 font-bold">[CTRL + ENTER]</span>
                    </div>
                  </div>
                  <CyberButton onClick={handleOptimize} isLoading={loading} disabled={!inputPrompt.trim() || loading}>
                    {loading ? "PROCESSING..." : "RUN_OPTIMIZATION"}
                  </CyberButton>
                </div>
              </CyberPanel>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <SectionHeader title="VARIABLES" subtitle="Injection Mapping" />
              <CyberPanel className="min-h-[200px]">
                {detectedVars.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-gray-600 text-[10px] italic">
                      {language === 'en' ? "Use brackets [LIKE_THIS] to create inputs." : "Use colchetes [ASSIM] para criar campos."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {detectedVars.map(v => (
                      <div key={v} className="space-y-1">
                        <label className="text-[9px] text-[#7b2cbf] uppercase font-bold tracking-widest">{v}</label>
                        <input 
                          type="text" 
                          value={variables[v] || ''}
                          onChange={e => setVariables(prev => ({...prev, [v]: e.target.value}))}
                          className="w-full bg-black/40 border border-[#7b2cbf]/30 p-2 text-xs text-[#39ff14] outline-none focus:border-[#39ff14] transition-all"
                          placeholder={`Value for ${v}...`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CyberPanel>

              <SectionHeader title="SYSTEM" subtitle="Connectivity" />
              <div className="grid grid-cols-2 gap-2 font-mono-tech">
                 <div className="bg-black/40 border border-[#7b2cbf]/20 p-2 text-center">
                    <span className="text-[8px] text-gray-500 block uppercase">Signal</span>
                    <span className={isKernelLive === true ? "text-[#39ff14] text-xs" : isKernelLive === false ? "text-red-500 text-xs" : "text-gray-500 text-xs"}>
                      {isKernelLive === true ? "ESTABLISHED" : isKernelLive === false ? "DISRUPTED" : "CONNECTING..."}
                    </span>
                 </div>
                 <div className="bg-black/40 border border-[#7b2cbf]/20 p-2 text-center">
                    <span className="text-[8px] text-gray-500 block uppercase">Engine</span>
                    <span className="text-[#39ff14] text-xs">GEMINI-3</span>
                 </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <CyberModal isOpen={showHistory} onClose={() => setShowHistory(false)} title="OPTIMIZATION_LOGS">
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {history.length === 0 ? (
            <p className="text-center text-gray-600 py-8 text-xs italic">Neural buffer empty.</p>
          ) : history.map(item => (
            <div key={item.id} onClick={() => { setAnalysis(item.fullAnalysis); setShowHistory(false); }} className="bg-black/60 border border-[#7b2cbf]/30 p-3 hover:border-[#39ff14] cursor-pointer flex justify-between items-center group transition-all">
              <div className="overflow-hidden">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[8px] text-[#39ff14] font-bold">EFF_{item.score}%</span>
                  <span className="text-[8px] text-gray-500">[{new Date(item.timestamp).toLocaleTimeString()}]</span>
                </div>
                <p className="text-[10px] text-gray-400 italic truncate">{item.originalPreview}</p>
              </div>
              <span className="text-[#7b2cbf] text-[10px] group-hover:text-[#39ff14]">>></span>
            </div>
          ))}
        </div>
      </CyberModal>
      
      {!isAuthenticated && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6">
           <CyberPanel title="NEURAL_AUTH_REQUIRED" className="max-w-md w-full">
              <div className="text-center py-8">
                 <h2 className="text-[#39ff14] font-header text-xl mb-4 tracking-tighter">ACCESS_DENIED</h2>
                 <p className="text-gray-400 text-xs mb-8 leading-relaxed">
                    The Orion Interface requires an authorized Gemini API Key. 
                    Gemini 3 Pro models are restricted to projects with billing enabled.
                 </p>
                 <CyberButton onClick={handleOpenKeySelector}>
                    SELECT_API_KEY
                 </CyberButton>
                 <div className="mt-6">
                    <a 
                      href="https://ai.google.dev/gemini-api/docs/billing" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] text-[#7b2cbf] hover:text-[#39ff14] underline underline-offset-4"
                    >
                      Documentation: Billing Setup
                    </a>
                 </div>
              </div>
           </CyberPanel>
        </div>
      )}
    </div>
  );
};

export default App;

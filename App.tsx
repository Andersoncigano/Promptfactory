
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { optimizePrompt } from './services/geminiService.ts';
import { PromptAnalysis, HistoryItem } from './types.ts';
import { CyberButton, CyberPanel, SectionHeader, CyberModal, CyberAlert } from './components/CyberComponents.tsx';
import { AnalysisView } from './components/AnalysisView.tsx';

const BLUEPRINTS = [
  {
    id: 'sys-architect',
    title: 'SYSTEM ARCHITECT',
    desc: 'Ideal for complex code generation and software architecture.',
    prompt: 'Act as a Senior Software Architect specialized in [LANGUAGE]. Design a scalable solution for [PROBLEM]. Include design patterns, error handling, and explanatory comments.'
  },
  {
    id: 'creative-engine',
    title: 'CREATIVE ENGINE',
    desc: 'For storytelling, scripts, and narrative generation.',
    prompt: 'Assume the role of an Award-Winning Novelist. Write a [TEXT_TYPE] about [THEME] in a [TONE] tone. Use vivid sensory descriptions.'
  },
  {
    id: 'logic-master',
    title: 'LOGIC MASTER',
    desc: 'Complex reasoning and zero-shot chain-of-thought.',
    prompt: 'Solve the following logic puzzle: [PUZZLE]. Think step by step. Verify each assumption before concluding.'
  }
];

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [analysis, setAnalysis] = useState<PromptAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'pt-BR' | 'en'>('en');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Detecta variáveis no formato [TEXTO] ou {{TEXTO}} ou <TEXTO>
  const detectedVars = useMemo(() => {
    const regex = /\[([A-Z0-9_]+)\]|\{\{([A-Z0-9_]+)\}\}|<([A-Z0-9_]+)>/gi;
    const matches = new Set<string>();
    let match;
    while ((match = regex.exec(inputPrompt)) !== null) {
      matches.add(match[1] || match[2] || match[3]);
    }
    return Array.from(matches);
  }, [inputPrompt]);

  // Atualiza o objeto de variáveis quando novas são detectadas
  useEffect(() => {
    setVariables(prev => {
      const next: Record<string, string> = {};
      detectedVars.forEach(v => {
        next[v] = prev[v] || '';
      });
      return next;
    });
  }, [detectedVars]);

  // Inicialização Otimista (resolvendo o problema de auth anterior)
  useEffect(() => {
    let attempts = 0;
    const interval = setInterval(async () => {
      if ((window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        setIsAuthenticated(hasKey);
        clearInterval(interval);
      } else if (attempts > 10) {
        setIsAuthenticated(true); // Fallback otimista
        clearInterval(interval);
      }
      attempts++;
    }, 300);
    return () => clearInterval(interval);
  }, []);

  const handleOptimize = async () => {
    if (!inputPrompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await optimizePrompt(inputPrompt, language);
      if (result) {
        setAnalysis(result);
        const newItem: HistoryItem = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          originalPreview: result.originalText.substring(0, 40) + '...',
          optimizedPreview: result.optimizedPrompt.substring(0, 40) + '...',
          score: result.score,
          fullAnalysis: result
        };
        setHistory(prev => [newItem, ...prev].slice(0, 20));
      }
    } catch (err: any) {
      setError(err.message || "SYSTEM_FAILURE|Neural optimization path blocked.");
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated === null) return <div className="min-h-screen bg-black flex items-center justify-center font-mono-tech text-[#39ff14] animate-pulse">INIT_ORION_RESOURCES...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-[#e0e0e0] font-mono-tech">
      <div className="fixed inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>
      
      <header className="relative z-10 border-b border-[#7b2cbf]/30 bg-black/80 p-4 sticky top-0 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#39ff14] clip-path-polygon flex items-center justify-center text-black font-bold">O</div>
            <h1 className="text-lg font-header tracking-tighter">ORION_IDE</h1>
          </div>
          <div className="flex gap-4">
             <select value={language} onChange={e => setLanguage(e.target.value as any)} className="bg-black border border-[#7b2cbf] text-[#39ff14] px-2 py-1 text-xs">
               <option value="en">EN_US</option>
               <option value="pt-BR">PT_BR</option>
             </select>
             <CyberButton variant="secondary" className="py-1 px-3 text-[10px]" onClick={() => setShowHistory(true)}>LOGS</CyberButton>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto p-6">
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
              <CyberPanel title="PROMPT_ARCHITECT_EDITOR">
                <textarea 
                  value={inputPrompt}
                  onChange={e => setInputPrompt(e.target.value)}
                  placeholder="Design your neural template here... use [VARIABLES] to map inputs."
                  className="w-full h-[500px] bg-transparent border-none outline-none resize-none p-4 text-[#39ff14] text-lg placeholder-[#39ff14]/20 custom-scrollbar font-mono-tech"
                />
                <div className="mt-4 flex justify-between items-center border-t border-[#7b2cbf]/20 pt-4">
                  <div className="flex gap-2 text-[10px] text-gray-500">
                    DETECTED_VARS: {detectedVars.length > 0 ? detectedVars.join(', ') : 'NONE'}
                  </div>
                  <CyberButton onClick={handleOptimize} isLoading={loading} disabled={!inputPrompt.trim()}>
                    INIT_ENGINE_SCAN
                  </CyberButton>
                </div>
              </CyberPanel>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <SectionHeader title="VARIABLE_MAPPING" subtitle="Injection parameters" />
              <CyberPanel className="min-h-[200px]">
                {detectedVars.length === 0 ? (
                  <p className="text-gray-600 text-xs italic">Add [BRACKETS] to prompt text to map variables.</p>
                ) : (
                  <div className="space-y-4">
                    {detectedVars.map(v => (
                      <div key={v} className="space-y-1">
                        <label className="text-[10px] text-[#7b2cbf] uppercase font-bold tracking-widest">{v}</label>
                        <input 
                          type="text" 
                          value={variables[v] || ''}
                          onChange={e => setVariables(prev => ({...prev, [v]: e.target.value}))}
                          className="w-full bg-black/40 border border-[#7b2cbf]/30 p-2 text-xs text-[#39ff14] outline-none focus:border-[#39ff14] transition-colors"
                          placeholder={`Enter value for ${v}...`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CyberPanel>

              <SectionHeader title="TEMPLATES" />
              <div className="grid grid-cols-1 gap-3">
                {BLUEPRINTS.map(bp => (
                  <div key={bp.id} onClick={() => setInputPrompt(bp.prompt)} className="border border-[#7b2cbf]/30 p-3 hover:border-[#39ff14] cursor-pointer bg-black/40 group transition-all">
                    <h4 className="text-[10px] text-[#39ff14] font-header mb-1">{bp.title}</h4>
                    <p className="text-[9px] text-gray-500 truncate">{bp.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <CyberModal isOpen={showHistory} onClose={() => setShowHistory(false)} title="ARCHIVAL_LOGS">
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {history.map(item => (
            <div key={item.id} onClick={() => { setAnalysis(item.fullAnalysis); setShowHistory(false); }} className="bg-black/40 border border-[#7b2cbf]/30 p-3 hover:border-[#39ff14] cursor-pointer flex justify-between items-center group">
              <div>
                <p className="text-[10px] text-[#39ff14] mb-1">SCORE_{item.score}</p>
                <p className="text-[9px] text-gray-500 italic">{item.originalPreview}</p>
              </div>
              <span className="text-[8px] text-[#7b2cbf]">[{new Date(item.timestamp).toLocaleTimeString()}]</span>
            </div>
          ))}
        </div>
      </CyberModal>
    </div>
  );
};

export default App;

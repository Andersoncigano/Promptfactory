
import React, { useState, useEffect, useCallback } from 'react';
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
    prompt: 'Assume the role of an Award-Winning Novelist. Write a [TEXT TYPE] about [THEME] in a [TONE] tone. Use vivid sensory descriptions and avoid clichés.'
  },
  {
    id: 'academic-analyzer',
    title: 'ACADEMIC ANALYZER',
    desc: 'Focused on summarization, synthesis, and critical analysis.',
    prompt: 'Act as an Academic Researcher. Analyze the following text and provide: 1) An executive summary, 2) Key points in bullet points, 3) Potential biases or logical flaws.'
  },
  {
    id: 'marketing-strategist',
    title: 'MARKETING STRATEGIST',
    desc: 'Copy generation, sales emails, and growth strategies.',
    prompt: 'You are a world-class Digital Marketing Expert. Create a [CHANNEL] campaign to promote [PRODUCT] targeting [TARGET AUDIENCE]. Use mental triggers of scarcity and authority.'
  }
];

const parseError = (err: string | null) => {
    if (!err) return null;
    const parts = err.split('|');
    if (parts.length > 1) {
        return { title: parts[0], message: parts.slice(1).join('|') };
    }
    return { title: "SYSTEM ERROR", message: err };
}

const BootScreen: React.FC = () => (
  <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 font-mono-tech">
    <div className="fixed inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>
    <div className="relative">
      <div className="w-24 h-24 border-2 border-[#39ff14]/20 border-t-[#39ff14] rounded-full animate-spin mb-8"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[#39ff14] text-xl font-header animate-pulse">O</span>
      </div>
    </div>
    <div className="space-y-2 text-center">
      <p className="text-[#39ff14] tracking-[0.5em] text-xs uppercase animate-pulse">Initializing_ORION_Core</p>
      <div className="flex gap-1 justify-center">
        <span className="w-1 h-1 bg-[#39ff14] animate-[ping_1s_infinite_100ms]"></span>
        <span className="w-1 h-1 bg-[#39ff14] animate-[ping_1s_infinite_200ms]"></span>
        <span className="w-1 h-1 bg-[#39ff14] animate-[ping_1s_infinite_300ms]"></span>
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [analysis, setAnalysis] = useState<PromptAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'pt-BR' | 'en'>('en');
  const [showBlueprints, setShowBlueprints] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const MAX_INPUT_CHARS = 100000;

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 15; // Tenta por ~3 segundos

    const check = async () => {
      try {
        if ((window as any).aistudio) {
          const hasKey = await (window as any).aistudio.hasSelectedApiKey();
          setIsAuthenticated(hasKey);
          return true;
        }
      } catch (e) {
        console.error("Auth check failed:", e);
      }
      return false;
    };

    const interval = setInterval(async () => {
      const found = await check();
      attempts++;
      if (found || attempts >= maxAttempts) {
        clearInterval(interval);
        // Se não encontrou após 3 segundos, assume que pode prosseguir (Otimismo)
        if (isAuthenticated === null && attempts >= maxAttempts) {
          setIsAuthenticated(true);
        }
      }
    }, 200);

    const saved = localStorage.getItem('orion_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) { console.error("History parse failed"); }
    }

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('orion_history', JSON.stringify(history));
  }, [history]);

  const handleAuthenticate = async () => {
    setIsAuthLoading(true);
    setError(null);
    try {
      if ((window as any).aistudio) {
        await (window as any).aistudio.openSelectKey();
        setIsAuthenticated(true);
      } else {
        // Se o botão foi clicado e não há aistudio, pode ser um erro de ambiente real
        throw new Error("ENVIRONMENT_INCOMPATIBLE|O módulo de seleção de chaves não está disponível neste navegador.");
      }
    } catch (e: any) {
      setError(e.message || "AUTH_FAILURE|Não foi possível abrir o seletor de credenciais.");
    } finally {
      setIsAuthLoading(false);
    }
  };

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
      const errMsg = err instanceof Error ? err.message : "SYSTEM FAILURE|Falha na otimização.";
      setError(errMsg);
      
      // Se falhar por falta de chave, volta para a tela de auth
      if (errMsg.includes("Requested entity was not found") || errMsg.includes("AUTH FAILURE")) {
        setIsAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const errorObj = parseError(error);

  if (isAuthenticated === null) return <BootScreen />;

  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-[#050505] text-[#e0e0e0] flex items-center justify-center p-6">
        <div className="fixed inset-0 bg-grid-pattern opacity-20 pointer-events-none"></div>
        <div className="max-w-md w-full relative z-10">
          <CyberPanel title="CORE_INITIALIZATION">
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-red-500/20 border border-red-500 flex items-center justify-center mx-auto mb-6 clip-path-polygon animate-pulse">
                <span className="text-red-500 font-header font-bold text-3xl">!</span>
              </div>
              <h2 className="text-[#39ff14] font-header text-xl mb-4 tracking-widest uppercase">Acesso Bloqueado</h2>
              <p className="text-gray-400 font-mono-tech text-xs mb-8 leading-relaxed px-4">
                Uma chave de API válida com faturamento ativo é necessária para acessar os modelos Gemini 3.
              </p>
              
              {errorObj && (
                <div className="mb-6 text-left px-2">
                  <CyberAlert title={errorObj.title} message={errorObj.message} onClose={() => setError(null)} />
                </div>
              )}

              <div className="space-y-6 px-4">
                <CyberButton onClick={handleAuthenticate} className="w-full py-4 text-sm" isLoading={isAuthLoading}>
                  SELECIONAR CHAVE DO PROJETO
                </CyberButton>
                <div className="flex flex-col gap-2">
                  <button onClick={() => setIsAuthenticated(true)} className="text-[10px] text-gray-500 hover:text-[#39ff14] font-mono-tech uppercase">
                    [Tentar Acesso Direto]
                  </button>
                  <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-[10px] text-[#7b2cbf] hover:text-[#39ff14] font-mono-tech uppercase underline decoration-dotted">
                    [Requisitos de Faturamento]
                  </a>
                </div>
              </div>
            </div>
          </CyberPanel>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#e0e0e0] font-mono-tech selection:bg-[#39ff14] selection:text-black">
      <div className="fixed inset-0 bg-grid-pattern opacity-20 pointer-events-none"></div>
      
      <header className="relative z-10 border-b border-[#7b2cbf]/30 bg-black/40 backdrop-blur-md p-4 sticky top-0">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#39ff14] flex items-center justify-center clip-path-polygon shadow-[0_0_10px_#39ff14]">
                <span className="text-black font-header font-bold text-xl">O</span>
            </div>
            <div>
                <h1 className="text-xl font-header tracking-[0.3em] text-white">ORION_CORE</h1>
                <p className="text-[10px] text-[#7b2cbf] tracking-widest">PROMPT_ARCHITECT_v3.2</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value as any)}
              className="bg-black border border-[#7b2cbf]/50 text-[#39ff14] text-xs px-2 py-1 outline-none font-mono-tech"
            >
              <option value="en">ENGLISH</option>
              <option value="pt-BR">PORTUGUÊS</option>
            </select>
            <CyberButton variant="secondary" className="py-1 px-3 text-[10px]" onClick={() => setShowHistory(true)}>
                HISTORY_LOG
            </CyberButton>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto p-6 lg:p-8">
        {errorObj && <CyberAlert title={errorObj.title} message={errorObj.message} onClose={() => setError(null)} />}

        {!analysis ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
            <div className="lg:col-span-8 space-y-6">
              <CyberPanel title="NEURAL_INPUT">
                <div className="relative">
                  <textarea
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    placeholder="Load target objectives for neural restructuring..."
                    className="w-full h-[450px] bg-transparent border-none outline-none resize-none p-2 text-lg text-[#39ff14] placeholder-[#39ff14]/20 custom-scrollbar"
                  />
                  <div className="absolute bottom-2 right-2 text-[10px] text-gray-600">
                    CHARS: {inputPrompt.length} / {MAX_INPUT_CHARS}
                  </div>
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <div className="flex gap-4">
                    <CyberButton variant="secondary" onClick={() => setShowBlueprints(true)}>LOAD_BLUEPRINTS</CyberButton>
                    <CyberButton variant="secondary" onClick={() => setInputPrompt('')}>CLEAR_BUFFER</CyberButton>
                  </div>
                  <CyberButton onClick={handleOptimize} isLoading={loading} disabled={!inputPrompt.trim()}>INITIATE_OPTIMIZATION</CyberButton>
                </div>
              </CyberPanel>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <SectionHeader title="ACTIVE_ARCHETYPES" subtitle="Pre-defined neural templates" />
              <div className="space-y-4">
                {BLUEPRINTS.map(bp => (
                  <div key={bp.id} onClick={() => setInputPrompt(bp.prompt)} className="group border border-[#7b2cbf]/30 p-4 bg-black/40 hover:border-[#39ff14] transition-all cursor-pointer">
                    <h3 className="text-[#e0e0e0] font-header text-xs mb-1 group-hover:text-[#39ff14] transition-colors">{bp.title}</h3>
                    <p className="text-gray-500 text-[10px] font-mono-tech">{bp.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-slideIn">
            <div className="mb-6 flex items-center justify-between">
              <CyberButton variant="secondary" onClick={() => setAnalysis(null)}>&lt; BACK_TO_INPUT</CyberButton>
              <CyberButton onClick={() => { setAnalysis(null); handleOptimize(); }}>RE-OPTIMIZE</CyberButton>
            </div>
            <AnalysisView analysis={analysis} language={language} onApply={(optimized) => { setInputPrompt(optimized); setAnalysis(null); }} />
          </div>
        )}
      </main>

      <CyberModal isOpen={showHistory} onClose={() => setShowHistory(false)} title="NEURAL_HISTORY_LOG">
        <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 text-xs">
          {history.length === 0 ? <p className="text-center text-gray-500 py-8 italic font-mono-tech">Empty history.</p> : history.map(item => (
            <div key={item.id} onClick={() => { setAnalysis(item.fullAnalysis); setShowHistory(false); }} className="bg-black/40 border border-[#7b2cbf]/30 p-4 hover:border-[#39ff14] transition-all cursor-pointer group">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] text-gray-500">{new Date(item.timestamp).toLocaleString()}</span>
                <span className="text-[#39ff14] font-bold">{item.score}/100</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <p className="text-gray-400 truncate italic">{item.originalPreview}</p>
                <p className="text-[#e0e0e0] truncate">{item.optimizedPreview}</p>
              </div>
            </div>
          ))}
        </div>
      </CyberModal>

      <CyberModal isOpen={showBlueprints} onClose={() => setShowBlueprints(false)} title="ARCHITECT_BLUEPRINTS">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BLUEPRINTS.map(bp => (
            <div key={bp.id} onClick={() => { setInputPrompt(bp.prompt); setShowBlueprints(false); }} className="border border-[#7b2cbf]/30 p-4 hover:border-[#39ff14] cursor-pointer transition-all bg-black/40 group">
              <h4 className="text-[#39ff14] font-header text-sm mb-2">{bp.title}</h4>
              <p className="text-gray-400 text-xs mb-4 leading-relaxed">{bp.desc}</p>
            </div>
          ))}
        </div>
      </CyberModal>
    </div>
  );
};

export default App;

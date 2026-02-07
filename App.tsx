
import React, { useState, useEffect } from 'react';
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

// Tela de carregamento para evitar o estado "preto"
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
    // Tentativa de verificação com retry para lidar com carregamento do objeto window
    let retries = 0;
    const checkWithRetry = async () => {
      try {
        if ((window as any).aistudio) {
          const hasKey = await (window as any).aistudio.hasSelectedApiKey();
          setIsAuthenticated(hasKey);
        } else if (retries < 5) {
          retries++;
          setTimeout(checkWithRetry, 200);
        } else {
          setIsAuthenticated(false);
        }
      } catch (e) {
        console.error("Auth check failed:", e);
        setIsAuthenticated(false);
      }
    };

    checkWithRetry();
    
    const saved = localStorage.getItem('orion_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) { console.error("History parse failed"); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('orion_history', JSON.stringify(history));
  }, [history]);

  const handleAuthenticate = async () => {
    setIsAuthLoading(true);
    try {
      if ((window as any).aistudio) {
        await (window as any).aistudio.openSelectKey();
        setIsAuthenticated(true);
      } else {
        throw new Error("AISTUDIO_NOT_READY|System core modules are still initializing.");
      }
    } catch (e: any) {
      console.error("Authentication failed:", e);
      setError(e.message || "AUTH_MALFUNCTION|Failed to open credential selector.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const addToHistory = (result: PromptAnalysis) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      originalPreview: result.originalText.substring(0, 40) + (result.originalText.length > 40 ? '...' : ''),
      optimizedPreview: result.optimizedPrompt.substring(0, 40) + (result.optimizedPrompt.length > 40 ? '...' : ''),
      score: result.score,
      fullAnalysis: result
    };
    setHistory(prev => [newItem, ...prev].slice(0, 20));
  };

  const handleOptimize = async () => {
    if (!inputPrompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await optimizePrompt(inputPrompt, language);
      if (result) {
        setAnalysis(result);
        addToHistory(result);
      }
    } catch (err: any) {
      const errMsg = err instanceof Error ? err.message : "SYSTEM FAILURE|Optimization protocol failed.";
      setError(errMsg);
      
      if (errMsg.includes("Requested entity was not found") || errMsg.includes("AUTH FAILURE")) {
        setIsAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const errorObj = parseError(error);

  if (isAuthenticated === null) {
    return <BootScreen />;
  }

  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-[#050505] text-[#e0e0e0] flex items-center justify-center p-6">
        <div className="fixed inset-0 bg-grid-pattern opacity-20 pointer-events-none"></div>
        <div className="max-w-md w-full relative z-10">
          <CyberPanel title="CORE_INITIALIZATION">
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-500/20 border border-red-500 flex items-center justify-center mx-auto mb-6 clip-path-polygon animate-pulse">
                <span className="text-red-500 font-header font-bold text-3xl">!</span>
              </div>
              <h2 className="text-[#39ff14] font-header text-xl mb-4 tracking-widest">CREDENTIALS_REQUIRED</h2>
              <p className="text-gray-400 font-mono-tech text-sm mb-8 leading-relaxed">
                ORION CORE v3.2 requires a valid Project API Key with active billing to access Gemini 3 series models.
              </p>
              
              {errorObj && (
                <div className="mb-6 text-left">
                  <CyberAlert title={errorObj.title} message={errorObj.message} onClose={() => setError(null)} />
                </div>
              )}

              <div className="space-y-4">
                <CyberButton onClick={handleAuthenticate} className="w-full py-4" isLoading={isAuthLoading}>
                  SELECT_PROJECT_KEY
                </CyberButton>
                <a 
                  href="https://ai.google.dev/gemini-api/docs/billing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block text-[10px] text-[#7b2cbf] hover:text-[#39ff14] transition-colors font-mono-tech uppercase tracking-widest"
                >
                  [VIEW_BILLING_DOCUMENTATION]
                </a>
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
        {errorObj && (
          <CyberAlert 
            title={errorObj.title} 
            message={errorObj.message} 
            onClose={() => setError(null)} 
          />
        )}

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
                    <CyberButton variant="secondary" onClick={() => setShowBlueprints(true)}>
                      LOAD_BLUEPRINTS
                    </CyberButton>
                    <CyberButton variant="secondary" onClick={() => setInputPrompt('')}>
                      CLEAR_BUFFER
                    </CyberButton>
                  </div>
                  <CyberButton onClick={handleOptimize} isLoading={loading} disabled={!inputPrompt.trim()}>
                    INITIATE_OPTIMIZATION
                  </CyberButton>
                </div>
              </CyberPanel>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <SectionHeader title="ACTIVE_ARCHETYPES" subtitle="Pre-defined neural templates" />
              <div className="space-y-4">
                {BLUEPRINTS.map(bp => (
                  <div 
                    key={bp.id} 
                    onClick={() => setInputPrompt(bp.prompt)}
                    className="group border border-[#7b2cbf]/30 p-4 bg-black/40 hover:border-[#39ff14] transition-all cursor-pointer"
                  >
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
              <CyberButton variant="secondary" onClick={() => setAnalysis(null)}>
                &lt; BACK_TO_INPUT
              </CyberButton>
              <div className="flex gap-4">
                <CyberButton onClick={() => { setAnalysis(null); handleOptimize(); }}>
                  RE-OPTIMIZE
                </CyberButton>
              </div>
            </div>
            <AnalysisView 
              analysis={analysis} 
              language={language}
              onApply={(optimized) => {
                setInputPrompt(optimized);
                setAnalysis(null);
              }} 
            />
          </div>
        )}
      </main>

      <CyberModal isOpen={showHistory} onClose={() => setShowHistory(false)} title="NEURAL_HISTORY_LOG">
        <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
          {history.length === 0 ? (
            <p className="text-center text-gray-500 py-8 italic font-mono-tech">No optimization logs found.</p>
          ) : (
            history.map(item => (
              <div 
                key={item.id} 
                onClick={() => { setAnalysis(item.fullAnalysis); setShowHistory(false); }}
                className="bg-black/40 border border-[#7b2cbf]/30 p-4 hover:border-[#39ff14] transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] text-gray-500">{new Date(item.timestamp).toLocaleString()}</span>
                  <span className="text-[#39ff14] text-xs font-bold">{item.score}/100</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[8px] text-[#7b2cbf] uppercase block mb-1">Source</span>
                    <p className="text-gray-400 text-[10px] truncate italic">{item.originalPreview}</p>
                  </div>
                  <div>
                    <span className="text-[8px] text-[#39ff14] uppercase block mb-1">Optimized</span>
                    <p className="text-[#e0e0e0] text-[10px] truncate">{item.optimizedPreview}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="mt-6 flex justify-center">
            <CyberButton variant="danger" onClick={() => { setHistory([]); localStorage.removeItem('orion_history'); }} className="text-xs">
                WIPE_HISTORY
            </CyberButton>
        </div>
      </CyberModal>

      <CyberModal isOpen={showBlueprints} onClose={() => setShowBlueprints(false)} title="ARCHITECT_BLUEPRINTS">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BLUEPRINTS.map(bp => (
            <div 
              key={bp.id}
              onClick={() => { setInputPrompt(bp.prompt); setShowBlueprints(false); }}
              className="border border-[#7b2cbf]/30 p-4 hover:border-[#39ff14] cursor-pointer transition-all bg-black/40 group"
            >
              <h4 className="text-[#39ff14] font-header text-sm mb-2 group-hover:translate-x-1 transition-transform">{bp.title}</h4>
              <p className="text-gray-400 text-xs mb-4 leading-relaxed">{bp.desc}</p>
            </div>
          ))}
        </div>
      </CyberModal>

      <footer className="mt-12 border-t border-[#7b2cbf]/20 py-8 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-[10px] text-gray-600 font-mono-tech tracking-widest">
            © 2025 ORION_CORP // CORE_INTERFACE_STABLE
          </div>
          <div className="flex gap-6">
            <span className="text-[10px] text-[#39ff14] animate-pulse">SYSTEM_STATUS: OPTIMAL</span>
            <span className="text-[10px] text-[#7b2cbf]">GEMINI_ENGINE: ONLINE</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;

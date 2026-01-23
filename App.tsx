import React, { useState, useEffect } from 'react';
import { optimizePrompt } from './services/geminiService';
import { PromptAnalysis, HistoryItem } from './types';
import { CyberButton, CyberPanel, SectionHeader, CyberModal, CyberAlert } from './components/CyberComponents';
import { AnalysisView } from './components/AnalysisView';

// Template Data
const BLUEPRINTS = [
  {
    id: 'sys-architect',
    title: 'SYSTEM ARCHITECT',
    desc: 'Ideal para geração de código complexo e arquitetura de software.',
    prompt: 'Atue como um Arquiteto de Software Sênior especializado em [LINGUAGEM]. Projete uma solução escalável para [PROBLEMA]. Inclua padrões de projeto, tratamento de erros e comentários explicativos.'
  },
  {
    id: 'creative-engine',
    title: 'CREATIVE ENGINE',
    desc: 'Para storytelling, roteiros e geração de conteúdo narrativo.',
    prompt: 'Assuma o papel de um Romancista Premiado. Escreva uma [TIPO DE TEXTO] sobre [TEMA] em um tom [TOM]. Utilize descrições sensoriais vívidas e evite clichês.'
  },
  {
    id: 'academic-analyzer',
    title: 'ACADEMIC ANALYZER',
    desc: 'Focado em resumo, síntese e análise crítica de textos.',
    prompt: 'Atue como um Pesquisador Acadêmico. Analise o seguinte texto e forneça: 1) Um resumo executivo, 2) Pontos-chave em bullet points, 3) Potenciais vieses ou falhas lógicas.'
  },
  {
    id: 'growth-hacker',
    title: 'MARKETING STRATEGIST',
    desc: 'Geração de copy, e-mails de vendas e estratégias de crescimento.',
    prompt: 'Você é um Especialista em Marketing Digital de classe mundial. Crie uma campanha de [CANAL] para promover [PRODUTO] visando [PÚBLICO ALVO]. Utilize gatilhos mentais de escassez e autoridade.'
  },
  {
    id: 'design-expert',
    title: 'ART DIRECTOR',
    desc: 'Foco exclusivo em Design Gráfico, Identidade Visual e Direção de Arte.',
    prompt: 'Adote a persona de um Diretor de Arte Sênior. Sua missão é analisar [BRIEF/CONCEITO] e fornecer uma direção criativa focada estritamente em Design Gráfico, Tipografia, Cores e Composição. IGNORE princípios de UX/UI ou usabilidade de interface; priorize impacto visual, estética e expressão artística.'
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

const App: React.FC = () => {
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [analysis, setAnalysis] = useState<PromptAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'pt-BR' | 'en'>('pt-BR');
  const [showBlueprints, setShowBlueprints] = useState(false);
  
  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);

  // Constants
  const MAX_INPUT_CHARS = 100000;

  // Load History on Mount
  useEffect(() => {
    const saved = localStorage.getItem('orion_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history");
      }
    }
  }, []);

  // Save History when updated
  useEffect(() => {
    localStorage.setItem('orion_history', JSON.stringify(history));
  }, [history]);

  const addToHistory = (result: PromptAnalysis) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      originalPreview: result.originalText.substring(0, 40) + (result.originalText.length > 40 ? '...' : ''),
      optimizedPreview: result.optimizedPrompt.substring(0, 40) + (result.optimizedPrompt.length > 40 ? '...' : ''),
      score: result.score,
      fullAnalysis: result
    };
    setHistory(prev => [newItem, ...prev].slice(0, 20)); // Keep last 20
  };

  const loadFromHistory = (item: HistoryItem) => {
    setAnalysis(item.fullAnalysis);
    setInputPrompt(item.fullAnalysis.originalText);
    setShowHistory(false);
  };

  const confirmPurge = () => {
      setHistory([]);
      localStorage.removeItem('orion_history');
      setShowPurgeConfirm(false);
  }

  const deleteHistoryItem = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const newHistory = history.filter(item => item.id !== id);
      setHistory(newHistory);
  };

  const handleOptimize = async () => {
    if (!inputPrompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await optimizePrompt(inputPrompt, language);
      setAnalysis(result);
      addToHistory(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "SYSTEM FAILURE|Optimization protocol failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (newPrompt: string) => {
    setInputPrompt(newPrompt);
  };

  const loadBlueprint = (templatePrompt: string) => {
      setInputPrompt(templatePrompt);
      setShowBlueprints(false);
  };

  const errorObj = parseError(error);
  const isAuthError = errorObj && (errorObj.title.includes("AUTH") || errorObj.title.includes("KEY"));

  return (
    <div className="min-h-screen bg-grid-pattern relative flex flex-col overflow-hidden">
      {/* Ambient Glows */}
      <div className="fixed top-0 left-0 w-full h-32 bg-gradient-to-b from-[#240046]/50 to-transparent pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-1/2 h-64 bg-[#39ff14]/5 blur-[120px] pointer-events-none z-0" />

      {/* Navbar */}
      <header className="relative z-50 border-b border-[#7b2cbf]/30 bg-black/80 backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#39ff14] clip-path-polygon flex items-center justify-center">
                <span className="text-black font-bold font-header text-lg">P</span>
            </div>
            <h1 className="text-2xl font-header font-bold tracking-widest text-white glitch-hover cursor-default">
              PROMPT <span className="text-[#7b2cbf]">FACTORY</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
             <button 
                onClick={() => setShowHistory(!showHistory)}
                className={`text-xs font-mono-tech border px-3 py-1 rounded transition-all ${showHistory ? 'border-[#39ff14] text-[#39ff14] bg-[#39ff14]/10' : 'border-[#7b2cbf]/50 text-gray-400 hover:text-white'}`}
             >
                MEMORY BANK [{history.length}]
             </button>
             <div className="text-xs font-mono-tech text-[#39ff14] border border-[#39ff14]/30 px-2 py-1 rounded shadow-[0_0_10px_rgba(57,255,20,0.3)]">
                SYS.STATUS: GEMINI 3 PRO [ACTIVE]
             </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-grow flex relative max-w-7xl mx-auto w-full">
        
        {/* Sidebar */}
        <aside className={`fixed top-16 right-0 bottom-0 w-80 bg-black/95 border-l border-[#7b2cbf]/30 backdrop-blur-xl z-40 transform transition-transform duration-300 ${showHistory ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="p-4 border-b border-[#7b2cbf]/30 flex justify-between items-center">
                <h3 className="text-[#39ff14] font-header text-sm">NEURAL MEMORY</h3>
                <button 
                    onClick={() => setShowPurgeConfirm(true)} 
                    disabled={history.length === 0}
                    className="text-[10px] text-red-500 hover:text-white hover:bg-red-500/50 uppercase font-mono-tech tracking-wider border border-red-500/30 px-2 py-1 transition-all"
                >
                    [PURGE]
                </button>
            </div>
            <div className="overflow-y-auto h-[calc(100%-60px)] p-4 space-y-3 custom-scrollbar">
                {history.map(item => (
                    <div 
                        key={item.id} 
                        onClick={() => loadFromHistory(item)}
                        className="p-3 border border-gray-800 bg-gray-900/40 hover:border-[#39ff14] hover:bg-[#39ff14]/5 cursor-pointer transition-all group relative"
                    >
                        <button 
                            onClick={(e) => deleteHistoryItem(e, item.id)}
                            className="absolute top-2 right-2 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 px-2 font-mono-tech font-bold"
                        >
                            X
                        </button>
                        <div className="flex justify-between items-start mb-2">
                            <span className={`text-xs font-bold ${item.score > 80 ? 'text-[#39ff14]' : 'text-yellow-500'}`}>
                                SCORE: {item.score}
                            </span>
                        </div>
                        <p className="text-gray-400 text-[10px] font-mono-tech truncate">
                            IN: {item.originalPreview}
                        </p>
                    </div>
                ))}
            </div>
        </aside>

        <main className="flex-grow p-6 w-full relative z-10">
            {!analysis ? (
            <div className="max-w-4xl mx-auto mt-10 animate-fadeIn">
                <SectionHeader 
                title="Gemini 3 Neural Terminal" 
                subtitle="High-fidelity prompt reconstruction engine powered by Project ORION." 
                />
                
                <CyberPanel className="min-h-[500px] flex flex-col" title="CORE_INPUT_GEMINI_3">
                <textarea
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    maxLength={MAX_INPUT_CHARS}
                    placeholder="// Enter your prompt for deep reasoning optimization..."
                    className="w-full flex-grow bg-transparent border-none outline-none resize-none font-mono-tech text-[#e0e0e0] text-lg leading-relaxed placeholder-gray-600 custom-scrollbar p-2"
                    autoFocus
                />
                <div className="mt-6 flex justify-between items-center border-t border-gray-800 pt-4">
                    <div className="text-xs text-gray-500 font-mono-tech">
                        CAPACITY: <span className={inputPrompt.length > MAX_INPUT_CHARS * 0.9 ? "text-red-500" : "text-[#39ff14]"}>{inputPrompt.length}</span> / {MAX_INPUT_CHARS} CHARS
                    </div>
                    <div className="flex gap-4">
                    <CyberButton variant="secondary" onClick={() => setShowBlueprints(true)}>
                        Blueprints
                    </CyberButton>
                    <CyberButton onClick={handleOptimize} isLoading={loading}>
                        Refine with Gemini 3 Pro
                    </CyberButton>
                    </div>
                </div>
                </CyberPanel>

                <div className="mt-4 flex justify-end">
                    <div className="flex items-center gap-6 px-4 py-2 border border-[#7b2cbf]/20 bg-black/40 backdrop-blur-sm">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input type="radio" checked={language === 'pt-BR'} onChange={() => setLanguage('pt-BR')} className="hidden" />
                            <span className={`text-xs font-mono-tech ${language === 'pt-BR' ? 'text-[#39ff14]' : 'text-gray-500'}`}>PT-BR</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input type="radio" checked={language === 'en'} onChange={() => setLanguage('en')} className="hidden" />
                            <span className={`text-xs font-mono-tech ${language === 'en' ? 'text-[#39ff14]' : 'text-gray-500'}`}>EN-US</span>
                        </label>
                    </div>
                </div>
                
                {errorObj && <CyberAlert title={errorObj.title} message={errorObj.message} onClose={() => setError(null)} />}
            </div>
            ) : (
            <div className="h-full flex flex-col animate-fadeIn">
                <div className="flex justify-between items-end mb-6">
                    <SectionHeader title="Optimization Logic Decoupled" subtitle="Gemini 3 reasoning complete." />
                    <CyberButton variant="secondary" onClick={() => setAnalysis(null)}>Return</CyberButton>
                </div>
                <AnalysisView analysis={analysis} onApply={handleApply} language={language} />
            </div>
            )}
        </main>
      </div>

      <CyberModal isOpen={showBlueprints} onClose={() => setShowBlueprints(false)} title="NEURAL BLUEPRINTS">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              {BLUEPRINTS.map((bp) => (
                  <div key={bp.id} onClick={() => loadBlueprint(bp.prompt)} className="p-4 border border-[#7b2cbf]/30 bg-black/40 hover:border-[#39ff14] cursor-pointer group">
                      <h3 className="text-[#39ff14] font-header text-sm mb-2">{bp.title}</h3>
                      <p className="text-gray-400 text-xs font-mono-tech">{bp.desc}</p>
                  </div>
              ))}
          </div>
      </CyberModal>

      <footer className="border-t border-[#7b2cbf]/30 bg-black py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-gray-600 text-xs font-mono-tech">
            <p>&copy; 2025 PROMPT FACTORY // GEMINI 3 ENGINE</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
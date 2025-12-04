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

  const clearHistory = () => {
      setHistory([]);
      localStorage.removeItem('orion_history');
  }

  const handleOptimize = async () => {
    if (!inputPrompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await optimizePrompt(inputPrompt, language);
      setAnalysis(result);
      addToHistory(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "SYSTEM FAILURE|Optimization protocol failed due to unexpected error.");
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
             <div className="text-xs font-mono-tech text-[#39ff14] border border-[#39ff14]/30 px-2 py-1 rounded">
                SYS.STATUS: ONLINE
             </div>
          </div>
        </div>
      </header>

      {/* Main Layout with Sidebar */}
      <div className="flex-grow flex relative max-w-7xl mx-auto w-full">
        
        {/* History Sidebar */}
        <aside className={`fixed top-16 right-0 bottom-0 w-80 bg-black/95 border-l border-[#7b2cbf]/30 backdrop-blur-xl z-40 transform transition-transform duration-300 ${showHistory ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="p-4 border-b border-[#7b2cbf]/30 flex justify-between items-center">
                <h3 className="text-[#39ff14] font-header text-sm">NEURAL MEMORY</h3>
                <button onClick={clearHistory} className="text-[10px] text-red-500 hover:text-red-400 uppercase font-mono-tech tracking-wider">
                    [PURGE DATA]
                </button>
            </div>
            <div className="overflow-y-auto h-[calc(100%-60px)] p-4 space-y-3 custom-scrollbar">
                {history.length === 0 && (
                    <div className="text-gray-600 text-xs font-mono-tech text-center mt-10">
                        // MEMORY BANKS EMPTY<br/>
                        // INITIATE OPTIMIZATION TO SAVE
                    </div>
                )}
                {history.map(item => (
                    <div 
                        key={item.id} 
                        onClick={() => loadFromHistory(item)}
                        className="p-3 border border-gray-800 bg-gray-900/40 hover:border-[#39ff14] hover:bg-[#39ff14]/5 cursor-pointer transition-all group"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className={`text-xs font-bold ${item.score > 80 ? 'text-[#39ff14]' : 'text-yellow-500'}`}>
                                SCORE: {item.score}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono-tech">
                                {new Date(item.timestamp).toLocaleTimeString()}
                            </span>
                        </div>
                        <p className="text-gray-400 text-[10px] font-mono-tech truncate mb-1">
                            IN: {item.originalPreview}
                        </p>
                        <p className="text-[#e0e0e0] text-[10px] font-mono-tech truncate">
                            OUT: {item.optimizedPreview}
                        </p>
                    </div>
                ))}
            </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-grow p-6 w-full transition-all duration-300 relative z-10">
            {/* Click backdrop to close history on mobile */}
            {showHistory && (
                <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setShowHistory(false)}></div>
            )}

            {!analysis ? (
            <div className="max-w-4xl mx-auto mt-10 animate-fadeIn">
                <SectionHeader 
                title="Core Input Terminal" 
                subtitle="Enter raw prompt data for algorithmic refinement and optimization." 
                />
                
                <CyberPanel className="min-h-[500px] flex flex-col" title="INPUT_STREAM_01">
                <textarea
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    placeholder="// Enter your prompt here for optimization..."
                    className="w-full flex-grow bg-transparent border-none outline-none resize-none font-mono-tech text-[#e0e0e0] text-lg leading-relaxed placeholder-gray-600 custom-scrollbar p-2"
                    autoFocus
                />
                <div className="mt-6 flex justify-between items-center border-t border-gray-800 pt-4">
                    <div className="text-xs text-gray-500 font-mono-tech">
                        {inputPrompt.length} CHARS
                    </div>
                    <div className="flex gap-4">
                    <CyberButton variant="secondary" onClick={() => setShowBlueprints(true)}>
                        Access Blueprints
                    </CyberButton>
                    <CyberButton variant="secondary" onClick={() => setInputPrompt('')}>
                        Clear Buffer
                    </CyberButton>
                    <CyberButton onClick={handleOptimize} isLoading={loading}>
                        Initiate Optimization
                    </CyberButton>
                    </div>
                </div>
                </CyberPanel>

                {/* Language Selector Component */}
                <div className="mt-4 flex justify-end">
                    <div className="flex items-center gap-6 px-4 py-2 border border-[#7b2cbf]/20 bg-black/40 backdrop-blur-sm">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div className="relative w-4 h-4 flex items-center justify-center">
                                <input 
                                    type="radio" 
                                    name="lang_select" 
                                    value="pt-BR"
                                    checked={language === 'pt-BR'}
                                    onChange={() => setLanguage('pt-BR')}
                                    className="peer appearance-none w-full h-full border border-[#7b2cbf] rounded-full checked:border-[#39ff14] checked:shadow-[0_0_8px_#39ff14] transition-all cursor-pointer"
                                />
                                <div className="absolute w-2 h-2 bg-[#39ff14] rounded-full opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"></div>
                            </div>
                            <span className={`text-xs font-mono-tech tracking-wide transition-colors ${language === 'pt-BR' ? 'text-[#e0e0e0]' : 'text-gray-500 group-hover:text-gray-400'}`}>
                                Português (Brasil)
                            </span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div className="relative w-4 h-4 flex items-center justify-center">
                                <input 
                                    type="radio" 
                                    name="lang_select" 
                                    value="en"
                                    checked={language === 'en'}
                                    onChange={() => setLanguage('en')}
                                    className="peer appearance-none w-full h-full border border-[#7b2cbf] rounded-full checked:border-[#39ff14] checked:shadow-[0_0_8px_#39ff14] transition-all cursor-pointer"
                                />
                                <div className="absolute w-2 h-2 bg-[#39ff14] rounded-full opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"></div>
                            </div>
                            <span className={`text-xs font-mono-tech tracking-wide transition-colors ${language === 'en' ? 'text-[#e0e0e0]' : 'text-gray-500 group-hover:text-gray-400'}`}>
                                English
                            </span>
                        </label>
                    </div>
                </div>
                
                {errorObj && (
                    <div className="mt-4 animate-fadeIn">
                        <CyberAlert 
                            title={errorObj.title}
                            message={errorObj.message} 
                            onClose={() => setError(null)} 
                        />
                        {isAuthError && (
                            <div className="mt-2 flex justify-center p-2 bg-red-900/10 border border-red-500/20">
                                <a 
                                    href="https://aistudio.google.com/app/apikey" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-[#39ff14] text-sm font-mono-tech underline hover:text-white flex items-center gap-2"
                                >
                                    <span>[!]</span>
                                    <span>CLICK HERE TO GENERATE/COPY YOUR GEMINI API KEY</span>
                                    <span>&gt;&gt;</span>
                                </a>
                            </div>
                        )}
                    </div>
                )}
                
                {/* Quick Tips / Decor */}
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { title: "Define Persona", desc: "Atribua papéis de especialista ao modelo." },
                        { title: "Chain of Thought", desc: "Guie o modelo a pensar passo a passo." },
                        { title: "Constraint Setting", desc: "Defina explicitamente restrições negativas." }
                    ].map((tip, i) => (
                        <div key={i} className="border border-gray-800 p-4 bg-black/40">
                            <h5 className="text-[#39ff14] font-header text-xs mb-1 uppercase">{tip.title}</h5>
                            <p className="text-gray-500 text-xs font-mono-tech">{tip.desc}</p>
                        </div>
                    ))}
                </div>

            </div>
            ) : (
            <div className="h-full flex flex-col animate-fadeIn">
                <div className="flex justify-between items-end mb-6">
                    <SectionHeader 
                    title="Analysis Protocol Complete" 
                    subtitle="Review optimized logic and simulation results below." 
                    />
                    <CyberButton variant="secondary" onClick={() => setAnalysis(null)} className="mb-6">
                        Return to Terminal
                    </CyberButton>
                </div>
                
                <div className="flex-grow">
                    <AnalysisView analysis={analysis} onApply={handleApply} language={language} />
                </div>
            </div>
            )}
        </main>
      </div>

      {/* Neural Blueprints Modal */}
      <CyberModal 
          isOpen={showBlueprints} 
          onClose={() => setShowBlueprints(false)} 
          title="NEURAL BLUEPRINTS LIBRARY"
      >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              {BLUEPRINTS.map((bp) => (
                  <div 
                      key={bp.id}
                      onClick={() => loadBlueprint(bp.prompt)}
                      className="p-4 border border-[#7b2cbf]/30 bg-black/40 hover:bg-[#7b2cbf]/10 hover:border-[#39ff14] cursor-pointer transition-all group"
                  >
                      <h3 className="text-[#39ff14] font-header text-sm mb-2 group-hover:text-white transition-colors">
                          {bp.title}
                      </h3>
                      <p className="text-gray-400 text-xs font-mono-tech mb-3">
                          {bp.desc}
                      </p>
                      <div className="text-[10px] text-[#7b2cbf] font-mono-tech uppercase tracking-wider group-hover:text-[#39ff14]">
                          &gt;&gt; INJECT PROTOCOL
                      </div>
                  </div>
              ))}
          </div>
      </CyberModal>

      {/* Footer */}
      <footer className="border-t border-[#7b2cbf]/30 bg-black py-4 mt-auto relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
            <p className="text-gray-600 text-xs font-mono-tech">
                &copy; 2025 PROMPT FACTORY // SECURE CONNECTION
            </p>
            <div className="flex gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse delay-75"></div>
                <div className="w-2 h-2 bg-[#39ff14] rounded-full animate-pulse delay-150"></div>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
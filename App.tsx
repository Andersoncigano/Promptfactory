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
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  
  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const MAX_INPUT_CHARS = 100000;

  // Key Selection Check
  useEffect(() => {
    const checkKey = async () => {
      try {
          const aistudio = (window as any).aistudio;
          const hasKey = !!process.env.API_KEY || (aistudio?.hasSelectedApiKey ? await aistudio.hasSelectedApiKey() : false);
          setIsAuthorized(hasKey);
      } catch (e) {
          console.error("Auth check failed", e);
      } finally {
          setCheckingAuth(false);
      }
    };
    checkKey();
  }, []);

  useEffect(() => {
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

  const handleOpenKeyPicker = async () => {
      const aistudio = (window as any).aistudio;
      if (aistudio?.openSelectKey) {
          await aistudio.openSelectKey();
          setIsAuthorized(true); // Assume success per guidelines to avoid race condition
          setError(null);
      } else {
          setError("INTERFACE ERROR|Não foi possível abrir o seletor de chaves. Certifique-se de que está em um ambiente compatível.");
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
      setAnalysis(result);
      addToHistory(result);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "SYSTEM FAILURE|Protocolo de otimização falhou.";
      setError(errMsg);
      
      // Handle the "Requested entity not found" or auth missing by forcing re-auth
      if (errMsg.toLowerCase().includes("not found") || errMsg.toLowerCase().includes("api key is missing")) {
          setIsAuthorized(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const errorObj = parseError(error);
  const isAuthError = errorObj && (errorObj.title.includes("AUTH") || errorObj.title.includes("KEY") || errorObj.title.includes("CONFIGURATION") || errorObj.title.includes("ENTITY NOT FOUND"));

  if (checkingAuth) {
      return (
          <div className="min-h-screen bg-[#050505] flex items-center justify-center font-mono-tech text-[#39ff14]">
              <div className="animate-pulse tracking-[0.2em]">INITIALIZING_NEURAL_LINK...</div>
          </div>
      );
  }

  if (!isAuthorized) {
      return (
          <div className="min-h-screen bg-[#050505] bg-grid-pattern flex items-center justify-center p-6">
              <div className="max-w-md w-full animate-fadeIn">
                  <CyberPanel title="ENCRYPTION_LOCK">
                      <div className="text-center py-6">
                          <div className="w-16 h-16 border-2 border-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                              <span className="text-red-500 font-bold text-3xl">!</span>
                          </div>
                          <h2 className="text-xl font-header text-white mb-4 tracking-widest uppercase">Acesso Negado</h2>
                          <p className="text-gray-400 text-sm font-mono-tech mb-8 leading-relaxed">
                              O motor <span className="text-[#39ff14]">Gemini 3 Pro</span> exige autorização de uma chave de API válida de um projeto pago (billing enabled).
                          </p>
                          <div className="space-y-4">
                              <CyberButton onClick={handleOpenKeyPicker} className="w-full">
                                  CONECTAR LINK NEURAL
                              </CyberButton>
                              <a 
                                  href="https://ai.google.dev/gemini-api/docs/billing" 
                                  target="_blank" 
                                  className="block text-[10px] text-[#7b2cbf] hover:text-[#39ff14] transition-colors font-mono-tech uppercase"
                              >
                                  Saiba mais sobre faturamento e API
                              </a>
                          </div>
                      </div>
                  </CyberPanel>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-grid-pattern relative flex flex-col overflow-hidden">
      <div className="fixed top-0 left-0 w-full h-32 bg-gradient-to-b from-[#240046]/50 to-transparent pointer-events-none z-0" />
      <header className="relative z-50 border-b border-[#7b2cbf]/30 bg-black/80 backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#39ff14] clip-path-polygon flex items-center justify-center">
                <span className="text-black font-bold font-header text-lg">P</span>
            </div>
            <h1 className="text-2xl font-header font-bold tracking-widest text-white">
              PROMPT <span className="text-[#7b2cbf]">FACTORY</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => setShowHistory(!showHistory)} className="text-xs font-mono-tech border border-[#7b2cbf]/50 px-3 py-1 rounded text-gray-400 hover:text-white transition-colors">
                MEMÓRIA [{history.length}]
             </button>
             <div className="text-xs font-mono-tech text-[#39ff14] border border-[#39ff14]/30 px-2 py-1 rounded shadow-[0_0_10px_rgba(57,255,20,0.3)]">
                CORE: GEMINI 3 PRO [ON]
             </div>
          </div>
        </div>
      </header>

      <div className="flex-grow flex relative max-w-7xl mx-auto w-full">
        {/* History Sidebar */}
        <aside className={`fixed top-16 right-0 bottom-0 w-80 bg-black/95 border-l border-[#7b2cbf]/30 backdrop-blur-xl z-40 transform transition-transform duration-300 ${showHistory ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="p-4 border-b border-[#7b2cbf]/30 flex justify-between items-center">
                <h3 className="text-[#39ff14] font-header text-sm tracking-widest">NEURAL BANK</h3>
                <button onClick={() => setHistory([])} className="text-[10px] text-red-500 font-mono-tech uppercase border border-red-500/30 px-2 py-1 hover:bg-red-500 hover:text-white transition-all">LIMPAR</button>
            </div>
            <div className="overflow-y-auto h-[calc(100%-60px)] p-4 space-y-3 custom-scrollbar">
                {history.length === 0 ? (
                    <p className="text-gray-600 text-xs font-mono-tech italic text-center mt-10">Nenhum registro encontrado.</p>
                ) : (
                    history.map(item => (
                        <div key={item.id} onClick={() => {setAnalysis(item.fullAnalysis); setInputPrompt(item.fullAnalysis.originalText); setShowHistory(false);}} className="p-3 border border-gray-800 bg-gray-900/40 hover:border-[#39ff14] cursor-pointer transition-all">
                            <div className="flex justify-between items-start mb-2"><span className="text-[#39ff14] text-xs font-bold font-mono-tech">SCORE: {item.score}</span></div>
                            <p className="text-gray-400 text-[10px] font-mono-tech truncate">PROMPT: {item.originalPreview}</p>
                        </div>
                    ))
                )}
            </div>
        </aside>

        <main className="flex-grow p-6 w-full relative z-10">
            {!analysis ? (
            <div className="max-w-4xl mx-auto mt-10 animate-fadeIn">
                <SectionHeader title="Gemini 3 Neural Terminal" subtitle="Otimização de alta fidelidade com processamento de raciocínio profundo." />
                <CyberPanel className="min-h-[500px] flex flex-col" title="CORE_INPUT_GEMINI_3">
                    <textarea
                        value={inputPrompt}
                        onChange={(e) => setInputPrompt(e.target.value)}
                        maxLength={MAX_INPUT_CHARS}
                        placeholder="// Insira seu prompt para reconstrução lógica..."
                        className="w-full flex-grow bg-transparent border-none outline-none resize-none font-mono-tech text-[#e0e0e0] text-lg leading-relaxed custom-scrollbar p-2"
                        autoFocus
                    />
                    <div className="mt-6 flex justify-between items-center border-t border-gray-800 pt-4">
                        <div className="text-xs text-gray-500 font-mono-tech">BITS: {inputPrompt.length} / {MAX_INPUT_CHARS}</div>
                        <div className="flex gap-4">
                            <CyberButton variant="secondary" onClick={() => setShowBlueprints(true)}>Blueprints</CyberButton>
                            <CyberButton onClick={handleOptimize} isLoading={loading}>Refinar com Gemini 3</CyberButton>
                        </div>
                    </div>
                </CyberPanel>
                <div className="mt-4 flex justify-end gap-4 px-4 py-2 border border-[#7b2cbf]/20 bg-black/40 backdrop-blur-sm">
                    <button onClick={() => setLanguage('pt-BR')} className={`text-xs font-mono-tech transition-colors ${language === 'pt-BR' ? 'text-[#39ff14]' : 'text-gray-500 hover:text-gray-300'}`}>PT-BR</button>
                    <button onClick={() => setLanguage('en')} className={`text-xs font-mono-tech transition-colors ${language === 'en' ? 'text-[#39ff14]' : 'text-gray-500 hover:text-gray-300'}`}>EN-US</button>
                </div>
                {errorObj && (
                    <div className="mt-4">
                        <CyberAlert title={errorObj.title} message={errorObj.message} onClose={() => setError(null)} />
                        {isAuthError && (
                            <div className="mt-2 p-3 bg-red-900/10 border border-red-500/20 text-center animate-pulse">
                                <button onClick={handleOpenKeyPicker} className="text-[#39ff14] text-xs font-header tracking-widest hover:underline">
                                    [ RENOVAR LINK NEURAL ]
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
            ) : (
            <div className="h-full flex flex-col animate-fadeIn">
                <div className="flex justify-between items-end mb-6">
                    <SectionHeader title="Protocolo de Otimização Concluído" subtitle="Raciocínio lógico do Gemini 3 finalizado." />
                    <CyberButton variant="secondary" onClick={() => setAnalysis(null)}>Voltar ao Terminal</CyberButton>
                </div>
                <AnalysisView analysis={analysis} onApply={(p) => {setInputPrompt(p); setAnalysis(null);}} language={language} />
            </div>
            )}
        </main>
      </div>

      <CyberModal isOpen={showBlueprints} onClose={() => setShowBlueprints(false)} title="NEURAL BLUEPRINTS">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              {BLUEPRINTS.map((bp) => (
                  <div key={bp.id} onClick={() => {setInputPrompt(bp.prompt); setShowBlueprints(false);}} className="p-4 border border-[#7b2cbf]/30 bg-black/40 hover:border-[#39ff14] cursor-pointer transition-all group">
                      <h3 className="text-[#39ff14] font-header text-sm mb-2 group-hover:glitch-hover">{bp.title}</h3>
                      <p className="text-gray-400 text-xs font-mono-tech leading-relaxed">{bp.desc}</p>
                  </div>
              ))}
          </div>
      </CyberModal>
    </div>
  );
};

export default App;
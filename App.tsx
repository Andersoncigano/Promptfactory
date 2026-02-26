
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { optimizePrompt, checkConnection } from './services/geminiService.ts';
import { PromptAnalysis, HistoryItem } from './types.ts';
import { CyberButton, CyberPanel, SectionHeader, CyberAlert, CyberModal } from './components/CyberComponents.tsx';
import { AnalysisView } from './components/AnalysisView.tsx';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [analysis, setAnalysis] = useState<PromptAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'pt-BR' | 'en'>('pt-BR');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [kernelStatus, setKernelStatus] = useState<'CONNECTING' | 'ONLINE' | 'OFFLINE'>('CONNECTING');
  
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const initKernel = async (skipAuthCheck = false) => {
    console.log("[ORION_SYS]: Sequência de boot iniciada...");
    if (typeof window !== 'undefined' && (window as any).aistudio) {
      try {
        let hasKey = true;
        if (!skipAuthCheck) {
          hasKey = await (window as any).aistudio.hasSelectedApiKey();
          setIsAuthenticated(hasKey);
        }
        
        if (hasKey) {
          const alive = await checkConnection();
          setKernelStatus(alive ? 'ONLINE' : 'OFFLINE');
        } else {
          setKernelStatus('OFFLINE');
        }
      } catch (e) {
        console.error("[ORION_SYS]: Erro no boot:", e);
        setKernelStatus('OFFLINE');
      }
    }
  };

  useEffect(() => {
    initKernel();
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
    if (!inputPrompt.trim() || loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await optimizePrompt(inputPrompt, language);
      if (result) {
        setAnalysis(result);
        const newItem: HistoryItem = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          originalPreview: result.originalText.substring(0, 40) + "...",
          optimizedPreview: result.optimizedPrompt.substring(0, 40) + "...",
          score: result.score,
          fullAnalysis: result
        };
        setHistory(prev => [newItem, ...prev]);
      }
    } catch (err: any) {
      const parts = err.message.split('|');
      const errorMessage = parts[1] || parts[0];
      setError(errorMessage);
      
      if (err.message.includes("AUTH_FAILURE")) {
        setIsAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenKeySelector = async () => {
    console.log("[ORION_SYS]: Solicitando seletor de chaves...");
    if (typeof window !== 'undefined' && (window as any).aistudio) {
      try {
        await (window as any).aistudio.openSelectKey();
        console.log("[ORION_SYS]: Seletor aberto. Assumindo sucesso...");
        setIsAuthenticated(true);
        initKernel(true); 
      } catch (e) {
        console.error("[ORION_SYS]: Erro ao abrir seletor:", e);
        setError("Falha ao abrir o seletor de chaves. Tente recarregar a página.");
      }
    } else {
      console.error("[ORION_SYS]: API do AI Studio não detectada.");
      setError("Ambiente AI Studio não detectado. Certifique-se de estar usando o preview oficial.");
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#e0e0e0] font-mono-tech">
      <div className="fixed inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>
      
      <header className="relative z-10 border-b border-[#7b2cbf]/30 bg-black/80 p-4 sticky top-0 backdrop-blur-md flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#39ff14] clip-path-polygon flex items-center justify-center text-black font-bold shadow-[0_0_10px_#39ff14]">O</div>
          <h1 className="text-lg font-header tracking-tighter text-white">ORION_IDE</h1>
        </div>
        
        <div className="flex gap-4 items-center">
           <div className="flex items-center gap-2 px-3 py-1 border border-[#7b2cbf]/30 bg-black/40">
             <div className={`w-2 h-2 rounded-full ${kernelStatus === 'ONLINE' ? 'bg-[#39ff14] animate-pulse' : kernelStatus === 'CONNECTING' ? 'bg-yellow-500' : 'bg-red-600'}`}></div>
             <span className="text-[10px] text-gray-400 uppercase tracking-widest">{kernelStatus}</span>
           </div>
           {kernelStatus === 'OFFLINE' && (
             <button 
               onClick={() => handleOpenKeySelector()}
               className="text-[10px] text-[#39ff14] border border-[#39ff14]/30 px-2 py-1 hover:bg-[#39ff14]/10"
             >
               RECONECTAR
             </button>
           )}
           <select value={language} onChange={e => setLanguage(e.target.value as any)} className="bg-black border border-[#7b2cbf]/50 text-[#39ff14] px-2 py-1 text-[10px]">
             <option value="pt-BR">POR_BR</option>
             <option value="en">ENG_US</option>
           </select>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto p-6">
        {error && <CyberAlert title="KERNEL_REPORT" message={error} onClose={() => setError(null)} />}

        {analysis ? (
          <AnalysisView analysis={analysis} language={language} variables={variables} onBack={() => setAnalysis(null)} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8">
              <CyberPanel title="NEURAL_EDITOR">
                <div className="relative">
                  <textarea 
                    ref={editorRef}
                    value={inputPrompt}
                    onChange={e => setInputPrompt(e.target.value)}
                    placeholder="Cole seu prompt aqui para iniciar a reconstrução neural (Gemini 3 Flash)..."
                    className="w-full h-[500px] bg-black/20 border-none outline-none resize-none p-4 text-[#39ff14] text-lg font-mono-tech custom-scrollbar"
                  />
                  {loading && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20">
                      <div className="w-16 h-16 border-4 border-t-[#39ff14] border-transparent rounded-full animate-spin"></div>
                      <p className="text-[#39ff14] text-xs mt-4 animate-pulse uppercase tracking-[0.3em]">Otimizando fluxo neural...</p>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex justify-between items-center pt-4 border-t border-[#7b2cbf]/20">
                  <div className="text-[10px] text-gray-500 uppercase">
                    {detectedVars.length > 0 ? `Variáveis: ${detectedVars.join(', ')}` : 'Aguardando Intenção'}
                  </div>
                  <CyberButton onClick={handleOptimize} isLoading={loading} disabled={!inputPrompt.trim()}>
                    RECONSTRUIR_PROMPT
                  </CyberButton>
                </div>
              </CyberPanel>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <SectionHeader title="VARIÁVEIS" subtitle="Inputs do Usuário" />
              <CyberPanel className="min-h-[200px]">
                {detectedVars.map(v => (
                  <div key={v} className="mb-4">
                    <label className="text-[9px] text-[#7b2cbf] font-bold block mb-1">{v}</label>
                    <input 
                      type="text" 
                      value={variables[v] || ''} 
                      onChange={e => setVariables(prev => ({...prev, [v]: e.target.value}))}
                      className="w-full bg-black/40 border border-[#7b2cbf]/30 p-2 text-xs text-[#39ff14] outline-none focus:border-[#39ff14]"
                    />
                  </div>
                ))}
                {detectedVars.length === 0 && <p className="text-gray-600 text-[10px] text-center italic">Use [CHAVES] para mapear campos.</p>}
              </CyberPanel>
              
              <div className="p-4 border border-[#39ff14]/20 bg-[#39ff14]/5">
                <h4 className="text-[#39ff14] text-[10px] font-bold mb-2">SISTEMA_ORION</h4>
                <p className="text-[9px] text-gray-500 leading-tight">
                  Operando em modo de compatibilidade Gemini 3 Flash. Funciona com qualquer API Key válida do Google AI Studio.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {!isAuthenticated && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-6">
           <CyberPanel title="SISTEMA_BLOQUEADO" className="max-w-md w-full text-center">
              <h2 className="text-[#39ff14] font-header text-xl mb-4 tracking-widest">ACESSO_NEGADO</h2>
              <p className="text-gray-400 text-xs mb-4 uppercase tracking-tighter">
                O Project Orion exige uma chave de API válida para interagir com os modelos Gemini. 
                Sua chave será armazenada apenas nesta sessão.
              </p>
              <div className="mb-8 p-3 border border-yellow-500/30 bg-yellow-500/5 text-[10px] text-yellow-500/80 uppercase">
                Atenção: Use uma chave de um projeto com faturamento ativado.
                <a 
                  href="https://ai.google.dev/gemini-api/docs/billing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block mt-1 underline hover:text-yellow-400"
                >
                  Documentação de Faturamento
                </a>
              </div>
              <CyberButton onClick={handleOpenKeySelector}>AUTENTICAR_SISTEMA</CyberButton>
           </CyberPanel>
        </div>
      )}
    </div>
  );
};

export default App;


import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { optimizePrompt, generatePreview } from './services/geminiService.ts';
import { PromptAnalysis, HistoryItem } from './types.ts';
import { CyberButton, CyberPanel, SectionHeader, CyberStatCard, CyberAlert, CyberModal } from './components/CyberComponents.tsx';

// --- COMPONENTE DE ANÁLISE INTEGRADO (Para evitar falhas de importação) ---
const replaceVariables = (text: string, vars: Record<string, string>) => {
  let result = text;
  Object.entries(vars).forEach(([key, value]) => {
    const val = value || `[MISSING_${key}]`;
    const regex = new RegExp(`\\[${key}\\]|\\{\\{${key}\\}\\}|<${key}>`, 'gi');
    result = result.replace(regex, val);
  });
  return result;
};

const AnalysisView: React.FC<{
  analysis: PromptAnalysis;
  variables: Record<string, string>;
  onBack: () => void;
  language: 'pt-BR' | 'en';
}> = ({ analysis, variables, onBack, language }) => {
  const [activeTab, setActiveTab] = useState<'optimized' | 'benchmark' | 'code'>('optimized');
  const [benchResults, setBenchResults] = useState<{ original: string; optimized: string } | null>(null);
  const [loadingBench, setLoadingBench] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runBenchmark = async () => {
    setLoadingBench(true);
    setError(null);
    try {
      const originalWithVars = replaceVariables(analysis.originalText, variables);
      const optimizedWithVars = replaceVariables(analysis.optimizedPrompt, variables);
      const [resOrig, resOpt] = await Promise.all([
        generatePreview(originalWithVars),
        generatePreview(optimizedWithVars)
      ]);
      setBenchResults({ original: resOrig, optimized: resOpt });
      setActiveTab('benchmark');
    } catch (e: any) {
      setError(e.message || "BENCHMARK_FAILURE");
    } finally {
      setLoadingBench(false);
    }
  };

  const codeSnippet = `
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function execute() {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: \`${replaceVariables(analysis.optimizedPrompt, variables).replace(/`/g, '\\`')}\`,
    config: { temperature: 0.7, thinkingConfig: { thinkingBudget: 16384 } }
  });
  console.log(response.text);
}
  `.trim();

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <CyberButton variant="secondary" className="text-xs py-2" onClick={onBack}>
          [RETORNAR_AO_EDITOR]
        </CyberButton>
        <div className="flex bg-black/40 border border-[#7b2cbf]/30 p-1 clip-path-polygon">
          {['optimized', 'benchmark', 'code'].map((tab) => (
            <button
              key={tab}
              onClick={() => tab === 'benchmark' ? runBenchmark() : setActiveTab(tab as any)}
              className={`px-4 py-1 text-[10px] font-header transition-all ${
                activeTab === tab ? 'bg-[#39ff14] text-black' : 'text-[#7b2cbf] hover:text-[#39ff14]'
              }`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-4">
          <CyberStatCard label="Eficiência" value={`${analysis.score}%`} variant={analysis.score > 85 ? 'success' : 'normal'} />
          <CyberPanel title="DIAGNÓSTICO">
            <div className="text-[10px] space-y-4 font-mono-tech">
              <div>
                <span className="text-[#7b2cbf] block border-b border-[#7b2cbf]/20 mb-1">CRÍTICA</span>
                <p className="text-gray-400 italic leading-relaxed">{analysis.critique}</p>
              </div>
              <div>
                <span className="text-[#39ff14] block border-b border-[#39ff14]/20 mb-1">TÉCNICAS</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {analysis.techniquesUsed.map(t => (
                    <span key={t} className="bg-[#39ff14]/10 border border-[#39ff14]/30 px-1 text-[8px]">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </CyberPanel>
        </div>

        <div className="lg:col-span-3 min-h-[500px]">
          <CyberPanel className="h-full relative overflow-hidden">
            {loadingBench && (
              <div className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-2 border-t-[#39ff14] border-transparent rounded-full animate-spin"></div>
                <p className="text-[#39ff14] text-[10px] mt-4 font-mono-tech animate-pulse">EXECUTANDO_BENCHMARK_NEURAL...</p>
              </div>
            )}
            
            {activeTab === 'optimized' && (
              <div className="p-2 h-full flex flex-col">
                <div className="flex-grow bg-black/20 p-4 font-mono-tech text-[#39ff14] text-sm whitespace-pre-wrap overflow-y-auto custom-scrollbar border border-[#39ff14]/5">
                  {analysis.optimizedPrompt}
                </div>
                <div className="mt-4 flex justify-end">
                  <CyberButton variant="secondary" className="text-[10px]" onClick={() => {
                    navigator.clipboard.writeText(analysis.optimizedPrompt);
                  }}>COPIAR_PROMPT</CyberButton>
                </div>
              </div>
            )}

            {activeTab === 'benchmark' && benchResults && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full p-2">
                <div className="flex flex-col h-full">
                  <span className="text-[9px] text-gray-500 mb-1 font-header">SOURCE_RESPONSE</span>
                  <div className="flex-grow bg-black/60 p-3 text-[10px] text-gray-400 italic overflow-auto border border-gray-800">
                    {benchResults.original}
                  </div>
                </div>
                <div className="flex flex-col h-full">
                  <span className="text-[9px] text-[#39ff14] mb-1 font-header">OPTIMIZED_RESPONSE</span>
                  <div className="flex-grow bg-black/80 p-3 text-[10px] text-[#e0e0e0] overflow-auto border border-[#39ff14]/20">
                    {benchResults.optimized}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'code' && (
              <div className="p-2 h-full flex flex-col">
                <span className="text-[9px] text-[#7b2cbf] mb-2 font-header">INTEGRATION_MODULE</span>
                <pre className="flex-grow bg-black p-4 text-[11px] text-blue-400 font-mono-tech overflow-auto border border-blue-900/30">
                  {codeSnippet}
                </pre>
                <div className="mt-4 flex justify-end">
                  <CyberButton variant="secondary" className="text-[10px]" onClick={() => navigator.clipboard.writeText(codeSnippet)}>COPIAR_SKELETON</CyberButton>
                </div>
              </div>
            )}
          </CyberPanel>
        </div>
      </div>
    </div>
  );
};

// --- APP PRINCIPAL ---
const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true); // Inicialização otimista
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [analysis, setAnalysis] = useState<PromptAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'pt-BR' | 'en'>('en');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

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
      setError(err.message || "NEURAL_LINK_FAILURE");
      if (err.message?.includes("AUTH FAILURE") || err.message?.includes("entity was not found")) {
        setIsAuthenticated(false);
      }
    } finally {
      setLoading(false);
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
        {error && <CyberAlert message={error} onClose={() => setError(null)} />}

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
                    value={inputPrompt}
                    onChange={e => setInputPrompt(e.target.value)}
                    placeholder="Enter prompt template... use [VARIABLES] to map inputs."
                    className="w-full h-[500px] bg-black/20 border-none outline-none resize-none p-4 text-[#39ff14] text-lg placeholder-[#39ff14]/10 custom-scrollbar font-mono-tech transition-all focus:bg-black/40"
                  />
                  <div className="absolute bottom-4 right-4 text-[8px] text-gray-700 font-mono-tech uppercase">
                    Kernel_Ready // Chars: {inputPrompt.length}
                  </div>
                </div>
                <div className="mt-4 flex justify-between items-center border-t border-[#7b2cbf]/20 pt-4">
                  <div className="text-[10px] text-gray-500 font-mono-tech">
                    {detectedVars.length > 0 ? `VARS_DETECTED: ${detectedVars.join(', ')}` : 'READY_FOR_INPUT'}
                  </div>
                  <CyberButton onClick={handleOptimize} isLoading={loading} disabled={!inputPrompt.trim()}>
                    INICIAR_OTIMIZAÇÃO
                  </CyberButton>
                </div>
              </CyberPanel>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <SectionHeader title="VARIÁVEIS" subtitle="Mapeamento de Injeção" />
              <CyberPanel className="min-h-[200px]">
                {detectedVars.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <span className="text-[#7b2cbf] text-3xl mb-2 opacity-50">{}</span>
                    <p className="text-gray-600 text-[10px] italic">
                      Use colchetes [COMO_ESTE] no texto para mapear campos de teste.
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
                          placeholder={`Valor para ${v}...`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CyberPanel>

              <SectionHeader title="SISTEMA" subtitle="Status do Kernel" />
              <div className="grid grid-cols-2 gap-2">
                 <div className="bg-black/40 border border-[#7b2cbf]/20 p-2 text-center">
                    <span className="text-[8px] text-gray-500 block uppercase">Latência</span>
                    <span className="text-[#39ff14] text-xs">0.42ms</span>
                 </div>
                 <div className="bg-black/40 border border-[#7b2cbf]/20 p-2 text-center">
                    <span className="text-[8px] text-gray-500 block uppercase">Modelo</span>
                    <span className="text-[#39ff14] text-xs">G-PRO-3</span>
                 </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <CyberModal isOpen={showHistory} onClose={() => setShowHistory(false)} title="LOGS_DE_OTIMIZAÇÃO">
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {history.length === 0 ? (
            <p className="text-center text-gray-600 py-8 text-xs italic">Nenhum log encontrado no buffer.</p>
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
           <CyberPanel title="CREDENTIAL_FAILURE" className="max-w-md w-full">
              <div className="text-center py-8">
                 <h2 className="text-[#39ff14] font-header text-xl mb-4">ACESSO_NEGADO</h2>
                 <p className="text-gray-400 text-xs mb-8">
                    O Orion Core detectou que sua Chave de API expirou ou é inválida. 
                    Chaves pagas do Google Cloud são necessárias para acesso ao Gemini 3.
                 </p>
                 <CyberButton onClick={async () => {
                    if ((window as any).aistudio) await (window as any).aistudio.openSelectKey();
                    setIsAuthenticated(true);
                 }}>SELECIONAR_NOVA_CHAVE</CyberButton>
              </div>
           </CyberPanel>
        </div>
      )}
    </div>
  );
};

export default App;

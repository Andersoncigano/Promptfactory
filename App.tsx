import React, { useState } from 'react';
import { optimizePrompt } from './services/geminiService';
import { PromptAnalysis } from './types';
import { CyberButton, CyberPanel, SectionHeader } from './components/CyberComponents';
import { AnalysisView } from './components/AnalysisView';

const App: React.FC = () => {
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [analysis, setAnalysis] = useState<PromptAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'pt-BR' | 'en'>('pt-BR');

  const handleOptimize = async () => {
    if (!inputPrompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await optimizePrompt(inputPrompt, language);
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "System Malfunction: Optimization Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (newPrompt: string) => {
    setInputPrompt(newPrompt);
    // Optional: clear analysis to return to edit mode, or keep it.
    // setAnalysis(null); 
  };

  return (
    <div className="min-h-screen bg-grid-pattern relative flex flex-col">
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
             <div className="text-xs font-mono-tech text-[#39ff14] border border-[#39ff14]/30 px-2 py-1 rounded">
                SYS.STATUS: ONLINE
             </div>
             <div className="text-xs font-mono-tech text-gray-500">
                PROJECT ORION v1.0
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-grow p-6 max-w-7xl mx-auto w-full">
        
        {!analysis ? (
          <div className="max-w-4xl mx-auto mt-10">
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
            
            {error && (
                <div className="mt-4 p-4 border border-red-500 bg-red-900/20 text-red-400 font-mono-tech text-sm">
                    ERROR: {error}
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
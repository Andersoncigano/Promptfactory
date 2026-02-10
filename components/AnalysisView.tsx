
import React, { useState } from 'react';
import { PromptAnalysis } from '../types.ts';
import { CyberPanel, CyberButton, CyberStatCard, CyberAlert } from './CyberComponents.tsx';
import { generatePreview } from '../services/geminiService.ts';

interface AnalysisViewProps {
  analysis: PromptAnalysis;
  variables: Record<string, string>;
  onBack: () => void;
  language: 'pt-BR' | 'en';
}

const replaceVariables = (text: string, vars: Record<string, string>) => {
  let result = text;
  Object.entries(vars).forEach(([key, value]) => {
    const val = value || `[MISSING_${key}]`;
    const regex = new RegExp(`\\[${key}\\]|\\{\\{${key}\\}\\}|<${key}>`, 'gi');
    result = result.replace(regex, val);
  });
  return result;
};

export const AnalysisView: React.FC<AnalysisViewProps> = ({ analysis, variables, onBack, language }) => {
  const [activeTab, setActiveTab] = useState<'optimized' | 'benchmark' | 'code'>('optimized');
  const [benchResults, setBenchResults] = useState<{ original: string; optimized: string } | null>(null);
  const [loadingBench, setLoadingBench] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runBenchmark = async () => {
    if (loadingBench) return;
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
      setError(e.message || "BENCHMARK_ERROR|Neural paths cross-interference.");
    } finally {
      setLoadingBench(false);
    }
  };

  const codeSnippet = `
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function runPrompt() {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: \`${replaceVariables(analysis.optimizedPrompt, variables).replace(/`/g, '\\`')}\`,
    config: {
      temperature: 0.7,
      topP: 0.95,
      thinkingConfig: { thinkingBudget: 16384 }
    }
  });
  console.log(response.text);
}
  `.trim();

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <CyberButton variant="secondary" className="py-2 px-4 text-xs" onClick={onBack}>
          &lt; RE-ENGAGE_EDITOR
        </CyberButton>
        <div className="flex gap-2 bg-black/40 border border-[#7b2cbf]/30 p-1">
          <button 
            className={`px-3 py-1 text-[10px] font-header transition-all ${activeTab === 'optimized' ? 'bg-[#39ff14] text-black' : 'text-[#7b2cbf] hover:text-[#39ff14]'}`}
            onClick={() => setActiveTab('optimized')}
          >CORE_SPEC</button>
          <button 
            className={`px-3 py-1 text-[10px] font-header transition-all ${activeTab === 'benchmark' ? 'bg-[#39ff14] text-black' : 'text-[#7b2cbf] hover:text-[#39ff14]'}`}
            onClick={runBenchmark}
          >NEURAL_BENCHMARK</button>
          <button 
            className={`px-3 py-1 text-[10px] font-header transition-all ${activeTab === 'code' ? 'bg-[#39ff14] text-black' : 'text-[#7b2cbf] hover:text-[#39ff14]'}`}
            onClick={() => setActiveTab('code')}
          >EXPORT_MODULE</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <CyberStatCard label="Neural Efficiency" value={`${analysis.score}%`} variant={analysis.score > 80 ? 'success' : 'normal'} />
          <CyberPanel title="DIAGNOSTICS_REPORT" className="text-[11px] leading-relaxed">
             <div className="space-y-4">
                <div>
                   <h5 className="text-[#7b2cbf] font-bold mb-1 uppercase tracking-tighter border-b border-[#7b2cbf]/20 pb-1">CRITIQUE</h5>
                   <p className="text-gray-400 italic">{analysis.critique}</p>
                </div>
                <div>
                   <h5 className="text-[#39ff14] font-bold mb-1 uppercase tracking-tighter border-b border-[#39ff14]/20 pb-1">STRATEGIES</h5>
                   <div className="flex flex-wrap gap-1 mt-2">
                      {analysis.techniquesUsed.map(t => <span key={t} className="px-1 bg-[#39ff14]/10 border border-[#39ff14]/30 text-[8px] text-[#39ff14]">{t}</span>)}
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
                <p className="text-[#39ff14] text-[10px] mt-4 font-mono-tech animate-pulse">RUNNING_NEURAL_BENCHMARK...</p>
              </div>
            )}
            
            {error && <CyberAlert message={error} onClose={() => setError(null)} />}

            {activeTab === 'optimized' && (
              <div className="flex flex-col h-full">
                <div className="flex-grow p-4 bg-black/40 border border-[#39ff14]/10 font-mono-tech text-sm text-[#39ff14] whitespace-pre-wrap overflow-y-auto custom-scrollbar">
                  {analysis.optimizedPrompt}
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <div className="text-[10px] text-gray-600 italic">
                    *Structurally aligned for Gemini 3 reasoning cores.
                  </div>
                  <CyberButton variant="secondary" className="text-[10px]" onClick={() => {
                    navigator.clipboard.writeText(analysis.optimizedPrompt);
                  }}>COPY_PROMPT</CyberButton>
                </div>
              </div>
            )}

            {activeTab === 'benchmark' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full p-2">
                <div className="flex flex-col border-r border-[#7b2cbf]/20 pr-4">
                   <h6 className="text-[10px] text-gray-500 mb-2 uppercase tracking-tighter font-header">Original_Response</h6>
                   <div className="flex-grow bg-black/60 p-3 text-[11px] text-gray-400 font-mono-tech overflow-y-auto custom-scrollbar italic border border-gray-900">
                      {benchResults?.original || "Awaiting benchmark execution..."}
                   </div>
                </div>
                <div className="flex flex-col pl-4">
                   <h6 className="text-[10px] text-[#39ff14] mb-2 uppercase tracking-tighter font-header">Optimized_Response</h6>
                   <div className="flex-grow bg-black/80 p-3 text-[11px] text-[#e0e0e0] font-mono-tech overflow-y-auto custom-scrollbar border border-[#39ff14]/10">
                      {benchResults?.optimized || "Awaiting benchmark execution..."}
                   </div>
                </div>
              </div>
            )}

            {activeTab === 'code' && (
              <div className="h-full flex flex-col p-2">
                <h6 className="text-[10px] text-[#7b2cbf] mb-2 font-header">PRODUCTION_READY_MODULE_JS</h6>
                <pre className="flex-grow bg-black/90 p-4 text-[11px] text-blue-400 font-mono-tech overflow-auto custom-scrollbar border border-blue-500/20">
                  {codeSnippet}
                </pre>
                <div className="mt-4 flex justify-end">
                   <CyberButton variant="secondary" className="text-[10px]" onClick={() => {
                     navigator.clipboard.writeText(codeSnippet);
                   }}>SYNC_TO_CLIPBOARD</CyberButton>
                </div>
              </div>
            )}
          </CyberPanel>
        </div>
      </div>
    </div>
  );
};

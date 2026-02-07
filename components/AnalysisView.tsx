
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
    result = result.replace(new RegExp(`\\[${key}\\]`, 'gi'), val);
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), val);
    result = result.replace(new RegExp(`<${key}>`, 'gi'), val);
  });
  return result;
};

export const AnalysisView: React.FC<AnalysisViewProps> = ({ analysis, variables, onBack, language }) => {
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
      <div className="flex justify-between items-center">
        <CyberButton variant="secondary" className="py-2 px-4 text-xs" onClick={onBack}>
          &lt; RE-ENGAGE_EDITOR
        </CyberButton>
        <div className="flex gap-2">
          <CyberButton 
            variant={activeTab === 'optimized' ? 'primary' : 'secondary'} 
            className="text-[10px]" 
            onClick={() => setActiveTab('optimized')}
          >CORE_SPEC</CyberButton>
          <CyberButton 
            variant={activeTab === 'benchmark' ? 'primary' : 'secondary'} 
            className="text-[10px]" 
            onClick={runBenchmark}
            isLoading={loadingBench}
          >NEURAL_BENCHMARK</CyberButton>
          <CyberButton 
            variant={activeTab === 'code' ? 'primary' : 'secondary'} 
            className="text-[10px]" 
            onClick={() => setActiveTab('code')}
          >EXPORT_JS_MODULE</CyberButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <CyberStatCard label="Neural Efficiency" value={`${analysis.score}%`} variant={analysis.score > 80 ? 'success' : 'normal'} />
          <CyberPanel title="DIAGNOSTICS_REPORT" className="text-[11px] leading-relaxed">
             <div className="space-y-4">
                <div>
                   <h5 className="text-[#7b2cbf] font-bold mb-1">CRITIQUE</h5>
                   <p className="text-gray-400 italic">{analysis.critique}</p>
                </div>
                <div>
                   <h5 className="text-[#39ff14] font-bold mb-1">STRATEGIES</h5>
                   <div className="flex flex-wrap gap-1">
                      {analysis.techniquesUsed.map(t => <span key={t} className="px-1 bg-[#39ff14]/10 border border-[#39ff14]/30 text-[8px]">{t}</span>)}
                   </div>
                </div>
             </div>
          </CyberPanel>
        </div>

        <div className="lg:col-span-3 min-h-[600px]">
          <CyberPanel className="h-full">
            {error && <CyberAlert message={error} onClose={() => setError(null)} />}

            {activeTab === 'optimized' && (
              <div className="flex flex-col h-full">
                <div className="flex-grow p-4 bg-black/40 border border-[#39ff14]/10 font-mono-tech text-sm text-[#39ff14] whitespace-pre-wrap overflow-y-auto custom-scrollbar">
                  {analysis.optimizedPrompt}
                </div>
                <div className="mt-4 text-[10px] text-gray-600 italic">
                  *This prompt has been structurally aligned for Gemini 3 reasoning cores.
                </div>
              </div>
            )}

            {activeTab === 'benchmark' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                <div className="flex flex-col border-r border-[#7b2cbf]/20 pr-4">
                   <h6 className="text-[10px] text-gray-500 mb-2 uppercase tracking-tighter">Original_Response_Stream</h6>
                   <div className="flex-grow bg-black/60 p-3 text-[11px] text-gray-400 font-mono-tech overflow-y-auto custom-scrollbar italic">
                      {benchResults?.original || "Awaiting benchmark execution..."}
                   </div>
                </div>
                <div className="flex flex-col pl-4">
                   <h6 className="text-[10px] text-[#39ff14] mb-2 uppercase tracking-tighter">Optimized_Output_Stream</h6>
                   <div className="flex-grow bg-black/80 p-3 text-[11px] text-[#e0e0e0] font-mono-tech overflow-y-auto custom-scrollbar">
                      {benchResults?.optimized || "Awaiting benchmark execution..."}
                   </div>
                </div>
              </div>
            )}

            {activeTab === 'code' && (
              <div className="h-full flex flex-col">
                <h6 className="text-[10px] text-[#7b2cbf] mb-2">PRODUCTION_READY_MODULE_JS</h6>
                <pre className="flex-grow bg-black/90 p-4 text-[11px] text-blue-400 font-mono-tech overflow-auto custom-scrollbar border border-blue-500/20">
                  {codeSnippet}
                </pre>
                <div className="mt-4 flex justify-end">
                   <CyberButton variant="secondary" className="text-[10px]" onClick={() => {
                     navigator.clipboard.writeText(codeSnippet);
                     alert("Code synced to local clipboard.");
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

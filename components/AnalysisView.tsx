import React, { useState } from 'react';
import { PromptAnalysis, PerformanceMetrics, ModelConfig } from '../types';
import { CyberPanel, CyberButton, CyberRange, CyberStatCard, CyberTooltip, CyberAlert } from './CyberComponents';
import { generatePreview, evaluatePerformance } from '../services/geminiService';

interface AnalysisViewProps {
  analysis: PromptAnalysis;
  onApply: (prompt: string) => void;
  language: 'pt-BR' | 'en';
}

// Updated Logic: Keys are in English (matching API output), Values are in Portuguese (Explanation)
const TECHNIQUE_DEFINITIONS: Record<string, string> = {
  "Persona Adoption": "Atribui um papel específico (ex: 'Programador Expert') à IA para alinhar tom e base de conhecimento.",
  "Chain of Thought": "Força a IA a pensar passo-a-passo antes de responder, reduzindo erros de lógica.",
  "Few-Shot Prompting": "Fornece exemplos de entrada e saída desejada para guiar o comportamento da IA.",
  "Delimiters": "Usa símbolos (###, \"\"\") para separar claramente instruções dos dados de entrada.",
  "Contextual Framing": "Fornece informações de bastidores para que a IA entenda o 'porquê' da solicitação.",
  "Output Formatting": "Especifica exatamente como o resultado deve parecer (Markdown, JSON, Lista).",
  "Constraint Setting": "Diz explicitamente o que a IA NÃO deve fazer para evitar erros comuns.",
  "Clarity & Precision": "Remove linguagem vaga para garantir que a IA interprete o pedido exatamente como pretendido.",
  "Tone Definition": "Define o humor da resposta (ex: Formal, Espirituoso, Acadêmico).",
  "Call to Action": "Instrução final clara sobre o que o modelo deve gerar."
};

const parseError = (err: string | null) => {
    if (!err) return null;
    const parts = err.split('|');
    if (parts.length > 1) {
        return { title: parts[0], message: parts.slice(1).join('|') };
    }
    return { title: "OPERATION FAILED", message: err };
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({ analysis, onApply, language }) => {
  const [activeTab, setActiveTab] = useState<'diff' | 'preview' | 'analytics'>('diff');
  
  // Preview State
  const [simulationResult, setSimulationResult] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Analytics State
  const [analyticsResult, setAnalyticsResult] = useState<PerformanceMetrics | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
      temperature: 0.7,
      topP: 0.95,
      topK: 40
  });

  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const handleSimulate = async () => {
    setSimulating(true);
    setError(null);
    try {
        const res = await generatePreview(analysis.optimizedPrompt);
        setSimulationResult(res);
        setActiveTab('preview');
    } catch (e) {
        setError(e instanceof Error ? e.message : "SIMULATION FAILED|Unable to generate preview content.");
        setActiveTab('preview'); // Switch to preview to show error
    } finally {
        setSimulating(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    try {
        const res = await evaluatePerformance(analysis.optimizedPrompt, modelConfig, language);
        setAnalyticsResult(res);
    } catch (e) {
        setError(e instanceof Error ? e.message : "ANALYSIS FAILED|Performance evaluation algorithm failed.");
    } finally {
        setAnalyzing(false);
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(analysis.optimizedPrompt);
    setCopyStatus("COPIED!");
    setTimeout(() => setCopyStatus(null), 2000);
  };

  const getTechniqueDef = (tech: string) => {
    // Basic fuzzy matching or default to generic message
    const key = Object.keys(TECHNIQUE_DEFINITIONS).find(k => tech.includes(k) || k.includes(tech));
    // Default fallback in Portuguese
    return key ? TECHNIQUE_DEFINITIONS[key] : "Estratégia de otimização avançada aplicada para melhorar a performance do modelo.";
  };

  const errorObj = parseError(error);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Left Column: Metrics & Critique */}
      <div className="lg:col-span-1 space-y-6">
        <CyberPanel title="DIAGNOSTICS" className="h-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400 font-mono-tech uppercase">Efficiency Score</span>
            <span className={`text-4xl font-header font-bold ${analysis.score > 80 ? 'text-[#39ff14]' : 'text-yellow-400'}`}>
              {analysis.score}<span className="text-sm align-top opacity-50">/100</span>
            </span>
          </div>
          
          <div className="w-full bg-gray-800 h-2 mb-6">
            <div 
              className="h-full bg-gradient-to-r from-[#7b2cbf] to-[#39ff14]" 
              style={{ width: `${analysis.score}%` }}
            ></div>
          </div>

          {/* Original Input Section */}
          <h4 className="text-[#39ff14] font-header text-sm mb-2">ORIGINAL INPUT</h4>
          <div className="bg-black/30 p-3 border border-gray-800 mb-6 max-h-32 overflow-y-auto custom-scrollbar">
             <p className="text-gray-400 text-xs font-mono-tech whitespace-pre-wrap opacity-80 italic">
                 {analysis.originalText}
             </p>
          </div>

          <h4 className="text-[#39ff14] font-header text-sm mb-2">CRITIQUE</h4>
          <p className="text-gray-300 text-sm leading-relaxed mb-6 font-mono-tech">
            {analysis.critique}
          </p>

          {/* Grammar & Syntax Module */}
          <div className="mb-6 border-t border-gray-800 pt-4">
             <h4 className="text-[#39ff14] font-header text-sm mb-3 flex items-center justify-between">
                SYNTAX INTEGRITY
                {analysis.grammarIssues.length === 0 && (
                    <span className="text-[#39ff14] text-xs px-2 py-0.5 border border-[#39ff14]/30 bg-[#39ff14]/10 rounded">CLEAN</span>
                )}
             </h4>
             
             {analysis.grammarIssues.length === 0 ? (
                 <p className="text-gray-500 text-xs font-mono-tech italic">No structural or grammatical errors detected in source input.</p>
             ) : (
                 <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                     {analysis.grammarIssues.map((issue, idx) => (
                         <div key={idx} className="bg-red-900/10 border-l-2 border-red-500 p-2">
                             <div className="flex justify-between items-center mb-1">
                                 <span className="text-red-400 text-[10px] font-bold uppercase tracking-wider">{issue.type}</span>
                             </div>
                             <div className="text-gray-400 text-xs font-mono-tech mb-1 line-through decoration-red-500/50">{issue.original}</div>
                             <div className="text-[#39ff14] text-xs font-mono-tech font-bold flex items-center gap-2">
                                 <span>&gt;</span> {issue.correction}
                             </div>
                             <div className="text-gray-500 text-[10px] mt-1 italic">{issue.explanation}</div>
                         </div>
                     ))}
                 </div>
             )}
          </div>

          <h4 className="text-[#39ff14] font-header text-sm mb-2">TECHNIQUES APPLIED</h4>
          <div className="flex flex-wrap gap-2">
            {analysis.techniquesUsed.map((tech, i) => (
              <CyberTooltip key={i} content={getTechniqueDef(tech)}>
                <span className="px-2 py-1 bg-[#7b2cbf]/20 border border-[#7b2cbf] text-[10px] text-[#e0e0e0] uppercase tracking-wider cursor-help hover:bg-[#7b2cbf]/40 transition-colors">
                  {tech}
                </span>
              </CyberTooltip>
            ))}
          </div>
        </CyberPanel>
      </div>

      {/* Right Column: Comparison, Action & Analytics */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="flex flex-wrap gap-4 mb-2">
            <CyberButton 
                variant={activeTab === 'diff' ? 'primary' : 'secondary'} 
                onClick={() => { setActiveTab('diff'); setError(null); }}
                className="text-xs py-2 px-4"
            >
                Source Code
            </CyberButton>
            <CyberButton 
                variant={activeTab === 'preview' ? 'primary' : 'secondary'} 
                onClick={handleSimulate}
                isLoading={simulating}
                className="text-xs py-2 px-4"
            >
                Quick Simulation
            </CyberButton>
            <CyberButton 
                variant={activeTab === 'analytics' ? 'primary' : 'secondary'} 
                onClick={() => { setActiveTab('analytics'); setError(null); }}
                className="text-xs py-2 px-4"
            >
                Performance Lab
            </CyberButton>
        </div>

        <CyberPanel 
            title={
                activeTab === 'diff' ? "OPTIMIZED CORE" : 
                activeTab === 'preview' ? "SIMULATION OUTPUT" : "PERFORMANCE ANALYTICS"
            } 
            className="flex-grow min-h-[500px]"
        >
           {/* Error Display inside the panel */}
           {errorObj && (
               <div className="mb-4">
                   <CyberAlert title={errorObj.title} message={errorObj.message} onClose={() => setError(null)} />
               </div>
           )}

           {activeTab === 'diff' && (
               <div className="h-full flex flex-col">
                   <textarea 
                    readOnly
                    value={analysis.optimizedPrompt}
                    className="w-full h-full bg-transparent border-none outline-none resize-none font-mono-tech text-[#e0e0e0] text-sm leading-6 custom-scrollbar"
                   />
                   <div className="mt-4 flex justify-end gap-4">
                       <CyberButton variant="secondary" onClick={handleCopy}>
                           {copyStatus || "Copy System Code"}
                       </CyberButton>
                       <CyberButton onClick={() => onApply(analysis.optimizedPrompt)}>
                           Accept Patch
                       </CyberButton>
                   </div>
               </div>
           )}

           {activeTab === 'preview' && (
               <div className="h-full overflow-y-auto custom-scrollbar font-mono-tech text-gray-300 text-sm whitespace-pre-wrap">
                   {!error && (simulationResult || "Initiate simulation to view model output...")}
               </div>
           )}

           {activeTab === 'analytics' && (
               <div className="h-full flex flex-col gap-6">
                   {/* Configuration Area */}
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 border border-[#7b2cbf]/30 bg-black/20">
                        <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
                            <CyberRange 
                                label="Temperature" 
                                min={0} max={2} step={0.1} 
                                value={modelConfig.temperature}
                                onChange={(val) => setModelConfig({...modelConfig, temperature: val})}
                            />
                            <CyberRange 
                                label="Top P" 
                                min={0} max={1} step={0.05} 
                                value={modelConfig.topP}
                                onChange={(val) => setModelConfig({...modelConfig, topP: val})}
                            />
                        </div>
                        <div className="flex items-center justify-center">
                             <CyberButton onClick={handleAnalyze} isLoading={analyzing} className="w-full text-xs">
                                 Run Analysis
                             </CyberButton>
                        </div>
                   </div>

                   {/* Results Area */}
                   {!error && (
                       analyticsResult ? (
                           <div className="flex-grow flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <CyberStatCard 
                                        label="Response Quality" 
                                        value={analyticsResult.qualityScore} 
                                        subValue="/ 100"
                                        variant={analyticsResult.qualityScore > 80 ? 'success' : 'normal'}
                                    />
                                    <CyberStatCard 
                                        label="Length (Chars)" 
                                        value={analyticsResult.responseLength} 
                                    />
                                    <CyberStatCard 
                                        label="Bias Check" 
                                        value={analyticsResult.biasDetected ? "DETECTED" : "CLEAR"}
                                        variant={analyticsResult.biasDetected ? 'alert' : 'success'}
                                    />
                                    <CyberStatCard 
                                        label="Tone" 
                                        value={analyticsResult.tone} 
                                    />
                               </div>

                               <div className="p-4 bg-gray-900/50 border border-gray-700">
                                    <h5 className="text-[#39ff14] text-xs font-header mb-2">BIAS & SAFETY AUDIT</h5>
                                    <p className="text-gray-400 text-xs font-mono-tech leading-relaxed">
                                        {analyticsResult.biasAnalysis}
                                    </p>
                               </div>

                               <div className="flex-grow border-t border-gray-800 pt-4">
                                    <h5 className="text-[#39ff14] text-xs font-header mb-2">GENERATED OUTPUT SAMPLE</h5>
                                    <p className="text-gray-300 text-sm font-mono-tech whitespace-pre-wrap">
                                        {analyticsResult.generatedResponse}
                                    </p>
                               </div>
                           </div>
                       ) : (
                           <div className="flex-grow flex items-center justify-center text-gray-600 font-mono-tech text-sm">
                               Configure parameters and run analysis to view metrics.
                           </div>
                       )
                   )}
               </div>
           )}
        </CyberPanel>
      </div>
    </div>
  );
};
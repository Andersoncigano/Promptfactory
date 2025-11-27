import React, { useState } from 'react';
import { PromptAnalysis, PerformanceMetrics, ModelConfig } from '../types';
import { CyberPanel, CyberButton, CyberRange, CyberStatCard } from './CyberComponents';
import { generatePreview, evaluatePerformance } from '../services/geminiService';

interface AnalysisViewProps {
  analysis: PromptAnalysis;
  onApply: (prompt: string) => void;
  language: 'pt-BR' | 'en';
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

  const handleSimulate = async () => {
    setSimulating(true);
    const res = await generatePreview(analysis.optimizedPrompt);
    setSimulationResult(res);
    setSimulating(false);
    setActiveTab('preview');
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
        const res = await evaluatePerformance(analysis.optimizedPrompt, modelConfig, language);
        setAnalyticsResult(res);
    } catch (e) {
        console.error(e);
    }
    setAnalyzing(false);
  }

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

          <h4 className="text-[#39ff14] font-header text-sm mb-2">CRITIQUE</h4>
          <p className="text-gray-300 text-sm leading-relaxed mb-6 font-mono-tech">
            {analysis.critique}
          </p>

          <h4 className="text-[#39ff14] font-header text-sm mb-2">TECHNIQUES APPLIED</h4>
          <div className="flex flex-wrap gap-2">
            {analysis.techniquesUsed.map((tech, i) => (
              <span key={i} className="px-2 py-1 bg-[#7b2cbf]/20 border border-[#7b2cbf] text-[10px] text-[#e0e0e0] uppercase tracking-wider">
                {tech}
              </span>
            ))}
          </div>
        </CyberPanel>
      </div>

      {/* Right Column: Comparison, Action & Analytics */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="flex flex-wrap gap-4 mb-2">
            <CyberButton 
                variant={activeTab === 'diff' ? 'primary' : 'secondary'} 
                onClick={() => setActiveTab('diff')}
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
                onClick={() => setActiveTab('analytics')}
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
           {activeTab === 'diff' && (
               <div className="h-full flex flex-col">
                   <textarea 
                    readOnly
                    value={analysis.optimizedPrompt}
                    className="w-full h-full bg-transparent border-none outline-none resize-none font-mono-tech text-[#e0e0e0] text-sm leading-6 custom-scrollbar"
                   />
                   <div className="mt-4 flex justify-end">
                       <CyberButton onClick={() => onApply(analysis.optimizedPrompt)}>
                           Accept Patch
                       </CyberButton>
                   </div>
               </div>
           )}

           {activeTab === 'preview' && (
               <div className="h-full overflow-y-auto custom-scrollbar font-mono-tech text-gray-300 text-sm whitespace-pre-wrap">
                   {simulationResult || "Initiate simulation to view model output..."}
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
                   {analyticsResult ? (
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
                   )}
               </div>
           )}
        </CyberPanel>
      </div>
    </div>
  );
};
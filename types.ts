export interface PromptAnalysis {
  originalText: string;
  critique: string;
  optimizedPrompt: string;
  techniquesUsed: string[];
  score: number; // 0-100
}

export enum ViewMode {
  EDITOR = 'EDITOR',
  COMPARISON = 'COMPARISON',
  SETTINGS = 'SETTINGS'
}

export interface ModelConfig {
  temperature: number;
  topP: number;
  topK: number;
}

export interface PerformanceMetrics {
  responseLength: number;
  qualityScore: number; // 0-100
  biasDetected: boolean;
  biasAnalysis: string;
  tone: string;
  generatedResponse: string;
}
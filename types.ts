export interface GrammarIssue {
  type: string; // e.g., 'Spelling', 'Syntax', 'Punctuation'
  original: string;
  correction: string;
  explanation: string;
}

export interface PromptAnalysis {
  originalText: string;
  critique: string;
  optimizedPrompt: string;
  techniquesUsed: string[];
  grammarIssues: GrammarIssue[];
  score: number; // 0-100
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  originalPreview: string; // Short snippet of original
  optimizedPreview: string; // Short snippet of optimized
  score: number;
  fullAnalysis: PromptAnalysis;
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
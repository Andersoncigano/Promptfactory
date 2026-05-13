
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { PromptAnalysis, ModelConfig, PerformanceMetrics } from "../types.ts";

const handleGenAIError = (error: any): never => {
    console.error("[ORION_LOG]: Falha detectada no motor neural:", error);
    
    let title = "SYSTEM_ERROR";
    let message = error.message || "Malfuncionamento inesperado no núcleo neural.";

    const errorMsg = message.toLowerCase();
    
    if (errorMsg.includes("401") || errorMsg.includes("api key") || errorMsg.includes("unauthorized") || errorMsg.includes("invalid")) {
        title = "AUTH_FAILURE";
        message = "Chave de API inválida ou expirada. Realize uma nova autenticação.";
    } else if (errorMsg.includes("429") || errorMsg.includes("quota")) {
        title = "QUOTA_EXCEEDED";
        message = "Limite de requisições atingido para sua chave gratuita. Aguarde alguns instantes.";
    } else if (errorMsg.includes("not found")) {
        title = "MODEL_ERROR";
        message = "O modelo solicitado não está disponível para esta chave de API.";
    }

    throw new Error(`${title}|${message}`);
};

const cleanJSONResponse = (text: string): any => {
    try {
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
            try { return JSON.parse(match[0]); } catch { /* ignore */ }
        }
        throw new Error("PARSING_ERROR|Fluxo de dados corrompido. Tente novamente.");
    }
};

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    critique: { type: Type.STRING },
    optimizedPrompt: { type: Type.STRING },
    techniquesUsed: { type: Type.ARRAY, items: { type: Type.STRING } },
    grammarIssues: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          original: { type: Type.STRING },
          correction: { type: Type.STRING },
          explanation: { type: Type.STRING }
        },
        required: ["type", "original", "correction", "explanation"]
      }
    },
    score: { type: Type.INTEGER },
  },
  required: ["critique", "optimizedPrompt", "techniquesUsed", "grammarIssues", "score"],
};

let internalApiKey = process.env.API_KEY || "";

export const setInternalApiKey = (key: string) => {
    internalApiKey = key;
    console.info("[ORION_LOG]: Núcleo neural atualizado com nova chave.");
};

const getAiInstance = () => {
    return new GoogleGenAI({ apiKey: internalApiKey });
};

export const checkConnection = async (): Promise<boolean> => {
  try {
    const ai = getAiInstance();
    await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: 'ping' }] }],
      config: { maxOutputTokens: 1 }
    });
    return true;
  } catch (e) {
    console.error("[ORION_LOG]: Falha no ping de rede neural.");
    return false;
  }
};

export const optimizePrompt = async (inputPrompt: string, language: 'pt-BR' | 'en'): Promise<PromptAnalysis> => {
  try {
      console.info("[ORION_LOG]: Iniciando otimização neural...");
      const ai = getAiInstance();
      
      const langInstruction = language === 'pt-BR' 
          ? "Responda em PORTUGUÊS (BRASIL). 'critique' e 'optimizedPrompt' devem estar em PT-BR."
          : "Respond in ENGLISH.";

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `Realize uma engenharia forense e reconstrua este prompt para máxima performance: ${inputPrompt}` }] }],
        config: {
            systemInstruction: `Você é ORION, o Arquiteto-Chefe de Engenharia de Prompts de Nível 5. Sua missão é transformar instruções brutas em comandos de elite para sistemas de IA de ponta.
            
            DIRETRIZES DE RIGIDEZ:
            1. ANÁLISE FORENSE: Antes de otimizar, identifique a real intenção (Goal), o público-alvo (Audience) e as restrições (Constraints) implícitas no input.
            2. FRAMEWORK ESTRUTURAL: A resposta otimizada DEVE seguir uma estrutura profissional (Contexto, Tarefa, Instruções Passo-a-Passo, Restrições, Formato de Saída).
            3. RIQUEZA SEMÂNTICA: Não economize em técnica. Use Delimitadores (e.g., ###), Personas complexas, e Chain-of-Thought explicito.
            4. DIAGNÓSTICO: No campo 'critique', seja impiedoso e técnico. Aponte exatamente onde o prompt original falha (vagalidades, falta de contexto, instruções contraditórias).
            5. PRESERVAÇÃO: Nunca remova informações base; transforme-as em diretrizes estruturadas.
            
            ${langInstruction}`,
            responseMimeType: "application/json",
            responseSchema: analysisSchema,
            temperature: 0.5,
            maxOutputTokens: 16384
        },
      });

      if (!response.text) throw new Error("EMPTY_RESPONSE|O motor neural não gerou saída.");

      const result = cleanJSONResponse(response.text);
      console.info("[ORION_LOG]: Otimização concluída.");
      
      return {
        originalText: inputPrompt,
        critique: result.critique,
        optimizedPrompt: result.optimizedPrompt,
        techniquesUsed: result.techniquesUsed,
        grammarIssues: result.grammarIssues || [],
        score: result.score
      };
  } catch (error) {
      handleGenAIError(error);
  }
};

export const generatePreview = async (prompt: string): Promise<string> => {
    try {
        const ai = getAiInstance();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ parts: [{ text: prompt }] }],
        });
        return response.text || "Sem saída.";
    } catch (error) {
        handleGenAIError(error);
    }
};

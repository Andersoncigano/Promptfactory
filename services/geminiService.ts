
import { GoogleGenAI, Type } from "@google/genai";
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

export const checkConnection = async (): Promise<boolean> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: 'ping' }] }],
      config: { maxOutputTokens: 1 }
    });
    return true;
  } catch (e) {
    console.error("[ORION_LOG]: Falha no ping inicial.");
    return false;
  }
};

export const optimizePrompt = async (inputPrompt: string, language: 'pt-BR' | 'en'): Promise<PromptAnalysis> => {
  try {
      console.info("[ORION_LOG]: Iniciando otimização com Gemini 3 Flash (Free Tier)...");
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const langInstruction = language === 'pt-BR' 
          ? "Responda em PORTUGUÊS (BRASIL). 'critique' e 'optimizedPrompt' devem estar em PT-BR."
          : "Respond in ENGLISH.";

      const response = await ai.models.generateContent({
        // Trocado para Flash para permitir uso gratuito
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `Otimize e reconstrua este prompt para máxima eficiência: ${inputPrompt}` }] }],
        config: {
            systemInstruction: `Você é ORION, Arquiteto de Prompts Sênior. Sua tarefa é transformar inputs em especificações de alta fidelidade usando técnicas avançadas. ${langInstruction}`,
            responseMimeType: "application/json",
            responseSchema: analysisSchema,
            temperature: 0.7,
            thinkingConfig: { thinkingBudget: 4096 } // Budget reduzido para maior velocidade em contas gratuitas
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
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ parts: [{ text: prompt }] }],
        });
        return response.text || "Sem saída.";
    } catch (error) {
        handleGenAIError(error);
    }
};

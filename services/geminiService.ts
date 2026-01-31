import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PromptAnalysis, ModelConfig, PerformanceMetrics } from "../types";

const handleGenAIError = (error: unknown): never => {
    console.error("Gemini Service Error:", error);
    
    let title = "SYSTEM ERROR";
    let message = "Um mau funcionamento inesperado ocorreu no sistema.";

    if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        
        if (msg.includes("api key") || msg.includes("apikey") || msg.includes("401") || msg.includes("auth")) {
            title = "AUTHENTICATION FAILED";
            message = "Chave de API inválida ou ausente. Clique no botão de autorização para conectar sua conta.";
        } else if (msg.includes("429") || msg.includes("quota")) {
            title = "QUOTA EXCEEDED";
            message = "Limite de requisições atingido. Aguarde alguns instantes.";
        } else if (msg.includes("404") || msg.includes("not found")) {
            title = "ENTITY NOT FOUND";
            message = "O modelo Gemini 3 Pro não foi encontrado ou seu projeto não tem acesso a ele. Verifique se o faturamento está ativo.";
        } else {
             if (error.message.includes("|")) {
                 const parts = error.message.split("|");
                 title = parts[0];
                 message = parts.slice(1).join("|");
             } else {
                 message = error.message;
             }
        }
    }

    throw new Error(`${title}|${message}`);
};

const getClient = () => {
    // Re-initialize to capture injected key
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("AUTHENTICATION FAILED|Nenhuma chave de API detectada no ambiente atual.");
    }
    return new GoogleGenAI({ apiKey });
}

const analysisSchema: Schema = {
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

export const optimizePrompt = async (inputPrompt: string, language: 'pt-BR' | 'en'): Promise<PromptAnalysis> => {
  try {
      const ai = getClient();
      const model = 'gemini-3-pro-preview';
      
      const langInstruction = language === 'pt-BR' 
          ? "OUTPUT LANGUAGE: PORTUGUESE (BRAZIL). Os campos 'critique', 'grammarIssues' e 'optimizedPrompt' DEVEM estar em Português."
          : "OUTPUT LANGUAGE: ENGLISH.";

      const systemInstruction = `
        Você é o Projeto ORION, um Arquiteto de Prompts Sênior. 
        Sua tarefa é reconstruir o input do usuário em uma especificação de alta fidelidade seguindo rigorosamente esta estrutura:
        ### 1. ROLE & PERSONA
        ### 2. CONTEXT & OBJECTIVES
        ### 3. VARIABLES
        ### 4. STEPS (CHAIN OF THOUGHT)
        ### 5. CONSTRAINTS & NEGATIVE PROMPTING
        ### 6. OUTPUT FORMAT
        ${langInstruction}
      `;

      const response = await ai.models.generateContent({
        model,
        contents: inputPrompt,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: analysisSchema,
            temperature: 0.7,
            thinkingConfig: { thinkingBudget: 16384 }
        },
      });

      const result = JSON.parse(response.text || "{}");
      
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
        const ai = getClient();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        return response.text || "Nenhuma saída gerada.";
    } catch (error) {
        handleGenAIError(error);
    }
}

export const evaluatePerformance = async (prompt: string, config: ModelConfig, language: 'pt-BR' | 'en'): Promise<PerformanceMetrics> => {
    try {
        const ai = getClient();
        const genResponse = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { temperature: config.temperature, topP: config.topP, topK: config.topK }
        });
        const generatedText = genResponse.text || "Sem resposta.";

        const judgeResponse = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Analise a qualidade técnica desta resposta gerada por IA: ${generatedText}`,
            config: {
                systemInstruction: "Você é um Auditor Sênior de QA de IA. Retorne JSON: {qualityScore: int, biasDetected: bool, biasAnalysis: string, tone: string}",
                responseMimeType: "application/json",
                temperature: 0.2,
                thinkingConfig: { thinkingBudget: 8192 }
            }
        });

        const analysis = JSON.parse(judgeResponse.text || "{}");
        return {
            generatedResponse: generatedText,
            responseLength: generatedText.length,
            qualityScore: analysis.qualityScore,
            biasDetected: analysis.biasDetected,
            biasAnalysis: analysis.biasAnalysis,
            tone: analysis.tone
        };
    } catch (error) {
        handleGenAIError(error);
    }
};

import { GoogleGenAI, Type } from "@google/genai";
import { PromptAnalysis, ModelConfig, PerformanceMetrics } from "../types.ts";

// Helper for handling API errors and identifying auth/entity failures
const handleGenAIError = (error: any): never => {
    console.error("[GEMINI_SERVICE_FAILURE]:", error);
    
    let title = "SYSTEM_ERROR";
    let message = error.message || "An unexpected malfunction occurred in the neural core.";

    const errorMsg = message.toLowerCase();
    
    if (errorMsg.includes("requested entity was not found") || errorMsg.includes("401") || errorMsg.includes("api key") || errorMsg.includes("invalid api key") || errorMsg.includes("unauthorized")) {
        title = "AUTH_FAILURE";
        message = "Security handshake failed. A valid project API key with billing enabled is required for Gemini 3 Pro.";
    } else if (errorMsg.includes("429") || errorMsg.includes("quota")) {
        title = "QUOTA_EXCEEDED";
        message = "Neural bandwidth exhausted. Please wait for the quota to reset.";
    } else if (errorMsg.includes("fetch")) {
        title = "NETWORK_DISRUPTION";
        message = "Failed to establish a link with the Gemini backbone. Check your connectivity.";
    }

    throw new Error(`${title}|${message}`);
};

// Clean and parse JSON response accurately
const cleanJSONResponse = (text: string): any => {
    try {
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("[JSON_PARSE_ERROR]: Failed to parse model output:", text);
        // Fallback for non-JSON or partial JSON
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
            try {
                return JSON.parse(match[0]);
            } catch { /* ignore */ }
        }
        throw new Error("PARSING_ERROR|The neural core returned a corrupted data stream.");
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
    console.warn("[ORION] Connection check failed.");
    return false;
  }
};

export const optimizePrompt = async (inputPrompt: string, language: 'pt-BR' | 'en'): Promise<PromptAnalysis> => {
  try {
      console.info("[ORION] Initiating Optimization Request for model: gemini-3-pro-preview");
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const model = 'gemini-3-pro-preview';
      const langInstruction = language === 'pt-BR' 
          ? "Você deve responder INTEIRAMENTE em PORTUGUÊS (BRASIL). Os campos 'critique' e 'optimizedPrompt' DEVEM estar em português."
          : "You must respond entirely in ENGLISH.";

      const response = await ai.models.generateContent({
        model,
        contents: [{ parts: [{ text: `Original Prompt to Optimize: ${inputPrompt}` }] }],
        config: {
            systemInstruction: `You are ORION, a world-class Senior Prompt Architect. Your mission is to reconstruct user inputs into high-fidelity prompt engineering specifications. 
            Analyze flaws (ambiguity, lack of context, missing constraints) and generate a significantly superior version using techniques like Chain-of-Thought, Variable placeholders, and Persona adoption.
            ${langInstruction}
            Output the result in the specified JSON schema.`,
            responseMimeType: "application/json",
            responseSchema: analysisSchema,
            temperature: 0.8,
            thinkingConfig: { thinkingBudget: 16384 }
        },
      });

      if (!response.text) {
        throw new Error("EMPTY_RESPONSE|The model failed to generate a response text.");
      }

      const result = cleanJSONResponse(response.text);
      console.info("[ORION] Optimization Success.");
      
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
        return response.text || "No output generated.";
    } catch (error) {
        handleGenAIError(error);
    }
};

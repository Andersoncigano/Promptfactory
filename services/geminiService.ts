
import { GoogleGenAI, Type } from "@google/genai";
import { PromptAnalysis, ModelConfig, PerformanceMetrics } from "../types";

const handleGenAIError = (error: unknown): never => {
    console.error("Gemini Service Error:", error);
    
    let title = "SYSTEM ERROR";
    let message = "An unexpected malfunction occurred in the neural core.";

    if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("429") || msg.includes("quota")) {
            title = "QUOTA EXCEEDED";
            message = "Neural bandwidth exhausted. Please wait for cool-down.";
        } else if (msg.includes("401") || msg.includes("api key") || msg.includes("auth")) {
            title = "AUTH FAILURE";
            message = "Security handshake failed. Check environment credentials.";
        } else if (error.message.includes("|")) {
            const parts = error.message.split("|");
            title = parts[0];
            message = parts.slice(1).join("|");
        } else {
            message = error.message;
        }
    }

    throw new Error(`${title}|${message}`);
};

// Standard initialization as per instructions
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

export const optimizePrompt = async (inputPrompt: string, language: 'pt-BR' | 'en'): Promise<PromptAnalysis> => {
  try {
      const model = 'gemini-3-pro-preview';
      const langInstruction = language === 'pt-BR' 
          ? "OUTPUT LANGUAGE: PORTUGUESE (BRAZIL). Critique and optimizedPrompt fields MUST be in Portuguese."
          : "OUTPUT LANGUAGE: ENGLISH.";

      const response = await ai.models.generateContent({
        model,
        contents: inputPrompt,
        config: {
            systemInstruction: `You are ORION, a Senior Prompt Architect. Reconstruct user input into high-fidelity prompt engineering specifications. ${langInstruction}`,
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
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        return response.text || "No output generated.";
    } catch (error) {
        handleGenAIError(error);
    }
}

export const evaluatePerformance = async (prompt: string, config: ModelConfig, language: 'pt-BR' | 'en'): Promise<PerformanceMetrics> => {
    try {
        const genResponse = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { temperature: config.temperature, topP: config.topP, topK: config.topK }
        });
        const generatedText = genResponse.text || "No response.";

        const judgeResponse = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Analyze technical quality: ${generatedText}`,
            config: {
                systemInstruction: "You are an AI QA Auditor. Return JSON: {qualityScore: int, biasDetected: bool, biasAnalysis: string, tone: string}",
                responseMimeType: "application/json",
                temperature: 0.1,
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


import { GoogleGenAI, Type } from "@google/genai";
import { PromptAnalysis, ModelConfig, PerformanceMetrics } from "../types.ts";

// Helper for handling API errors and identifying auth/entity failures
const handleGenAIError = (error: any): never => {
    console.error("[GEMINI_SERVICE_FAILURE]:", error);
    
    let title = "SYSTEM_ERROR";
    let message = error.message || "An unexpected malfunction occurred in the neural core.";

    const errorMsg = message.toLowerCase();
    
    if (errorMsg.includes("requested entity was not found") || errorMsg.includes("401") || errorMsg.includes("api key") || errorMsg.includes("invalid api key")) {
        title = "AUTH_FAILURE";
        message = "Security handshake failed. A valid project API key with billing enabled is required.";
    } else if (errorMsg.includes("429") || errorMsg.includes("quota")) {
        title = "QUOTA_EXCEEDED";
        message = "Neural bandwidth exhausted. Please wait for cool-down.";
    } else if (errorMsg.includes("fetch")) {
        title = "NETWORK_DISRUPTION";
        message = "Failed to establish a link with the Gemini backbone.";
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

export const optimizePrompt = async (inputPrompt: string, language: 'pt-BR' | 'en'): Promise<PromptAnalysis> => {
  try {
      console.info("[ORION] Initiating Optimization Request...");
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const model = 'gemini-3-pro-preview';
      const langInstruction = language === 'pt-BR' 
          ? "OUTPUT LANGUAGE: PORTUGUESE (BRAZIL). The 'critique' and 'optimizedPrompt' fields MUST be in Portuguese."
          : "OUTPUT LANGUAGE: ENGLISH.";

      const response = await ai.models.generateContent({
        model,
        contents: [{ parts: [{ text: inputPrompt }] }],
        config: {
            systemInstruction: `You are ORION, a Senior Prompt Architect. Reconstruct user input into high-fidelity prompt engineering specifications. Analyze flaws and generate a superior version using professional techniques (Chain-of-Thought, Few-Shot, etc.). ${langInstruction}`,
            responseMimeType: "application/json",
            responseSchema: analysisSchema,
            temperature: 0.7,
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
}

export const evaluatePerformance = async (prompt: string, config: ModelConfig, language: 'pt-BR' | 'en'): Promise<PerformanceMetrics> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const genResponse = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ parts: [{ text: prompt }] }],
            config: { temperature: config.temperature, topP: config.topP, topK: config.topK }
        });
        const generatedText = genResponse.text || "No response.";

        const judgeResponse = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: [{ parts: [{ text: `Analyze technical quality and bias of this generated content: ${generatedText}` }] }],
            config: {
                systemInstruction: "You are an AI QA Auditor. Return JSON: {qualityScore: int, biasDetected: bool, biasAnalysis: string, tone: string}",
                responseMimeType: "application/json",
                temperature: 0.1,
                thinkingConfig: { thinkingBudget: 8192 }
            }
        });

        const analysis = cleanJSONResponse(judgeResponse.text || "{}");
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

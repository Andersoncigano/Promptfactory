import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PromptAnalysis, ModelConfig, PerformanceMetrics } from "../types";

// Enhanced Error Handling to provide structured feedback to the UI
const handleGenAIError = (error: unknown): never => {
    console.error("Gemini Service Error:", error);
    
    let title = "SYSTEM ERROR";
    let message = "An unexpected system malfunction occurred during processing.";

    if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        
        if (msg.includes("api key") || msg.includes("apikey") || msg.includes("401") || msg.includes("auth")) {
            title = "AUTHENTICATION FAILED";
            message = error.message.includes("|") ? error.message.split("|")[1] : "API Key invalid or missing. Check your environment settings.";
        } else if (msg.includes("429") || msg.includes("quota")) {
            title = "QUOTA EXCEEDED";
            message = "Rate limit reached. Please standby before retrying operation.";
        } else if (msg.includes("safety") || msg.includes("blocked")) {
            title = "SAFETY PROTOCOL";
            message = "Content blocked by safety filters. Revise input parameters to comply with safety guidelines.";
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
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("CONFIGURATION ERROR|API Key is missing from process.env.API_KEY.");
    }
    return new GoogleGenAI({ apiKey });
}

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    critique: {
      type: Type.STRING,
      description: "A harsh, professional critique of the user's prompt identifying logical gaps and ambiguity.",
    },
    optimizedPrompt: {
      type: Type.STRING,
      description: "The rewritten, high-fidelity prompt using MARKDOWN HEADERS (###).",
    },
    techniquesUsed: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of specific techniques applied in ENGLISH.",
    },
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
    score: {
      type: Type.INTEGER,
      description: "Quality score from 0 to 100.",
    },
  },
  required: ["critique", "optimizedPrompt", "techniquesUsed", "grammarIssues", "score"],
};

export const optimizePrompt = async (inputPrompt: string, language: 'pt-BR' | 'en'): Promise<PromptAnalysis> => {
  try {
      const ai = getClient();
      const model = 'gemini-3-pro-preview';
      
      const langInstruction = language === 'pt-BR' 
          ? "OUTPUT LANGUAGE: PORTUGUESE (BRAZIL). The 'critique', 'grammarIssues' and 'optimizedPrompt' fields MUST be in Portuguese. 'techniquesUsed' MUST be in ENGLISH."
          : "OUTPUT LANGUAGE: ENGLISH. All fields MUST be in English.";

      const systemInstruction = `
        You are Project ORION, an ELITE Lead Prompt Architect. 
        Analyze the user's prompt and reconstruct it into a "High-Fidelity" production-grade specification.
        
        OPTIMIZATION STANDARDS:
        The 'optimizedPrompt' MUST follow this Markdown structure:
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
            thinkingConfig: { thinkingBudget: 16384 } // Use reasoning for optimization
        },
      });

      const jsonText = response.text;
      if (!jsonText) throw new Error("GENERATION ERROR|Empty response from Gemini 3 Core.");

      const result = JSON.parse(jsonText);
      
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
            model: 'gemini-3-flash-preview', // Flash for speed in quick simulation
            contents: prompt,
        });
        return response.text || "No output generated.";
    } catch (error) {
        handleGenAIError(error);
    }
}

const performanceJudgeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    qualityScore: { type: Type.INTEGER },
    biasDetected: { type: Type.BOOLEAN },
    biasAnalysis: { type: Type.STRING },
    tone: { type: Type.STRING }
  },
  required: ["qualityScore", "biasDetected", "biasAnalysis", "tone"]
};

export const evaluatePerformance = async (prompt: string, config: ModelConfig, language: 'pt-BR' | 'en'): Promise<PerformanceMetrics> => {
    try {
        const ai = getClient();
        // Generate sample response using optimized prompt
        const genResponse = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                temperature: config.temperature,
                topP: config.topP,
                topK: config.topK
            }
        });

        const generatedText = genResponse.text || "No output.";

        // Judge the response using the Pro model
        const langInstruction = language === 'pt-BR' 
            ? "OUTPUT LANGUAGE: PORTUGUESE (BRAZIL)."
            : "OUTPUT LANGUAGE: ENGLISH.";

        const judgeSystemInstruction = `
            You are a Senior AI QA Auditor. Analyze the text for quality, bias, and tone.
            ${langInstruction}
            Return JSON.
        `;

        const judgeResponse = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `[GENERATED_TEXT_START]\n${generatedText}\n[GENERATED_TEXT_END]`,
            config: {
                systemInstruction: judgeSystemInstruction,
                responseMimeType: "application/json",
                responseSchema: performanceJudgeSchema,
                temperature: 0.2,
                thinkingConfig: { thinkingBudget: 8192 } // Reasoning for audit
            }
        });

        const analysisJson = judgeResponse.text;
        if (!analysisJson) throw new Error("GENERATION ERROR|Auditor failed to respond");

        const analysis = JSON.parse(analysisJson);

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
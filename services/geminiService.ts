import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PromptAnalysis, ModelConfig, PerformanceMetrics } from "../types";

// Lógica de leitura de API Key simplificada e robusta para Vercel/Vite e Ambientes Locais
const getApiKey = (): string => {
  let key = "";

  // 1. Tenta ler do Vite (Padrão moderno) de forma SEGURA
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      key = import.meta.env.VITE_API_KEY || "";
    }
  } catch (e) {
    // Ignora erro se import.meta não for suportado
  }

  // 2. Se não achou, tenta ler do Process (Fallback para Node/Antigo)
  if (!key) {
    try {
      // @ts-ignore
      if (typeof process !== 'undefined' && process.env) {
        // @ts-ignore
        key = process.env.API_KEY || "";
      }
    } catch (e) {
      // Ignora erro se process não for suportado
    }
  }

  if (!key) {
    console.error("CRITICAL ERROR: API Key not found.");
    console.log("Diagnostic Info: Checked both import.meta.env and process.env but found no keys.");
  }

  return key;
};

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    critique: {
      type: Type.STRING,
      description: "A professional critique of the user's prompt, identifying weaknesses like ambiguity, lack of context, or poor structure.",
    },
    optimizedPrompt: {
      type: Type.STRING,
      description: "The rewritten, high-fidelity prompt using advanced prompt engineering techniques.",
    },
    techniquesUsed: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of specific techniques applied (e.g., 'Chain of Thought', 'Few-Shot', 'Persona Adoption'). MUST ALWAYS BE IN ENGLISH STANDARD TERMINOLOGY.",
    },
    grammarIssues: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, description: "Category of error (e.g., Spelling, Punctuation, Concordance)" },
          original: { type: Type.STRING, description: "The exact snippet of text containing the error" },
          correction: { type: Type.STRING, description: "The corrected version of the snippet" },
          explanation: { type: Type.STRING, description: "Brief explanation of the rule violated" }
        },
        required: ["type", "original", "correction", "explanation"]
      },
      description: "List of grammatical, spelling, or punctuation errors found in the ORIGINAL prompt."
    },
    score: {
      type: Type.INTEGER,
      description: "A quality score from 0 to 100 representing the robustness of the optimized prompt.",
    },
  },
  required: ["critique", "optimizedPrompt", "techniquesUsed", "grammarIssues", "score"],
};

export const optimizePrompt = async (inputPrompt: string, language: 'pt-BR' | 'en'): Promise<PromptAnalysis> => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error("API Key is missing. Please check VITE_API_KEY or API_KEY in environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-2.5-flash";
  
  const langInstruction = language === 'pt-BR' 
      ? "OUTPUT LANGUAGE: PORTUGUESE (BRAZIL). The 'critique', 'grammarIssues' and 'optimizedPrompt' fields MUST be written in Portuguese. However, the 'techniquesUsed' list MUST ALWAYS be in ENGLISH (standard industry terminology)."
      : "OUTPUT LANGUAGE: ENGLISH. All fields including 'critique', 'optimizedPrompt', 'grammarIssues' and 'techniquesUsed' MUST be written in English.";

  const systemInstruction = `
    You are Project ORION, an advanced Prompt Engineering AI Specialist. 
    Your goal is to analyze user prompts and restructure them into "High-Fidelity" specifications.
    
    Principles:
    1. Clarity & Precision: Eliminate ambiguity.
    2. Contextual Framing: Assign personas and context.
    3. Structural Formatting: Use markdown, delimiters, and clear steps.
    4. Constraint Handling: Explicitly define what the model should NOT do.
    5. Syntax Integrity: Rigorously audit the input for grammatical, spelling, and punctuation errors.
    
    ${langInstruction}
    
    Analyze the user's input and provide a JSON response containing a critique, the optimized prompt, techniques used, a list of grammar issues, and a quality score.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: inputPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.7,
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from model");

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
    console.error("Optimization failed:", error);
    throw error;
  }
};

export const generatePreview = async (prompt: string): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) return "Error: API Key missing.";

    const ai = new GoogleGenAI({ apiKey });

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        return response.text || "No output generated.";
    } catch (error) {
        return `Simulation Error: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
}

const performanceJudgeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    qualityScore: { type: Type.INTEGER, description: "Score 0-100 based on coherence, relevance, and adherence to instructions." },
    biasDetected: { type: Type.BOOLEAN, description: "True if any political, social, or harmful bias is detected." },
    biasAnalysis: { type: Type.STRING, description: "Explanation of the bias check." },
    tone: { type: Type.STRING, description: "The perceived tone of the text (e.g. Formal, Creative, Urgent)." }
  },
  required: ["qualityScore", "biasDetected", "biasAnalysis", "tone"]
};

export const evaluatePerformance = async (prompt: string, config: ModelConfig, language: 'pt-BR' | 'en'): Promise<PerformanceMetrics> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key is missing.");

    const ai = new GoogleGenAI({ apiKey });

    const generationModel = "gemini-2.5-flash";
    const genResponse = await ai.models.generateContent({
        model: generationModel,
        contents: prompt,
        config: {
            temperature: config.temperature,
            topP: config.topP,
            topK: config.topK
        }
    });

    const generatedText = genResponse.text || "No output.";

    const judgeModel = "gemini-2.5-flash";
    
    const langInstruction = language === 'pt-BR' 
        ? "OUTPUT LANGUAGE: PORTUGUESE (BRAZIL). The 'biasAnalysis' and 'tone' fields MUST be written in Portuguese."
        : "OUTPUT LANGUAGE: ENGLISH. The 'biasAnalysis' and 'tone' fields MUST be written in English.";

    const judgeSystemInstruction = `
        You are an AI Quality Assurance Auditor. 
        Analyze the provided text which was generated by an LLM in response to a user prompt.
        
        Evaluate:
        1. Quality: Is it coherent? Does it look like a high-quality AI response?
        2. Bias: Are there any harmful stereotypes or biased viewpoints?
        3. Tone: Classify the tone.
        
        ${langInstruction}

        Return your analysis in JSON format.
    `;

    const judgeResponse = await ai.models.generateContent({
        model: judgeModel,
        contents: `[GENERATED_TEXT_START]\n${generatedText}\n[GENERATED_TEXT_END]`,
        config: {
            systemInstruction: judgeSystemInstruction,
            responseMimeType: "application/json",
            responseSchema: performanceJudgeSchema,
            temperature: 0.2
        }
    });

    const analysisJson = judgeResponse.text;
    if (!analysisJson) throw new Error("Judge failed to respond");

    const analysis = JSON.parse(analysisJson);

    return {
        generatedResponse: generatedText,
        responseLength: generatedText.length,
        qualityScore: analysis.qualityScore,
        biasDetected: analysis.biasDetected,
        biasAnalysis: analysis.biasAnalysis,
        tone: analysis.tone
    };
};
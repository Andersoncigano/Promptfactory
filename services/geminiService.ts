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
            message = error.message.includes("|") ? error.message.split("|")[1] : "API Key invalid or missing. Check VITE_API_KEY settings.";
        } else if (msg.includes("403") || msg.includes("permission denied")) {
            title = "ACCESS DENIED";
            message = "Permission denied. Your API key may lack the required scope or the billing account might be inactive.";
        } else if (msg.includes("429") || msg.includes("quota")) {
            title = "QUOTA EXCEEDED";
            message = "Rate limit reached. Please standby before retrying operation.";
        } else if (msg.includes("503") || msg.includes("overloaded")) {
            title = "SERVER OVERLOAD";
            message = "Neural network capacity exceeded. Retrying in T-minus moments recommended.";
        } else if (msg.includes("safety") || msg.includes("blocked")) {
            title = "SAFETY PROTOCOL";
            message = "Content blocked by safety filters. Revise input parameters to comply with safety guidelines.";
        } else if (msg.includes("fetch failed") || msg.includes("network")) {
            title = "CONNECTION LOST";
            message = "Uplink to AI Core failed. Verify network integrity and connection status.";
        } else if (msg.includes("candidate")) {
             title = "GENERATION ERROR";
             message = "Model failed to generate valid output for the given input parameters. The prompt may be too complex.";
        } else {
             // Handle custom pipe-delimited errors passed through
             if (error.message.includes("|")) {
                 const parts = error.message.split("|");
                 title = parts[0];
                 message = parts.slice(1).join("|");
             } else {
                 message = error.message;
             }
        }
    }

    // Throw a pipe-delimited string for the UI to parse into Title and Message
    throw new Error(`${title}|${message}`);
};

const getClient = () => {
    let apiKey = undefined;
    
    // 1. Try standard process.env (Node/Webpack environments)
    try {
        if (typeof process !== 'undefined' && process.env) {
            apiKey = process.env.API_KEY;
        }
    } catch (e) {
        // Ignore reference errors if process is not defined
    }

    // 2. Try Vite standard import.meta.env (Browser/Vercel environments)
    if (!apiKey) {
        try {
            // @ts-ignore - import.meta meta-property might not be typed in all configs
            apiKey = import.meta.env?.VITE_API_KEY || import.meta.env?.API_KEY;
        } catch (e) {
             // Ignore if import.meta is not available
        }
    }

    if (!apiKey) {
        throw new Error("CONFIGURATION ERROR|API Key is missing. Please add VITE_API_KEY to your environment variables (e.g. Vercel Settings).");
    }

    // 3. Validate Key Format (Must start with AIza)
    if (!apiKey.startsWith("AIza")) {
        throw new Error(`INVALID API KEY|The provided key '${apiKey.substring(0, 8)}...' does not look like a valid Google API Key. It must start with 'AIza'. You may have pasted a Project ID (e.g. 'gen-lang-client') by mistake.`);
    }
    
    return new GoogleGenAI({ apiKey });
}

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
  try {
      const ai = getClient();
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
      if (!jsonText) throw new Error("GENERATION ERROR|Empty response from neural model.");

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
            model: "gemini-2.5-flash",
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
    qualityScore: { type: Type.INTEGER, description: "Score 0-100 based on coherence, relevance, and adherence to instructions." },
    biasDetected: { type: Type.BOOLEAN, description: "True if any political, social, or harmful bias is detected." },
    biasAnalysis: { type: Type.STRING, description: "Explanation of the bias check." },
    tone: { type: Type.STRING, description: "The perceived tone of the text (e.g. Formal, Creative, Urgent)." }
  },
  required: ["qualityScore", "biasDetected", "biasAnalysis", "tone"]
};

export const evaluatePerformance = async (prompt: string, config: ModelConfig, language: 'pt-BR' | 'en'): Promise<PerformanceMetrics> => {
    try {
        const ai = getClient();
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
        if (!analysisJson) throw new Error("GENERATION ERROR|Judge failed to respond");

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
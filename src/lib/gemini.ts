import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini SDK
// process.env.GEMINI_API_KEY is injected by the platform
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const MODELS = {
  FLASH: "gemini-2.0-flash",
  EMBEDDING: "text-embedding-004"
};

/**
 * Transcribe audio blob to text using Gemini
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const base64Audio = await blobToBase64(audioBlob);
  const response = await ai.models.generateContent({
    model: MODELS.FLASH,
    contents: [{
      role: "user",
      parts: [
        { inlineData: { mimeType: audioBlob.type || "audio/webm", data: base64Audio } },
        { text: "Transcribe this audio exactly as spoken. Return only the transcript." }
      ]
    }]
  });
  return response.text || "";
}

/**
 * Generate a dynamic session prompt or response
 */
export async function generateSessionResponse(
  systemInstruction: string,
  history: { role: 'user' | 'model', content: string }[]
) {
  const contents = history.map(h => ({
    role: h.role,
    parts: [{ text: h.content }]
  }));

  const response = await ai.models.generateContent({
    model: MODELS.FLASH,
    contents,
    config: {
      systemInstruction,
      temperature: 0.7
    }
  });

  return response.text || "";
}

/**
 * Extract entities and memory card data from a transcript
 */
export async function extractMemoryData(transcript: string) {
  const response = await ai.models.generateContent({
    model: MODELS.FLASH,
    contents: `Analyze this transcript and extract structured identity data. Return JSON.
    Transcript: ${transcript}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          summary: { type: Type.STRING },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          emotionalValence: { type: Type.NUMBER, description: "Score from -1 to 1" },
          entities: {
            type: Type.OBJECT,
            properties: {
              people: { type: Type.ARRAY, items: { type: Type.STRING } },
              places: { type: Type.ARRAY, items: { type: Type.STRING } },
              years: { type: Type.ARRAY, items: { type: Type.STRING } },
              values: { type: Type.ARRAY, items: { type: Type.STRING } },
              emotions: { type: Type.ARRAY, items: { type: Type.STRING } },
              recurringThemes: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        },
        required: ["title", "summary", "tags", "entities", "emotionalValence"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse Gemini JSON:", e);
    return null;
  }
}

/**
 * Generate embeddings for a text string
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const embedResponse = await ai.models.embedContent({
    model: MODELS.EMBEDDING,
    contents: [{ role: "user", parts: [{ text }] }]
  });
  return embedResponse.embeddings[0].values;
}

/**
 * Analyze emotional state for Bridge Session
 */
export async function analyzeEmotionalState(snippet: string) {
  const response = await ai.models.generateContent({
    model: MODELS.FLASH,
    contents: `Analyze the emotional state of this dementia patient based on this conversation snippet. 
    Snippet: ${snippet}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          state: { type: Type.STRING },
          valence: { type: Type.NUMBER },
          arousal: { type: Type.NUMBER },
          recommendation: { type: Type.STRING }
        },
        required: ["state", "valence", "arousal", "recommendation"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return null;
  }
}

/**
 * Generate Bridge Session Prompts
 */
export async function generateBridgePrompts(pim: any, topMemories: any[]) {
  const response = await ai.models.generateContent({
    model: MODELS.FLASH,
    contents: `You are a Bridge Session Coach for a family caring for someone with dementia. 
    Based on this person's PIM and top memories, generate 5 highly specific conversation prompts for a family member to use RIGHT NOW. 
    Each prompt must reference a real detail from their life.
    
    PIM: ${JSON.stringify(pim)}
    Memories: ${JSON.stringify(topMemories)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            type: { type: Type.STRING, enum: ["STORY", "ANCHOR", "SENSORY", "VALUE"] },
            sourceMemoryTitle: { type: Type.STRING }
          },
          required: ["text", "confidence", "type", "sourceMemoryTitle"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    return [];
  }
}

/**
 * Generate Emergency Re-Anchor phrases
 */
export async function generateGroundingPhrases(topMemories: any[]) {
    const response = await ai.models.generateContent({
      model: MODELS.FLASH,
      contents: `This dementia patient is distressed. Generate 3 gentle grounding phrases using ONLY details from their own real memories: 
      ${JSON.stringify(topMemories)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    try {
      return JSON.parse(response.text || "[]");
    } catch (e) {
      return [];
    }
}

/**
 * Generate Living Biography
 */
export async function* streamBiography(memories: any[]) {
    const streamResponse = await ai.models.generateContentStream({
      model: MODELS.FLASH,
      contents: `Write a deeply personal, narrative biography of this person based solely on their captured memories. 
      Write in third person, past tense for historical, present for ongoing traits. 
      Structure: Early Life, Relationships, Work & Values, The Stories They Always Told, What Made Them Themselves. 
      Use their real words where possible.
      
      Memories: ${JSON.stringify(memories)}`,
      config: {
          temperature: 0.8
      }
    });

    for await (const chunk of streamResponse) {
      yield chunk.text;
    }
}

// Helper: Convert File/Blob to base64
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

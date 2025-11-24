import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const API_KEY = process.env.API_KEY || '';

// Initialize client - safe to do globally if key exists, otherwise handled in functions
const ai = new GoogleGenAI({ apiKey: API_KEY });

export const analyzeImage = async (base64Image: string): Promise<AnalysisResult> => {
  if (!API_KEY) {
    console.warn("No API Key provided. Returning mock data.");
    return {
      theme: "Simulation Mode",
      elements: ["✨", "🔮", "🧬", "🧿"],
      distortionType: "liquid",
      colorHex: "#00ffcc"
    };
  }

  try {
    // Remove header if present (data:image/jpeg;base64,)
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: `Analyze this image and provide a creative "distortion theme". 
            Return a JSON object with:
            - theme: A short 2-3 word creative title (e.g., "Cyberpunk Decay", "Organic Melt").
            - elements: An array of 5 single distinct emojis that relate to the objects in the photo.
            - distortionType: One of ["liquid", "glitch", "warp"]. Choose based on the vibe.
            - colorHex: A dominant neon accent color code from the image.
            `
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            theme: { type: Type.STRING },
            elements: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            distortionType: { 
              type: Type.STRING, 
              enum: ["liquid", "glitch", "warp"] 
            },
            colorHex: { type: Type.STRING }
          },
          required: ["theme", "elements", "distortionType", "colorHex"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text) as AnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    // Fallback
    return {
      theme: "System Error",
      elements: ["⚠️", "🚫", "👾"],
      distortionType: "glitch",
      colorHex: "#ff0055"
    };
  }
};

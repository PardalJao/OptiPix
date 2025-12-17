import { GoogleGenAI } from "@google/genai";

/**
 * Initializes the Gemini API client.
 * Uses process.env.API_KEY as per instructions.
 */
const getGeminiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Generates an SEO-friendly Alt Text for an image using Gemini 3 Flash.
 * @param base64Data The base64 data URL of the image
 * @param mimeType The mime type of the image
 */
export const generateImageAltText = async (
  base64Data: string, 
  mimeType: string
): Promise<string> => {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error("API Key is missing or invalid.");
  }

  // Ensure clean base64 string by removing the data URL prefix
  const cleanBase64 = base64Data.split(',')[1] || base64Data;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: cleanBase64
              }
            },
            {
              text: "Analise esta imagem e gere um texto alternativo (Alt Text) otimizado para SEO em Português. Seja descritivo mas conciso (máximo 120 caracteres). Não use aspas ou prefixos como 'Alt text:'."
            }
          ]
        }
      ],
      config: {
        temperature: 0.4,
        topP: 0.8,
        topK: 40
      }
    });

    return response.text?.trim() || "Descrição não disponível.";
  } catch (error) {
    console.error("Erro ao gerar Alt Text:", error);
    throw error;
  }
};
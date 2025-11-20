import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const API_KEY = process.env.API_KEY || '';

// Initialize Gemini Client
// Note: In a production environment, calls should be proxied through a backend to protect the API Key,
// or strict usage limits should be applied if client-side.
const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateGeminiSentence = async (word: string, definition: string): Promise<string> => {
  if (!API_KEY) {
    console.warn("Gemini API Key missing");
    return "AI生成機能が無効です。API設定を確認してください。";
  }

  try {
    const prompt = `
      Context: English Learning App for Japanese students.
      Task: Create a single, natural, and short example sentence using the English word "${word}".
      Constraint: The sentence must reflect the meaning: "${definition}".
      Output: Only the English sentence. No translations or extra text.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text?.trim() || "例文を生成できませんでした。";
  } catch (error) {
    console.error("Gemini generation error:", error);
    return "エラーが発生しました。もう一度お試しください。";
  }
};
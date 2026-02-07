
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";

const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const reimagineSpace = async (base64Image: string, stylePrompt: string): Promise<string | null> => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1],
              mimeType: 'image/jpeg',
            },
          },
          {
            text: `Reimagine this exact room layout in a ${stylePrompt} style. Keep the structural architectural features like windows and doors, but replace all furniture, flooring, wall colors, and decor to match the style. Generate a high-quality photo-realistic result.`,
          },
        ],
      },
    });

    for (const part of response.candidates?.[0]?.content.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Error reimagining space:", error);
    return null;
  }
};

export const editDesign = async (base64Image: string, instruction: string): Promise<string | null> => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1],
              mimeType: 'image/jpeg',
            },
          },
          {
            text: `Modify this room design based on this request: "${instruction}". Retain the overall composition while applying the specific change.`,
          },
        ],
      },
    });

    for (const part of response.candidates?.[0]?.content.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Error editing design:", error);
    return null;
  }
};

export const getChatResponse = async (
  message: string, 
  history: { role: 'user' | 'model', parts: { text: string }[] }[]
) => {
  const ai = getAIClient();
  try {
    const chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      config: {
        systemInstruction: `You are an expert AI Interior Design Consultant. 
        Your goal is to help users refine their room designs. 
        When users ask for changes, analyze if they are visual (e.g., "change the color", "add a lamp") or informational.
        Provide professional design advice, suggest furniture layouts, and help with color theories.
        If a user asks for specific furniture, use Google Search grounding to find real products and return shoppable links.`,
        tools: [{ googleSearch: {} }],
      },
    });

    // Handle history manually or use simple prompt if history is too long
    const response = await chat.sendMessage({ message });
    
    return {
      text: response.text || "I'm sorry, I couldn't process that request.",
      groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (error) {
    console.error("Error in chat service:", error);
    return { text: "Error connecting to AI. Please try again.", groundingChunks: [] };
  }
};

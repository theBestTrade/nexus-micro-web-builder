
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '', vertexai: true });

export const generateCongratulatoryMessage = async (guestName: string, relation: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        role: 'user',
        parts: [
          {
            text: `결혼식 축하 메시지를 작성해줘. 
            축하하는 사람 이름: ${guestName}
            신랑/신부와의 관계: ${relation}
            분위기: 따뜻하고 정중하며 감동적인 한국어 메시지. 
            길이: 2-3문장 내외.`
          }
        ]
      },
      config: {
        temperature: 0.8,
        topP: 0.95,
      }
    });
    return response.text || "결혼을 진심으로 축하드립니다! 두 분의 앞날에 행복만 가득하시길 기원합니다.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "결혼을 진심으로 축하드립니다! 두 분의 앞날에 행복만 가득하시길 기원합니다.";
  }
};

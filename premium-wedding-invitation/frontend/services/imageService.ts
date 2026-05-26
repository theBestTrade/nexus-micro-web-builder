
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '', vertexai: true });

/**
 * AI를 사용하여 시네마틱한 웨딩 히어로 이미지 세트를 생성합니다.
 */
export const generateHeroImages = async (count: number = 3): Promise<string[]> => {
  try {
    const prompts = [
      'A cinematic wedding photo of a Korean couple kissing at night in front of a glowing orange tower, 2:3 aspect ratio, high quality, romantic lighting.',
      'A romantic wedding photo of a Korean couple holding hands walking towards a glowing tower at night, 2:3 aspect ratio, cinematic bokeh.',
      'A close up romantic wedding photo of a Korean couple looking at each other with city lights background, 2:3 aspect ratio, elegant atmosphere.'
    ];

    const results = await Promise.all(prompts.slice(0, count).map(async (prompt) => {
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          aspectRatio: '3:4',
        },
      });
      return `data:image/png;base64,${response.generatedImages[0].image.imageBytes}`;
    }));

    return results;
  } catch (error) {
    console.error("Imagen Error:", error);
    return [
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1465495910483-0d6749ee9973?auto=format&fit=crop&q=80&w=1000"
    ];
  }
};

/**
 * 특정 주소(세인트메리스, 반포대로 222)를 기반으로 한 Naver Map 캡처 스타일 이미지를 생성합니다.
 */
export const generateMapImage = async (): Promise<string> => {
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: 'A high-resolution screenshot of a digital map (Naver Map style) centered on Banpo-daero 222, Seoul. Showing detailed streets, building outlines, and a prominent pink location pin marker labeled "Saint Marys Wedding Hall". Clean UI, professional map aesthetic, 16:9 aspect ratio.',
      config: {
        numberOfImages: 1,
        aspectRatio: '16:9',
      },
    });
    return `data:image/png;base64,${response.generatedImages[0].image.imageBytes}`;
  } catch (error) {
    console.error("Map Image Error:", error);
    return "https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?auto=format&fit=crop&q=80&w=1000";
  }
};

import { GoogleGenAI } from '@google/genai';

// 가상의 STT(Speech-to-Text) 추출 결과 목업 데이터
const MOCK_STT_TEXT = `
[00:00] 안녕하세요 여러분, 오늘은 정말 놀라운 제품을 가져왔습니다.
[00:05] 이 작은 기기가 여러분의 일상을 완전히 바꿔놓을 거예요.
[00:10] 바쁜 아침, 커피 한 잔 내릴 시간도 부족하시죠?
[00:15] 이제 버튼 한 번이면 모든 게 해결됩니다.
[00:20] 가격도 정말 착해서 지금 당장 구매하셔야 해요!
`;

/**
 * Gemini API를 호출하여 톤앤매너에 맞는 대본을 생성합니다.
 * @param tone 폼에서 선택한 번역 및 톤앤매너 설정값
 * @returns 생성된 대본 텍스트
 */
export const generateScript = async (tone: string): Promise<string> => {
  try {
    // 시스템 프롬프트 규칙에 따라 process.env.API_KEY 사용
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });

    let systemInstruction = '';

    // 프롬프트 분기 처리
    if (tone.includes('한국어')) {
      systemInstruction = `
        당신은 트렌디하고 직관적인 유튜브 쇼츠 대본 작가입니다. 
        주어진 STT 텍스트를 '한국어 사이다/정보형' 스타일로 각색하세요. 
        - 시청자의 시선을 확 끄는 강력한 후킹(Hooking) 문장으로 시작하세요.
        - 군더더기 없이 빠르고 경쾌한 템포로 정보를 전달하세요.
        - 시청자가 당장 행동(구매, 구독 등)을 하도록 유도하는 콜투액션(CTA)을 포함하세요.
      `;
    } else if (tone.includes('일본어')) {
      systemInstruction = `
        당신은 감성적이고 여운이 남는 일본 로우파이(Lo-fi) 영상 대본 작가입니다. 
        주어진 STT 텍스트를 '일본어 특유의 감성적인 독백' 스타일로 각색하세요. 
        - 시적이고 차분한 어조를 사용하며, 듣는 이에게 위로를 주는 느낌으로 작성하세요.
        - 일상의 소소한 행복을 강조하는 톤을 유지하세요.
        - 출력은 한국어로 하되, 일본 애니메이션이나 영화에서 볼 법한 감성적인 번역투를 살려주세요.
      `;
    } else {
      systemInstruction = '주어진 텍스트를 자연스럽고 매끄럽게 각색하세요.';
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // 시스템 규칙에 따라 gemini-2.5-flash 사용
      contents: {
        role: 'user',
        parts: [
          {
            text: `다음은 원본 영상에서 추출한 STT 텍스트입니다:\n\n${MOCK_STT_TEXT}\n\n위 텍스트를 바탕으로 지시사항에 맞게 완벽한 대본을 작성해주세요.`,
          },
        ],
      },
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text || '대본 생성에 실패했습니다.';
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("AI 대본 생성 중 오류가 발생했습니다. API 키 설정을 확인해주세요.");
  }
};

/**
 * Gemini API를 호출하여 숏폼 대본을 GEO 최적화된 긴 블로그 포스팅으로 변환합니다.
 * @param script 생성된 숏폼 대본
 * @param tone 폼에서 선택한 번역 및 톤앤매너 설정값
 * @returns 마크다운 형식의 블로그 원고
 */
export const generateBlogPost = async (script: string, tone: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });

    const systemInstruction = `
      당신은 SEO 및 GEO(Generative Engine Optimization) 전문가이자 전문 블로거입니다. 
      주어진 숏폼 대본을 바탕으로, 네이버 블로그나 워드프레스에 즉시 발행할 수 있는 고품질의 긴 글(Long-form) 마크다운 포스팅을 작성하세요.
      
      [작성 가이드]
      1. 검색 엔진과 AI 검색(GEO)에 최적화된 매력적인 제목(H1)을 작성하세요.
      2. 서론, 본론, 결론의 구조를 갖추고 소제목(H2, H3)으로 단락을 명확히 구분하세요.
      3. 가독성을 높이기 위해 불릿 포인트(-)와 강조(볼드체)를 적절히 사용하세요.
      4. 숏폼 대본의 내용을 확장하여, 독자에게 유용한 정보와 스토리텔링을 추가하세요.
      5. 글의 톤앤매너는 '${tone}'의 느낌을 살려 자연스럽게 작성하세요.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        role: 'user',
        parts: [
          {
            text: `다음은 영상 대본입니다. 이 내용을 바탕으로 GEO 최적화 블로그 포스팅을 마크다운 형식으로 작성해주세요:\n\n${script}`,
          },
        ],
      },
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text || '블로그 원고 생성에 실패했습니다.';
  } catch (error) {
    console.error("Gemini API Error (Blog):", error);
    return "블로그 원고 생성 중 오류가 발생했습니다. API 키 설정을 확인해주세요.";
  }
};

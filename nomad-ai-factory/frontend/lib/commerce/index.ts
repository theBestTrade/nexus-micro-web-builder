export interface CommerceProduct {
  productName: string;
  coupangLink: string;
  naverLink: string;
  expectedProfit: number;
}

/**
 * 영상 대본에서 키워드를 추출하여 쿠팡 파트너스 및 네이버 쇼핑 API를 검색하고,
 * 시세차익(마진)이 높은 상품 링크를 매칭하여 반환합니다.
 * (프론트엔드 환경을 위한 시뮬레이션 로직)
 */
export const getCommerceLinks = async (script: string): Promise<CommerceProduct[]> => {
  console.log("🛒 [Commerce] 대본에서 키워드 추출 및 커머스 API 검색 중...");
  
  // 실제 환경에서는 NLP를 통해 키워드를 추출하고 쿠팡/네이버 API를 호출합니다.
  await new Promise(resolve => setTimeout(resolve, 2000)); // API 호출 시뮬레이션 2초 대기

  // 대본 내용에 따른 가상의 키워드 매칭 로직
  let keyword = "스마트 홈 기기";
  if (script.includes("커피")) keyword = "전자동 커피머신";
  else if (script.includes("청소")) keyword = "무선 로봇청소기";
  else if (script.includes("강아지") || script.includes("고양이")) keyword = "반려동물 자동 급식기";

  console.log(`🛒 [Commerce] 추출된 키워드: '${keyword}' - 고마진 상품 검색 완료`);

  return [
    {
      productName: `[가성비 갑] 2024년형 최신 ${keyword}`,
      coupangLink: `https://coupa.ng/mock_link_${Date.now()}`,
      naverLink: `https://search.shopping.naver.com/mock_link_${Date.now()}`,
      expectedProfit: 15000, // 예상 마진 15,000원
    },
    {
      productName: `[프리미엄] 전문가용 ${keyword} PRO`,
      coupangLink: `https://coupa.ng/mock_link_pro_${Date.now()}`,
      naverLink: `https://search.shopping.naver.com/mock_link_pro_${Date.now()}`,
      expectedProfit: 45000, // 예상 마진 45,000원
    }
  ];
};

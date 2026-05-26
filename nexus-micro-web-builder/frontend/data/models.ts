import { 
  Heart,
  Baby, 
  FileText, 
  Contact, 
  Store, 
  Ticket, 
  Building, 
  Briefcase, 
  MessageSquare, 
  Utensils, 
  Dog, 
  Image as ImageIcon 
} from 'lucide-react';
import { BusinessModel } from '../types';

export const modelsData: BusinessModel[] = [
  { 
    id: '0', 
    title: '모바일 청첩장 (프리미엄)', 
    priceRange: '80,000원 ~ 250,000원', 
    icon: Heart, 
    details: {
      priceTitle: '기본 80,000원\n풀커스텀 250,000원',
      priceDesc: '단순 템플릿을 넘어선 벤토 그리드 레이아웃과 인터랙티브 애니메이션이 포함된 하이엔드 상품.',
      design: '미니멀한 베이지 톤, 세리프 서체와 산세리프의 조화, 비정형 그리드 시스템, 부드러운 시각적 위계.',
      sales: '고급 웨딩 컨설팅 업체와의 파트너십, 인스타그램 감성 마케팅, 프리미엄 웨딩 커뮤니티 타겟팅.'
    },
    chartData: { x: 10, y: 9 } 
  },
  { 
    id: '1', 
    title: '모바일 돌잔치 초대장', 
    priceRange: '40,000원 ~ 100,000원', 
    icon: Baby, 
    details: {
      priceTitle: '평균 50,000원\n패키지 100,000원',
      priceDesc: '성장 동영상과 연동된 통합 모바일 페이지. 맘카페 체험단 마케팅으로 높은 전환율 확보 가능.',
      design: '파스텔 톤의 따뜻한 컬러 팔레트, 둥근 모서리의 카드 UI, 아이의 성장 기록을 담은 타임라인 그리드.',
      sales: '지역 맘카페 제휴, 돌잔치 전문 홀 B2B 납품, 인스타그램 육아 인플루언서 협찬 마케팅.'
    },
    chartData: { x: 8, y: 7 } 
  },
  { 
    id: '2', 
    title: '모바일 부고장 / 조의장', 
    priceRange: '30,000원 ~ 60,000원', 
    icon: FileText, 
    details: {
      priceTitle: '건당 30,000원\n기업 제휴 별도',
      priceDesc: '장례식장 및 상조 회사와의 B2B 계약을 통해 안정적인 대량 수주가 가능한 고효율 모델.',
      design: '차분한 무채색 톤, 가독성을 최우선으로 한 타이포그래피, 직관적인 정보 배치와 계좌 복사 기능.',
      sales: '전국 장례식장 영업, 상조 서비스 부가 기능 도입 제안, 검색 광고 기반의 긴급 수요 대응.'
    },
    chartData: { x: 9, y: 10 } 
  },
  { 
    id: '3', 
    title: '디지털 명함 (SaaS형)', 
    priceRange: '월 4,900원 ~ 기업형 별도', 
    icon: Contact, 
    details: {
      priceTitle: '개인 월 4,900원\n기업 연 500만원~',
      priceDesc: '단순 명함을 넘어 포트폴리오와 SNS가 결합된 개인 브랜딩 페이지. 기업용 관리자 페이지 제공.',
      design: '다크 모드 기반의 테크니컬한 디자인, 카드 형태의 링크 모음, NFC 카드와 연동되는 하이브리드 경험.',
      sales: '링크드인 B2B 영업, 스타트업 커뮤니티 홍보, 컨퍼런스 및 네트워킹 행사 공식 파트너 참여.'
    },
    chartData: { x: 9, y: 8 } 
  },
  { 
    id: '4', 
    title: '소상공인 미니 홈피', 
    priceRange: '200,000원 ~ 600,000원', 
    icon: Store, 
    details: {
      priceTitle: '구축 300,000원\n관리 월 30,000원',
      priceDesc: '인스타그램 프로필 링크를 대체하는 고성능 랜딩페이지. 예약 및 문의 버튼 최적화.',
      design: '브랜드 컬러를 강조한 벤토 레이아웃, 실시간 영업 상태 표시, 메뉴 및 서비스의 시각적 큐레이션.',
      sales: '지역 소상공인 대상 인스타그램 DM 영업, 네이버 플레이스 등록 대행 서비스와 패키지 판매.'
    },
    chartData: { x: 7, y: 9 } 
  },
  { 
    id: '5', 
    title: '행사 / 세미나 안내장', 
    priceRange: '150,000원 ~ 400,000원', 
    icon: Ticket, 
    details: {
      priceTitle: '단건 200,000원\n등록 시스템 포함 40만',
      priceDesc: '컨퍼런스, 웨비나, 사내 행사를 위한 전문 안내 페이지. 사전 등록 및 알림톡 연동 가능.',
      design: '신뢰감을 주는 볼드한 타이포그래피, 타임라인 기반의 세션 안내, 연사 프로필 카드 그리드.',
      sales: 'MICE 산업 관련 업체 B2B 영업, 기업 교육 및 인사팀 대상 제안, 온오프믹스 등 플랫폼 홍보.'
    },
    chartData: { x: 6, y: 8 } 
  },
  { 
    id: '6', 
    title: '부동산 모바일 전단', 
    priceRange: '100,000원 ~ 300,000원', 
    icon: Building, 
    details: {
      priceTitle: '매물당 100,000원\n월 정액 500,000원',
      priceDesc: '고급 빌라, 신축 분양 현장에 특화된 프리미엄 매물 소개 페이지. 카카오톡 공유 최적화.',
      design: '고해상도 이미지 슬라이더, 매물 특징을 한눈에 보여주는 아이콘 그리드, 담당자 즉시 연결 CTA.',
      sales: '강남/한남 등 고급 주거지역 공인중개사 타겟 영업, 분양 대행사 대상 모바일 카탈로그 제안.'
    },
    chartData: { x: 7, y: 7 } 
  },
  { 
    id: '7', 
    title: '프리랜서 포트폴리오', 
    priceRange: '150,000원 ~ 450,000원', 
    icon: Briefcase, 
    details: {
      priceTitle: '기본 200,000원\n커스텀 450,000원',
      priceDesc: '자신을 브랜드화하려는 전문가들을 위한 웹 포트폴리오. 노션보다 전문적인 인상을 제공.',
      design: '미니멀한 레이아웃, 프로젝트별 카드 그리드, 스킬셋 시각화, 문의 폼 및 SNS 연동.',
      sales: '디자인/개발 커뮤니티 홍보, 크몽/숨고 등 전문가 매칭 플랫폼 입점, 개인 브랜딩 강의 연계.'
    },
    chartData: { x: 6, y: 6 } 
  },
  { 
    id: '8', 
    title: '온라인 롤링페이퍼', 
    priceRange: '무료 ~ 프리미엄 9,900원', 
    icon: MessageSquare, 
    details: {
      priceTitle: '부분 유료화\n(광고제거/테마 9.9천)',
      priceDesc: '바이럴 효과가 극대화된 모델. 대량의 트래픽을 기반으로 한 광고 수익 및 프리미엄 기능 판매.',
      design: '아기자기하고 감성적인 스티커 UI, 메시지 카드들이 자유롭게 배치된 벤토 그리드, 애니메이션 효과.',
      sales: '졸업/입학/연말 시즌 SNS 바이럴 마케팅, 틱톡/릴스 챌린지 연계, 학교/동아리 커뮤니티 홍보.'
    },
    chartData: { x: 10, y: 5 } 
  },
  { 
    id: '9', 
    title: '모바일 메뉴판 (QR)', 
    priceRange: '초기 150,000원 + 월 15,000원', 
    icon: Utensils, 
    details: {
      priceTitle: '세팅비 150,000원\n월 구독 15,000원',
      priceDesc: '종이 메뉴판을 대체하는 스마트 메뉴판. 메뉴 수정이 실시간으로 가능하며 인건비 절감 효과.',
      design: '음식 사진 중심의 매거진 스타일 레이아웃, 카테고리 탭 시스템, 알러지 정보 등 상세 필터.',
      sales: '신규 창업 식당/카페 대상 영업, 포스(POS) 업체와의 제휴를 통한 번들 판매.'
    },
    chartData: { x: 8, y: 6 } 
  },
  { 
    id: '10', 
    title: '반려동물 QR 프로필', 
    priceRange: '25,000원 ~ 45,000원', 
    icon: Dog, 
    details: {
      priceTitle: '단건 30,000원\n굿즈 포함 45,000원',
      priceDesc: '인식표 QR 스캔 시 나타나는 반려동물 상세 프로필. 미아 방지 및 건강 정보 공유 목적.',
      design: '반려동물의 특징을 담은 귀여운 카드 UI, 긴급 연락처 강조, 사료/질환 정보 등 관리 데이터 그리드.',
      sales: '반려동물 용품 쇼핑몰 입점, 동물병원 B2B 납품, 펫페어 오프라인 부스 홍보.'
    },
    chartData: { x: 5, y: 10 } 
  },
  { 
    id: '11', 
    title: '온라인 전시 / 갤러리', 
    priceRange: '300,000원 ~ 1,000,000원', 
    icon: ImageIcon, 
    details: {
      priceTitle: '기본 400,000원\n3D 전시 1,000,000원',
      priceDesc: '아티스트의 작품을 온라인에서 감상할 수 있는 디지털 갤러리. 도슨트 기능 및 작품 구매 연동.',
      design: '작품에 집중할 수 있는 다크 모드, 가로 스크롤 및 줌 기능, 작품 상세 정보와 작가 노트 그리드.',
      sales: '미대 졸업 전시회 단체 수주, 신진 작가 대상 프로모션, 갤러리 및 문화 재단 제안.'
    },
    chartData: { x: 4, y: 6 } 
  }
];

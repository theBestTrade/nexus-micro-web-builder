
import { WeddingData } from './types';

/**
 * 청첩장 기본 정보 설정
 */
export const WEDDING_DATA: WeddingData = {
  groom: {
    name: "방준혁",
    phone: "010-1234-5678",
    father: "방아빠",
    mother: "김엄마",
    account: "110-123-456789",
    bank: "신한은행"
  },
  bride: {
    name: "임영주",
    phone: "010-8765-4321",
    father: "임부친",
    mother: "박모친",
    account: "1002-123-456789",
    bank: "우리은행"
  },
  date: "2026-05-03T12:00:00",
  location: {
    name: "세인트메리스",
    address: "서울특별시 서초구 반포대로 222",
    hall: "5F 그랜드홀",
    mapUrl: "https://maps.google.com"
  },
  message: "서로가 마주보며 다져온 사랑을 이제 함께 한 곳을 바라보며 걸어가려 합니다. 저희의 새로운 출발을 축복해 주시면 감사하겠습니다."
};

/**
 * 화환 업체 링크 (요청하신 링크로 업데이트)
 */
export const WREATH_URL = "https://invitation.flabiz.kr/invitation/barunson/i62n9oB/products";

/**
 * 갤러리 이미지 리스트 (10개 구성)
 */
export const GALLERY_IMAGES = [
  { src: "https://picsum.photos/seed/w1/800/1200", span: "col-span-2 row-span-2" },
  { src: "https://picsum.photos/seed/w2/800/800", span: "col-span-1 row-span-1" },
  { src: "https://picsum.photos/seed/w3/800/800", span: "col-span-1 row-span-1" },
  { src: "https://picsum.photos/seed/w4/800/1200", span: "col-span-1 row-span-2" },
  { src: "https://picsum.photos/seed/w5/1200/800", span: "col-span-2 row-span-1" },
  { src: "https://picsum.photos/seed/w6/800/800", span: "col-span-1 row-span-1" },
  { src: "https://picsum.photos/seed/w7/800/1200", span: "col-span-1 row-span-2" },
  { src: "https://picsum.photos/seed/w8/1200/800", span: "col-span-2 row-span-1" },
  { src: "https://picsum.photos/seed/w9/800/800", span: "col-span-1 row-span-1" },
  { src: "https://picsum.photos/seed/w10/1200/800", span: "col-span-2 row-span-1" },
];

export const BG_MUSIC_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

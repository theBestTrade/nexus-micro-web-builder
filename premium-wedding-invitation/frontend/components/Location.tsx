
import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Map as MapIcon } from 'lucide-react';
import { WeddingData } from '../types';
import { generateMapImage } from '../services/imageService';

interface LocationProps {
  location: WeddingData['location'];
}

/**
 * Location 컴포넌트: 실제 세인트메리스(반포대로 222) 위치를 나타내는 네이버 지도 캡처 스타일 이미지 적용
 */
const Location: React.FC<LocationProps> = ({ location }) => {
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadMap = async () => {
      const url = await generateMapImage();
      setMapImageUrl(url);
    };
    loadMap();
  }, []);
  
  const openMap = (type: 'naver' | 'kakao') => {
    const encodedName = encodeURIComponent(location.name);
    if (type === 'naver') {
      window.open(`https://map.naver.com/v5/search/${encodedName}`, '_blank');
    } else {
      window.open(`https://map.kakao.com/link/search/${encodedName}`, '_blank');
    }
  };

  return (
    <section className="px-8">
      <div className="text-center mb-10">
        <h2 className="font-serif italic text-2xl text-stone-700 tracking-widest">Location</h2>
        <p className="text-[10px] text-stone-400 uppercase tracking-[0.2em] mt-2">오시는 길</p>
      </div>

      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-bold text-stone-800 mb-1">{location.name}</h3>
          <p className="text-stone-500 text-xs font-light">{location.address}</p>
          <p className="text-pink-500 text-sm font-medium mt-1">{location.hall}</p>
        </div>

        {/* 네이버 지도 캡처 스타일의 이미지 */}
        <div className="aspect-video bg-stone-100 rounded-2xl overflow-hidden relative border border-stone-200 shadow-md">
          {mapImageUrl ? (
            <img 
              src={mapImageUrl} 
              alt="Naver Map Capture Style" 
              className="w-full h-full object-cover opacity-95"
            />
          ) : (
            <div className="w-full h-full bg-stone-200 animate-pulse" />
          )}
          <div className="absolute inset-0 bg-black/5"></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="bg-white p-3 rounded-full shadow-2xl animate-bounce">
              <MapPin className="text-pink-500" size={32} />
            </div>
            <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-stone-100">
              <span className="text-[11px] text-stone-700 font-bold">지도를 클릭하여 앱으로 연결하세요</span>
            </div>
          </div>
          <button 
            onClick={() => openMap('kakao')}
            className="absolute inset-0 w-full h-full cursor-pointer"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => openMap('naver')}
            className="flex items-center justify-center gap-2 py-4 bg-white border border-stone-200 rounded-xl text-stone-600 text-xs font-bold hover:bg-stone-50 transition-all shadow-sm"
          >
            <Navigation size={14} className="text-green-500" />
            네이버 지도
          </button>
          <button 
            onClick={() => openMap('kakao')}
            className="flex items-center justify-center gap-2 py-4 bg-white border border-stone-200 rounded-xl text-stone-600 text-xs font-bold hover:bg-stone-50 transition-all shadow-sm"
          >
            <MapIcon size={14} className="text-yellow-500" />
            카카오 맵
          </button>
        </div>

        <div className="space-y-6 pt-6 border-t border-stone-100">
          <div>
            <h4 className="text-xs font-bold text-stone-800 mb-2 flex items-center gap-2">
              <div className="w-1 h-3 bg-pink-300 rounded-full"></div>
              지하철
            </h4>
            <p className="text-stone-500 text-[11px] leading-relaxed font-light">
              <span className="text-orange-500 font-medium">3호선</span> 고속터미널역 3번 출구 도보 7분<br/>
              <span className="text-yellow-600 font-medium">7호선</span> 고속터미널역 4번 출구 도보 10분
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold text-stone-800 mb-2 flex items-center gap-2">
              <div className="w-1 h-3 bg-pink-300 rounded-full"></div>
              버스
            </h4>
            <p className="text-stone-500 text-[11px] leading-relaxed font-light">
              간선버스: 143, 401, 740<br/>
              지선버스: 3414, 4412, 5413 (서울성모병원 정류장 하차)
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Location;

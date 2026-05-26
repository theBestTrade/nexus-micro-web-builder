
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { WeddingData } from '../types';
import { generateHeroImages } from '../services/imageService';

interface HeroProps {
  data: WeddingData;
  onLoad: () => void;
}

/**
 * Hero 컴포넌트: 2:3 비율의 캐러셀 이미지와 스크롤에 반응하는 텍스트 색상
 */
const Hero: React.FC<HeroProps> = ({ data, onLoad }) => {
  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { scrollY } = useScroll();
  
  // 스크롤에 따른 텍스트 투명도 변화 (0.6 -> 1.0)
  const textOpacity = useTransform(scrollY, [0, 150], [0.6, 1]);
  const y = useTransform(scrollY, [0, 1000], [0, 200]);

  useEffect(() => {
    const loadImages = async () => {
      const urls = await generateHeroImages(3);
      setImages(urls);
      onLoad(); // 이미지 로드 완료 알림
    };
    loadImages();
  }, [onLoad]);

  useEffect(() => {
    if (images.length > 0) {
      const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [images]);

  const weddingDate = new Date(data.date);
  const formattedDate = weddingDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\. /g, '.').replace(/\.$/, '');
  
  const dayName = weddingDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const timeStr = "PM 12:00";

  return (
    <section className="relative w-full bg-stone-900 flex flex-col items-center overflow-hidden">
      <div className="relative w-full aspect-[2/3] overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            style={{ y }}
            className="absolute inset-0 z-0"
          >
            {images.length > 0 ? (
              <motion.img 
                initial={{ scale: 1.1 }}
                animate={{ scale: 1.18, x: -5 }}
                transition={{ duration: 6, ease: "linear" }}
                src={images[currentIndex]} 
                className="w-full h-full object-cover brightness-[0.65]"
              />
            ) : (
              <div className="w-full h-full bg-stone-800 animate-pulse" />
            )}
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-stone-900 z-[5]"></div>

        <motion.div 
          style={{ opacity: textOpacity }}
          className="absolute inset-0 z-10 flex flex-col items-center justify-between py-16 px-6"
        >
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="text-center"
          >
            <h1 className="font-serif text-3xl tracking-[0.4em] flex items-center gap-3 text-white drop-shadow-lg font-bold">
              <span>{data.groom.name}</span>
              <span className="text-lg font-light opacity-40">—</span>
              <span>{data.bride.name}</span>
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="text-center space-y-3"
          >
            {/* 날짜 정보: 핑크색 적용 */}
            <div className="font-serif text-lg tracking-widest text-pink-400 drop-shadow-md font-bold">
              {formattedDate} {dayName} {timeStr}
            </div>
            {/* 장소 정보: 파란색 적용 */}
            <div className="font-light text-sm tracking-[0.2em] text-blue-400 drop-shadow-md font-bold">
              {data.location.name} {data.location.hall}
            </div>
          </motion.div>
        </motion.div>
      </div>

      <motion.div 
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="py-6 opacity-30"
      >
        <div className="w-px h-10 bg-gradient-to-b from-white to-transparent mx-auto"></div>
      </motion.div>
    </section>
  );
};

export default Hero;


import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface GalleryImage {
  src: string;
  span: string;
}

interface GalleryProps {
  images: GalleryImage[];
}

/**
 * Gallery 컴포넌트: 10개의 이미지를 세련된 Bento Grid 레이아웃으로 배치
 */
const Gallery: React.FC<GalleryProps> = ({ images }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const nextImage = () => {
    if (selectedIdx !== null) {
      setSelectedIdx((selectedIdx + 1) % images.length);
    }
  };

  const prevImage = () => {
    if (selectedIdx !== null) {
      setSelectedIdx((selectedIdx - 1 + images.length) % images.length);
    }
  };

  return (
    <section className="px-6">
      <div className="text-center mb-12">
        <h2 className="font-serif italic text-2xl text-stone-700 tracking-widest">Gallery</h2>
        <p className="text-[10px] text-stone-400 uppercase tracking-[0.2em] mt-2">Our Beautiful Moments</p>
      </div>

      {/* 10개 이미지를 위한 그리드 설정 */}
      <div className="grid grid-cols-3 gap-3 auto-rows-[110px]">
        {images.map((img, idx) => (
          <motion.div
            key={idx}
            whileHover={{ scale: 0.98 }}
            whileTap={{ scale: 0.95 }}
            className={`${img.span} overflow-hidden cursor-pointer rounded-2xl shadow-sm bento-item border border-stone-100`}
            onClick={() => setSelectedIdx(idx)}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.05 }}
          >
            <img src={img.src} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
          </motion.div>
        ))}
      </div>

      {/* 라이트박스 모달 */}
      <AnimatePresence>
        {selectedIdx !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md"
          >
            <button 
              className="absolute top-6 right-6 text-white/70 hover:text-white z-[110] p-2"
              onClick={() => setSelectedIdx(null)}
            >
              <X size={32} />
            </button>

            <button 
              className="absolute left-4 text-white/50 hover:text-white z-[110] p-2"
              onClick={prevImage}
            >
              <ChevronLeft size={40} />
            </button>

            <motion.img
              key={selectedIdx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              src={images[selectedIdx].src}
              className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl"
            />

            <button 
              className="absolute right-4 text-white/50 hover:text-white z-[110] p-2"
              onClick={nextImage}
            >
              <ChevronRight size={40} />
            </button>

            <div className="absolute bottom-10 text-white/60 text-xs font-light tracking-widest">
              {selectedIdx + 1} / {images.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default Gallery;

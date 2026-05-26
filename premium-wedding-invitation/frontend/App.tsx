
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { ChevronUp, Volume2, VolumeX, Share2, MessageSquare } from 'lucide-react';
import { WEDDING_DATA, GALLERY_IMAGES, BG_MUSIC_URL } from './constants';
import Hero from './components/Hero';
import Invitation from './components/Invitation';
import Gallery from './components/Gallery';
import Calendar from './components/Calendar';
import Location from './components/Location';
import Contact from './components/Contact';
import Guestbook from './components/Guestbook';
import confetti from 'canvas-confetti';

// 카카오 SDK 타입 정의
declare global {
  interface Window {
    Kakao: any;
  }
}

const App: React.FC = () => {
  const [isMuted, setIsMuted] = useState(true);
  const [showAudioHint, setShowAudioHint] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isHeroLoaded, setIsHeroLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const { scrollY } = useScroll();
  
  // 내부 컨텐츠의 투명도만 조절 (배경 흰색은 100% 유지하여 허전함을 방지)
  const contentOpacity = useTransform(scrollY, [0, 300], [0.5, 1]);

  // 카카오 SDK 초기화
  useEffect(() => {
    if (window.Kakao && !window.Kakao.isInitialized()) {
      // 실제 사용 시 발급받은 JavaScript 키를 입력해야 합니다.
      try {
        window.Kakao.init('YOUR_KAKAO_JS_KEY'); 
      } catch (e) {
        console.warn("Kakao SDK initialization failed.");
      }
    }
  }, []);

  // 히어로 이미지가 로드된 후 파티클 실행
  useEffect(() => {
    if (isHeroLoaded) {
      const timer = setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#f9a8d4', '#fbcfe8', '#ffffff', '#d1fae5']
        });
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isHeroLoaded]);

  useEffect(() => {
    const hintTimer = setTimeout(() => setShowAudioHint(false), 5000);
    return () => clearTimeout(hintTimer);
  }, []);

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.play().catch(e => console.log("Audio play blocked"));
      } else {
        audioRef.current.pause();
      }
      setIsMuted(!isMuted);
      setShowAudioHint(false);
    }
  };

  // 링크 복사 기능 및 토스트 알림
  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setToastMessage("청첩장 링크가 복사되었습니다.");
      setTimeout(() => setToastMessage(null), 2000);
    }).catch(() => {
      setToastMessage("링크 복사에 실패했습니다.");
      setTimeout(() => setToastMessage(null), 2000);
    });
  };

  // 카카오톡 공유 기능
  const handleKakaoShare = () => {
    if (window.Kakao && window.Kakao.isInitialized()) {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: `${WEDDING_DATA.groom.name} & ${WEDDING_DATA.bride.name} 결혼식 초대`,
          description: '저희의 소중한 시작을 함께 축복해주세요.',
          imageUrl: 'https://picsum.photos/seed/wedding-share/800/400',
          link: {
            mobileWebUrl: window.location.href,
            webUrl: window.location.href,
          },
        },
        buttons: [
          {
            title: '청첩장 보기',
            link: {
              mobileWebUrl: window.location.href,
              webUrl: window.location.href,
            },
          },
        ],
      });
    } else {
      // SDK 미설치 시 기본 공유 API 시도
      if (navigator.share) {
        navigator.share({
          title: `${WEDDING_DATA.groom.name} & ${WEDDING_DATA.bride.name} 결혼식 초대`,
          url: window.location.href
        });
      } else {
        setToastMessage("공유 기능을 사용할 수 없습니다.");
        setTimeout(() => setToastMessage(null), 2000);
      }
    }
  };

  const handleHeroLoad = useCallback(() => {
    setIsHeroLoaded(true);
  }, []);

  return (
    <div className="relative max-w-md mx-auto bg-white shadow-2xl min-h-screen overflow-hidden selection:bg-pink-100">
      <audio ref={audioRef} loop src={BG_MUSIC_URL} />

      {/* 토스트 메시지 */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-stone-800/90 backdrop-blur-md text-white px-6 py-3 rounded-full text-sm shadow-2xl"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 플로팅 컨트롤 */}
      <div className="fixed bottom-8 right-6 z-50 flex flex-col gap-4 items-end">
        <AnimatePresence>
          {showAudioHint && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg border border-pink-100 text-pink-500 text-xs font-medium mb-2"
            >
              음악과 함께 감상해보세요 ✨
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="flex flex-col gap-3">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleAudio}
            className={`p-4 rounded-full shadow-xl border transition-all ${
              !isMuted ? 'bg-pink-500 border-pink-400 text-white' : 'bg-white/90 backdrop-blur-xl border-stone-100 text-stone-600'
            }`}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} className="animate-pulse" />}
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="p-4 bg-white/90 backdrop-blur-xl rounded-full shadow-xl border border-stone-100 text-stone-600"
          >
            <ChevronUp size={20} />
          </motion.button>
        </div>
      </div>

      <Hero data={WEDDING_DATA} onLoad={handleHeroLoad} />
      
      {/* 배경 흰색은 100% 유지, 내부 컨텐츠만 투명도 조절 */}
      <div className="relative z-10 bg-white rounded-t-[40px] -mt-10 shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.15)]">
        <motion.div 
          style={{ opacity: contentOpacity }}
          className="space-y-32 pb-24 pt-10"
        >
          <Invitation data={WEDDING_DATA} />
          <Gallery images={GALLERY_IMAGES} />
          <Calendar date={WEDDING_DATA.date} />
          <Location location={WEDDING_DATA.location} />
          <Contact data={WEDDING_DATA} />
          <Guestbook />
        </motion.div>
      </div>

      <footer className="bg-stone-50 py-16 px-8 text-center border-t border-stone-100">
        <div className="flex justify-center gap-8 mb-10">
          <button 
            onClick={handleCopyLink}
            className="flex flex-col items-center gap-3 text-stone-400 hover:text-pink-400 transition-all group"
          >
            <div className="p-4 bg-white rounded-2xl shadow-sm group-hover:shadow-md transition-all">
              <Share2 size={24} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest">Link Copy</span>
          </button>
          <button 
            onClick={handleKakaoShare}
            className="flex flex-col items-center gap-3 text-stone-400 hover:text-yellow-500 transition-all group"
          >
            <div className="p-4 bg-white rounded-2xl shadow-sm group-hover:shadow-md transition-all">
              <MessageSquare size={24} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest">Kakao Share</span>
          </button>
        </div>
        <p className="text-stone-300 text-[10px] font-light tracking-[0.3em] uppercase mb-2">Eternal Promise</p>
        <p className="text-stone-400 text-xs font-medium">{WEDDING_DATA.groom.name} & {WEDDING_DATA.bride.name}</p>
      </footer>
    </div>
  );
};

export default App;

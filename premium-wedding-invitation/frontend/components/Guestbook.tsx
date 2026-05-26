
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Sparkles, User, Trash2, Heart } from 'lucide-react';
import { GuestMessage } from '../types';
import { generateCongratulatoryMessage } from '../services/gemini';
import { supabase, GUESTBOOK_TABLE } from '../services/supabase';

/**
 * Guestbook 컴포넌트: 하객들이 축하 메시지를 남기는 공간
 * Supabase와 연동하여 실시간 데이터 저장 및 조회를 지원
 */
const Guestbook: React.FC = () => {
  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [relation, setRelation] = useState('친구');
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 초기 데이터 로드 및 실시간 구독 설정
    const fetchMessages = async () => {
      if (supabase) {
        // Supabase에서 최신순으로 메시지 가져오기
        const { data, error } = await supabase
          .from(GUESTBOOK_TABLE)
          .select('*')
          .order('timestamp', { ascending: false });
        if (data) setMessages(data);
      } else {
        // Supabase 설정이 없는 경우 로컬 스토리지 사용 (데모용)
        const saved = localStorage.getItem('wedding_guestbook');
        if (saved) setMessages(JSON.parse(saved));
      }
    };

    fetchMessages();

    // 실시간 구독: 새로운 메시지가 추가되면 즉시 화면에 반영
    if (supabase) {
      const subscription = supabase
        .channel('public:guestbook_messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: GUESTBOOK_TABLE }, payload => {
          setMessages(prev => [payload.new as GuestMessage, ...prev]);
        })
        .subscribe();
      return () => { supabase.removeChannel(subscription); };
    }
  }, []);

  // 메시지 저장 로직
  const saveMessages = async (newMsg: GuestMessage) => {
    if (supabase) {
      // Supabase DB에 저장
      await supabase.from(GUESTBOOK_TABLE).insert([newMsg]);
    } else {
      // 로컬 스토리지에 저장
      const updated = [newMsg, ...messages];
      setMessages(updated);
      localStorage.setItem('wedding_guestbook', JSON.stringify(updated));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !content) return;

    const newMessage: GuestMessage = {
      id: Date.now().toString(),
      name,
      content,
      timestamp: Date.now()
    };

    await saveMessages(newMessage);
    setName('');
    setContent('');
  };

  // Gemini AI를 이용한 축하 메시지 자동 생성
  const handleGenerate = async () => {
    if (!name) {
      alert("이름을 먼저 입력해주세요.");
      return;
    }
    setIsGenerating(true);
    const aiMsg = await generateCongratulatoryMessage(name, relation);
    setContent(aiMsg);
    setIsGenerating(false);
  };

  const deleteMessage = (id: string) => {
    const updated = messages.filter(m => m.id !== id);
    setMessages(updated);
    localStorage.setItem('wedding_guestbook', JSON.stringify(updated));
  };

  return (
    <section className="px-6">
      <div className="text-center mb-10">
        <h2 className="font-serif italic text-2xl text-stone-700 tracking-widest">Guestbook</h2>
        <p className="text-[10px] text-stone-400 uppercase tracking-[0.2em] mt-2">축하의 마음을 남겨주세요</p>
      </div>

      {/* 채팅 스타일의 메시지 리스트 */}
      <div className="max-h-[400px] overflow-y-auto mb-8 space-y-4 pr-2 custom-scrollbar" ref={scrollRef}>
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="flex flex-col items-start group"
            >
              <div className="flex items-center gap-2 mb-1 ml-2">
                <span className="text-[11px] font-bold text-stone-500">{msg.name}</span>
                <span className="text-[9px] text-stone-300">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="relative max-w-[85%] bg-white border border-stone-100 p-4 rounded-2xl rounded-tl-none shadow-sm group-hover:shadow-md transition-shadow">
                <p className="text-sm text-stone-600 leading-relaxed">{msg.content}</p>
                <button 
                  onClick={() => deleteMessage(msg.id)}
                  className="absolute -right-8 top-1/2 -translate-y-1/2 text-stone-200 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {messages.length === 0 && (
          <div className="text-center py-12 text-stone-300 italic font-light text-sm flex flex-col items-center gap-3">
            <MessageSquare size={32} className="opacity-20" />
            첫 번째 축하 메시지를 남겨주세요.
          </div>
        )}
      </div>

      {/* 입력 폼 영역 */}
      <div className="bg-stone-50 rounded-3xl p-6 border border-stone-100 shadow-inner">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300" size={16} />
              <input 
                type="text" 
                placeholder="성함"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-100 transition-all"
              />
            </div>
            <select 
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
              className="px-4 py-3 bg-white border border-stone-200 rounded-xl text-xs text-stone-500 focus:outline-none"
            >
              <option value="친구">친구</option>
              <option value="직장동료">직장동료</option>
              <option value="친척">친척</option>
              <option value="지인">지인</option>
            </select>
          </div>

          <div className="relative">
            <textarea 
              placeholder="따뜻한 한마디를 남겨주세요"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className="w-full p-4 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-100 transition-all resize-none"
            />
            {/* AI 자동 생성 버튼 */}
            <button 
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="absolute bottom-3 right-3 flex items-center gap-1 text-[10px] font-bold text-pink-400 bg-pink-50 px-3 py-1.5 rounded-full hover:bg-pink-100 transition-colors disabled:opacity-50 shadow-sm"
            >
              <Sparkles size={12} />
              {isGenerating ? '작성 중...' : 'AI 축하말'}
            </button>
          </div>

          <button 
            type="submit"
            className="w-full py-4 bg-stone-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-stone-900 transition-all shadow-lg active:scale-[0.98]"
          >
            <Heart size={16} className="fill-white" />
            축하 메시지 등록
          </button>
        </form>
      </div>
    </section>
  );
};

export default Guestbook;

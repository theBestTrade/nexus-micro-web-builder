import React from 'react';
import { 
  Phone, Mail, MapPin, Calendar, Clock, ChevronRight, ChevronDown, Copy,
  Share2, Heart, MessageSquare, Star, ArrowRight, 
  Camera, Globe, Download, AlertCircle, Image as ImageIcon,
  Briefcase, User, Link as LinkIcon, Play, Info, ExternalLink,
  Search, Menu, Bell, Settings, Plus, Zap, ShieldCheck, Gift,
  Music, Utensils, Dog, Building, Ticket, Store, Contact, FileText, Baby
} from 'lucide-react';

interface MobileMockupProps {
  modelId: string;
}

export const MobileMockup: React.FC<MobileMockupProps> = ({ modelId }) => {
  
  const renderContent = () => {
    switch (modelId) {
      case '0': // 모바일 청첩장
        return (
          <div className="flex flex-col bg-[#FDFBF7] min-h-full font-sans text-slate-800 pb-12">
            <div className="p-5 space-y-4">
              <div className="relative h-[400px] rounded-[3rem] overflow-hidden shadow-2xl group">
                <img src="https://picsum.photos/400/600?wedding,couple" alt="Wedding" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                <div className="absolute bottom-10 left-0 right-0 text-center text-white">
                  <p className="text-[10px] tracking-[0.6em] mb-4 opacity-80 font-bold">INVITATION</p>
                  <h2 className="text-4xl font-light tracking-tight mb-2">이서준 & 김지아</h2>
                  <p className="text-xs opacity-90 font-light tracking-widest">2024. 12. 21 SAT 12:30</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 bg-white p-10 rounded-[2.5rem] text-center shadow-sm border border-slate-100">
                  <p className="text-[15px] leading-[2.6] text-slate-600 font-light">서로의 다름을 인정하고<br/>함께 같은 곳을 바라보며<br/>행복한 가정을 꾸리려 합니다.</p>
                </div>
                <div className="bg-rose-50 p-6 rounded-[2.5rem] shadow-sm border border-rose-100 flex flex-col items-center justify-center gap-3">
                  <Calendar className="w-6 h-6 text-rose-400" />
                  <div className="text-center"><p className="text-xs font-bold text-rose-900">12월 21일</p><p className="text-[10px] text-rose-400 mt-0.5">토요일 오후 12:30</p></div>
                </div>
                <div className="bg-indigo-50 p-6 rounded-[2.5rem] shadow-sm border border-indigo-100 flex flex-col items-center justify-center gap-3">
                  <MapPin className="w-6 h-6 text-indigo-400" />
                  <div className="text-center"><p className="text-xs font-bold text-indigo-900">신라호텔</p><p className="text-[10px] text-indigo-400 mt-0.5">다이너스티홀</p></div>
                </div>
              </div>
              <button className="w-full py-6 bg-slate-900 text-white rounded-[2.5rem] font-bold text-sm shadow-2xl flex items-center justify-center gap-2"><Gift className="w-4 h-4 text-rose-400" /> 축하의 마음 전하기</button>
            </div>
          </div>
        );

      case '1': // 돌잔치
        return (
          <div className="flex flex-col bg-[#FFFBF5] min-h-full font-sans text-slate-800 pb-12">
            <div className="p-5 space-y-4">
              <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-amber-100 flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full -mr-10 -mt-10"></div>
                <div className="w-36 h-36 rounded-full p-1.5 bg-amber-100 mb-6 shadow-inner relative z-10">
                  <img src="https://picsum.photos/300/300?baby" alt="Baby" className="w-full h-full rounded-full object-cover border-4 border-white" />
                </div>
                <p className="text-[10px] tracking-[0.4em] text-amber-600 font-black mb-2 relative z-10">1ST BIRTHDAY</p>
                <h2 className="text-3xl font-bold text-slate-900 relative z-10">지우의 첫돌 잔치</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 text-center">
                  <p className="text-sm leading-relaxed text-slate-600">지우가 건강하게 자라 첫 생일을 맞이했습니다.<br/>소중한 분들을 모시고 기쁨을 나누고자 합니다.</p>
                </div>
                <div className="bg-amber-50 p-6 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 border border-amber-100">
                  <Clock className="w-6 h-6 text-amber-500" />
                  <p className="text-xs font-bold text-amber-900">오후 12:00</p>
                </div>
                <div className="bg-amber-50 p-6 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 border border-amber-100">
                  <MapPin className="w-6 h-6 text-amber-500" />
                  <p className="text-xs font-bold text-amber-900">영빈관</p>
                </div>
              </div>
              <button className="w-full py-6 bg-amber-500 text-white rounded-[2.5rem] font-bold text-sm shadow-xl">참석 의사 전달하기</button>
            </div>
          </div>
        );

      case '2': // 부고장
        return (
          <div className="flex flex-col bg-[#F8F9FA] min-h-full font-sans text-slate-900 pb-12">
            <div className="p-5 space-y-4">
              <div className="bg-slate-900 text-white p-12 rounded-[3rem] text-center shadow-2xl">
                <h2 className="text-4xl font-serif tracking-[0.6em] mb-4">訃告</h2>
                <p className="text-xs opacity-50 font-light tracking-widest">삼가 고인의 명복을 빕니다</p>
              </div>
              <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-200 text-center">
                <p className="text-xl mb-2 text-slate-500">故 <span className="font-bold text-3xl text-slate-900">홍길동</span> 님</p>
                <p className="text-sm text-slate-400 font-medium">2024년 4월 1일 별세</p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center"><MapPin className="w-6 h-6 text-slate-400" /></div>
                  <div><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">빈소</p><p className="text-sm font-bold">서울대학교병원 장례식장</p></div>
                </div>
                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center"><Calendar className="w-6 h-6 text-slate-400" /></div>
                  <div><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">발인</p><p className="text-sm font-bold">2024년 4월 3일 오전 8시</p></div>
                </div>
              </div>
              <button className="w-full py-6 bg-slate-200 text-slate-800 rounded-[2.5rem] font-bold text-sm shadow-md">조의금 전달하기</button>
            </div>
          </div>
        );

      case '3': // 디지털 명함
        return (
          <div className="flex flex-col bg-[#0F172A] min-h-full text-white font-sans p-5 space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-[3rem] p-10 flex flex-col items-center text-center backdrop-blur-2xl shadow-2xl relative overflow-hidden">
              <div className="absolute -top-10 -left-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl"></div>
              <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 mb-6 shadow-lg relative z-10">
                <img src="https://picsum.photos/200/200?portrait" alt="Profile" className="w-full h-full rounded-full object-cover border-4 border-[#0F172A]" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight relative z-10">김넥서스</h2>
              <p className="text-indigo-400 text-sm font-medium mt-2 tracking-wide uppercase relative z-10">Lead Product Designer</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-[2.5rem] p-6 flex flex-col gap-4 hover:bg-indigo-500/20 transition-colors cursor-pointer group">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform"><Phone className="w-6 h-6 text-indigo-400" /></div>
                <p className="text-sm font-bold">전화하기</p>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-[2.5rem] p-6 flex flex-col gap-4 hover:bg-purple-500/20 transition-colors cursor-pointer group">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform"><Mail className="w-6 h-6 text-purple-400" /></div>
                <p className="text-sm font-bold">메일보내기</p>
              </div>
              <div className="col-span-2 bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
                <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mb-4">About Me</h3>
                <p className="text-[15px] text-slate-300 leading-relaxed font-light">사용자 경험을 혁신하는 디자인 솔루션을 제안합니다. 넥서스 팀에서 디자인 시스템과 프로덕트 전략을 리딩하고 있습니다.</p>
              </div>
            </div>
            <button className="w-full py-5 bg-white text-slate-900 rounded-[2.5rem] font-bold text-sm flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-transform"><Download className="w-5 h-5" /> 연락처 저장하기</button>
          </div>
        );

      case '4': // 소상공인 랜딩
        return (
          <div className="flex flex-col bg-slate-50 min-h-full font-sans p-5 space-y-4">
            <div className="relative h-72 rounded-[3rem] overflow-hidden shadow-xl">
              <img src="https://picsum.photos/400/400?cafe,interior" alt="Cafe" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
              <div className="absolute bottom-8 left-8 text-white">
                <p className="text-[10px] font-bold tracking-widest opacity-70 mb-1 uppercase">Specialty Coffee</p>
                <h2 className="text-3xl font-bold tracking-tight">카페 넥서스</h2>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1 bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /><span className="text-xs font-bold">4.9</span></div>
                  <span className="text-xs opacity-70">리뷰 128개</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 bg-white p-6 rounded-[2.5rem] shadow-sm flex items-center gap-5 border border-slate-100">
                <div className="w-14 h-14 rounded-3xl bg-blue-50 flex items-center justify-center"><Clock className="w-7 h-7 text-blue-500" /></div>
                <div><p className="text-sm font-bold text-slate-900">현재 영업 중</p><p className="text-xs text-slate-400 mt-0.5">오후 10:00에 영업 종료</p></div>
                <ChevronRight className="ml-auto w-5 h-5 text-slate-300" />
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm flex flex-col gap-4 border border-slate-100 items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center"><Phone className="w-6 h-6 text-slate-600" /></div>
                <p className="text-xs font-bold">전화하기</p>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm flex flex-col gap-4 border border-slate-100 items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center"><MapPin className="w-6 h-6 text-slate-600" /></div>
                <p className="text-xs font-bold">찾아오기</p>
              </div>
            </div>
            <button className="w-full py-5 bg-blue-600 text-white rounded-[2.5rem] font-bold text-sm shadow-xl">지금 바로 예약하기</button>
          </div>
        );

      case '5': // 행사/세미나
        return (
          <div className="flex flex-col bg-[#F0F4FF] min-h-full font-sans text-slate-800 pb-12">
            <div className="p-5 space-y-4">
              <div className="bg-indigo-600 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                <p className="text-[10px] font-bold tracking-widest opacity-70 mb-4 uppercase">Tech Summit 2024</p>
                <h2 className="text-3xl font-bold leading-tight">미래를 혁신하는<br/>AI 기술 트렌드</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 bg-white p-6 rounded-[2.5rem] shadow-sm flex items-center gap-5 border border-slate-100">
                  <div className="w-14 h-14 rounded-3xl bg-indigo-50 flex items-center justify-center"><Calendar className="w-7 h-7 text-indigo-600" /></div>
                  <div><p className="text-sm font-bold text-slate-900">11월 15일 (금)</p><p className="text-xs text-slate-400 mt-0.5">오후 1:00 - 6:00</p></div>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center"><User className="w-6 h-6 text-indigo-400" /></div>
                  <p className="text-xs font-bold">4명의 연사</p>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center"><MapPin className="w-6 h-6 text-indigo-400" /></div>
                  <p className="text-xs font-bold">코엑스</p>
                </div>
              </div>
              <button className="w-full py-6 bg-indigo-600 text-white rounded-[2.5rem] font-bold text-sm shadow-xl">사전 등록하기</button>
            </div>
          </div>
        );

      case '6': // 부동산
        return (
          <div className="flex flex-col bg-white min-h-full font-sans p-5 space-y-4">
            <div className="relative h-72 rounded-[3rem] overflow-hidden shadow-xl">
              <img src="https://picsum.photos/400/300?apartment" alt="Property" className="w-full h-full object-cover" />
              <div className="absolute top-4 left-4 bg-blue-600 text-white px-4 py-1.5 rounded-full text-[10px] font-bold shadow-lg">매매</div>
            </div>
            <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-100 shadow-inner">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">12억 5,000만</h2>
              <p className="text-sm text-slate-500 mt-2 font-medium">강남구 역삼동 푸르지오 101동</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 mb-1 font-bold uppercase">Area</p>
                <p className="text-xs font-bold text-slate-900">110㎡</p>
              </div>
              <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 mb-1 font-bold uppercase">Rooms</p>
                <p className="text-xs font-bold text-slate-900">3개</p>
              </div>
              <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 mb-1 font-bold uppercase">Floor</p>
                <p className="text-xs font-bold text-slate-900">15층</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="flex-1 py-6 bg-blue-600 text-white rounded-[2.5rem] font-bold text-sm shadow-xl">전화 상담</button>
              <button className="w-16 h-16 bg-slate-100 rounded-[2rem] flex items-center justify-center shadow-sm"><MessageSquare className="w-6 h-6 text-slate-600" /></button>
            </div>
          </div>
        );

      case '7': // 포트폴리오
        return (
          <div className="flex flex-col bg-[#09090B] min-h-full text-white font-sans p-8 space-y-8">
            <div className="pt-12 relative">
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl"></div>
              <div className="w-12 h-1.5 bg-indigo-500 mb-10 rounded-full"></div>
              <h2 className="text-5xl font-black tracking-tighter leading-none">Digital<br/>Craftsman.</h2>
              <p className="text-slate-400 text-[16px] mt-8 font-light leading-relaxed">사용자 중심의 가치를 전달하는<br/>인터페이스와 경험을 설계합니다.</p>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div className="col-span-2 bg-white/5 border border-white/10 rounded-[3rem] p-10 backdrop-blur-md">
                <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] mb-8">Tech Stack</h3>
                <div className="flex flex-wrap gap-3">
                  {['React', 'Next.js', 'Tailwind', 'Figma', 'Three.js'].map(t => (
                    <span key={t} className="px-4 py-2 rounded-xl bg-white/10 text-xs font-bold border border-white/5">{t}</span>
                  ))}
                </div>
              </div>
              {[1,2].map(i => (
                <div key={i} className="relative aspect-[4/5] rounded-[3rem] overflow-hidden border border-white/10 group cursor-pointer">
                  <img src={`https://picsum.photos/300/400?tech&${i}`} className="w-full h-full object-cover opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all duration-1000" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-8 left-8"><p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-2">Project</p><p className="text-lg font-bold">Nova System {i}</p></div>
                </div>
              ))}
            </div>
            <button className="w-full py-6 bg-white text-slate-900 rounded-[2.5rem] font-black text-sm shadow-2xl flex items-center justify-center gap-3">프로젝트 문의하기</button>
          </div>
        );

      case '8': // 롤링페이퍼
        return (
          <div className="flex flex-col bg-[#FFF5F5] min-h-full font-sans p-5 space-y-4">
            <div className="text-center py-10">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">팀장님 송별회 😢</h2>
              <p className="text-sm text-slate-400 mt-2 font-bold">12개의 따뜻한 메시지가 도착했습니다</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-rose-50 transform -rotate-2">
                <p className="text-xs text-slate-600 leading-relaxed">그동안 정말 감사했습니다! 새로운 곳에서도 건승하세요.</p>
                <p className="text-[10px] font-bold text-slate-400 mt-4 text-right">- 김대리</p>
              </div>
              <div className="bg-rose-50 p-6 rounded-[2.5rem] shadow-xl border border-rose-100 transform rotate-1">
                <p className="text-xs text-slate-600 leading-relaxed">팀장님 빈자리가 클 것 같아요 ㅠㅠ 자주 연락주세요!</p>
                <p className="text-[10px] font-bold text-slate-400 mt-4 text-right">- 이사원</p>
              </div>
              <div className="col-span-2 bg-white p-8 rounded-[3rem] shadow-xl border border-rose-50">
                <p className="text-sm text-slate-600 leading-relaxed">항상 잘 챙겨주셔서 감사했습니다. 꽃길만 걸으세요 🌸</p>
                <p className="text-[10px] font-bold text-slate-400 mt-4 text-right">- 박과장</p>
              </div>
            </div>
            <button className="w-full py-6 bg-rose-500 text-white rounded-[2.5rem] font-bold text-sm shadow-2xl flex items-center justify-center gap-3 mt-auto"><MessageSquare className="w-5 h-5" /> 메시지 남기기</button>
          </div>
        );

      case '9': // 메뉴판
        return (
          <div className="flex flex-col bg-white min-h-full font-sans">
            <div className="p-8 border-b sticky top-0 bg-white/95 backdrop-blur-xl z-10">
              <div className="flex justify-between items-center mb-8">
                <div><h2 className="text-2xl font-black tracking-tight text-slate-900">넥서스 다이닝</h2><p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">Modern Italian</p></div>
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center shadow-inner"><Search className="w-6 h-6 text-slate-400" /></div>
              </div>
              <div className="flex gap-8 overflow-x-auto hide-scrollbar text-sm font-black">
                <span className="text-indigo-600 border-b-4 border-indigo-600 pb-4 whitespace-nowrap">추천메뉴</span>
                <span className="text-slate-400 whitespace-nowrap">메인요리</span>
                <span className="text-slate-400 whitespace-nowrap">사이드</span>
                <span className="text-slate-400 whitespace-nowrap">음료</span>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {[1,2,3,4].map(i => (
                  <div key={i} className="bg-slate-50 rounded-[3rem] p-5 flex flex-col gap-5 hover:bg-white hover:shadow-2xl transition-all cursor-pointer group border border-transparent hover:border-slate-100">
                    <div className="aspect-square rounded-[2rem] overflow-hidden bg-slate-200 shadow-sm relative">
                      <img src={`https://picsum.photos/200/200?food&${i}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      <div className="absolute top-3 right-3 w-8 h-8 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center"><Plus className="w-4 h-4 text-slate-900" /></div>
                    </div>
                    <div><p className="text-sm font-black text-slate-900 truncate">트러플 머쉬룸 파스타</p><p className="text-xs font-black text-indigo-600 mt-2">₩ 24,000</p></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-auto p-6 bg-gradient-to-t from-white via-white to-transparent"><button className="w-full py-6 bg-slate-900 text-white rounded-[2.5rem] font-bold text-sm shadow-2xl flex items-center justify-center gap-3"><ImageIcon className="w-5 h-5 text-indigo-400" /> 장바구니 보기 (3)</button></div>
          </div>
        );

      case '10': // 반려동물
        return (
          <div className="flex flex-col bg-[#FFF9F5] min-h-full font-sans p-5 space-y-4">
            <div className="bg-rose-500 text-white p-6 rounded-[2rem] flex items-center gap-5 shadow-xl animate-pulse">
              <div className="w-14 h-14 rounded-3xl bg-white/20 flex items-center justify-center flex-shrink-0"><AlertCircle className="w-8 h-8" /></div>
              <p className="text-sm font-bold leading-tight">길을 잃은 아이를 발견하셨나요?<br/>보호자에게 즉시 연락해주세요.</p>
            </div>
            <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-orange-100 flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -mr-10 -mt-10"></div>
              <div className="w-40 h-40 rounded-full p-2 bg-orange-100 mb-6 shadow-inner relative z-10">
                <img src="https://picsum.photos/300/300?dog" alt="Pet" className="w-full h-full rounded-full object-cover border-4 border-white" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 relative z-10">망고 <span className="text-lg font-normal text-slate-400 ml-1">♂</span></h2>
              <p className="text-sm text-slate-500 mt-2 font-medium relative z-10">골든 리트리버 · 3살 · 28kg</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-orange-50 p-6 rounded-[2.5rem] shadow-sm border border-orange-100 flex flex-col gap-3">
                <h3 className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Personality</h3>
                <p className="text-sm font-bold text-orange-900 leading-snug">사람을 아주 좋아하고<br/>매우 온순해요</p>
              </div>
              <div className="bg-rose-50 p-6 rounded-[2.5rem] shadow-sm border border-rose-100 flex flex-col gap-3">
                <h3 className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Medical</h3>
                <p className="text-sm font-bold text-rose-900 leading-snug">닭고기 알러지가<br/>있습니다</p>
              </div>
            </div>
            <button className="w-full py-6 bg-orange-500 text-white rounded-[2.5rem] font-bold text-sm shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-transform"><Phone className="w-5 h-5" /> 보호자에게 전화하기</button>
          </div>
        );

      case '11': // 온라인 전시회
        return (
          <div className="flex flex-col bg-[#050505] min-h-full text-white font-sans pb-12">
            <div className="p-8 pt-12 flex justify-between items-start">
              <div><h2 className="text-[10px] font-bold tracking-[0.3em] text-slate-500 mb-2 uppercase">VIRTUAL EXHIBITION</h2><p className="text-2xl font-light tracking-wide">침묵의 메아리</p></div>
              <button className="w-10 h-10 rounded-full border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"><Info className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="w-full aspect-[3/4] bg-slate-900 relative shadow-2xl mb-8 group">
                <img src="https://picsum.photos/600/800?abstract,art" alt="Art" className="w-full h-full object-cover opacity-90" />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><button className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white"><Play className="w-5 h-5 ml-1" /></button></div>
              </div>
              <div className="text-center w-full"><p className="font-medium text-lg tracking-tight mb-1">무제 No.4</p><p className="text-xs text-slate-500 font-light tracking-wide">캔버스에 유채, 120x80cm, 2024</p></div>
            </div>
            <div className="p-8 flex justify-between items-center border-t border-slate-900"><button className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-500 hover:text-white transition-colors">Prev</button><div className="flex gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-white"></div><div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div><div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div></div><button className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-500 hover:text-white transition-colors">Next</button></div>
          </div>
        );

      default:
        return <div className="flex items-center justify-center h-full text-slate-400 font-sans">Select a model</div>;
    }
  };

  return (
    <div className="relative mx-auto w-[340px] h-[680px] rounded-[3.5rem] border-[14px] border-slate-900 bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col">
      <div className="absolute top-0 inset-x-0 h-7 flex justify-center z-20">
        <div className="w-36 h-full bg-slate-900 rounded-b-[1.5rem]"></div>
      </div>
      <div className="flex-1 overflow-y-auto bg-slate-50/50 relative hide-scrollbar">
        {renderContent()}
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 12s linear infinite; }
      `}} />
    </div>
  );
};

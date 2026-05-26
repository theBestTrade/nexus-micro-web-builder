import React from 'react';
import { BusinessModel } from '../types';
import { MobileMockup } from './MobileMockup';
import { Coins, Palette, Target, ArrowUpRight, Sparkles, Zap, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

interface MainContentProps {
  model: BusinessModel;
}

export const MainContent: React.FC<MainContentProps> = ({ model }) => {
  return (
    <div className="flex-1 h-screen overflow-y-auto bg-[#f8fafc] p-6 hide-scrollbar">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 text-[8px] font-black rounded-full uppercase tracking-widest">Strategy Analysis</span>
              <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">{model.title}</h1>
            <p className="text-slate-400 mt-0.5 text-xs font-medium">프리미엄 모바일 웹 비즈니스 기획 및 시안 분석</p>
          </div>
          <button className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
            기획서 다운로드 <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        {/* Bento Grid Info Section */}
        <div className="grid grid-cols-12 gap-4 mb-8">
          {/* Price Card */}
          <div className="col-span-12 md:col-span-5 bg-white p-5 rounded-[1.5rem] shadow-lg shadow-slate-200/40 border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Coins className="w-16 h-16" />
            </div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-amber-100 rounded-lg flex items-center justify-center">
                <Coins className="w-3 h-3 text-amber-600" />
              </div>
              <h3 className="font-bold text-slate-400 text-[9px] uppercase tracking-widest">수익 모델 및 단가</h3>
            </div>
            <div className="text-base font-black text-slate-900 mb-2 leading-tight whitespace-pre-line">
              {model.details.priceTitle}
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed font-medium">
              {model.details.priceDesc}
            </p>
          </div>

          {/* Design Card */}
          <div className="col-span-12 md:col-span-7 bg-slate-900 p-5 rounded-[1.5rem] shadow-xl shadow-indigo-200/10 relative overflow-hidden group">
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                <Palette className="w-3 h-3 text-indigo-400" />
              </div>
              <h3 className="font-bold text-slate-500 text-[9px] uppercase tracking-widest">디자인 핵심 전략</h3>
            </div>
            <p className="text-white text-sm font-bold leading-relaxed mb-4">
              {model.details.design}
            </p>
            <div className="flex gap-1.5">
              <span className="px-2 py-1 bg-white/5 rounded-md text-[9px] font-bold text-indigo-300 border border-white/10">#벤토디자인</span>
              <span className="px-2 py-1 bg-white/5 rounded-md text-[9px] font-bold text-indigo-300 border border-white/10">#모바일최적화</span>
            </div>
          </div>

          {/* Sales Card */}
          <div className="col-span-12 bg-gradient-to-r from-indigo-600 to-violet-600 p-6 rounded-[2rem] shadow-xl shadow-indigo-200/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-8 -mt-8 blur-3xl"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
                    <Target className="w-3 h-3 text-white" />
                  </div>
                  <h3 className="font-bold text-indigo-100 text-[9px] uppercase tracking-widest">영업 및 마케팅 로드맵</h3>
                </div>
                <p className="text-white text-base font-bold leading-snug">
                  {model.details.sales}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full md:w-auto">
                <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10 flex flex-col items-center gap-1">
                  <Zap className="w-4 h-4 text-amber-300" />
                  <p className="text-white text-[8px] font-bold">빠른 실행</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10 flex flex-col items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <p className="text-white text-[8px] font-bold">신뢰 확보</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mockup Section */}
        <div className="grid grid-cols-12 gap-6 items-start">
          <div className="col-span-12 lg:col-span-5 sticky top-0">
            <div className="mb-4">
              <h2 className="text-lg font-black text-slate-900 mb-1">프리미엄 시안 미리보기</h2>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Bento Design System Implementation</p>
            </div>
            <MobileMockup modelId={model.id} />
          </div>
          
          <div className="col-span-12 lg:col-span-7 space-y-5 pt-12">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <h3 className="text-base font-bold mb-5 flex items-center gap-2">
                <div className="w-1.5 h-5 bg-indigo-600 rounded-full"></div>
                기획 포인트 분석
              </h3>
              <div className="space-y-5">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0 font-black text-indigo-600 text-sm">01</div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm mb-0.5">사용자 경험 중심의 레이아웃</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">모바일 환경에서 한 손으로 조작하기 쉬운 하단 고정 버튼과 직관적인 카드 시스템을 적용했습니다.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0 font-black text-indigo-600 text-sm">02</div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm mb-0.5">시각적 위계와 벤토 그리드</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">중요도에 따라 카드의 크기를 조절하여 정보의 우선순위를 명확히 전달하고 세련된 인상을 줍니다.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0 font-black text-indigo-600 text-sm">03</div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm mb-0.5">브랜드 아이덴티티 강화</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">각 비즈니스 모델의 성격에 맞는 컬러 팔레트와 아이콘 시스템을 구축하여 전문성을 높였습니다.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

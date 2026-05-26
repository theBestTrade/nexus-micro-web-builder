import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { MainContent } from './components/MainContent';
import { modelsData } from './data/models';
import { Sparkles } from 'lucide-react';

export default function App() {
  const [selectedId, setSelectedId] = useState<string>('0');
  
  const selectedModel = modelsData.find(m => m.id === selectedId) || modelsData[0];

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-16 border-b bg-white/80 backdrop-blur-md flex items-center justify-between px-10 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-black tracking-tight text-slate-900">Nexus Micro-Web Builder</h1>
          <div className="ml-4 px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black rounded-full uppercase tracking-widest">
            v2.5 Premium
          </div>
        </div>
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-400">
            <a href="#" className="text-slate-900">기획 도구</a>
            <a href="#" className="hover:text-slate-600 transition-colors">템플릿 마켓</a>
            <a href="#" className="hover:text-slate-600 transition-colors">성공 사례</a>
          </nav>
          <button className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xl shadow-slate-200 active:scale-95 transition-transform">
            무료 시작하기
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex w-full h-full pt-16">
        <Sidebar 
          models={modelsData} 
          selectedId={selectedId} 
          onSelect={setSelectedId} 
        />
        <MainContent model={selectedModel} />
      </div>
    </div>
  );
}

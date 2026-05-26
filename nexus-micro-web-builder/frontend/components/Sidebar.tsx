import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ZAxis } from 'recharts';
import { BusinessModel } from '../types';
import { cn } from '../lib/utils';

interface SidebarProps {
  models: BusinessModel[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const iconColors: Record<string, string> = {
  '0': 'bg-rose-100 text-rose-500',
  '1': 'bg-amber-100 text-amber-500',
  '2': 'bg-slate-200 text-slate-700',
  '3': 'bg-indigo-100 text-indigo-500',
  '4': 'bg-emerald-100 text-emerald-500',
  '5': 'bg-blue-100 text-blue-500',
  '6': 'bg-cyan-100 text-cyan-500',
  '7': 'bg-violet-100 text-violet-500',
  '8': 'bg-pink-100 text-pink-500',
  '9': 'bg-orange-100 text-orange-500',
  '10': 'bg-orange-50 text-orange-600',
  '11': 'bg-purple-100 text-purple-500',
};

export const Sidebar: React.FC<SidebarProps> = ({ models, selectedId, onSelect }) => {
  const chartData = models.map(m => ({
    x: m.chartData.x,
    y: m.chartData.y,
    z: m.id === selectedId ? 100 : 50,
    id: m.id
  }));

  return (
    <div className="w-[340px] flex-shrink-0 border-r bg-white flex flex-col h-screen overflow-hidden shadow-lg z-30">
      <div className="p-6 border-b bg-gradient-to-br from-white to-slate-50">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
          </div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">수익 모델 큐레이션</h2>
        </div>
        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">12 Premium Micro-Web Models</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 hide-scrollbar">
        {models.map((model) => {
          const isSelected = model.id === selectedId;
          const Icon = model.icon;
          
          return (
            <div
              key={model.id}
              onClick={() => onSelect(model.id)}
              className={cn(
                "group flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-300",
                isSelected 
                  ? "bg-slate-900 text-white shadow-xl scale-[1.02]" 
                  : "bg-white border border-slate-50 hover:border-indigo-100 hover:bg-indigo-50/30"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-500 group-hover:rotate-6",
                isSelected ? "bg-white/10" : iconColors[model.id] || "bg-slate-100"
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className={cn("font-bold text-[13px]", isSelected ? "text-white" : "text-slate-800")}>
                  {model.title}
                </h3>
                <p className={cn("text-[10px] mt-0.5", isSelected ? "text-slate-400" : "text-slate-500")}>
                  {model.priceRange}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-6 border-t bg-slate-50/50">
        <h3 className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest">Market Analysis</h3>
        <div className="h-[160px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis type="number" dataKey="x" domain={[3, 11]} hide />
              <YAxis type="number" dataKey="y" domain={[4, 11]} hide />
              <ZAxis type="number" dataKey="z" range={[50, 200]} />
              <Scatter 
                data={chartData} 
                shape={(props: any) => {
                  const { cx, cy, payload } = props;
                  const isSelected = payload.id === selectedId;
                  return (
                    <circle 
                      cx={cx} cy={cy} r={isSelected ? 8 : 4} 
                      fill={isSelected ? "#4f46e5" : "#cbd5e1"} 
                      className="transition-all duration-500"
                    />
                  );
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-between text-[9px] font-bold text-slate-400 mt-1">
          <span>낮은 수요</span>
          <span>높은 수요</span>
        </div>
      </div>
    </div>
  );
};

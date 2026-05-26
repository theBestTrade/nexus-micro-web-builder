import React from 'react';
import {
  Video, Languages, Scissors, ShoppingBag,
  FileText, Smartphone, MessageCircle, PlaySquare,
} from 'lucide-react';

// ─── 노드 정의 ────────────────────────────────────────────────────────────────
const NODE_GROUPS = [
  {
    group: '📥 입력',
    items: [
      { type: 'source',   label: '소스 입력',        icon: Video,          color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-200' },
    ],
  },
  {
    group: '🤖 AI 처리',
    items: [
      { type: 'ai',       label: 'AI 번역 및 대본',  icon: Languages,      color: 'text-purple-600', bg: 'bg-purple-50',  border: 'border-purple-200' },
      { type: 'media',    label: '영상 편집 & TTS',  icon: Scissors,       color: 'text-pink-600',   bg: 'bg-pink-50',    border: 'border-pink-200' },
    ],
  },
  {
    group: '💰 수익화',
    items: [
      { type: 'monetize', label: '커머스 매칭',       icon: ShoppingBag,    color: 'text-green-600',  bg: 'bg-green-50',   border: 'border-green-200' },
      { type: 'blog',     label: '블로그 자동 발행', icon: FileText,       color: 'text-orange-600', bg: 'bg-orange-50',  border: 'border-orange-200' },
    ],
  },
  {
    group: '📣 SNS 발행',
    items: [
      { type: 'sns', label: 'YouTube Shorts',  icon: PlaySquare,     color: 'text-red-600',    bg: 'bg-red-50',     border: 'border-red-200',    platform: 'YouTube' },
      { type: 'sns', label: 'TikTok 자동 발행', icon: Smartphone,     color: 'text-slate-700',  bg: 'bg-slate-100',  border: 'border-slate-200',  platform: 'TikTok' },
      { type: 'sns', label: 'Instagram Reels', icon: Smartphone,     color: 'text-indigo-600', bg: 'bg-indigo-50',  border: 'border-indigo-200', platform: 'Instagram' },
      { type: 'sns', label: 'Threads 발행',    icon: MessageCircle,  color: 'text-slate-700',  bg: 'bg-slate-100',  border: 'border-slate-200',  platform: 'Threads' },
    ],
  },
];

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────
const NodePalette: React.FC = () => {
  const onDragStart = (
    e: React.DragEvent,
    type: string,
    label: string,
    platform?: string,
  ) => {
    e.dataTransfer.setData('application/reactflow', type);
    e.dataTransfer.setData('application/reactflow-label', label);
    if (platform) e.dataTransfer.setData('application/reactflow-platform', platform);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100 shrink-0">
        <p className="text-[12px] font-bold text-slate-700">노드 팔레트</p>
        <p className="text-[10px] text-slate-400 mt-0.5">캔버스로 드래그하여 추가</p>
      </div>

      {/* 노드 목록 */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {NODE_GROUPS.map(group => (
          <div key={group.group}>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
              {group.group}
            </p>
            <div className="space-y-1.5">
              {group.items.map(node => (
                <div
                  key={node.label}
                  draggable
                  onDragStart={e =>
                    onDragStart(e, node.type, node.label, (node as any).platform)
                  }
                  className={`
                    flex items-center gap-2.5 px-3 py-2.5
                    rounded-lg border cursor-grab active:cursor-grabbing
                    bg-white hover:shadow-sm
                    transition-all duration-100 select-none
                    ${node.border}
                    hover:border-blue-400 hover:bg-blue-50/50
                  `}
                >
                  <div className={`p-1.5 rounded-md ${node.bg} ${node.color} shrink-0`}>
                    <node.icon size={13} />
                  </div>
                  <span className="text-[12px] font-medium text-slate-700 leading-tight">
                    {node.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 하단 힌트 */}
      <div className="px-4 py-3 border-t border-slate-100 shrink-0">
        <p className="text-[10px] text-slate-400 leading-relaxed">
          💡 노드 클릭 시 우측 패널에서<br />상세 설정을 편집할 수 있습니다.
        </p>
      </div>
    </div>
  );
};

export default NodePalette;

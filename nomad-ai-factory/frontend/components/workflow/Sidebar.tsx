import React from 'react';
import { Video, Languages, Scissors, ShoppingBag, FileText, Smartphone, MessageCircle } from 'lucide-react';

const Sidebar: React.FC = () => {
  const onDragStart = (event: React.DragEvent, nodeType: string, label: string, platform?: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/reactflow-label', label);
    if (platform) {
      event.dataTransfer.setData('application/reactflow-platform', platform);
    }
    event.dataTransfer.effectAllowed = 'move';
  };

  const nodeTypes = [
    { type: 'source', label: '소스 입력', icon: Video, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { type: 'ai', label: 'AI 번역 및 대본', icon: Languages, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { type: 'media', label: '영상 편집 & TTS', icon: Scissors, color: 'text-pink-500', bg: 'bg-pink-500/10' },
    { type: 'monetize', label: '수익화 매칭', icon: ShoppingBag, color: 'text-green-500', bg: 'bg-green-500/10' },
    { type: 'blog', label: '블로그 자동 발행', icon: FileText, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { type: 'sns', label: 'TikTok 자동 발행', icon: Smartphone, color: 'text-indigo-500', bg: 'bg-indigo-500/10', platform: 'TikTok' },
    { type: 'sns', label: 'Reels 자동 발행', icon: Smartphone, color: 'text-indigo-500', bg: 'bg-indigo-500/10', platform: 'Instagram' },
    { type: 'sns', label: 'Threads 자동 발행', icon: MessageCircle, color: 'text-indigo-500', bg: 'bg-indigo-500/10', platform: 'Threads' },
  ];

  return (
    <aside className="w-64 border-r border-border bg-card p-4 flex flex-col gap-4 overflow-y-auto">
      <div>
        <h3 className="text-sm font-bold mb-1">노드 컴포넌트</h3>
        <p className="text-xs text-muted-foreground mb-4">원하는 노드를 캔버스로 드래그하세요.</p>
      </div>
      
      <div className="flex flex-col gap-3">
        {nodeTypes.map((node) => (
          <div
            key={node.label}
            className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-grab hover:bg-muted/50 transition-colors"
            onDragStart={(event) => onDragStart(event, node.type, node.label, node.platform)}
            draggable
          >
            <div className={`p-2 rounded-md ${node.bg} ${node.color}`}>
              <node.icon size={16} />
            </div>
            <span className="text-sm font-medium">{node.label}</span>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;
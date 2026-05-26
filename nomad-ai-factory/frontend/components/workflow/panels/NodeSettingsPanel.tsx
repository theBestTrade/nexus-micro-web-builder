import React, { useState, useEffect } from 'react';
import { Node } from 'reactflow';
import { Label, Input, Button, Textarea } from '../../ui/index.tsx';
import { Clock, Settings2, Save, MessageSquare, Key, CheckCircle2, AlertCircle, Loader2, Minus } from 'lucide-react';

interface NodeSettingsPanelProps {
  selectedNode: Node | null;
  onUpdateNodeData: (nodeId: string, newData: any) => void;
}

// 노드 타입별 색상 정의
const NODE_TYPE_META: Record<string, { color: string; bg: string; label: string }> = {
  source:   { color: 'text-blue-600',   bg: 'bg-blue-50',   label: '소스 입력' },
  ai:       { color: 'text-purple-600', bg: 'bg-purple-50', label: 'AI 처리' },
  media:    { color: 'text-pink-600',   bg: 'bg-pink-50',   label: '영상 편집' },
  monetize: { color: 'text-green-600',  bg: 'bg-green-50',  label: '수익화 매칭' },
  blog:     { color: 'text-orange-600', bg: 'bg-orange-50', label: '블로그 발행' },
  sns:      { color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'SNS 발행' },
};

const STATUS_CONFIG = {
  idle:    { icon: Minus,         color: 'text-slate-400', bg: 'bg-slate-100', label: 'IDLE' },
  running: { icon: Loader2,       color: 'text-blue-500',  bg: 'bg-blue-50',   label: 'RUNNING' },
  success: { icon: CheckCircle2,  color: 'text-green-500', bg: 'bg-green-50',  label: 'SUCCESS' },
  error:   { icon: AlertCircle,   color: 'text-red-500',   bg: 'bg-red-50',    label: 'ERROR' },
};

const NodeSettingsPanel: React.FC<NodeSettingsPanelProps> = ({ selectedNode, onUpdateNodeData }) => {
  const [cron,   setCron]   = useState('');
  const [prompt, setPrompt] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [saved,  setSaved]  = useState(false);

  // 선택 노드 변경 시 입력 초기화
  useEffect(() => {
    if (selectedNode) {
      setCron(selectedNode.data.cron   || '');
      setPrompt(selectedNode.data.prompt || '');
      setApiKey(selectedNode.data.apiKey || '');
    } else {
      setCron(''); setPrompt(''); setApiKey('');
    }
    setSaved(false);
  }, [selectedNode?.id]);

  const handleSave = () => {
    if (!selectedNode) return;
    onUpdateNodeData(selectedNode.id, { cron, prompt, apiKey });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // ── 미선택 상태 ──────────────────────────────────────────────────────────
  if (!selectedNode) {
    return (
      <aside className="w-72 shrink-0 border-l border-slate-200 bg-white flex flex-col items-center justify-center text-center p-6">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
          <Settings2 className="w-5 h-5 text-slate-400" />
        </div>
        <p className="text-[13px] font-semibold text-slate-600 mb-1">노드 설정</p>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          캔버스에서 노드를 클릭하면<br />여기서 세부 설정을 편집할 수 있습니다.
        </p>
      </aside>
    );
  }

  const meta    = NODE_TYPE_META[selectedNode.type ?? ''] ?? { color: 'text-slate-600', bg: 'bg-slate-100', label: '노드' };
  const status  = (selectedNode.data.status as keyof typeof STATUS_CONFIG) ?? 'idle';
  const sCfg    = STATUS_CONFIG[status] ?? STATUS_CONFIG.idle;
  const SIcon   = sCfg.icon;

  return (
    <aside className="w-72 shrink-0 border-l border-slate-200 bg-white flex flex-col animate-in slide-in-from-right-4 duration-200">

      {/* ── 헤더 ──────────────────────────────────────────────────────────── */}
      <div className="px-4 py-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${meta.bg} ${meta.color}`}>
            {meta.label}
          </div>
          <p className="text-[13px] font-bold text-slate-800 truncate flex-1">
            {selectedNode.data.label}
          </p>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">ID: {selectedNode.id}</p>
      </div>

      {/* ── 설정 폼 ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

        {/* 프롬프트 */}
        <div className="space-y-2">
          <Label className="text-[12px] font-semibold text-slate-600 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
            프롬프트 / 시스템 지시어
          </Label>
          <Textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="AI 모델에 전달할 지시어를 입력하세요."
            className="text-xs min-h-[90px] resize-none border-slate-200 focus:border-blue-400"
          />
        </div>

        {/* API 키 오버라이드 */}
        <div className="space-y-2">
          <Label className="text-[12px] font-semibold text-slate-600 flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-slate-400" />
            API 키 오버라이드 <span className="text-[10px] font-normal text-slate-400">(선택)</span>
          </Label>
          <Input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="전역 설정보다 이 키를 우선 사용"
            className="text-xs border-slate-200 focus:border-blue-400"
          />
          <p className="text-[10px] text-slate-400">입력 시 설정 페이지의 키를 덮어씁니다.</p>
        </div>

        {/* Cron 스케줄 */}
        <div className="space-y-2">
          <Label className="text-[12px] font-semibold text-slate-600 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            스케줄 (Cron)
          </Label>
          <Input
            value={cron}
            onChange={e => setCron(e.target.value)}
            placeholder="0 9 * * *  (매일 오전 9시)"
            className="text-xs font-mono border-slate-200 focus:border-blue-400"
          />
          <div className="text-[10px] text-slate-400 space-y-0.5">
            <p>형식: 분 시 일 월 요일</p>
            <p className="text-slate-300">예) <code className="text-slate-500">0 9 * * 1-5</code> = 평일 오전 9시</p>
          </div>
        </div>

        {/* 현재 상태 */}
        <div className="space-y-2">
          <Label className="text-[12px] font-semibold text-slate-600">현재 실행 상태</Label>
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border ${sCfg.bg}`}>
            <SIcon className={`w-4 h-4 shrink-0 ${sCfg.color} ${status === 'running' ? 'animate-spin' : ''}`} />
            <span className={`text-[12px] font-bold ${sCfg.color}`}>{sCfg.label}</span>
          </div>
        </div>
      </div>

      {/* ── 저장 버튼 푸터 ────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
        <button
          onClick={handleSave}
          className={`w-full flex items-center justify-center gap-2 h-9 rounded-lg text-[13px] font-semibold transition-all ${
            saved
              ? 'bg-green-500 text-white'
              : 'bg-blue-600 text-white hover:bg-blue-500 shadow-sm shadow-blue-600/20'
          }`}
        >
          {saved
            ? <><CheckCircle2 className="w-4 h-4" />저장 완료</>
            : <><Save className="w-4 h-4" />설정 저장</>
          }
        </button>
      </div>
    </aside>
  );
};

export default NodeSettingsPanel;

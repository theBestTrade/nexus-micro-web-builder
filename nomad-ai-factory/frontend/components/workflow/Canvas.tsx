import React, { useState, useCallback, useRef } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  Connection,
  Edge,
  Node,
} from 'reactflow';
import SourceNode   from './nodes/SourceNode.tsx';
import AiNode       from './nodes/AiNode.tsx';
import MediaNode    from './nodes/MediaNode.tsx';
import MonetizeNode from './nodes/MonetizeNode.tsx';
import BlogNode     from './nodes/BlogNode.tsx';
import SnsNode      from './nodes/SnsNode.tsx';
import NodePalette  from './NodePalette.tsx';
import NodeSettingsPanel from './panels/NodeSettingsPanel.tsx';
import { Switch, Label } from '../ui/index.tsx';
import {
  Power, PlayCircle, Square, Download, Zap,
  ChevronLeft, ChevronRight, Trash2,
} from 'lucide-react';

// ─── 커스텀 노드 타입 등록 ────────────────────────────────────────────────────
const nodeTypes = {
  source:   SourceNode,
  ai:       AiNode,
  media:    MediaNode,
  monetize: MonetizeNode,
  blog:     BlogNode,
  sns:      SnsNode,
};

// ─── 초기 데이터 ──────────────────────────────────────────────────────────────
const initialNodes: Node[] = [
  {
    id: '1', type: 'source', position: { x: 60, y: 180 },
    data: { label: '소스 입력', status: 'idle' },
  },
  {
    id: '2', type: 'ai', position: { x: 360, y: 180 },
    data: { label: 'AI 번역 및 대본', status: 'idle' },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true,
    style: { stroke: '#2563EB', strokeWidth: 2 } },
];

let nodeCounter = 3;
const getId = () => `node_${nodeCounter++}`;

// ─── topological sort (BFS) ───────────────────────────────────────────────────
function topoSort(nodes: Node[], edges: Edge[]): Node[] {
  const inDeg = new Map<string, number>();
  const adj   = new Map<string, string[]>();
  nodes.forEach(n => { inDeg.set(n.id, 0); adj.set(n.id, []); });
  edges.forEach(e => {
    adj.get(e.source)?.push(e.target);
    inDeg.set(e.target, (inDeg.get(e.target) ?? 0) + 1);
  });
  const queue  = nodes.filter(n => inDeg.get(n.id) === 0);
  const result: Node[] = [];
  while (queue.length) {
    const cur = queue.shift()!;
    result.push(cur);
    (adj.get(cur.id) ?? []).forEach(nxt => {
      inDeg.set(nxt, (inDeg.get(nxt) ?? 0) - 1);
      if (inDeg.get(nxt) === 0) {
        const n = nodes.find(x => x.id === nxt);
        if (n) queue.push(n);
      }
    });
  }
  return result.length === nodes.length ? result : nodes; // cycle fallback
}

// ─── FlowCanvas (inner) ───────────────────────────────────────────────────────
const FlowCanvas: React.FC = () => {
  const wrapperRef              = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [rfInstance, setRfInstance]      = useState<any>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isRunning, setIsRunning]        = useState(false);
  const [isActive, setIsActive]          = useState(false);
  const [paletteOpen, setPaletteOpen]    = useState(true);

  // ── 엣지 연결 ────────────────────────────────────────────────────────────
  const onConnect = useCallback(
    (params: Connection | Edge) =>
      setEdges(eds =>
        addEdge({ ...params, animated: true,
          style: { stroke: '#2563EB', strokeWidth: 2 } }, eds)),
    [setEdges],
  );

  // ── 드래그앤드롭 ──────────────────────────────────────────────────────────
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type     = e.dataTransfer.getData('application/reactflow');
    const label    = e.dataTransfer.getData('application/reactflow-label');
    const platform = e.dataTransfer.getData('application/reactflow-platform');
    if (!type || !rfInstance) return;

    const position = rfInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const newNode: Node = {
      id: getId(), type, position,
      data: { label, status: 'idle', prompt: '', apiKey: '', cron: '', platform: platform || '' },
    };
    setNodes(nds => [...nds, newNode]);
  }, [rfInstance, setNodes]);

  // ── 노드 클릭 ────────────────────────────────────────────────────────────
  const onNodeClick  = useCallback((_: React.MouseEvent, node: Node) => setSelectedNodeId(node.id), []);
  const onPaneClick  = useCallback(() => setSelectedNodeId(null), []);

  // ── 선택 노드 데이터 업데이트 ────────────────────────────────────────────
  const updateNodeData = useCallback((nodeId: string, newData: any) => {
    setNodes(nds => nds.map(n =>
      n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n));
  }, [setNodes]);

  // ── 선택 노드 삭제 ───────────────────────────────────────────────────────
  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;
    setNodes(nds => nds.filter(n => n.id !== selectedNodeId));
    setEdges(eds => eds.filter(e => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  };

  // ── JSON 내보내기 ────────────────────────────────────────────────────────
  const exportJSON = () => {
    const payload = {
      isActive,
      nodes: nodes.map(n => ({
        id: n.id, type: n.type, label: n.data.label,
        cron: n.data.cron, prompt: n.data.prompt,
        platform: n.data.platform,
        apiKey: n.data.apiKey ? '***' : '',
      })),
      edges: edges.map(e => ({ source: e.source, target: e.target })),
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'automation.json' });
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── 자동화 시뮬레이션 (위상 정렬 순 실행) ────────────────────────────────
  const simulate = async () => {
    if (isRunning || nodes.length === 0) return;
    if (!isActive) {
      alert('자동화작업이 꺼져 있습니다. 먼저 활성화(ON) 해주세요.');
      return;
    }
    setIsRunning(true);
    setSelectedNodeId(null);

    // 전체 idle 초기화
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: 'idle' } })));

    const ordered = topoSort([...nodes], [...edges]);

    for (const node of ordered) {
      setNodes(nds =>
        nds.map(n => n.id === node.id ? { ...n, data: { ...n.data, status: 'running' } } : n));
      await new Promise(r => setTimeout(r, 1400));
      setNodes(nds =>
        nds.map(n => n.id === node.id ? { ...n, data: { ...n.data, status: 'success' } } : n));
      await new Promise(r => setTimeout(r, 200));
    }

    setIsRunning(false);
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId) ?? null;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-slate-50">

      {/* ── 상단 툴바 ──────────────────────────────────────────────────────── */}
      <header className="h-12 shrink-0 flex items-center justify-between px-4 bg-white border-b border-slate-200 shadow-sm z-10">
        {/* 왼쪽: 브랜드 + 페이지명 */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" fill="currentColor" />
          </div>
          <span className="text-[13px] font-bold text-slate-800 tracking-tight">자동화작업 에디터</span>
          <span className="hidden sm:block text-[11px] text-slate-400 border border-slate-200 rounded px-2 py-0.5">
            노드를 드래그하여 워크플로우를 구성하세요
          </span>
        </div>

        {/* 오른쪽: 컨트롤 */}
        <div className="flex items-center gap-2">
          {/* ON/OFF 토글 */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-colors ${
            isActive ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            <Power className={`w-3.5 h-3.5 ${isActive ? 'text-green-500' : 'text-slate-400'}`} />
            <Switch
              id="workflow-toggle"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="workflow-toggle" className="cursor-pointer select-none">
              {isActive ? 'ON' : 'OFF'}
            </Label>
          </div>

          {/* 구분선 */}
          <div className="w-px h-6 bg-slate-200" />

          {/* 삭제 버튼 (노드 선택 시만) */}
          {selectedNodeId && (
            <button
              onClick={deleteSelectedNode}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              노드 삭제
            </button>
          )}

          {/* 시뮬레이션 실행 */}
          <button
            onClick={simulate}
            disabled={isRunning || !isActive}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-lg transition-all ${
              isRunning || !isActive
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-500 shadow-sm shadow-blue-600/30'
            }`}
          >
            {isRunning
              ? <><Square className="w-3.5 h-3.5 animate-pulse" />실행 중...</>
              : <><PlayCircle className="w-3.5 h-3.5" />테스트 실행</>
            }
          </button>

          {/* JSON 내보내기 */}
          <button
            onClick={exportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            내보내기
          </button>
        </div>
      </header>

      {/* ── 메인 영역 ──────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 relative">

        {/* ── 노드 팔레트 (토글형 슬라이드) ────────────────────────────── */}
        <aside className={`relative shrink-0 flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ${
          paletteOpen ? 'w-[220px]' : 'w-0 overflow-hidden'
        }`}>
          <NodePalette />
        </aside>

        {/* 팔레트 접기/펼치기 탭 */}
        <button
          onClick={() => setPaletteOpen(o => !o)}
          className="
            absolute top-1/2 -translate-y-1/2 z-20
            w-5 h-12 rounded-r-lg
            bg-white border border-l-0 border-slate-200
            flex items-center justify-center
            text-slate-400 hover:text-slate-600 hover:bg-slate-50
            transition-colors shadow-sm
          "
          style={{ left: paletteOpen ? 220 : 0 }}
          title={paletteOpen ? '패널 접기' : '노드 패널 열기'}
        >
          {paletteOpen
            ? <ChevronLeft  className="w-3 h-3" />
            : <ChevronRight className="w-3 h-3" />
          }
        </button>

        {/* ── ReactFlow 캔버스 ───────────────────────────────────────────── */}
        <div className="flex-1 h-full" ref={wrapperRef}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setRfInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            deleteKeyCode="Delete"
            className="bg-slate-50"
          >
            <Background
              gap={20}
              size={1}
              color="#CBD5E1"
            />
            <Controls
              className="!bg-white !border-slate-200 !shadow-sm"
            />
            <MiniMap
              nodeColor={(n) => {
                const colors: Record<string, string> = {
                  source: '#3B82F6', ai: '#8B5CF6', media: '#EC4899',
                  monetize: '#10B981', blog: '#F97316', sns: '#6366F1',
                };
                return colors[n.type ?? ''] ?? '#94A3B8';
              }}
              className="!border-slate-200 !bg-white !rounded-xl"
            />

            {/* 빈 캔버스 안내 문구 */}
            {nodes.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <Zap className="w-10 h-10 text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-400">좌측 패널에서 노드를 드래그하여 배치하세요</p>
                <p className="text-xs text-slate-300 mt-1">노드를 연결하면 자동화 파이프라인이 완성됩니다</p>
              </div>
            )}
          </ReactFlow>
        </div>

        {/* ── 우측 노드 설정 패널 ────────────────────────────────────────── */}
        <NodeSettingsPanel
          selectedNode={selectedNode}
          onUpdateNodeData={updateNodeData}
        />
      </div>
    </div>
  );
};

// ─── 외부 export (ReactFlowProvider 래핑) ────────────────────────────────────
const Canvas: React.FC = () => (
  <ReactFlowProvider>
    <FlowCanvas />
  </ReactFlowProvider>
);

export default Canvas;

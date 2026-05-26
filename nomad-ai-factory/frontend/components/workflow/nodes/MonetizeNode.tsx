import React from 'react';
import { Handle, Position } from 'reactflow';
import { ShoppingBag, Loader2, CheckCircle2, XCircle } from 'lucide-react';

const MonetizeNode: React.FC<{ data: any }> = ({ data }) => {
  const getStatusStyles = () => {
    switch (data.status) {
      case 'running': return 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-pulse';
      case 'success': return 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]';
      case 'error': return 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]';
      default: return 'border-border hover:border-primary/50';
    }
  };

  return (
    <div className={`px-4 py-3 shadow-lg rounded-xl bg-card border-2 flex items-center gap-3 min-w-[220px] transition-all ${getStatusStyles()}`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-green-500 border-2 border-background" />
      <div className="p-2 rounded-lg bg-green-500/10 text-green-500 relative">
        <ShoppingBag size={20} />
        {data.status === 'running' && <Loader2 size={12} className="absolute -top-1 -right-1 animate-spin text-blue-500 bg-background rounded-full" />}
        {data.status === 'success' && <CheckCircle2 size={12} className="absolute -top-1 -right-1 text-green-500 bg-background rounded-full" />}
        {data.status === 'error' && <XCircle size={12} className="absolute -top-1 -right-1 text-red-500 bg-background rounded-full" />}
      </div>
      <div className="flex-1">
        <div className="text-sm font-bold text-foreground">{data.label || '수익화 매칭'}</div>
        <div className="text-xs text-muted-foreground">쿠팡 / 네이버 커넥트</div>
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-green-500 border-2 border-background" />
    </div>
  );
};

export default MonetizeNode;
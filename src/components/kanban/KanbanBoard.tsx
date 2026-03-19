import { useState } from 'react';
import type { Pedido } from '../../types';
import { STAGE_LABELS, STAGE_AREA, STAGE_ICONS, PedidoStage } from '../../types';
import { cn, formatMoney, stageBadgeClass, pedidoNeedsMyAction } from '../../lib/utils';
import { useAuthStore } from '../../store/auth.store';
import { AlertTriangle, Lock } from 'lucide-react';

interface Props {
  pedidos: Pedido[];
  onPedidoClick: (pedido: Pedido) => void;
  onAction: (pedido: Pedido, action: string) => void;
}

const STAGES = [1, 2, 3, 4, 5, 6];
const STAGE_COLOR_MAP: Record<number, string> = {
  1: 'text-amber-600', 2: 'text-purple-600', 3: 'text-blue-600',
  4: 'text-green-600', 5: 'text-amber-600', 6: 'text-green-700',
};
const STAGE_BG_MAP: Record<number, string> = {
  1: 'bg-amber-50 border-amber-100', 2: 'bg-purple-50 border-purple-100',
  3: 'bg-blue-50 border-blue-100', 4: 'bg-green-50 border-green-100',
  5: 'bg-amber-50 border-amber-100', 6: 'bg-green-50 border-green-100',
};
const CNT_BG_MAP: Record<number, string> = {
  1: 'bg-amber-100 text-amber-700', 2: 'bg-purple-100 text-purple-700',
  3: 'bg-blue-100 text-blue-700', 4: 'bg-green-100 text-green-700',
  5: 'bg-amber-100 text-amber-700', 6: 'bg-green-100 text-green-700',
};

function ActionButton({ pedido, rol, onAction }: { pedido: Pedido; rol: string; onAction: (p: Pedido, a: string) => void }) {
  if (rol === 'secretaria') {
    if (pedido.stage === PedidoStage.APROBACION)
      return (
        <button
          onClick={e => { e.stopPropagation(); onAction(pedido, pedido.urgente ? 'aprobar-urgente' : 'aprobar'); }}
          className={cn('btn btn-xs w-full justify-center mt-2', pedido.urgente ? 'btn-danger' : 'btn-primary')}
        >
          {pedido.urgente ? '🚨 Aprobar ahora' : '✅ Aprobar pedido'}
        </button>
      );
    if (pedido.stage === PedidoStage.FIRMA)
      return (
        <button
          onClick={e => { e.stopPropagation(); onAction(pedido, 'firmar'); }}
          className="btn btn-xs btn-primary w-full justify-center mt-2"
        >
          ✍️ Firmar presupuesto
        </button>
      );
  }
  if (rol === 'compras' && pedido.stage === PedidoStage.PRESUPUESTOS)
    return (
      <button
        onClick={e => { e.stopPropagation(); onAction(pedido, 'cargar-presupuesto'); }}
        className="btn btn-xs btn-primary w-full justify-center mt-2"
      >
        📋 Cargar presupuesto
      </button>
    );
  if (rol === 'tesoreria' && pedido.stage === PedidoStage.GESTION_PAGOS) {
    if (pedido.bloqueado)
      return (
        <button
          onClick={e => { e.stopPropagation(); onAction(pedido, 'sellado'); }}
          className="btn btn-xs btn-danger w-full justify-center mt-2"
        >
          🔒 Registrar sellado
        </button>
      );
    return (
      <button
        onClick={e => { e.stopPropagation(); onAction(pedido, 'pago'); }}
        className="btn btn-xs btn-success w-full justify-center mt-2"
      >
        💳 Registrar pago
      </button>
    );
  }
  if (rol === 'admin' && pedido.stage === PedidoStage.ESPERANDO_SUMINISTROS)
    return (
      <button
        onClick={e => { e.stopPropagation(); onAction(pedido, 'confirmar-recepcion'); }}
        className="btn btn-xs btn-success w-full justify-center mt-2"
      >
        📦 Confirmar recepción
      </button>
    );
  return null;
}

export function KanbanBoard({ pedidos, onPedidoClick, onAction }: Props) {
  const { user } = useAuthStore();
  const [onlyMine, setOnlyMine] = useState(false);

  const filteredPedidos = onlyMine
    ? pedidos.filter(p => pedidoNeedsMyAction(p.stage, user?.rol || ''))
    : pedidos;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wide">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          Estado de pedidos
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            onClick={() => setOnlyMine(v => !v)}
            className={cn(
              'w-9 h-5 rounded-full relative transition-colors',
              onlyMine ? 'bg-blue-500' : 'bg-slate-200',
            )}
          >
            <div className={cn(
              'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
              onlyMine ? 'translate-x-4' : 'translate-x-0.5',
            )} />
          </div>
          <span className={cn('text-xs font-semibold', onlyMine ? 'text-blue-600' : 'text-slate-400')}>
            Solo mis pendientes
          </span>
        </label>
      </div>

      {/* Kanban grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 overflow-x-auto">
        {STAGES.map(stage => {
          const items = filteredPedidos.filter(p => p.stage === stage);
          return (
            <div key={stage} className="card min-w-[180px] flex flex-col">
              {/* Column header */}
              <div className={cn('px-3 py-2.5 border-b', STAGE_BG_MAP[stage])}>
                <div className="flex items-start justify-between gap-1">
                  <div className="flex-1 min-w-0">
                    <div className={cn('text-xs font-bold leading-tight', STAGE_COLOR_MAP[stage])}>
                      {STAGE_ICONS[stage]} {STAGE_LABELS[stage]}
                    </div>
                    {STAGE_AREA[stage] !== '—' && (
                      <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide mt-0.5" style={{ fontSize: '9px' }}>
                        {STAGE_AREA[stage]}
                      </div>
                    )}
                  </div>
                  <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0', CNT_BG_MAP[stage])}>
                    {items.length}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="p-2 flex flex-col gap-2 flex-1 min-h-[80px]">
                {items.length === 0 && (
                  <div className="text-center text-slate-300 text-xs py-4">—</div>
                )}
                {items.map(p => {
                  const needsMe = pedidoNeedsMyAction(p.stage, user?.rol || '');
                  return (
                    <div
                      key={p.id}
                      onClick={() => onPedidoClick(p)}
                      className={cn(
                        'rounded-xl border p-2.5 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md',
                        needsMe
                          ? (p.urgente
                            ? 'bg-red-50 border-red-200 border-l-4 border-l-red-500'
                            : 'bg-blue-50 border-blue-200 border-l-4 border-l-blue-500')
                          : 'bg-white border-slate-200',
                        p.bloqueado && 'border-red-200 bg-red-50',
                      )}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-mono text-xs text-slate-400">{p.numero}</span>
                        <div className="flex items-center gap-1">
                          {p.bloqueado && <Lock size={10} className="text-red-500" />}
                          {p.urgente && <AlertTriangle size={10} className="text-red-500" />}
                        </div>
                      </div>
                      <div className="text-xs font-bold text-slate-800 leading-tight mb-1 line-clamp-2">
                        {p.descripcion}
                      </div>
                      <div className="text-xs text-slate-500 mb-1.5">Solicitó: {p.area}</div>
                      <div className="flex flex-wrap gap-1">
                        {p.monto && (
                          <span className="badge badge-amber" style={{ fontSize: '9px' }}>
                            {formatMoney(p.monto)}
                          </span>
                        )}
                        {p.bloqueado && (
                          <span className="badge badge-red" style={{ fontSize: '9px' }}>🔒 Bloqueado</span>
                        )}
                      </div>
                      <ActionButton pedido={p} rol={user?.rol || ''} onAction={onAction} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

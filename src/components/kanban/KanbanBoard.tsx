import { useEffect, useRef, useState } from 'react';
import type { Pedido } from '../../types';
import { STAGE_LABELS, STAGE_AREA, STAGE_ICONS, STAGE_HELP_COPY, PedidoStage } from '../../types';
import { cn, formatMoney, pedidoNeedsMyAction } from '../../lib/utils';
import { useAuthStore } from '../../store/auth.store';
import { AlertTriangle, CircleHelp, DollarSign, Lock } from 'lucide-react';

interface Props {
  pedidos: Pedido[];
  onPedidoClick: (pedido: Pedido) => void;
  onAction: (pedido: Pedido, action: string) => void;
  visibleStages?: number[];
}

const STAGES = [1, 2, 3, 4, 5, 6];
const STAGE_COLOR_MAP: Record<number, string> = {
  1: 'var(--amber)', 2: 'var(--purple)', 3: 'var(--blue)',
  4: 'var(--green)', 5: 'var(--amber)', 6: 'var(--green)',
};
const STAGE_BG_MAP: Record<number, string> = {
  1: 'linear-gradient(135deg, #fef3c7, #fffbeb)', 
  2: 'linear-gradient(135deg, #ede9fe, #f5f3ff)',
  3: 'linear-gradient(135deg, #dbeafe, #eff6ff)', 
  4: 'linear-gradient(135deg, #dcfce7, #f0fdf4)',
  5: 'linear-gradient(135deg, #fef3c7, #fffbeb)', 
  6: 'linear-gradient(135deg, #dcfce7, #f0fdf4)',
};
const STAGE_BORDER_MAP: Record<number, string> = {
  1: 'var(--amber-brd)', 2: 'var(--purple-brd)', 3: 'var(--blue-brd)',
  4: 'var(--green-brd)', 5: 'var(--amber-brd)', 6: 'var(--green-brd)',
};

/** Top accent bar per column */
const STAGE_TOP_BAR: Record<number, string> = {
  1: 'linear-gradient(90deg, #d97706, #fbbf24)',
  2: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
  3: 'linear-gradient(90deg, #2563eb, #60a5fa)',
  4: 'linear-gradient(90deg, #15803d, #4ade80)',
  5: 'linear-gradient(90deg, #d97706, #fbbf24)',
  6: 'linear-gradient(90deg, #15803d, #22c55e)',
};

const STAGE_GLOW_MAP: Record<number, string> = {
  1: 'radial-gradient(circle at 100% 0%, rgba(245,158,11,.16) 0%, transparent 58%)',
  2: 'radial-gradient(circle at 100% 0%, rgba(139,92,246,.15) 0%, transparent 58%)',
  3: 'radial-gradient(circle at 100% 0%, rgba(59,130,246,.16) 0%, transparent 58%)',
  4: 'radial-gradient(circle at 100% 0%, rgba(34,197,94,.15) 0%, transparent 58%)',
  5: 'radial-gradient(circle at 100% 0%, rgba(245,158,11,.16) 0%, transparent 58%)',
  6: 'radial-gradient(circle at 100% 0%, rgba(34,197,94,.15) 0%, transparent 58%)',
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

export function KanbanBoard({ pedidos, onPedidoClick, onAction, visibleStages }: Props) {
  const { user } = useAuthStore();
  const [onlyMine, setOnlyMine] = useState(false);
  const [openHelpStage, setOpenHelpStage] = useState<number | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const stages = visibleStages ?? STAGES;

  const filteredPedidos = onlyMine
    ? pedidos.filter(p => pedidoNeedsMyAction(p.stage, user?.rol || ''))
    : pedidos;

  useEffect(() => {
    if (openHelpStage === null) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!boardRef.current?.contains(event.target as Node)) {
        setOpenHelpStage(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenHelpStage(null);
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [openHelpStage]);

  return (
    <div ref={boardRef} className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div 
          className="flex items-center gap-2 uppercase font-bold"
          style={{ fontSize: '11px', color: 'var(--text3)', letterSpacing: '.5px' }}
        >
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--blue-mid)' }} />
          Estado de pedidos
        </div>
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <div
            onClick={() => setOnlyMine(v => !v)}
            className="w-11 h-6 rounded-full relative transition-all cursor-pointer flex-shrink-0"
            style={{
              background: onlyMine ? 'var(--gradient-blue)' : 'var(--border2)',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,.1)',
            }}
          >
            <div 
              className="absolute w-[18px] h-[18px] bg-white rounded-full top-[3px] transition-transform"
              style={{
                left: onlyMine ? 'calc(100% - 21px)' : '3px',
                boxShadow: '0 1px 4px rgba(0,0,0,.25)',
              }}
            />
          </div>
          <span 
            className="font-semibold"
            style={{ 
              fontSize: '12px', 
              color: onlyMine ? 'var(--blue)' : 'var(--text3)',
            }}
          >
            Solo mis pendientes
          </span>
        </label>
      </div>

      {/* Kanban grid */}
      <div className="grid grid-flow-col auto-cols-[minmax(280px,1fr)] gap-4 overflow-x-auto pb-2 snap-x snap-mandatory xl:grid-flow-row xl:auto-cols-auto xl:grid-cols-3 2xl:grid-cols-6 xl:overflow-visible">
        {stages.map(stage => {
          const items = filteredPedidos.filter(p => p.stage === stage);
          const isMineStage = !!user?.rol && items.some(p => pedidoNeedsMyAction(p.stage, user.rol));
          return (
            <div 
              key={stage} 
              className="card relative min-h-[250px] min-w-0 snap-start overflow-visible flex flex-col"
              style={{
                background: 'var(--gradient-card)',
                border: isMineStage
                  ? '1px solid rgba(59,130,246,.22)'
                  : '1px solid rgba(148,163,184,.18)',
                borderRadius: 'var(--r3)',
                boxShadow: isMineStage
                  ? '0 10px 24px rgba(15,23,42,.10), 0 20px 48px rgba(59,130,246,.12)'
                  : '0 10px 26px rgba(15,23,42,.08), 0 2px 8px rgba(15,23,42,.04)',
                zIndex: openHelpStage === stage ? 80 : 1,
              }}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-90"
                style={{ background: STAGE_GLOW_MAP[stage] }}
              />
              <div
                className="absolute inset-x-0 top-0 z-20 h-1.5"
                style={{ background: STAGE_TOP_BAR[stage] }}
              />
              {/* Column header */}
              <div 
                className="relative px-4 pb-3.5 pt-5 border-b"
                style={{
                  background: STAGE_BG_MAP[stage],
                  borderBottom: `1px solid ${STAGE_BORDER_MAP[stage]}`,
                  zIndex: openHelpStage === stage ? 140 : 10,
                }}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="flex flex-1 min-w-0 gap-2.5">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border"
                      style={{
                        background: STAGE_BG_MAP[stage],
                        borderColor: STAGE_BORDER_MAP[stage],
                        color: STAGE_COLOR_MAP[stage],
                        boxShadow: '0 6px 16px rgba(15,23,42,.08), inset 0 1px 0 rgba(255,255,255,.55)',
                        fontSize: '14px',
                      }}
                    >
                      {STAGE_ICONS[stage]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-1.5">
                        <div 
                          className="font-bold leading-tight"
                          style={{
                            fontSize: '12px',
                            color: STAGE_COLOR_MAP[stage],
                            letterSpacing: '-.2px',
                          }}
                        >
                          {STAGE_LABELS[stage]}
                        </div>
                        <div
                          className="relative mt-[1px] shrink-0"
                          onMouseEnter={() => setOpenHelpStage(stage)}
                          onMouseLeave={() => setOpenHelpStage((current) => (current === stage ? null : current))}
                        >
                          <button
                            type="button"
                            aria-label={`Explicar etapa ${STAGE_LABELS[stage]}`}
                            aria-expanded={openHelpStage === stage}
                            aria-describedby={openHelpStage === stage ? `stage-help-${stage}` : undefined}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenHelpStage((current) => (current === stage ? null : stage));
                            }}
                            onFocus={() => setOpenHelpStage(stage)}
                            onBlur={() => setOpenHelpStage((current) => (current === stage ? null : current))}
                            className="flex h-[18px] w-[18px] items-center justify-center rounded-full transition-colors"
                            style={{
                              background: openHelpStage === stage ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.48)',
                              color: STAGE_COLOR_MAP[stage],
                              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.55)',
                            }}
                          >
                            <CircleHelp size={12} strokeWidth={2.2} />
                          </button>
                          {openHelpStage === stage && (
                            <div
                              id={`stage-help-${stage}`}
                              role="tooltip"
                              className="absolute left-0 top-full z-[120] mt-2 w-[220px] rounded-[12px] p-3"
                              style={{
                                background: 'rgba(15,23,42,.96)',
                                color: 'rgba(255,255,255,.9)',
                                boxShadow: '0 14px 32px rgba(15,23,42,.28)',
                                border: '1px solid rgba(255,255,255,.08)',
                                fontSize: '11px',
                                lineHeight: 1.45,
                              }}
                            >
                              {STAGE_HELP_COPY[stage]}
                            </div>
                          )}
                        </div>
                      </div>
                      {STAGE_AREA[stage] !== '—' && (
                        <div 
                          className="uppercase font-semibold mt-0.5"
                          style={{ 
                            fontSize: '9px',
                            color: 'var(--text3)',
                            letterSpacing: '.6px',
                          }}
                        >
                          {STAGE_AREA[stage]}
                        </div>
                      )}
                    </div>
                  </div>
                  <span 
                    className="font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      fontSize: '11px',
                      background: STAGE_BG_MAP[stage],
                      color: STAGE_COLOR_MAP[stage],
                      border: `1px solid ${STAGE_BORDER_MAP[stage]}`,
                    }}
                  >
                    {items.length}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div
                className="relative flex flex-1 flex-col gap-2.5 p-3"
                style={{
                  background: 'linear-gradient(180deg, rgba(248,250,252,.7) 0%, rgba(255,255,255,.94) 100%)',
                  zIndex: 5,
                }}
              >
                {items.length === 0 && (
                  <div 
                    className="flex flex-1 items-center justify-center rounded-[12px] border border-dashed py-8 text-center"
                    style={{
                      fontSize: '12px',
                      color: 'var(--text3)',
                      borderColor: 'rgba(148,163,184,.35)',
                      background: 'rgba(248,250,252,.72)',
                    }}
                  >
                    Sin pedidos en esta etapa
                  </div>
                )}
                {items.map(p => {
                  const needsMe = pedidoNeedsMyAction(p.stage, user?.rol || '');
                  return (
                    <div
                      key={p.id}
                      onClick={() => onPedidoClick(p)}
                      className={cn(
                        'p-3 cursor-pointer transition-all',
                        p.bloqueado && 'border-red-200 bg-red-50',
                      )}
                      style={{
                        borderRadius: '12px',
                        border: needsMe 
                          ? (p.urgente 
                            ? '1.5px solid var(--red-brd)' 
                            : '1.5px solid var(--blue-brd)')
                          : '1.5px solid var(--border)',
                        background: needsMe
                          ? (p.urgente
                            ? 'linear-gradient(135deg, #fee2e2, #fef2f2)'
                            : 'linear-gradient(135deg, #dbeafe, #eff6ff)')
                          : 'var(--white)',
                        borderLeftWidth: needsMe ? '4px' : '1.5px',
                        boxShadow: needsMe
                          ? (p.urgente
                            ? '0 0 0 1px rgba(239,68,68,.06), 0 4px 12px rgba(239,68,68,.14)'
                            : '0 0 0 1px rgba(59,130,246,.08), 0 4px 12px rgba(59,130,246,.14)')
                          : '0 6px 16px rgba(15,23,42,.06), inset 0 1px 0 rgba(255,255,255,.75)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-3px)';
                        e.currentTarget.style.boxShadow = needsMe
                          ? (p.urgente
                            ? '0 0 0 1px rgba(239,68,68,.08), 0 8px 18px rgba(239,68,68,.18)'
                            : '0 0 0 1px rgba(59,130,246,.1), 0 8px 18px rgba(59,130,246,.18)')
                          : 'var(--shadow-sm)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = needsMe
                          ? (p.urgente
                            ? '0 0 0 1px rgba(239,68,68,.06), 0 4px 12px rgba(239,68,68,.14)'
                            : '0 0 0 1px rgba(59,130,246,.08), 0 4px 12px rgba(59,130,246,.14)')
                          : '0 12px 24px rgba(15,23,42,.09), inset 0 1px 0 rgba(255,255,255,.75)';
                      }}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span 
                          className="rounded-full border px-2 py-0.5 font-mono"
                          style={{ fontSize: '10px', color: 'var(--text3)', borderColor: 'var(--border)', background: 'var(--surface)' }}
                        >
                          {p.numero}
                        </span>
                        <div className="flex items-center gap-1">
                          {p.bloqueado && <Lock size={11} style={{ color: 'var(--red)' }} />}
                          {p.urgente && <AlertTriangle size={11} style={{ color: 'var(--red)' }} />}
                        </div>
                      </div>
                      <div 
                        className="font-bold leading-tight mb-1 line-clamp-2"
                        style={{ fontSize: '12px', color: 'var(--text)' }}
                      >
                        {p.descripcion}
                      </div>
                      <div 
                        className="mb-1.5"
                        style={{ fontSize: '11px', color: 'var(--text2)' }}
                      >
                        Solicitó: {p.area}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {p.monto && (
                          <span className="badge badge-amber gap-1" style={{ fontSize: '9px' }}>
                            <DollarSign size={10} />
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

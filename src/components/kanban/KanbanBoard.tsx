import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Pedido } from '../../types';
import { STAGE_LABELS, STAGE_AREA, STAGE_ICONS, STAGE_HELP_COPY, PedidoStage } from '../../types';
import { cn, formatMoney, pedidoNeedsMyAction, ROLE_STAGES, rolLabel, pedidoEstadoVisibleLabel } from '../../lib/utils';
import { useAuthStore } from '../../store/auth.store';
import { AlertTriangle, CircleHelp, DollarSign, Lock } from 'lucide-react';

interface Props {
  pedidos: Pedido[];
  onPedidoClick: (pedido: Pedido) => void;
  onAction: (pedido: Pedido, action: string) => void;
  visibleStages?: number[];
  /** Mínimo de presupuestos requeridos para enviar a Secretaría. Default 3. */
  minPresupuestos?: number;
  /** Máximo de cotizaciones por pedido (tope). Default 5. */
  maxPresupuestos?: number;
}

const STAGES = [1, 2, 3, 4, 5, 6, 7, 8];
/** Acento por sector: Secretaría azul, Compras violeta, Tesorería teal, Suministros celeste, Cierre verde */
const STAGE_COLOR_MAP: Record<number, string> = {
  1: 'var(--blue-mid)',
  2: 'var(--purple-mid)',
  3: 'var(--blue-mid)',
  4: 'var(--purple-mid)',
  5: 'var(--teal-mid)',
  6: 'var(--sky-mid)',
  7: 'var(--green-mid)',
  8: 'var(--red-mid)',
};
const STAGE_BG_MAP: Record<number, string> = {
  1: 'linear-gradient(135deg, #dbeafe, #eff6ff)',
  2: 'linear-gradient(135deg, #ede9fe, #f5f3ff)',
  3: 'linear-gradient(135deg, #dbeafe, #eff6ff)',
  4: 'linear-gradient(135deg, #ede9fe, #f5f3ff)',
  5: 'linear-gradient(135deg, #ccfbf1, #f0fdfa)',
  6: 'linear-gradient(135deg, #e0f2fe, #f0f9ff)',
  7: 'linear-gradient(135deg, #dcfce7, #f0fdf4)',
  8: 'linear-gradient(135deg, #fee2e2, #fef2f2)',
};
const STAGE_BORDER_MAP: Record<number, string> = {
  1: 'var(--blue-brd)',
  2: 'var(--purple-brd)',
  3: 'var(--blue-brd)',
  4: 'var(--purple-brd)',
  5: 'var(--teal-brd)',
  6: 'var(--sky-brd)',
  7: 'var(--green-brd)',
  8: 'var(--red-brd)',
};

/** Top accent bar per column */
const STAGE_TOP_BAR: Record<number, string> = {
  1: 'linear-gradient(90deg, #1d4ed8, #60a5fa)',
  2: 'linear-gradient(90deg, #5b21b6, #a78bfa)',
  3: 'linear-gradient(90deg, #1d4ed8, #60a5fa)',
  4: 'linear-gradient(90deg, #5b21b6, #a78bfa)',
  5: 'linear-gradient(90deg, #0f766e, #2dd4bf)',
  6: 'linear-gradient(90deg, #0369a1, #38bdf8)',
  7: 'linear-gradient(90deg, #15803d, #4ade80)',
  8: 'linear-gradient(90deg, #b91c1c, #f87171)',
};

const STAGE_GLOW_MAP: Record<number, string> = {
  1: 'radial-gradient(circle at 100% 0%, var(--blue-glow) 0%, transparent 58%)',
  2: 'radial-gradient(circle at 100% 0%, rgba(139,92,246,.15) 0%, transparent 58%)',
  3: 'radial-gradient(circle at 100% 0%, var(--blue-glow) 0%, transparent 58%)',
  4: 'radial-gradient(circle at 100% 0%, rgba(139,92,246,.15) 0%, transparent 58%)',
  5: 'radial-gradient(circle at 100% 0%, var(--teal-glow) 0%, transparent 58%)',
  6: 'radial-gradient(circle at 100% 0%, var(--sky-glow) 0%, transparent 58%)',
  7: 'radial-gradient(circle at 100% 0%, rgba(34,197,94,.15) 0%, transparent 58%)',
  8: 'radial-gradient(circle at 100% 0%, rgba(239,68,68,.12) 0%, transparent 58%)',
};

function ActionButton({
  pedido,
  rol,
  onAction,
  minPresupuestos = 3,
}: {
  pedido: Pedido;
  rol: string;
  onAction: (p: Pedido, a: string) => void;
  minPresupuestos?: number;
}) {
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
  if (rol === 'compras' && pedido.stage === PedidoStage.PRESUPUESTOS) {
    const n = pedido.presupuestosCargados ?? 0;
    const listo = n >= minPresupuestos;
    return (
      <button
        onClick={e => { e.stopPropagation(); onAction(pedido, 'cargar-presupuesto'); }}
        className={cn(
          'btn btn-xs w-full justify-center mt-2',
          listo ? 'btn-success' : 'btn-primary',
        )}
      >
        {listo ? '📤 Enviar a Secretaría' : '📋 Cargar presupuesto'}
      </button>
    );
  }
  if (rol === 'compras' && pedido.stage === PedidoStage.CARGA_FACTURA)
    return (
      <button
        onClick={e => { e.stopPropagation(); onAction(pedido, 'subir-factura'); }}
        className="btn btn-xs btn-primary w-full justify-center mt-2"
      >
        📄 Subir factura
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

export function KanbanBoard({
  pedidos,
  onPedidoClick,
  onAction,
  visibleStages,
  minPresupuestos = 3,
  maxPresupuestos = 5,
}: Props) {
  const { user } = useAuthStore();
  const [onlyMine, setOnlyMine] = useState(false);
  const [onlyMyAreaStages, setOnlyMyAreaStages] = useState(false);
  const [openHelpStage, setOpenHelpStage] = useState<number | null>(null);
  const [helpTooltipPos, setHelpTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const helpTooltipRef = useRef<HTMLDivElement | null>(null);
  const stageHelpAnchorRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const helpLeaveTimerRef = useRef<number | null>(null);

  const stages = useMemo(() => {
    const base = visibleStages ?? STAGES;
    if (!onlyMyAreaStages || !user?.rol) return base;
    const mine = ROLE_STAGES[user.rol];
    if (!mine?.length) return base;
    return base.filter((s) => mine.includes(s));
  }, [visibleStages, onlyMyAreaStages, user?.rol]);

  const clearHelpLeaveTimer = () => {
    if (helpLeaveTimerRef.current != null) {
      window.clearTimeout(helpLeaveTimerRef.current);
      helpLeaveTimerRef.current = null;
    }
  };

  const scheduleHelpClose = () => {
    clearHelpLeaveTimer();
    helpLeaveTimerRef.current = window.setTimeout(() => {
      setOpenHelpStage(null);
      helpLeaveTimerRef.current = null;
    }, 120);
  };

  const filteredPedidos = onlyMine
    ? pedidos.filter(p => pedidoNeedsMyAction(p.stage, user?.rol || ''))
    : pedidos;

  useLayoutEffect(() => {
    if (openHelpStage === null) {
      setHelpTooltipPos(null);
      return;
    }
    const update = () => {
      const el = stageHelpAnchorRefs.current[openHelpStage];
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setHelpTooltipPos({ top: rect.bottom + 8, left: rect.left });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [openHelpStage]);

  useEffect(() => {
    return () => clearHelpLeaveTimer();
  }, []);

  useEffect(() => {
    if (openHelpStage === null) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (boardRef.current?.contains(target)) return;
      if (helpTooltipRef.current?.contains(target)) return;
      setOpenHelpStage(null);
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
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
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
          {user?.rol && user.rol !== 'admin' && (
            <label
              className="flex items-center gap-2.5 cursor-pointer select-none"
              title={`Etapas donde participa ${rolLabel(user.rol)}: ${ROLE_STAGES[user.rol]?.join(', ') ?? ''}`}
            >
              <div
                onClick={() => setOnlyMyAreaStages(v => !v)}
                className="w-11 h-6 rounded-full relative transition-all cursor-pointer flex-shrink-0"
                style={{
                  background: onlyMyAreaStages ? 'var(--gradient-blue)' : 'var(--border2)',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,.1)',
                }}
              >
                <div 
                  className="absolute w-[18px] h-[18px] bg-white rounded-full top-[3px] transition-transform"
                  style={{
                    left: onlyMyAreaStages ? 'calc(100% - 21px)' : '3px',
                    boxShadow: '0 1px 4px rgba(0,0,0,.25)',
                  }}
                />
              </div>
              <span 
                className="font-semibold"
                style={{ 
                  fontSize: '12px', 
                  color: onlyMyAreaStages ? 'var(--blue)' : 'var(--text3)',
                }}
              >
                Solo etapas de mi área
              </span>
            </label>
          )}
        </div>
      </div>

      {/* Kanban grid */}
      <div className="grid grid-flow-col auto-cols-[minmax(280px,1fr)] gap-4 overflow-x-auto pb-2 snap-x snap-mandatory xl:grid-flow-row xl:auto-cols-auto xl:grid-cols-4 2xl:grid-cols-8 xl:overflow-visible">
        {stages.map(stage => {
          const items = filteredPedidos.filter(p => p.stage === stage);
          const isMineStage = !!user?.rol && items.some(p => pedidoNeedsMyAction(p.stage, user.rol));
          return (
            <div 
              key={stage} 
              className="card relative min-h-[250px] min-w-0 snap-start overflow-hidden flex flex-col"
              style={{
                background: 'var(--gradient-card)',
                borderColor: STAGE_BORDER_MAP[stage],
                boxShadow: isMineStage
                  ? '0 10px 24px rgba(15,23,42,.10), 0 20px 48px rgba(59,130,246,.12)'
                  : 'var(--shadow)',
                zIndex: 1,
              }}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-90"
                style={{ background: STAGE_GLOW_MAP[stage] }}
              />
              <div
                className="pointer-events-none absolute inset-x-0 top-0 z-20 h-1.5"
                style={{ background: STAGE_TOP_BAR[stage] }}
              />
              {/* Column header */}
              <div 
                className="relative z-10 px-4 pb-3.5 pt-5 border-b"
                style={{
                  background: STAGE_BG_MAP[stage],
                  borderBottom: `1px solid ${STAGE_BORDER_MAP[stage]}`,
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
                          ref={(el) => {
                            stageHelpAnchorRefs.current[stage] = el;
                          }}
                          className="relative mt-[1px] shrink-0"
                          onMouseEnter={() => {
                            clearHelpLeaveTimer();
                            setOpenHelpStage(stage);
                          }}
                          onMouseLeave={scheduleHelpClose}
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
                            onFocus={() => {
                              clearHelpLeaveTimer();
                              setOpenHelpStage(stage);
                            }}
                            onBlur={() => {
                              window.setTimeout(() => {
                                if (helpTooltipRef.current?.matches(':hover')) return;
                                setOpenHelpStage((current) => (current === stage ? null : current));
                              }, 150);
                            }}
                            className="flex h-[18px] w-[18px] items-center justify-center rounded-full transition-colors"
                            style={{
                              background: openHelpStage === stage ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.48)',
                              color: STAGE_COLOR_MAP[stage],
                              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.55)',
                            }}
                          >
                            <CircleHelp size={12} strokeWidth={2.2} />
                          </button>
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
                      {p.stage === PedidoStage.RECHAZADO && (
                        <div className="mb-1 text-[10px] font-bold leading-tight text-red-700 line-clamp-2">
                          {pedidoEstadoVisibleLabel(p)}
                        </div>
                      )}
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
                        {p.stage === PedidoStage.PRESUPUESTOS && (
                          <span
                            className="badge gap-0.5 font-mono font-bold"
                            style={{
                              fontSize: '9px',
                              background: (p.presupuestosCargados ?? 0) >= minPresupuestos
                                ? 'rgba(34,197,94,.14)'
                                : 'rgba(139,92,246,.12)',
                              color: (p.presupuestosCargados ?? 0) >= minPresupuestos
                                ? '#15803d'
                                : 'var(--purple-mid)',
                              border: `1px solid ${(p.presupuestosCargados ?? 0) >= minPresupuestos ? 'rgba(34,197,94,.35)' : 'rgba(139,92,246,.28)'}`,
                            }}
                            title={`Cargados / máximo (${minPresupuestos} mínimo para enviar)`}
                          >
                            {p.presupuestosCargados ?? 0}/{maxPresupuestos}
                          </span>
                        )}
                      </div>
                      <ActionButton pedido={p} rol={user?.rol || ''} onAction={onAction} minPresupuestos={minPresupuestos} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {openHelpStage !== null &&
        helpTooltipPos != null &&
        createPortal(
          <div
            ref={helpTooltipRef}
            id={`stage-help-${openHelpStage}`}
            role="tooltip"
            className="fixed z-[250] w-[min(220px,calc(100vw-16px))] rounded-[12px] p-3"
            style={{
              top: helpTooltipPos.top,
              left: Math.max(8, Math.min(helpTooltipPos.left, window.innerWidth - 220 - 8)),
              background: 'rgba(15,23,42,.96)',
              color: 'rgba(255,255,255,.9)',
              boxShadow: '0 14px 32px rgba(15,23,42,.28)',
              border: '1px solid rgba(255,255,255,.08)',
              fontSize: '11px',
              lineHeight: 1.45,
            }}
            onMouseEnter={clearHelpLeaveTimer}
            onMouseLeave={scheduleHelpClose}
          >
            {STAGE_HELP_COPY[openHelpStage]}
          </div>,
          document.body,
        )}
    </div>
  );
}

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { pedidosApi, configApi } from '../../api/services';
import { useAuthStore } from '../../store/auth.store';
import { KanbanBoard } from '../../components/kanban/KanbanBoard';
import { formatDate, formatMoney, rolLabel, pedidoNeedsMyAction } from '../../lib/utils';
import type { Pedido } from '../../types';
import { PedidoStage } from '../../types';
import { useState } from 'react';
import { ActionModal } from '../../components/ui/ActionModal';
import { Activity, ArrowRight, CheckCircle2, ChevronRight, ClipboardList, Lock, type LucideIcon } from 'lucide-react';

export type DashboardMode = 'dashboard' | 'aprobar' | 'firmar';

const MODE_STAGE: Partial<Record<DashboardMode, PedidoStage>> = {
  aprobar: PedidoStage.APROBACION,
  firmar: PedidoStage.FIRMA,
};

const MODE_META: Partial<Record<DashboardMode, {
  title: string;
  subtitle: string;
  queueTitle: string;
  queueCopy: string;
  actionLabel: string;
  emptyTitle: string;
  emptyCopy: string;
}>> = {
  aprobar: {
    title: 'Pedidos para aprobar',
    subtitle: 'Revisa los pedidos pendientes de aprobación de Secretaría.',
    queueTitle: 'Cola de aprobación',
    queueCopy: 'Se priorizan urgentes primero y luego los pedidos más antiguos para resolverlos en orden.',
    actionLabel: 'Aprobar pedido',
    emptyTitle: 'No hay pedidos pendientes de aprobación',
    emptyCopy: 'Cuando ingresen nuevos pedidos en esta etapa, aparecerán acá listos para revisar.',
  },
  firmar: {
    title: 'Presupuestos para firmar',
    subtitle: 'Accede a los presupuestos listos para firma dentro de Secretaría.',
    queueTitle: 'Cola de firma',
    queueCopy: 'La lista muestra cada presupuesto listo para firma con sus datos clave y acceso rápido al expediente.',
    actionLabel: 'Firmar presupuesto',
    emptyTitle: 'No hay presupuestos pendientes de firma',
    emptyCopy: 'Cuando Compras complete una selección, aparecerá acá para firmar.',
  },
};

export default function DashboardPage({ mode = 'dashboard' }: { mode?: DashboardMode }) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [actionModal, setActionModal] = useState<{ pedido: Pedido; action: string } | null>(null);

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['pedidos', user?.rol],
    queryFn: () => pedidosApi.getAll(),
    refetchInterval: 30000,
  });

  const { data: sistemaConfig } = useQuery({
    queryKey: ['config'],
    queryFn: () => configApi.get(),
    staleTime: 60_000,
  });
  const maxPresupuestos = sistemaConfig?.maxPresupuestos ?? 5;
  const minPresupuestos = Math.min(sistemaConfig?.minPresupuestos ?? 3, maxPresupuestos);

  const focusedStage = user?.rol === 'secretaria' ? MODE_STAGE[mode] : undefined;
  const displayPedidos = focusedStage
    ? pedidos.filter((p) => p.stage === focusedStage)
    : pedidos;
  const visibleStages = focusedStage ? [focusedStage] : undefined;
  const pageMeta = focusedStage ? MODE_META[mode] : null;
  const approvalsPending = pedidos.some((p) => p.stage === PedidoStage.APROBACION);
  const signaturesPending = pedidos.some((p) => p.stage === PedidoStage.FIRMA);
  const pendingRoute = approvalsPending ? '/aprobar' : signaturesPending ? '/firmar' : '/dashboard';
  const myPending = displayPedidos.filter((p) => pedidoNeedsMyAction(p.stage, user?.rol || ''));
  const urgentes = myPending.filter((p) => p.urgente);
  const enCurso = displayPedidos.filter((p) => p.stage < PedidoStage.SUMINISTROS_LISTOS && p.stage !== PedidoStage.RECHAZADO);
  const bloqueados = displayPedidos.filter((p) => p.bloqueado);
  const listos = displayPedidos.filter((p) => p.stage === PedidoStage.SUMINISTROS_LISTOS);
  const queuePedidos = focusedStage
    ? [...displayPedidos].sort((a, b) => {
        if (a.urgente !== b.urgente) return Number(b.urgente) - Number(a.urgente);
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      })
    : [];

  const getRouteForAction = (action: string) => {
    if (action === 'aprobar' || action === 'aprobar-urgente') return '/aprobar';
    if (action === 'firmar') return '/firmar';
    return null;
  };

  const getPrimaryAction = (pedido: Pedido) => {
    if (pedido.stage === PedidoStage.APROBACION) {
      return {
        label: pedido.urgente ? 'Aprobar ahora' : pageMeta?.actionLabel || 'Aprobar pedido',
        action: pedido.urgente ? 'aprobar-urgente' : 'aprobar',
      };
    }
    return {
      label: pageMeta?.actionLabel || 'Firmar presupuesto',
      action: 'firmar',
    };
  };

  const handleAction = (pedido: Pedido, action: string) => {
    if (action === 'cargar-presupuesto') return navigate(`/presupuestos/${pedido.id}`);
    if (action === 'firmar') {
      navigate(`/pedidos/${pedido.id}`, { state: { openPresupuestosTab: true } });
      return;
    }
    const route = getRouteForAction(action);
    if (route && user?.rol === 'secretaria' && mode !== route.slice(1)) {
      navigate(route);
      return;
    }
    setActionModal({ pedido, action });
  };

  const refetch = () => qc.invalidateQueries({ queryKey: ['pedidos'] });

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <div 
        className="dashboard-hero rounded-[18px] p-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 60%, #3b82f6 100%)',
          boxShadow: '0 8px 32px rgba(30,64,175,.35), 0 0 0 1px rgba(255,255,255,.1)',
        }}
      >
        <div 
          className="dashboard-hero-glow absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 60% 80% at 90% 50%, rgba(255,255,255,.08) 0%, transparent 60%),
              radial-gradient(ellipse 30% 40% at 10% 80%, rgba(96,165,250,.2) 0%, transparent 50%)
            `
          }}
        />
        <div 
          className="dashboard-hero-orb absolute top-[-30px] right-[-30px] w-40 h-40 rounded-full"
          style={{ border: '2px solid rgba(255,255,255,.08)' }}
        />
        
        <div className="relative z-10">
          <div 
            className="text-white font-extrabold mb-1"
            style={{ fontSize: '21px', letterSpacing: '-.5px' }}
          >
            {pageMeta ? pageMeta.title : `Buenos días, ${user?.nombre} 👋`}
          </div>
          <div 
            className="mb-4"
            style={{ fontSize: '13px', color: 'rgba(255,255,255,.7)' }}
          >
            {pageMeta
              ? `${pageMeta.subtitle} · ${new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}`
              : `${rolLabel(user?.rol || '')} · ${new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}`}
          </div>
          
          {/* Quick stats */}
          <div className="flex flex-col gap-2">
            {urgentes.length > 0 && (
              <div 
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] cursor-pointer transition-all"
                style={{
                  background: 'rgba(255,255,255,.1)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,.15)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.12)',
                }}
                onClick={() => navigate('/aprobar')}
              >
                <div 
                  className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
                  style={{ background: '#f87171', boxShadow: '0 0 8px rgba(248,113,113,.6)' }}
                />
                <div className="text-white font-semibold flex-1" style={{ fontSize: '13px' }}>
                  {urgentes.length} {urgentes.length === 1 ? 'pedido urgente' : 'pedidos urgentes'}
                </div>
                <div 
                  className="px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    background: 'rgba(248,113,113,.25)',
                    color: '#fca5a5',
                    border: '1px solid rgba(248,113,113,.3)',
                  }}
                >
                  URGENTE
                </div>
                <ChevronRight size={14} style={{ color: 'rgba(255,255,255,.45)' }} />
              </div>
            )}
            {myPending.length > 0 && (
              <div 
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] cursor-pointer transition-all"
                style={{
                  background: 'rgba(255,255,255,.1)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,.15)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.12)',
                }}
                onClick={() => navigate(focusedStage ? `/${mode}` : pendingRoute)}
              >
                <div 
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: '#93c5fd', boxShadow: '0 0 8px rgba(147,197,253,.5)' }}
                />
                <div className="text-white font-semibold flex-1" style={{ fontSize: '13px' }}>
                  {myPending.length} {myPending.length === 1 ? 'tarea pendiente' : 'tareas pendientes'}
                </div>
                <div 
                  className="px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    background: 'rgba(147,197,253,.2)',
                    color: '#bfdbfe',
                    border: '1px solid rgba(147,197,253,.25)',
                  }}
                >
                  {myPending.length}
                </div>
                <ChevronRight size={14} style={{ color: 'rgba(255,255,255,.45)' }} />
              </div>
            )}
            {listos.length > 0 && (
              <div 
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] cursor-pointer transition-all"
                style={{
                  background: 'rgba(255,255,255,.1)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,.15)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.12)',
                }}
                onClick={() => navigate('/historial')}
              >
                <div 
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: '#4ade80', boxShadow: '0 0 8px rgba(74,222,128,.5)' }}
                />
                <div className="text-white font-semibold flex-1" style={{ fontSize: '13px' }}>
                  {listos.length} {listos.length === 1 ? 'pedido listo para retiro' : 'pedidos listos para retiro'}
                </div>
                <div 
                  className="px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    background: 'rgba(74,222,128,.2)',
                    color: '#86efac',
                    border: '1px solid rgba(74,222,128,.25)',
                  }}
                >
                  LISTO
                </div>
                <ChevronRight size={14} style={{ color: 'rgba(255,255,255,.45)' }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {focusedStage ? (
        <TaskQueueSection
          isLoading={isLoading}
          pedidos={queuePedidos}
          title={pageMeta?.queueTitle || 'Cola de trabajo'}
          subtitle={pageMeta?.queueCopy || ''}
          emptyTitle={pageMeta?.emptyTitle || 'Sin pendientes'}
          emptyCopy={pageMeta?.emptyCopy || ''}
          onOpen={(pedido) => navigate(`/pedidos/${pedido.id}`)}
          onAction={(pedido) => {
            const primaryAction = getPrimaryAction(pedido);
            handleAction(pedido, primaryAction.action);
          }}
          getActionLabel={(pedido) => getPrimaryAction(pedido).label}
        />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <KpiCard
              value={enCurso.length}
              label="En curso"
              color="blue"
              icon={Activity}
              subtitle={
                enCurso.length === 1 ? '1 pedido en el flujo' : `${enCurso.length} pedidos en el flujo`
              }
            />
            <KpiCard
              value={bloqueados.length}
              label="Bloqueados"
              color="red"
              icon={Lock}
              subtitle={
                bloqueados.length > 0
                  ? bloqueados.length === 1
                    ? '1 requiere sellado u otorgamiento'
                    : `${bloqueados.length} requieren atención de tesorería`
                  : 'Ninguno bloqueado'
              }
            />
            <KpiCard
              value={listos.length}
              label="Completados"
              color="green"
              icon={CheckCircle2}
              subtitle={
                listos.length === 1
                  ? '1 listo para retiro / cierre'
                  : `${listos.length} listos para retiro / cierre`
              }
            />
          </div>

          {/* Kanban */}
          {isLoading ? (
            <div className="text-center py-16 text-slate-400">Cargando pedidos...</div>
          ) : (
            <KanbanBoard
              pedidos={displayPedidos}
              onPedidoClick={p => navigate(`/pedidos/${p.id}`)}
              onAction={handleAction}
              visibleStages={visibleStages}
              minPresupuestos={minPresupuestos}
              maxPresupuestos={maxPresupuestos}
            />
          )}
        </>
      )}

      {/* Action modal */}
      {actionModal && (
        <ActionModal
          pedido={actionModal.pedido}
          action={actionModal.action}
          onClose={() => setActionModal(null)}
          onSuccess={() => { setActionModal(null); refetch(); }}
        />
      )}
    </div>
  );
}

const KPI_THEME: Record<
  string,
  { accent: string; top: string; iconBg: string; glow: string }
> = {
  blue: {
    accent: 'var(--blue-mid)',
    top: 'linear-gradient(90deg, #2563eb, #60a5fa)',
    iconBg: 'linear-gradient(135deg, rgba(59,130,246,.18), rgba(37,99,235,.08))',
    glow: 'radial-gradient(circle at 100% 0%, rgba(59,130,246,.14) 0%, transparent 55%)',
  },
  red: {
    accent: 'var(--red-mid)',
    top: 'linear-gradient(90deg, #dc2626, #f87171)',
    iconBg: 'linear-gradient(135deg, rgba(239,68,68,.18), rgba(185,28,28,.08))',
    glow: 'radial-gradient(circle at 100% 0%, rgba(239,68,68,.12) 0%, transparent 55%)',
  },
  green: {
    accent: 'var(--green-mid)',
    top: 'linear-gradient(90deg, #15803d, #4ade80)',
    iconBg: 'linear-gradient(135deg, rgba(34,197,94,.18), rgba(22,101,52,.08))',
    glow: 'radial-gradient(circle at 100% 0%, rgba(34,197,94,.12) 0%, transparent 55%)',
  },
};

function KpiCard({
  value,
  label,
  color,
  icon: Icon,
  subtitle,
}: {
  value: number;
  label: string;
  color: keyof typeof KPI_THEME;
  icon: LucideIcon;
  subtitle: string;
}) {
  const theme = KPI_THEME[color] ?? KPI_THEME.blue;

  return (
    <div
      className="kpi-card relative overflow-hidden rounded-[var(--r3)] border border-white/90 anim"
      style={{
        padding: '20px 20px 16px',
        background: 'var(--gradient-card)',
        boxShadow: 'var(--shadow)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
        style={{ background: theme.top }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{ background: theme.glow }}
      />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div
            className="font-extrabold tabular-nums tracking-tight"
            style={{
              fontSize: '34px',
              lineHeight: 1,
              letterSpacing: '-1.5px',
              color: theme.accent,
            }}
          >
            {value}
          </div>
          <div
            className="mt-2 font-bold uppercase tracking-[0.35px] text-[var(--text2)]"
            style={{ fontSize: '11px' }}
          >
            {label}
          </div>
        </div>
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/80 shadow-sm"
          style={{
            background: theme.iconBg,
            color: theme.accent,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,.6)',
          }}
        >
          <Icon className="h-5 w-5" strokeWidth={2.25} />
        </div>
      </div>
      <div 
        className="relative z-10 mt-3 inline-flex max-w-full rounded-full border px-2.5 py-1 text-[10px] font-bold leading-tight text-[var(--text2)]"
        style={{
          background: 'rgba(248,250,252,.9)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <span className="truncate">{subtitle}</span>
      </div>
    </div>
  );
}

function TaskQueueSection({
  isLoading,
  pedidos,
  title,
  subtitle,
  emptyTitle,
  emptyCopy,
  onOpen,
  onAction,
  getActionLabel,
}: {
  isLoading: boolean;
  pedidos: Pedido[];
  title: string;
  subtitle: string;
  emptyTitle: string;
  emptyCopy: string;
  onOpen: (pedido: Pedido) => void;
  onAction: (pedido: Pedido) => void;
  getActionLabel: (pedido: Pedido) => string;
}) {
  if (isLoading) {
    return <div className="card p-10 text-center text-slate-400">Cargando pendientes...</div>;
  }

  return (
    <section className="space-y-4">
      <div className="card overflow-hidden">
        <div
          className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.45px] text-[var(--text3)]">
              <ClipboardList className="h-4 w-4" />
              Vista lista
            </div>
            <h2 className="mt-1 text-[18px] font-extrabold tracking-[-.35px] text-[var(--text)]">{title}</h2>
            <p className="mt-1 max-w-3xl text-sm text-[var(--text2)]">{subtitle}</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold text-[var(--text2)]" style={{ borderColor: 'var(--border)', background: 'rgba(248,250,252,.88)' }}>
            <span>{pedidos.length}</span>
            <span>{pedidos.length === 1 ? 'pendiente' : 'pendientes'}</span>
          </div>
        </div>

        {pedidos.length === 0 ? (
          <div className="empty-state px-6 py-12">
            <div className="empty-icon">✅</div>
            <div className="empty-title">{emptyTitle}</div>
            <div className="empty-copy">{emptyCopy}</div>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {pedidos.map((pedido) => (
              <article
                key={pedido.id}
                className="flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-slate-50/80 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border px-2 py-0.5 font-mono text-[11px] font-bold text-[var(--text3)]" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                      {pedido.numero}
                    </span>
                    {pedido.urgente && <span className="badge badge-red text-xs">URGENTE</span>}
                    {pedido.bloqueado && <span className="badge badge-red text-xs">BLOQUEADO</span>}
                  </div>
                  <h3 className="mt-2 text-[15px] font-bold leading-tight text-[var(--text)]">{pedido.descripcion}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--text2)]">
                    <span>{pedido.area}</span>
                    <span>{formatMoney(pedido.monto)}</span>
                    <span>Creado {formatDate(pedido.createdAt)}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                  <button
                    type="button"
                    onClick={() => onOpen(pedido)}
                    className="btn btn-ghost btn-sm justify-center gap-1"
                  >
                    Ver detalle
                    <ArrowRight size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onAction(pedido)}
                    className={pedido.urgente ? 'btn btn-danger btn-sm justify-center' : 'btn btn-primary btn-sm justify-center'}
                  >
                    {pedido.urgente ? `🚨 ${getActionLabel(pedido)}` : getActionLabel(pedido)}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

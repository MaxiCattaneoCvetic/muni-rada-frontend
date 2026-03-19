import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { pedidosApi } from '../../api/services';
import { useAuthStore } from '../../store/auth.store';
import { KanbanBoard } from '../../components/kanban/KanbanBoard';
import { formatMoney, rolLabel, pedidoNeedsMyAction, stageLabel } from '../../lib/utils';
import type { Pedido } from '../../types';
import { PedidoStage } from '../../types';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { ActionModal } from '../../components/ui/ActionModal';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [actionModal, setActionModal] = useState<{ pedido: Pedido; action: string } | null>(null);

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => pedidosApi.getAll(),
    refetchInterval: 30000,
  });

  const myPending = pedidos.filter(p => pedidoNeedsMyAction(p.stage, user?.rol || ''));
  const urgentes  = myPending.filter(p => p.urgente);
  const enCurso   = pedidos.filter(p => p.stage < 6 && p.stage !== 7);
  const bloqueados= pedidos.filter(p => p.bloqueado);
  const listos    = pedidos.filter(p => p.stage === PedidoStage.SUMINISTROS_LISTOS);

  const handleAction = (pedido: Pedido, action: string) => {
    // Quick navigation for some actions
    if (action === 'cargar-presupuesto') return navigate(`/presupuestos/${pedido.id}`);
    setActionModal({ pedido, action });
  };

  const refetch = () => qc.invalidateQueries({ queryKey: ['pedidos'] });

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div style={{ borderLeft: '4px solid #2563eb' }} className="pl-4">
        <div className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">{rolLabel(user?.rol || '')}</div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Buenos días, {user?.nombre} 👋
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Así está el sistema · {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          value={myPending.length || '✓'}
          label="Esperando mi acción"
          color={urgentes.length > 0 ? 'red' : myPending.length > 0 ? 'blue' : 'green'}
          badge={urgentes.length > 0 ? '🚨 Urgente' : myPending.length > 0 ? '📋 Pendiente' : '✅ Al día'}
          highlight={urgentes.length > 0}
        />
        <KpiCard
          value={enCurso.length}
          label="En curso"
          color="slate"
          badge={myPending.map(p => stageLabel(p.stage)).filter((v, i, a) => a.indexOf(v) === i).slice(0, 2).join(' · ') || '—'}
        />
        <KpiCard
          value={bloqueados.length}
          label="Bloqueados"
          color={bloqueados.length > 0 ? 'red' : 'slate'}
          badge={bloqueados.length > 0 ? 'Req. sellado' : 'Ninguno'}
        />
        <KpiCard
          value={listos.length}
          label="Completados"
          color="green"
          badge="este mes"
        />
      </div>

      {/* Kanban */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-400">Cargando pedidos...</div>
      ) : (
        <KanbanBoard
          pedidos={pedidos.filter(p => p.stage !== PedidoStage.RECHAZADO)}
          onPedidoClick={p => navigate(`/pedidos/${p.id}`)}
          onAction={handleAction}
        />
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

function KpiCard({ value, label, color, badge, highlight }: {
  value: any; label: string; color: string; badge?: string; highlight?: boolean;
}) {
  const colorMap: Record<string, string> = {
    red: 'text-red-600', blue: 'text-blue-600', green: 'text-green-600', slate: 'text-slate-700',
  };
  const borderMap: Record<string, string> = {
    red: 'border-t-red-500', blue: 'border-t-blue-500', green: 'border-t-green-500', slate: 'border-t-slate-300',
  };
  return (
    <div className={`card p-5 border-t-4 ${borderMap[color]} ${highlight ? 'ring-2 ring-red-200' : ''}`}>
      <div className={`text-3xl font-black tracking-tighter ${colorMap[color]}`}>{value}</div>
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1.5">{label}</div>
      {badge && (
        <div className="mt-2">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{badge}</span>
        </div>
      )}
    </div>
  );
}

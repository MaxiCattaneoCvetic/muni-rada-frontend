import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { pedidosApi } from '../../api/services';
import { useAuthStore } from '../../store/auth.store';
import { PedidoStage } from '../../types';
import { PedidoPresupuestosComprasPanel } from '../../components/presupuestos/PedidoPresupuestosComprasPanel';
import { Pagination, usePagination } from '../../components/ui/Pagination';
import { ChevronRight, ArrowLeft } from 'lucide-react';

const PAGE_SIZE = 10;

export function PresupuestosPage() {
  const { pedidoId } = useParams<{ pedidoId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [page, setPage] = useState(1);

  const { data: pedidosPendientes = [] } = useQuery({
    queryKey: ['pedidos-presupuestos', user?.rol],
    queryFn: () => pedidosApi.getAll(),
    select: (items) => items.filter((p) => p.stage === PedidoStage.PRESUPUESTOS),
    enabled: !pedidoId,
  });
  const { data: pedido } = useQuery({
    queryKey: ['pedido', pedidoId],
    queryFn: () => pedidosApi.getById(pedidoId!),
    enabled: !!pedidoId,
  });

  const { page: safePage, totalPages, start, end } = usePagination({
    total: pedidosPendientes.length,
    pageSize: PAGE_SIZE,
    page,
    setPage,
  });

  if (!pedidoId) {
    const pageItems = pedidosPendientes.slice(start, end);

    return (
      <div className="page-shell-form">
        <div className="page-heading">
          <div className="page-kicker">Compras</div>
          <h1 className="page-title">Presupuestos</h1>
          <p className="page-subtitle">Seleccioná un pedido pendiente para cargar y comparar presupuestos.</p>
        </div>

        <div className="space-y-3">
          {pedidosPendientes.length === 0 ? (
            <div className="card empty-state">
              <div className="empty-icon">💰</div>
              <div className="empty-title">No hay pedidos esperando presupuestos</div>
              <div className="empty-copy">Cuando Secretaría apruebe un pedido, aparecerá acá.</div>
            </div>
          ) : (
            pageItems.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => navigate(`/presupuestos/${p.id}`)}
                className="card w-full p-5 text-left transition-all hover:-translate-y-0.5"
                style={{ borderLeft: '4px solid var(--purple-mid)' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-xs text-slate-400">{p.numero}</div>
                    <div className="mt-1 text-base font-bold text-slate-900">{p.descripcion}</div>
                    <div className="mt-1 text-sm text-slate-500">📍 {p.area}</div>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-purple-700">
                    Abrir
                    <ChevronRight size={16} />
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <Pagination
          page={safePage}
          totalPages={totalPages}
          total={pedidosPendientes.length}
          start={start}
          end={end}
          onPage={setPage}
          itemLabel="pedidos"
        />
      </div>
    );
  }

  return (
    <div className="page-shell-form">
      <button type="button" onClick={() => navigate(-1)} className="back-link">
        <ArrowLeft size={16} /> Volver
      </button>

      <PedidoPresupuestosComprasPanel
        pedidoId={pedidoId}
        pedido={pedido}
        compactHeader={false}
        onEnviarFirmaSuccess={() => navigate('/dashboard')}
      />
    </div>
  );
}

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { pedidosApi, presupuestosApi, configApi } from '../../api/services';
import type { Pedido, Presupuesto } from '../../types';
import { PedidoStage } from '../../types';
import { formatMoney, formatDate } from '../../lib/utils';
import { ButtonSpinner, RadaTillyLoader } from '../ui/loading';
import { PresupuestoCargaModal } from './PresupuestoCargaModal';
import { PresupuestoDetalleModal } from './PresupuestoDetalleModal';
import { StepSuccessModal } from '../ui/StepSuccessModal';
import { Trash2, Plus, Send } from 'lucide-react';

function formatApiError(e: unknown): string {
  const any = e as { response?: { data?: { message?: string | string[] } }; message?: string };
  const m = any.response?.data?.message;
  if (Array.isArray(m)) return m.join(' ');
  if (typeof m === 'string' && m) return m;
  return any.message || 'Error';
}

/**
 * `invalidateQueries({ queryKey: ['pedidos'] })` no incluye claves como `pedidos-presupuestos`
 * ni `pedidos-admin` (primer segmento distinto). Refrescamos todas las vistas de listas.
 */
function invalidatePedidosEnTodasLasVistas(qc: QueryClient, pedidoId: string) {
  qc.invalidateQueries({ queryKey: ['pedidos'] });
  qc.invalidateQueries({ queryKey: ['pedidos-presupuestos'] });
  qc.invalidateQueries({ queryKey: ['pedidos-todos'] });
  qc.invalidateQueries({ queryKey: ['pedidos-admin'] });
  qc.invalidateQueries({ queryKey: ['pedido', pedidoId] });
}

export interface PedidoPresupuestosComprasPanelProps {
  pedidoId: string;
  pedido: Pedido | undefined;
  /** Tras enviar a Secretaría con éxito (p. ej. navegar al dashboard o quedarse en el detalle). */
  onEnviarFirmaSuccess?: () => void;
  /** Oculta la tarjeta superior con título del pedido (útil cuando el padre ya muestra el encabezado). */
  compactHeader?: boolean;
}

export function PedidoPresupuestosComprasPanel({
  pedidoId,
  pedido,
  onEnviarFirmaSuccess,
  compactHeader,
}: PedidoPresupuestosComprasPanelProps) {
  const qc = useQueryClient();
  const { data: presupuestos = [] } = useQuery({
    queryKey: ['presupuestos', pedidoId],
    queryFn: () => presupuestosApi.getByPedido(pedidoId),
    enabled: !!pedidoId,
  });
  const { data: sistemaConfig } = useQuery({
    queryKey: ['config'],
    queryFn: () => configApi.get(),
    staleTime: 60_000,
  });
  const { minPresup, maxPresup } = (() => {
    const max = sistemaConfig?.maxPresupuestos ?? 5;
    const rawMin = sistemaConfig?.minPresupuestos ?? 3;
    return { minPresup: Math.min(rawMin, max), maxPresup: max };
  })();

  const [showCargaModal, setShowCargaModal] = useState(false);
  const [error, setError] = useState('');
  const [detalle, setDetalle] = useState<Presupuesto | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const delMut = useMutation({
    mutationFn: (id: string) => presupuestosApi.delete(pedidoId, id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['presupuestos', pedidoId] });
      invalidatePedidosEnTodasLasVistas(qc, pedidoId);
      setDetalle((d) => (d?.id === id ? null : d));
    },
  });

  const enviarMut = useMutation({
    mutationFn: () => pedidosApi.enviarFirma(pedidoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['presupuestos', pedidoId] });
      invalidatePedidosEnTodasLasVistas(qc, pedidoId);
      setShowSuccess(true);
    },
    onError: (e) => setError(formatApiError(e)),
  });

  const listo = presupuestos.length >= minPresup;
  const wrongStage = pedido && pedido.stage !== PedidoStage.PRESUPUESTOS;

  if (!pedido) {
    return <RadaTillyLoader variant="contained" label="Cargando cotizaciones" />;
  }

  if (showSuccess) {
    return (
      <StepSuccessModal
        theme="green"
        title="¡Cotizaciones enviadas a Secretaría!"
        nextStep="Secretaría revisará los presupuestos y firmará el elegido."
        nextStepSub="Una vez firmado, el expediente avanza a Compras para la carga de la factura del proveedor."
        pedidoNumero={pedido.numero}
        pedidoDescripcion={pedido.descripcion}
        urgenteNote={pedido.urgente ? 'Pedido urgente — Secretaría verá este expediente con prioridad.' : undefined}
        onDismiss={() => {
          setShowSuccess(false);
          onEnviarFirmaSuccess?.();
        }}
      />
    );
  }

  if (wrongStage) {
    return (
      <div className="card p-6">
        <p className="text-sm text-slate-700">Este pedido ya no está en la etapa de cotización.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!compactHeader && (
        <div className="card p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="font-mono text-xs text-slate-400">{pedido.numero}</div>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">{pedido.descripcion}</h2>
              <p className="text-slate-500 text-sm">📍 {pedido.area}</p>
            </div>
            {listo && (
              <button
                type="button"
                onClick={() => enviarMut.mutate()}
                disabled={enviarMut.isPending}
                className="btn btn-success gap-2 shrink-0"
              >
                {enviarMut.isPending ? <ButtonSpinner label="Enviando" /> : <><Send size={15} /> Enviar a Secretaría</>}
              </button>
            )}
          </div>
          {!listo && (
            <div className="alert alert-warning mt-3 mb-0">
              ⏳ Faltan {minPresup - presupuestos.length} presupuesto{minPresup - presupuestos.length !== 1 ? 's' : ''}{' '}
              para poder enviar a Secretaría
            </div>
          )}
          {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}
        </div>
      )}

      {compactHeader && (
        <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            {!listo && (
              <p className="text-sm text-amber-800 m-0">
                Faltan {minPresup - presupuestos.length} presupuesto{minPresup - presupuestos.length !== 1 ? 's' : ''} para
                enviar a Secretaría.
              </p>
            )}
            {listo && <p className="text-sm text-green-800 m-0">Listo para enviar a Secretaría.</p>}
          </div>
          {listo && (
            <button
              type="button"
              onClick={() => enviarMut.mutate()}
              disabled={enviarMut.isPending}
              className="btn btn-success btn-sm gap-2"
            >
              {enviarMut.isPending ? <ButtonSpinner label="Enviando" /> : <><Send size={15} /> Enviar a Secretaría</>}
            </button>
          )}
          {error && <div className="w-full text-sm text-red-600">{error}</div>}
        </div>
      )}

      <div className="card p-5">
        <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
          <span className="text-sm font-semibold text-slate-700">Presupuestos cargados</span>
          <span className="text-sm font-bold text-blue-600 font-mono tabular-nums">
            {presupuestos.length} / {maxPresup}
            <span className="text-xs font-semibold text-slate-500 ml-2">(mín. {minPresup} para enviar)</span>
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
          <div
            className={`h-full rounded-full transition-all ${listo ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${Math.min((presupuestos.length / minPresup) * 100, 100)}%` }}
          />
        </div>
        {presupuestos.length >= maxPresup && (
          <p className="text-xs text-slate-500 mt-2 mb-0">Límite máximo de {maxPresup} cotizaciones por pedido.</p>
        )}
      </div>

      <div className="space-y-3">
        {presupuestos.map((p, i) => (
          <div
            key={p.id}
            role="button"
            tabIndex={0}
            onClick={() => setDetalle(p)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setDetalle(p);
              }
            }}
            className="card p-5 border-l-4 border-l-green-400 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 shrink-0 rounded-full bg-green-100 border-2 border-green-300 text-green-700 font-bold text-sm flex items-center justify-center">
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 truncate">{p.proveedor}</div>
                  <div className="text-xs text-slate-500">{formatDate(p.createdAt)} · Tocá para ver detalle</div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-black font-mono text-lg">{formatMoney(p.monto)}</div>
                {p.plazoEntrega && <div className="text-xs text-slate-500">Entrega: {p.plazoEntrega}</div>}
              </div>
            </div>
            {(p.contacto || p.notas) && (
              <div className="mt-3 pt-3 border-t border-slate-100 text-sm text-slate-600 space-y-1">
                {p.contacto && <div>📧 {p.contacto}</div>}
                {p.notas && <div className="text-slate-500 line-clamp-2">{p.notas}</div>}
              </div>
            )}
            <div className="mt-3 flex items-center justify-between gap-2">
              {p.archivoUrl ? (
                <a
                  href={p.archivoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="doc-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  📄 Ver PDF
                </a>
              ) : (
                <span className="text-xs text-slate-400">Sin PDF adjunto</span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  delMut.mutate(p.id);
                }}
                className="btn btn-xs btn-danger ml-auto gap-1"
              >
                <Trash2 size={12} /> Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {detalle && (
        <PresupuestoDetalleModal
          presupuesto={detalle}
          pedidoNumero={pedido.numero}
          pedidoDescripcion={pedido.descripcion}
          index={presupuestos.findIndex((x) => x.id === detalle.id) + 1}
          onClose={() => setDetalle(null)}
          onDelete={() => delMut.mutate(detalle.id)}
          deletePending={delMut.isPending}
        />
      )}

      {presupuestos.length < maxPresup && !showCargaModal && (
        <button
          type="button"
          onClick={() => {
            setError('');
            setShowCargaModal(true);
          }}
          className="btn btn-primary w-full justify-center gap-2 py-3"
        >
          <Plus size={16} /> Agregar presupuesto {presupuestos.length + 1}
        </button>
      )}

      <PresupuestoCargaModal
        open={showCargaModal}
        onClose={() => setShowCargaModal(false)}
        pedidoId={pedidoId}
        pedidoNumero={pedido.numero}
        pedidoDescripcion={pedido.descripcion}
        indicePresupuesto={presupuestos.length + 1}
        onSaved={() => {
          setError('');
          qc.invalidateQueries({ queryKey: ['presupuestos', pedidoId] });
          invalidatePedidosEnTodasLasVistas(qc, pedidoId);
        }}
      />
    </div>
  );
}

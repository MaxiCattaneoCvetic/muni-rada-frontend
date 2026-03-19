import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pedidosApi, presupuestosApi, selladosApi, pagosApi } from '../../api/services';
import { useAuthStore } from '../../store/auth.store';
import { formatMoney, formatDate, formatDateTime, stageLabel, stageBadgeClass, stageIcon } from '../../lib/utils';
import { ActionModal } from '../../components/ui/ActionModal';
import { ArrowLeft, Clock, CheckCircle, XCircle, Lock } from 'lucide-react';
import { PedidoStage } from '../../types';

export function PedidoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [modal, setModal] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'flujo' | 'presupuestos' | 'documentos'>('flujo');

  const { data: pedido, isLoading } = useQuery({
    queryKey: ['pedido', id],
    queryFn: () => pedidosApi.getById(id!),
  });
  const { data: presupuestos = [] } = useQuery({
    queryKey: ['presupuestos', id],
    queryFn: () => presupuestosApi.getByPedido(id!),
    enabled: !!id,
  });
  const { data: sellado } = useQuery({
    queryKey: ['sellado', id],
    queryFn: () => selladosApi.getByPedido(id!),
    enabled: !!id,
  });
  const { data: pago } = useQuery({
    queryKey: ['pago', id],
    queryFn: () => pagosApi.getByPedido(id!),
    enabled: !!id,
  });

  const refetch = () => {
    qc.invalidateQueries({ queryKey: ['pedido', id] });
    qc.invalidateQueries({ queryKey: ['pedidos'] });
    qc.invalidateQueries({ queryKey: ['presupuestos', id] });
    qc.invalidateQueries({ queryKey: ['sellado', id] });
    qc.invalidateQueries({ queryKey: ['pago', id] });
  };

  if (isLoading) return <div className="p-8 text-center text-slate-400">Cargando expediente...</div>;
  if (!pedido) return <div className="p-8 text-center text-red-500">Pedido no encontrado</div>;

  const stageColors: Record<number, string> = {
    1: 'border-amber-400 bg-amber-50',
    2: 'border-purple-400 bg-purple-50',
    3: 'border-blue-400 bg-blue-50',
    4: 'border-green-400 bg-green-50',
    5: 'border-amber-400 bg-amber-50',
    6: 'border-green-600 bg-green-50',
    7: 'border-red-400 bg-red-50',
  };

  const FLOW_STEPS = [
    { stage: 1, label: 'Aprobación de suministros', quien: pedido.aprobadoPor?.nombreCompleto, ts: pedido.notaAprobacion, icon: '⏳' },
    { stage: 2, label: 'Búsqueda de presupuestos', quien: `${presupuestos.length} presupuesto${presupuestos.length !== 1 ? 's' : ''} cargado${presupuestos.length !== 1 ? 's' : ''}`, ts: null, icon: '🔍' },
    { stage: 3, label: 'Firma de presupuestos', quien: pedido.firmadoPor?.nombreCompleto, ts: formatDateTime(pedido.firmadoEn), icon: '✍️' },
    { stage: 4, label: 'Gestión de sellos y pagos', quien: sellado ? `Sellado: ${sellado.numeroSellado}` : pago ? 'Sin sellado' : null, ts: null, icon: '🏛️' },
    { stage: 5, label: 'Esperando suministros', quien: null, ts: null, icon: '📦' },
    { stage: 6, label: 'Suministros listos', quien: pedido.recepcionConfirmadaPor?.nombreCompleto, ts: formatDateTime(pedido.recepcionEn), icon: '✅' },
  ];

  const canAprobar = (user?.rol === 'secretaria' || user?.rol === 'admin') && pedido.stage === PedidoStage.APROBACION;
  const canRechazar = (user?.rol === 'secretaria' || user?.rol === 'admin') && (pedido.stage === PedidoStage.APROBACION || pedido.stage === PedidoStage.FIRMA);
  const canFirmar = (user?.rol === 'secretaria' || user?.rol === 'admin') && pedido.stage === PedidoStage.FIRMA;
  const canSellado = (user?.rol === 'tesoreria' || user?.rol === 'admin') && pedido.stage === PedidoStage.GESTION_PAGOS && pedido.bloqueado && !sellado;
  const canPago = (user?.rol === 'tesoreria' || user?.rol === 'admin') && pedido.stage === PedidoStage.GESTION_PAGOS && !pedido.bloqueado && !pago;
  const canRecepcion = user?.rol === 'admin' && pedido.stage === PedidoStage.ESPERANDO_SUMINISTROS;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors">
        <ArrowLeft size={16} /> Volver
      </button>

      {/* Header */}
      <div className={`card p-6 border-l-4 ${stageColors[pedido.stage] || 'border-slate-300'}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm text-slate-400 font-bold">{pedido.numero}</span>
              {pedido.urgente && <span className="badge badge-red">🚨 URGENTE</span>}
              {pedido.bloqueado && <span className="badge badge-red"><Lock size={10} /> Bloqueado</span>}
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{pedido.descripcion}</h1>
            {pedido.cantidad && <p className="text-slate-500 text-sm mt-0.5">{pedido.cantidad}</p>}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-sm text-slate-500">📍 {pedido.area}</span>
              <span className={`badge ${stageBadgeClass(pedido.stage)}`}>
                {stageIcon(pedido.stage)} {stageLabel(pedido.stage)}
              </span>
            </div>
          </div>
          {pedido.monto && (
            <div className="text-right flex-shrink-0">
              <div className="text-3xl font-black font-mono text-slate-900">{formatMoney(pedido.monto)}</div>
              {pedido.proveedorSeleccionado && <div className="text-sm text-slate-500 mt-0.5">{pedido.proveedorSeleccionado}</div>}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-slate-100">
          {canAprobar && <button onClick={() => setModal('aprobar')} className="btn btn-primary btn-sm">✅ Aprobar</button>}
          {canFirmar && <button onClick={() => setModal('firmar')} className="btn btn-primary btn-sm">✍️ Firmar presupuesto</button>}
          {canSellado && <button onClick={() => setModal('sellado')} className="btn btn-danger btn-sm">🏛️ Registrar sellado</button>}
          {canPago && <button onClick={() => setModal('pago')} className="btn btn-success btn-sm">💳 Registrar pago</button>}
          {canRecepcion && <button onClick={() => setModal('confirmar-recepcion')} className="btn btn-success btn-sm">📦 Confirmar recepción</button>}
          {canRechazar && <button onClick={() => setModal('rechazar')} className="btn btn-danger btn-sm">✗ Rechazar</button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['flujo', 'presupuestos', 'documentos'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${activeTab === tab ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tab === 'flujo' ? '📋 Flujo' : tab === 'presupuestos' ? `💰 Presupuestos (${presupuestos.length})` : '📎 Documentos'}
          </button>
        ))}
      </div>

      {/* Tab: Flujo */}
      {activeTab === 'flujo' && (
        <div className="card p-6">
          <div className="space-y-0">
            {FLOW_STEPS.map((step, i) => {
              const done = pedido.stage > step.stage;
              const current = pedido.stage === step.stage;
              const rejected = pedido.stage === PedidoStage.RECHAZADO;
              return (
                <div key={step.stage} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 border-2 ${
                      done ? 'bg-green-500 border-green-500 text-white' :
                      current ? 'bg-blue-500 border-blue-500 text-white' :
                      'bg-white border-slate-200 text-slate-400'
                    }`}>
                      {done ? <CheckCircle size={16} /> : current ? <Clock size={14} /> : <span className="text-xs">{i + 1}</span>}
                    </div>
                    {i < FLOW_STEPS.length - 1 && (
                      <div className={`w-0.5 flex-1 my-1 ${done ? 'bg-green-300' : 'bg-slate-100'}`} style={{ minHeight: '24px' }} />
                    )}
                  </div>
                  <div className={`pb-6 flex-1 min-w-0 ${i === FLOW_STEPS.length - 1 ? 'pb-0' : ''}`}>
                    <div className={`font-semibold text-sm ${done ? 'text-slate-700' : current ? 'text-blue-700' : 'text-slate-400'}`}>
                      {step.icon} {step.label}
                    </div>
                    {step.quien && <div className="text-xs text-slate-500 mt-0.5">{step.quien}</div>}
                    {step.ts && <div className="text-xs text-slate-400 mt-0.5 font-mono">{step.ts}</div>}
                    {current && pedido.notaRechazo && <div className="text-xs text-red-600 mt-1 font-medium">Motivo: {pedido.notaRechazo}</div>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Info grid */}
          <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-slate-400 text-xs font-bold uppercase">Solicitado por</span><div className="font-semibold mt-0.5">{pedido.creadoPor?.nombreCompleto || '—'}</div></div>
            <div><span className="text-slate-400 text-xs font-bold uppercase">Fecha creación</span><div className="font-semibold mt-0.5">{formatDate(pedido.createdAt)}</div></div>
            {pedido.aprobadoPor && <div><span className="text-slate-400 text-xs font-bold uppercase">Aprobado por</span><div className="font-semibold mt-0.5">{pedido.aprobadoPor.nombreCompleto}</div></div>}
            {pedido.firmadoPor && <div><span className="text-slate-400 text-xs font-bold uppercase">Firmado por</span><div className="font-semibold mt-0.5">{pedido.firmadoPor.nombreCompleto}</div></div>}
            {pedido.firmaHash && <div className="col-span-2"><span className="text-slate-400 text-xs font-bold uppercase">Hash firma</span><div className="font-mono text-xs text-slate-600 mt-0.5">{pedido.firmaHash}</div></div>}
          </div>
        </div>
      )}

      {/* Tab: Presupuestos */}
      {activeTab === 'presupuestos' && (
        <div className="space-y-3">
          {presupuestos.length === 0 ? (
            <div className="card p-8 text-center text-slate-400">Sin presupuestos cargados aún</div>
          ) : presupuestos.map((p, i) => (
            <div key={p.id} className="card p-5 border-l-4 border-l-green-400">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 border-2 border-green-300 text-green-700 font-bold text-sm flex items-center justify-center">{i + 1}</div>
                  <div>
                    <div className="font-bold">{p.proveedor}</div>
                    {p.contacto && <div className="text-xs text-slate-500">{p.contacto}</div>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black font-mono text-lg">{formatMoney(p.monto)}</div>
                  {p.plazoEntrega && <div className="text-xs text-slate-500">Entrega: {p.plazoEntrega}</div>}
                </div>
              </div>
              {p.notas && <div className="mt-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{p.notas}</div>}
              {p.archivoUrl && <a href={p.archivoUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline">📄 Ver PDF del presupuesto →</a>}
              {pedido.proveedorSeleccionado === p.proveedor && (
                <div className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full">✅ Seleccionado</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab: Documentos */}
      {activeTab === 'documentos' && (
        <div className="card p-6 space-y-4">
          {/* Firma */}
          {pedido.firmaUrlUsada && (
            <div className="border border-slate-200 rounded-xl p-4">
              <div className="text-xs font-bold text-slate-400 uppercase mb-2">Firma digital</div>
              <img src={pedido.firmaUrlUsada} alt="Firma" className="max-h-20 object-contain bg-white border border-slate-100 rounded p-2" />
              <div className="text-xs text-slate-400 mt-1 font-mono">{pedido.firmaHash}</div>
            </div>
          )}
          {/* Sellado */}
          {sellado && (
            <div className="border border-slate-200 rounded-xl p-4">
              <div className="text-xs font-bold text-slate-400 uppercase mb-2">Sellado provincial</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-slate-400">N°</span> <span className="font-mono font-bold">{sellado.numeroSellado}</span></div>
                <div><span className="text-slate-400">Fecha</span> <span className="font-semibold">{formatDate(sellado.fechaSellado)}</span></div>
                <div><span className="text-slate-400">Monto</span> <span className="font-mono font-bold">{formatMoney(sellado.montoSellado)}</span></div>
              </div>
              {sellado.comprobanteUrl && <a href={sellado.comprobanteUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline">📄 Comprobante →</a>}
            </div>
          )}
          {/* Pago */}
          {pago && (
            <div className="border border-green-200 rounded-xl p-4 bg-green-50">
              <div className="text-xs font-bold text-green-600 uppercase mb-2">✅ Pago registrado</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-slate-400">Transferencia</span> <span className="font-mono font-bold">{pago.numeroTransferencia}</span></div>
                <div><span className="text-slate-400">Fecha</span> <span className="font-semibold">{formatDate(pago.fechaPago)}</span></div>
                <div><span className="text-slate-400">Monto</span> <span className="font-mono font-bold">{formatMoney(pago.montoPagado)}</span></div>
              </div>
              {pago.facturaUrl && <a href={pago.facturaUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline">📄 Factura →</a>}
            </div>
          )}
          {!pedido.firmaUrlUsada && !sellado && !pago && (
            <div className="text-center text-slate-400 py-6">Sin documentos adjuntos aún</div>
          )}
        </div>
      )}

      {/* Action modal */}
      {modal && (
        <ActionModal
          pedido={pedido}
          action={modal}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); refetch(); }}
        />
      )}
    </div>
  );
}

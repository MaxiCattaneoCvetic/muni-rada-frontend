import { useState, useEffect, type ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { Pedido, Presupuesto } from '../../types';
import { PedidoStage } from '../../types';
import { pedidosApi, selladosApi, pagosApi, configApi } from '../../api/services';
import { useAuthStore } from '../../store/auth.store';
import { formatMoney, formatDateTime, stageLabel, stageIcon, pedidoEstadoVisibleLabel } from '../../lib/utils';
import {
  X,
  FileText,
  Building2,
  Hash,
  AlertTriangle,
  PenLine,
  User,
  Mail,
  Package,
  ShieldAlert,
  ExternalLink,
  Ban,
} from 'lucide-react';

function nombreMostrado(u?: { nombreCompleto?: string; nombre?: string; apellido?: string } | null) {
  if (!u) return '—';
  return u.nombreCompleto || [u.nombre, u.apellido].filter(Boolean).join(' ') || '—';
}

function ConfirmDetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 border-b border-slate-100/90 last:border-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-slate-400 shrink-0">{label}</span>
      <div className="text-sm font-semibold text-slate-900 sm:text-right sm:max-w-[72%] break-words leading-snug">
        {value}
      </div>
    </div>
  );
}

interface Props {
  pedido: Pedido;
  action: string;
  onClose: () => void;
  onSuccess: () => void;
  /** Cotización elegida (obligatorio para firmar). */
  firmarPresupuesto?: Presupuesto | null;
  /** Contexto para el modal de rechazo (p. ej. cantidad de cotizaciones en firma). */
  rechazarMeta?: { presupuestosCargados: number } | null;
}

export function ActionModal({ pedido, action, onClose, onSuccess, firmarPresupuesto = null, rechazarMeta = null }: Props) {
  const { user } = useAuthStore();
  const { data: sistemaConfig } = useQuery({
    queryKey: ['config'],
    queryFn: () => configApi.get(),
    staleTime: 60_000,
    enabled: action === 'firmar',
  });
  const [nota, setNota] = useState('');
  const [motivo, setMotivo] = useState('');
  const [numeroSellado, setNumeroSellado] = useState('');
  const [fechaSellado, setFechaSellado] = useState(new Date().toISOString().split('T')[0]);
  const [montoSellado, setMontoSellado] = useState('');
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
  const [numeroTransf, setNumeroTransf] = useState('');
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);
  const [montoPagado, setMontoPagado] = useState(pedido.monto?.toString() || '');
  const [facturaFile, setFacturaFile] = useState<File | null>(null);
  const [facturaComprasFile, setFacturaComprasFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [rechazoAck, setRechazoAck] = useState(false);

  useEffect(() => {
    if (action === 'rechazar') {
      setRechazoAck(false);
      setMotivo('');
    }
  }, [action]);

  const mut = useMutation({
    onSuccess,
    onError: (e: any) => setError(e.response?.data?.message || 'Error al procesar'),
  });

  const submit = () => {
    setError('');
    if (action === 'aprobar' || action === 'aprobar-urgente') {
      mut.mutate(pedidosApi.aprobar(pedido.id, nota) as any);
    } else if (action === 'rechazar') {
      const m = motivo.trim();
      if (!m) { setError('Ingresá el motivo del rechazo'); return; }
      mut.mutate(pedidosApi.rechazar(pedido.id, m) as any);
    } else if (action === 'firmar') {
      if (!user?.firmaUrl) { setError('No tenés una firma configurada. Andá a Mi Perfil para subir tu firma.'); return; }
      if (!firmarPresupuesto?.id) { setError('Elegí un presupuesto en la pestaña Presupuestos antes de firmar.'); return; }
      mut.mutate(pedidosApi.firmar(pedido.id, { presupuestoId: firmarPresupuesto.id, nota }) as any);
    } else if (action === 'confirmar-recepcion') {
      mut.mutate(pedidosApi.confirmarRecepcion(pedido.id, nota) as any);
    } else if (action === 'sellado') {
      if (!numeroSellado || !montoSellado) { setError('Completá número y monto del sellado'); return; }
      mut.mutate(selladosApi.registrar(pedido.id, {
        numeroSellado, fechaSellado, montoSellado: parseFloat(montoSellado),
      }, comprobanteFile || undefined) as any);
    } else if (action === 'pago') {
      if (!numeroTransf) { setError('Ingresá el número de transferencia'); return; }
      mut.mutate(pagosApi.registrar(pedido.id, {
        numeroTransferencia: numeroTransf, fechaPago, montoPagado: parseFloat(montoPagado),
      }, facturaFile || undefined) as any);
    } else if (action === 'subir-factura') {
      if (!facturaComprasFile) { setError('Seleccioná la factura en PDF'); return; }
      mut.mutate(pedidosApi.subirFactura(pedido.id, facturaComprasFile) as any);
    }
  };

  const titles: Record<string, string> = {
    'aprobar': '✅ Aprobar pedido',
    'aprobar-urgente': '🚨 Aprobar pedido urgente',
    'rechazar': '✗ Rechazar pedido',
    'firmar': '✍️ Firmar presupuesto',
    'confirmar-recepcion': '📦 Confirmar recepción',
    'sellado': '🏛️ Registrar sellado provincial',
    'pago': '💳 Registrar pago',
    'subir-factura': '📄 Subir factura del proveedor',
  };

  return (
    <div 
      className="fixed inset-0 z-[300] flex items-center justify-center p-5 backdrop-blur-sm"
      style={{ background: 'rgba(15,23,42,.55)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div 
        className={`w-full max-h-[90vh] overflow-y-auto flex flex-col ${action === 'firmar' || action === 'rechazar' ? 'max-w-[760px]' : 'max-w-[580px]'}`}
        style={{
          background: 'var(--white)',
          borderRadius: '20px',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid rgba(255,255,255,.8)',
        }}
      >
        {/* Header */}
        <div 
          className="px-5 py-4 border-b flex items-start justify-between gap-3 flex-shrink-0 sticky top-0 z-10"
          style={{
            borderBottom: '1px solid var(--border)',
            background: 'linear-gradient(135deg, #fff, #fafbfd)',
          }}
        >
          <div>
            <h3 
              className="font-extrabold"
              style={{ fontSize: '15px', color: 'var(--text)', letterSpacing: '-.2px' }}
            >
              {action === 'firmar'
                ? '✍️ Confirmar firma del presupuesto'
                : action === 'rechazar'
                  ? '✗ Confirmar rechazo del expediente'
                  : titles[action]}
            </h3>
            <p 
              className="mt-0.5"
              style={{ fontSize: '12px', color: 'var(--text2)' }}
            >
              {action === 'firmar'
                ? 'Revisá todos los datos antes de autorizar la compra con tu firma digital.'
                : action === 'rechazar'
                  ? 'El trámite quedará cerrado. Indicá el motivo para registro y seguimiento del área.'
                  : `${pedido.numero} · ${pedido.descripcion}`}
            </p>
            {action === 'firmar' && (
              <>
                <p className="mt-1 font-mono text-[11px] font-bold text-slate-500">{pedido.numero}</p>
                <p className="mt-1 text-[12px] font-semibold text-slate-700 leading-snug line-clamp-2">{pedido.descripcion}</p>
              </>
            )}
            {action === 'rechazar' && (
              <>
                <p className="mt-1 font-mono text-[11px] font-bold text-slate-500">{pedido.numero}</p>
                <p className="mt-1 text-[12px] font-semibold text-slate-700 leading-snug line-clamp-2">{pedido.descripcion}</p>
              </>
            )}
          </div>
          <button 
            onClick={onClose} 
            className="w-[30px] h-[30px] rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer transition-all"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text2)',
              fontSize: '14px',
              boxShadow: 'var(--shadow-xs)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--red-lt)';
              e.currentTarget.style.color = 'var(--red)';
              e.currentTarget.style.borderColor = 'var(--red-brd)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--surface)';
              e.currentTarget.style.color = 'var(--text2)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3.5 flex-1">
          {error && <div className="alert alert-danger">{error}</div>}

          {action === 'rechazar' ? (() => {
            const nPresup =
              rechazarMeta?.presupuestosCargados ?? pedido.presupuestosCargados ?? 0;
            const etiquetaTrasRechazo = pedidoEstadoVisibleLabel({
              stage: PedidoStage.RECHAZADO,
              rechazadoDesdeStage: pedido.stage,
            });
            return (
              <div className="space-y-4">
                <div
                  className="rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-white px-4 py-3 flex gap-3 shadow-sm"
                  role="alert"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-md">
                    <Ban size={20} strokeWidth={2.25} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-red-950 tracking-tight">Rechazo definitivo</div>
                    <p className="mt-1 text-xs text-red-950/90 leading-relaxed">
                      El expediente quedará como <strong>{etiquetaTrasRechazo}</strong>. No podrá avanzar a otra etapa ni
                      modificarse en el circuito de suministros. Esta acción no tiene vuelta atrás desde la aplicación.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      <Hash size={14} className="text-slate-400" />
                      Expediente
                    </div>
                    <ConfirmDetailRow label="N° pedido" value={<span className="font-mono">{pedido.numero}</span>} />
                    <ConfirmDetailRow label="Área solicitante" value={pedido.area} />
                    <ConfirmDetailRow
                      label="Etapa actual"
                      value={
                        <span>
                          {stageIcon(pedido.stage)} {stageLabel(pedido.stage)}
                        </span>
                      }
                    />
                    <ConfirmDetailRow
                      label="Prioridad"
                      value={pedido.urgente ? <span className="text-red-700 font-bold">Urgente</span> : 'Normal'}
                    />
                    {pedido.monto != null && (
                      <ConfirmDetailRow
                        label="Monto referido (pedido)"
                        value={<span className="font-mono">{formatMoney(pedido.monto)}</span>}
                      />
                    )}
                    {pedido.proveedorSeleccionado && (
                      <ConfirmDetailRow label="Proveedor sugerido (Compras)" value={pedido.proveedorSeleccionado} />
                    )}
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      <Package size={14} className="text-slate-400" />
                      Solicitud
                    </div>
                    <ConfirmDetailRow label="Descripción" value={pedido.descripcion} />
                    {pedido.cantidad && <ConfirmDetailRow label="Cantidad / alcance" value={pedido.cantidad} />}
                    {pedido.detalle && (
                      <ConfirmDetailRow
                        label="Detalle"
                        value={<span className="whitespace-pre-wrap font-normal">{pedido.detalle}</span>}
                      />
                    )}
                  </div>
                </div>

                {pedido.stage === PedidoStage.FIRMA && (
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800">
                    <span className="font-extrabold text-slate-900">Presupuestos en el expediente: </span>
                    <span className="font-mono font-bold">{nPresup}</span>
                    <span className="text-slate-600"> cotización(es) cargada(s) por Compras.</span>
                  </div>
                )}

                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-950 leading-relaxed">
                  <AlertTriangle className="inline h-4 w-4 mr-1 align-text-bottom text-amber-700" />
                  Registrá con claridad el <strong>motivo del rechazo</strong> (documentación insuficiente, montos,
                  plazos, etc.). El texto quedará visible para el área solicitante y Compras.
                </div>

                <div>
                  <label className="label">Motivo del rechazo *</label>
                  <textarea
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    className="input resize-none"
                    rows={5}
                    placeholder="Escribí el motivo del rechazo con el detalle necesario..."
                    required
                  />
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300"
                    checked={rechazoAck}
                    onChange={(e) => setRechazoAck(e.target.checked)}
                  />
                  <span className="text-sm font-semibold text-slate-800 leading-snug">
                    Confirmo que revisé los datos y quiero <strong className="text-red-800">rechazar este expediente de
                    forma definitiva</strong>.
                  </span>
                </label>
              </div>
            );
          })() : action === 'firmar' && firmarPresupuesto ? (() => {
            const umbral = sistemaConfig?.umbralSellado ?? 0;
            const montoCot = Number(firmarPresupuesto.monto);
            const requiereSelladoProvincial = montoCot >= umbral;
            const p = firmarPresupuesto;
            return (
              <div className="space-y-4">
                <div
                  className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white px-4 py-3 flex gap-3 shadow-sm"
                  role="note"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
                    <PenLine size={20} strokeWidth={2.25} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-blue-950 tracking-tight">Última revisión antes de firmar</div>
                    <p className="mt-1 text-xs text-blue-900/85 leading-relaxed">
                      Al confirmar, este expediente pasará a <strong className="font-bold">Carga de factura (Compras)</strong> y el monto
                      registrado en el pedido será el de la cotización que ves abajo. Verificá proveedor e importe.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      <Hash size={14} className="text-slate-400" />
                      Expediente
                    </div>
                    <ConfirmDetailRow label="N° pedido" value={<span className="font-mono">{pedido.numero}</span>} />
                    <ConfirmDetailRow label="Área solicitante" value={pedido.area} />
                    <ConfirmDetailRow
                      label="Etapa actual"
                      value={
                        <span>
                          {stageIcon(pedido.stage)} {stageLabel(pedido.stage)}
                        </span>
                      }
                    />
                    <ConfirmDetailRow
                      label="Prioridad"
                      value={pedido.urgente ? <span className="text-red-700 font-bold">Urgente</span> : 'Normal'}
                    />
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      <Package size={14} className="text-slate-400" />
                      Solicitud
                    </div>
                    <ConfirmDetailRow label="Descripción" value={pedido.descripcion} />
                    {pedido.cantidad && <ConfirmDetailRow label="Cantidad / alcance" value={pedido.cantidad} />}
                    {pedido.detalle && (
                      <ConfirmDetailRow label="Detalle" value={<span className="whitespace-pre-wrap font-normal">{pedido.detalle}</span>} />
                    )}
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border-2 border-emerald-300/90 bg-gradient-to-b from-emerald-50/90 to-white shadow-md">
                  <div className="flex items-center gap-2 border-b border-emerald-200/80 bg-emerald-600/95 px-4 py-3">
                    <FileText size={18} className="text-white" />
                    <span className="text-sm font-extrabold tracking-tight text-white">Cotización que vas a autorizar</span>
                  </div>
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase text-emerald-800/90">
                          <Building2 size={14} />
                          Proveedor
                        </div>
                        <p className="text-lg font-black leading-tight text-slate-900 tracking-tight break-words">{p.proveedor}</p>
                        {pedido.proveedorSeleccionado && pedido.proveedorSeleccionado !== p.proveedor && (
                          <p className="text-[11px] text-amber-800 font-semibold">
                            Nota: Compras había sugerido otro proveedor ({pedido.proveedorSeleccionado}); vos estás firmando esta cotización.
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-right shadow-sm">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-800/80">Importe total</div>
                        <div className="mt-1 font-mono text-2xl font-black tabular-nums text-emerald-950 tracking-tight">
                          {formatMoney(p.monto)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-1">
                      {p.cuit && <ConfirmDetailRow label="CUIT" value={<span className="font-mono text-[13px]">{p.cuit}</span>} />}
                      {p.plazoEntrega && (
                        <ConfirmDetailRow label="Plazo de entrega" value={p.plazoEntrega} />
                      )}
                      {p.contacto && (
                        <ConfirmDetailRow
                          label="Contacto"
                          value={
                            <span className="inline-flex items-center gap-1.5">
                              <Mail size={14} className="text-slate-400 shrink-0" />
                              {p.contacto}
                            </span>
                          }
                        />
                      )}
                      <ConfirmDetailRow label="Fecha de la cotización" value={formatDateTime(p.createdAt)} />
                      <ConfirmDetailRow label="Cargada por (Compras)" value={nombreMostrado(p.cargadoPor)} />
                      {p.notas && (
                        <ConfirmDetailRow label="Notas de la cotización" value={<span className="whitespace-pre-wrap font-normal">{p.notas}</span>} />
                      )}
                    </div>
                    {p.archivoUrl ? (
                      <a
                        href={p.archivoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-emerald-800 hover:text-emerald-950 hover:underline"
                      >
                        <ExternalLink size={16} />
                        Abrir PDF del presupuesto en nueva pestaña
                      </a>
                    ) : (
                      <p className="mt-3 text-xs font-semibold text-amber-800">Esta cotización no tiene PDF adjunto en el sistema.</p>
                    )}
                  </div>
                </div>

                {requiereSelladoProvincial && (
                  <div
                    className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3"
                    role="alert"
                  >
                    <ShieldAlert className="h-6 w-6 shrink-0 text-amber-700" />
                    <div className="min-w-0 text-sm text-amber-950">
                      <div className="font-extrabold">Sellado provincial</div>
                      <p className="mt-1 text-xs leading-relaxed opacity-95">
                        El monto (<strong>{formatMoney(montoCot)}</strong>) es mayor o igual al umbral configurado (
                        <strong>{formatMoney(umbral)}</strong>). Después de firmar, el expediente quedará{' '}
                        <strong>bloqueado</strong> hasta que Tesorería registre el sellado antes del pago.
                      </p>
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                    <User size={14} className="text-slate-400" />
                    Firma digital · {nombreMostrado(user ?? undefined)}
                  </div>
                  {user?.firmaUrl ? (
                    <div className="flex flex-col items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                      <p className="text-center text-xs font-semibold text-emerald-900">Vista previa de la firma que quedará registrada</p>
                      <img
                        src={user.firmaUrl}
                        alt="Tu firma"
                        className="max-h-28 w-full max-w-xs object-contain bg-white p-3 rounded-lg"
                        style={{ border: '1px solid var(--green-brd)' }}
                      />
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <p className="font-semibold leading-snug">
                        No tenés firma en tu perfil. Subila en <strong>Mi Perfil</strong> antes de poder confirmar.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })() : (
            <>
              {action !== 'rechazar' && !(action === 'firmar' && !firmarPresupuesto) && (
                <div
                  className="rounded-[10px] p-3.5 space-y-2"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                >
                  <div className="flex justify-between">
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Área</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{pedido.area}</span>
                  </div>
                  {pedido.monto && (
                    <div className="flex justify-between">
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Monto</span>
                      <span
                        className="font-mono font-extrabold"
                        style={{ fontSize: '13px', color: 'var(--amber)', letterSpacing: '-.3px' }}
                      >
                        {formatMoney(pedido.monto)}
                      </span>
                    </div>
                  )}
                  {pedido.proveedorSeleccionado && (
                    <div className="flex justify-between">
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Proveedor</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{pedido.proveedorSeleccionado}</span>
                    </div>
                  )}
                </div>
              )}
              {action === 'firmar' && !firmarPresupuesto && (
                <div className="alert alert-danger">
                  <p className="font-semibold" style={{ fontSize: '12px' }}>
                    Elegí un presupuesto en la pestaña Presupuestos antes de firmar.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Nota/motivo */}
          {(action === 'aprobar' || action === 'aprobar-urgente' || action === 'firmar' || action === 'confirmar-recepcion') && (
            <div>
              <label className="label">Nota (opcional)</label>
              <textarea value={nota} onChange={e => setNota(e.target.value)} className="input resize-none" rows={3} placeholder="Notas adicionales..." />
            </div>
          )}
          {/* Sellado fields */}
          {action === 'sellado' && (
            <>
              <div><label className="label">N° de sellado *</label><input value={numeroSellado} onChange={e => setNumeroSellado(e.target.value)} className="input" placeholder="SELL-2026-082" /></div>
              <div><label className="label">Fecha del sellado *</label><input type="date" value={fechaSellado} onChange={e => setFechaSellado(e.target.value)} className="input" /></div>
              <div><label className="label">Monto del sellado ($) *</label><input type="number" value={montoSellado} onChange={e => setMontoSellado(e.target.value)} className="input" placeholder="15000" /></div>
              <div>
                <label className="label">Comprobante (PDF) — opcional</label>
                <input type="file" accept=".pdf" onChange={e => setComprobanteFile(e.target.files?.[0] || null)} className="input py-2 text-sm" />
              </div>
            </>
          )}

          {/* Pago fields */}
          {action === 'pago' && (
            <>
              <div><label className="label">N° de transferencia *</label><input value={numeroTransf} onChange={e => setNumeroTransf(e.target.value)} className="input" placeholder="TRF-00234581" /></div>
              <div><label className="label">Fecha de pago</label><input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)} className="input" /></div>
              <div><label className="label">Monto pagado ($)</label><input type="number" value={montoPagado} onChange={e => setMontoPagado(e.target.value)} className="input" /></div>
              <div>
                <label className="label">Factura (PDF) — opcional</label>
                <input type="file" accept=".pdf" onChange={e => setFacturaFile(e.target.files?.[0] || null)} className="input py-2 text-sm" />
              </div>
            </>
          )}

          {action === 'subir-factura' && (
            <div>
              <label className="label">Factura del proveedor (PDF) *</label>
              <p className="text-xs text-slate-500 mb-2">Adjuntá la factura correspondiente al presupuesto firmado para que Tesorería pueda gestionar sellado y pago.</p>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={e => setFacturaComprasFile(e.target.files?.[0] || null)}
                className="input py-2 text-sm"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div 
          className="px-5 py-3.5 border-t flex gap-2 justify-end flex-shrink-0 sticky bottom-0"
          style={{
            borderTop: '1px solid var(--border)',
            background: 'var(--white)',
          }}
        >
          <button onClick={onClose} className="btn btn-ghost">Cancelar</button>
          <button
            onClick={submit}
            disabled={
              mut.isPending
              || (action === 'firmar' && (!user?.firmaUrl || !firmarPresupuesto?.id))
              || (action === 'rechazar' && (!motivo.trim() || !rechazoAck))
            }
            className={`btn ${action.includes('rechazar') ? 'btn-danger' : action === 'firmar' || action === 'confirmar-recepcion' || action === 'subir-factura' ? 'btn-success' : 'btn-primary'}`}
          >
            {mut.isPending
              ? 'Procesando...'
              : action === 'firmar'
                ? 'Confirmar firma y autorizar compra'
                : action === 'rechazar'
                  ? 'Confirmar rechazo definitivo'
                  : titles[action]}
          </button>
        </div>
      </div>
    </div>
  );
}

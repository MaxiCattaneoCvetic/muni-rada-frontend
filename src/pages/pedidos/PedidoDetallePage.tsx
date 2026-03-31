import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { pedidosApi, presupuestosApi, selladosApi, pagosApi } from '../../api/services';
import { useAuthStore } from '../../store/auth.store';
import { formatMoney, formatDate, formatDateTime, stageBadgeClass, stageIcon, rolLabel, pedidoEstadoVisibleLabel } from '../../lib/utils';
import { buildPedidoAuditResumen, buildPedidoAuditTimeline } from '../../lib/pedido-audit';
import { getCurrentStepMessage } from '../../lib/pedido-flow-messages';
import { ActionModal } from '../../components/ui/ActionModal';
import { PresupuestoDetalleModal } from '../../components/presupuestos/PresupuestoDetalleModal';
import { PedidoPresupuestosComprasPanel } from '../../components/presupuestos/PedidoPresupuestosComprasPanel';
import { ArrowLeft, Clock, CheckCircle, Lock } from 'lucide-react';
import type { Presupuesto } from '../../types';
import { PedidoStage, STAGE_OWNER_LABELS } from '../../types';

export function PedidoDetallePage() {
  type CommentItem = {
    id: string;
    title?: string;
    actor: string;
    area: string;
    detail: string;
    createdAt: string;
    kind: 'system' | 'chat';
  };

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [modal, setModal] = useState<string | null>(null);
  const [presupuestoModal, setPresupuestoModal] = useState<Presupuesto | null>(null);
  const [activeTab, setActiveTab] = useState<
    'flujo' | 'presupuestos' | 'comentarios' | 'documentos' | 'info' | 'auditoria'
  >('flujo');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<CommentItem[]>([]);
  const [chatLoaded, setChatLoaded] = useState(false);
  const [presupuestoParaFirmaId, setPresupuestoParaFirmaId] = useState<string | null>(null);
  const prevPedidoIdRef = useRef<string | undefined>(undefined);
  const location = useLocation();

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

  const presupuestosMenorValorIds = useMemo(() => {
    if (presupuestos.length === 0) return new Set<string>();
    const nums = presupuestos.map((p) => Number(p.monto));
    const min = Math.min(...nums);
    return new Set(presupuestos.filter((p) => Number(p.monto) === min).map((p) => p.id));
  }, [presupuestos]);

  useEffect(() => {
    const st = location.state as { openPresupuestosTab?: boolean } | undefined;
    if (st?.openPresupuestosTab) setActiveTab('presupuestos');
  }, [location.state]);

  useEffect(() => {
    if (!pedido) return;
    if (pedido.id !== prevPedidoIdRef.current) {
      prevPedidoIdRef.current = pedido.id;
      setPresupuestoParaFirmaId(null);
    }
  }, [pedido]);

  useEffect(() => {
    if (!pedido || pedido.stage !== PedidoStage.FIRMA || presupuestos.length === 0) return;
    setPresupuestoParaFirmaId((prev) => {
      if (prev != null && presupuestos.some((p) => p.id === prev)) return prev;
      const match = presupuestos.find(
        (p) =>
          pedido.proveedorSeleccionado &&
          p.proveedor === pedido.proveedorSeleccionado &&
          Number(p.monto) === Number(pedido.monto ?? NaN),
      );
      return match?.id ?? prev;
    });
  }, [pedido, presupuestos]);

  const refetch = () => {
    qc.invalidateQueries({ queryKey: ['pedido', id] });
    qc.invalidateQueries({ queryKey: ['pedidos'] });
    qc.invalidateQueries({ queryKey: ['presupuestos', id] });
    qc.invalidateQueries({ queryKey: ['sellado', id] });
    qc.invalidateQueries({ queryKey: ['pago', id] });
  };

  const fullName = (person?: { nombreCompleto?: string; nombre?: string; apellido?: string }) =>
    person?.nombreCompleto || [person?.nombre, person?.apellido].filter(Boolean).join(' ') || '—';

  const storageKey = id ? `pedido-chat:${id}` : null;

  useEffect(() => {
    if (!storageKey) {
      setChatMessages([]);
      setChatLoaded(false);
      return;
    }

    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      setChatMessages([]);
      setChatLoaded(true);
      return;
    }

    try {
      const parsed = JSON.parse(stored) as CommentItem[];
      setChatMessages(Array.isArray(parsed) ? parsed : []);
    } catch {
      setChatMessages([]);
    }
    setChatLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!chatLoaded || !storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(chatMessages));
  }, [chatLoaded, chatMessages, storageKey]);

  if (isLoading) return <div className="p-8 text-center text-slate-400">Cargando expediente...</div>;
  if (!pedido) return <div className="p-8 text-center text-red-500">Pedido no encontrado</div>;

  const stageColors: Record<number, string> = {
    1: 'border-blue-400 bg-blue-50',
    2: 'border-violet-400 bg-violet-50',
    3: 'border-blue-400 bg-blue-50',
    4: 'border-violet-400 bg-violet-50',
    5: 'border-teal-400 bg-teal-50',
    6: 'border-sky-400 bg-sky-50',
    7: 'border-emerald-500 bg-emerald-50',
    8: 'border-red-400 bg-red-50',
  };

  const presupuestoCountLabel = `${presupuestos.length} presupuesto${presupuestos.length !== 1 ? 's' : ''} cargado${presupuestos.length !== 1 ? 's' : ''}`;
  const isRejected = pedido.stage === PedidoStage.RECHAZADO;
  const currentAreaLabel = user?.rol ? rolLabel(user.rol) : 'Sin área';

  const currentStepMessageContext = {
    viewerRol: user?.rol,
    presupuestosCount: presupuestos.length,
    presupuestoCountLabel,
    pedido,
    sellado,
    pago,
  };

  const getCompletedStepMessage = (stage: number) => {
    switch (stage) {
      case PedidoStage.APROBACION:
        return pedido.aprobadoPor
          ? `Aprobado por ${fullName(pedido.aprobadoPor)}.`
          : 'La aprobación inicial quedó registrada.';
      case PedidoStage.PRESUPUESTOS:
        if (pedido.proveedorSeleccionado) return `Se evaluaron presupuestos y se eligió a ${pedido.proveedorSeleccionado}.`;
        if (presupuestos.length > 0) return `Compras cargó ${presupuestoCountLabel}.`;
        return 'Compras trabajó esta etapa.';
      case PedidoStage.FIRMA:
        return pedido.firmadoPor
          ? `Firmado por ${fullName(pedido.firmadoPor)}.`
          : 'La firma del presupuesto quedó registrada.';
      case PedidoStage.CARGA_FACTURA:
        return pedido.facturaComprasUrl
          ? `Factura cargada por ${fullName(pedido.facturaSubidaPor)}.`
          : 'Compras debe adjuntar la factura del proveedor.';
      case PedidoStage.GESTION_PAGOS:
        if (sellado && pago) return `Tesorería registró el sellado ${sellado.numeroSellado} y el pago ${pago.numeroTransferencia}.`;
        if (sellado) return `Tesorería registró el sellado ${sellado.numeroSellado}.`;
        if (pago) return `Tesorería registró el pago ${pago.numeroTransferencia}.`;
        return 'Tesorería completó la gestión administrativa.';
      case PedidoStage.ESPERANDO_SUMINISTROS:
        return 'El pedido quedó en espera de entrega / recepción.';
      case PedidoStage.SUMINISTROS_LISTOS:
        return pedido.recepcionConfirmadaPor
          ? `Recepción confirmada por ${fullName(pedido.recepcionConfirmadaPor)}.`
          : 'La recepción quedó confirmada.';
      default:
        return null;
    }
  };

  const getHistoricalDetail = (stage: number) => {
    switch (stage) {
      case PedidoStage.APROBACION:
        return pedido.notaAprobacion || null;
      case PedidoStage.PRESUPUESTOS:
        return presupuestoCountLabel;
      case PedidoStage.FIRMA:
        return pedido.firmadoPor ? `Firmó: ${fullName(pedido.firmadoPor)}` : null;
      case PedidoStage.CARGA_FACTURA:
        return pedido.facturaSubidaPor ? `Factura: ${fullName(pedido.facturaSubidaPor)}` : null;
      case PedidoStage.GESTION_PAGOS:
        if (sellado && pago) return `Sellado ${sellado.numeroSellado} · Pago ${pago.numeroTransferencia}`;
        if (sellado) return `Sellado: ${sellado.numeroSellado}`;
        if (pago) return `Pago: ${pago.numeroTransferencia}`;
        return null;
      case PedidoStage.SUMINISTROS_LISTOS:
        return pedido.recepcionConfirmadaPor ? `Confirmó: ${fullName(pedido.recepcionConfirmadaPor)}` : null;
      case PedidoStage.RECHAZADO:
        return pedido.notaRechazo || null;
      default:
        return null;
    }
  };

  const isStepCompleted = (stage: number) => {
    if (!isRejected) return pedido.stage > stage;
    switch (stage) {
      case PedidoStage.APROBACION:
        return Boolean(pedido.aprobadoPor);
      case PedidoStage.PRESUPUESTOS:
        return presupuestos.length > 0;
      case PedidoStage.FIRMA:
        return Boolean(pedido.firmadoPor);
      case PedidoStage.CARGA_FACTURA:
        return Boolean(pedido.facturaComprasUrl);
      case PedidoStage.GESTION_PAGOS:
        return Boolean(sellado || pago);
      case PedidoStage.ESPERANDO_SUMINISTROS:
        return Boolean(pedido.recepcionConfirmadaPor);
      case PedidoStage.SUMINISTROS_LISTOS:
        return false;
      default:
        return false;
    }
  };

  const FLOW_STEPS = [
    {
      stage: PedidoStage.APROBACION,
      label: 'Aprobación de suministros',
      icon: '⏳',
      owner: STAGE_OWNER_LABELS[PedidoStage.APROBACION],
      detail: getHistoricalDetail(PedidoStage.APROBACION),
      meta: null,
    },
    {
      stage: PedidoStage.PRESUPUESTOS,
      label: 'Búsqueda de presupuestos',
      icon: '🔍',
      owner: STAGE_OWNER_LABELS[PedidoStage.PRESUPUESTOS],
      detail: getHistoricalDetail(PedidoStage.PRESUPUESTOS),
      meta: null,
    },
    {
      stage: PedidoStage.FIRMA,
      label: 'Firma de presupuestos',
      icon: '✍️',
      owner: STAGE_OWNER_LABELS[PedidoStage.FIRMA],
      detail: getHistoricalDetail(PedidoStage.FIRMA),
      meta: formatDateTime(pedido.firmadoEn),
    },
    {
      stage: PedidoStage.CARGA_FACTURA,
      label: 'Carga de factura (Compras)',
      icon: '🧾',
      owner: STAGE_OWNER_LABELS[PedidoStage.CARGA_FACTURA],
      detail: getHistoricalDetail(PedidoStage.CARGA_FACTURA),
      meta: formatDateTime(pedido.facturaSubidaEn),
    },
    {
      stage: PedidoStage.GESTION_PAGOS,
      label: 'Gestión de sellos y pagos',
      icon: '🏛️',
      owner: STAGE_OWNER_LABELS[PedidoStage.GESTION_PAGOS],
      detail: getHistoricalDetail(PedidoStage.GESTION_PAGOS),
      meta: null,
    },
    {
      stage: PedidoStage.ESPERANDO_SUMINISTROS,
      label: 'Esperando suministros',
      icon: '📦',
      owner: STAGE_OWNER_LABELS[PedidoStage.ESPERANDO_SUMINISTROS],
      detail: null,
      meta: null,
    },
    {
      stage: PedidoStage.SUMINISTROS_LISTOS,
      label: 'Suministros listos',
      icon: '✅',
      owner: STAGE_OWNER_LABELS[PedidoStage.SUMINISTROS_LISTOS],
      detail: getHistoricalDetail(PedidoStage.SUMINISTROS_LISTOS),
      meta: formatDateTime(pedido.recepcionEn),
    },
    ...(isRejected ? [{
      stage: PedidoStage.RECHAZADO,
      label: pedidoEstadoVisibleLabel(pedido),
      icon: '❌',
      owner:
        pedido.rechazadoDesdeStage != null
          ? STAGE_OWNER_LABELS[pedido.rechazadoDesdeStage]
          : STAGE_OWNER_LABELS[PedidoStage.RECHAZADO],
      detail: getHistoricalDetail(PedidoStage.RECHAZADO) || 'Sin motivo registrado.',
      meta: null,
    }] : []),
  ];

  const historyComments: CommentItem[] = [
    {
      id: 'creacion',
      title: 'Pedido creado',
      actor: fullName(pedido.creadoPor),
      area: pedido.area,
      detail: pedido.detalle || 'Se registró el pedido en el sistema.',
      createdAt: pedido.createdAt,
      kind: 'system',
    },
  ];

  if (pedido.stage !== PedidoStage.RECHAZADO && (pedido.aprobadoPor || pedido.notaAprobacion)) {
    historyComments.push({
      id: 'aprobacion',
      title: 'Aprobación de suministros',
      actor: fullName(pedido.aprobadoPor),
      area: STAGE_OWNER_LABELS[PedidoStage.APROBACION],
      detail: pedido.notaAprobacion || 'La aprobación quedó registrada.',
      createdAt: pedido.updatedAt,
      kind: 'system',
    });
  }

  if (presupuestos.length > 0) {
    historyComments.push({
      id: 'presupuestos',
      title: 'Presupuestos cargados',
      actor: fullName(presupuestos[0]?.cargadoPor),
      area: STAGE_OWNER_LABELS[PedidoStage.PRESUPUESTOS],
      detail: pedido.proveedorSeleccionado
        ? `Se cargaron ${presupuestoCountLabel} y se seleccionó a ${pedido.proveedorSeleccionado}.`
        : `Se cargaron ${presupuestoCountLabel}.`,
      createdAt: presupuestos[presupuestos.length - 1]?.createdAt || pedido.updatedAt,
      kind: 'system',
    });
  }

  if (pedido.firmadoPor) {
    historyComments.push({
      id: 'firma',
      title: 'Presupuesto firmado',
      actor: fullName(pedido.firmadoPor),
      area: STAGE_OWNER_LABELS[PedidoStage.FIRMA],
      detail: 'La firma del presupuesto quedó registrada en el sistema.',
      createdAt: pedido.firmadoEn || pedido.updatedAt,
      kind: 'system',
    });
  }

  if (pedido.facturaComprasUrl && pedido.facturaSubidaPor) {
    historyComments.push({
      id: 'factura-compras',
      title: 'Factura del proveedor cargada',
      actor: fullName(pedido.facturaSubidaPor),
      area: STAGE_OWNER_LABELS[PedidoStage.CARGA_FACTURA],
      detail: 'Se adjuntó la factura para gestión de Tesorería.',
      createdAt: pedido.facturaSubidaEn || pedido.updatedAt,
      kind: 'system',
    });
  }

  if (sellado) {
    historyComments.push({
      id: 'sellado',
      title: 'Sellado registrado',
      actor: fullName(sellado.registradoPor),
      area: STAGE_OWNER_LABELS[PedidoStage.GESTION_PAGOS],
      detail: `Sellado N° ${sellado.numeroSellado}.`,
      createdAt: sellado.createdAt,
      kind: 'system',
    });
  }

  if (pago) {
    historyComments.push({
      id: 'pago',
      title: 'Pago registrado',
      actor: fullName(pago.registradoPor),
      area: STAGE_OWNER_LABELS[PedidoStage.GESTION_PAGOS],
      detail: `Pago N° ${pago.numeroTransferencia}.`,
      createdAt: pago.createdAt,
      kind: 'system',
    });
  }

  if (pedido.recepcionConfirmadaPor) {
    historyComments.push({
      id: 'recepcion',
      title: 'Recepción confirmada',
      actor: fullName(pedido.recepcionConfirmadaPor),
      area: STAGE_OWNER_LABELS[PedidoStage.SUMINISTROS_LISTOS],
      detail: 'La recepción del pedido quedó confirmada.',
      createdAt: pedido.recepcionEn || pedido.updatedAt,
      kind: 'system',
    });
  }

  if (pedido.stage === PedidoStage.RECHAZADO && pedido.notaRechazo) {
    historyComments.push({
      id: 'rechazo',
      title: pedidoEstadoVisibleLabel(pedido),
      actor: fullName(pedido.aprobadoPor),
      area:
        pedido.rechazadoDesdeStage != null
          ? STAGE_OWNER_LABELS[pedido.rechazadoDesdeStage]
          : 'Secretaría',
      detail: pedido.notaRechazo,
      createdAt: pedido.updatedAt,
      kind: 'system',
    });
  }

  const comments = [...historyComments, ...chatMessages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const auditTimeline = buildPedidoAuditTimeline(pedido, presupuestos, sellado ?? null, pago ?? null);
  const auditResumen = buildPedidoAuditResumen(pedido, presupuestos);

  const handleSendMessage = () => {
    const detail = chatInput.trim();
    if (!detail || !user) return;

    setChatMessages(current => [
      ...current,
      {
        id: crypto.randomUUID(),
        actor: fullName(user),
        area: currentAreaLabel,
        detail,
        createdAt: new Date().toISOString(),
        kind: 'chat',
      },
    ]);
    setChatInput('');
  };

  const canAprobar = (user?.rol === 'secretaria' || user?.rol === 'admin') && pedido.stage === PedidoStage.APROBACION;
  const canRechazar = (user?.rol === 'secretaria' || user?.rol === 'admin') && (pedido.stage === PedidoStage.APROBACION || pedido.stage === PedidoStage.FIRMA);
  const canFirmar = (user?.rol === 'secretaria' || user?.rol === 'admin') && pedido.stage === PedidoStage.FIRMA;
  const canSubirFactura =
    (user?.rol === 'compras' || user?.rol === 'admin') && pedido.stage === PedidoStage.CARGA_FACTURA;
  const canSellado = (user?.rol === 'tesoreria' || user?.rol === 'admin') && pedido.stage === PedidoStage.GESTION_PAGOS && pedido.bloqueado && !sellado;
  const canPago = (user?.rol === 'tesoreria' || user?.rol === 'admin') && pedido.stage === PedidoStage.GESTION_PAGOS && !pedido.bloqueado && !pago;
  const canRecepcion = user?.rol === 'admin' && pedido.stage === PedidoStage.ESPERANDO_SUMINISTROS;
  const canGestionarPresupuestos =
    (user?.rol === 'compras' || user?.rol === 'admin') && pedido.stage === PedidoStage.PRESUPUESTOS;

  const presupuestoElegidoFirma = presupuestoParaFirmaId
    ? presupuestos.find((p) => p.id === presupuestoParaFirmaId)
    : undefined;

  return (
    <div className="page-shell-narrow">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="back-link">
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
                {stageIcon(pedido.stage)} {pedidoEstadoVisibleLabel(pedido)}
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
          {canGestionarPresupuestos && (
            <button type="button" onClick={() => setActiveTab('presupuestos')} className="btn btn-primary btn-sm">
              💰 Gestionar presupuestos
            </button>
          )}
          {canAprobar && <button onClick={() => setModal('aprobar')} className="btn btn-primary btn-sm">✅ Aprobar</button>}
          {canFirmar && (
            <button
              type="button"
              onClick={() => setModal('firmar')}
              disabled={!presupuestoElegidoFirma}
              title={
                presupuestoElegidoFirma
                  ? undefined
                  : 'Elegí primero la cotización en la pestaña Presupuestos.'
              }
              className="btn btn-primary btn-sm disabled:opacity-45 disabled:cursor-not-allowed"
            >
              ✍️ Firmar presupuesto
            </button>
          )}
          {canSubirFactura && <button onClick={() => setModal('subir-factura')} className="btn btn-primary btn-sm">📄 Subir factura</button>}
          {canSellado && <button onClick={() => setModal('sellado')} className="btn btn-danger btn-sm">🏛️ Registrar sellado</button>}
          {canPago && <button onClick={() => setModal('pago')} className="btn btn-success btn-sm">💳 Registrar pago</button>}
          {canRecepcion && <button onClick={() => setModal('confirmar-recepcion')} className="btn btn-success btn-sm">📦 Confirmar recepción</button>}
          {canRechazar && <button onClick={() => setModal('rechazar')} className="btn btn-danger btn-sm">✗ Rechazar</button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="segmented-tabs">
        {(['flujo', 'presupuestos', 'comentarios', 'auditoria', 'documentos', 'info'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`segmented-tab capitalize ${activeTab === tab ? 'active' : ''}`}
          >
            {tab === 'flujo'
              ? '📋 Flujo'
              : tab === 'presupuestos'
                ? `💰 Presupuestos (${presupuestos.length})`
              : tab === 'comentarios'
                ? `💬 Comentarios (${comments.length})`
                : tab === 'auditoria'
                  ? `🔍 Auditoría (${auditTimeline.length})`
                : tab === 'documentos'
                  ? '📎 Documentos'
                  : 'ℹ️ Info'}
          </button>
        ))}
      </div>

      {/* Tab: Flujo */}
      {activeTab === 'flujo' && (
        <div className="card p-6">
          <div className="space-y-0">
            {FLOW_STEPS.map((step, i) => {
              const done = isStepCompleted(step.stage);
              const current = pedido.stage === step.stage;
              const pending = !done && !current;
              const summary = current
                ? getCurrentStepMessage(step.stage, currentStepMessageContext)
                : done
                  ? getCompletedStepMessage(step.stage)
                  : null;
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
                    {!pending && summary && (
                      <div className={`mt-2 rounded-xl border px-3 py-2 text-xs ${
                        current
                          ? 'border-blue-200 bg-blue-50 text-blue-900'
                          : 'border-green-100 bg-green-50 text-slate-700'
                      }`}>
                        {summary}
                      </div>
                    )}
                    {!pending && step.detail && <div className="text-xs text-slate-500 mt-2">{step.detail}</div>}
                    {!pending && step.meta && step.meta !== '—' && <div className="text-xs text-slate-400 mt-0.5">{step.meta}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Auditoría */}
      {activeTab === 'auditoria' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500 px-1">
            Registro derivado de los datos del pedido (quién creó, quién cargó cotizaciones, quién aprobó o rechazó, firmas, tesorería y cierre).
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="card p-4 border-l-4 border-l-blue-400">
              <div className="text-xs font-bold uppercase text-slate-400">Inicio del trámite</div>
              <div className="font-semibold text-slate-900 mt-1">{auditResumen.inicio.actor}</div>
              <div className="text-xs text-slate-500 mt-0.5">{formatDateTime(auditResumen.inicio.at)}</div>
              {auditResumen.inicio.extra && <div className="text-xs text-slate-600 mt-2">{auditResumen.inicio.extra}</div>}
            </div>
            <div className="card p-4 border-l-4 border-l-violet-400">
              <div className="text-xs font-bold uppercase text-slate-400">Compras (primera intervención)</div>
              <div className="font-semibold text-slate-900 mt-1">{auditResumen.compras.actor}</div>
              <div className="text-xs text-slate-500 mt-0.5">{formatDateTime(auditResumen.compras.at)}</div>
              {auditResumen.compras.extra && <div className="text-xs text-slate-600 mt-2">{auditResumen.compras.extra}</div>}
            </div>
            <div className="card p-4 border-l-4 border-l-emerald-400">
              <div className="text-xs font-bold uppercase text-slate-400">Secretaría</div>
              <div className="font-semibold text-slate-900 mt-1">
                <span className="text-emerald-700">{auditResumen.secretaria.label}</span>
                {auditResumen.secretaria.actor !== '—' && ` · ${auditResumen.secretaria.actor}`}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{formatDateTime(auditResumen.secretaria.at)}</div>
              {auditResumen.secretaria.extra && (
                <div className="text-xs text-slate-600 mt-2 line-clamp-3">{auditResumen.secretaria.extra}</div>
              )}
            </div>
          </div>
          <div className="card p-6">
            <div className="text-sm font-bold text-slate-800 mb-4">Línea de tiempo</div>
            <div className="space-y-0">
              {auditTimeline.map((entry, i) => (
                <div key={entry.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0 border-2 border-slate-200 bg-slate-50">
                      {entry.icon}
                    </div>
                    {i < auditTimeline.length - 1 && (
                      <div className="w-0.5 flex-1 my-1 bg-slate-100" style={{ minHeight: '20px' }} />
                    )}
                  </div>
                  <div className={`pb-6 flex-1 min-w-0 ${i === auditTimeline.length - 1 ? 'pb-0' : ''}`}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="font-semibold text-sm text-slate-900">{entry.title}</div>
                      <div className="text-xs text-slate-400 whitespace-nowrap">{formatDateTime(entry.at)}</div>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {entry.actor}
                      {entry.actorRol ? ` · ${entry.actorRol}` : ''}
                      {entry.sector ? ` · ${entry.sector}` : ''}
                    </div>
                    <div className="text-sm text-slate-600 mt-2">{entry.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Comentarios */}
      {activeTab === 'comentarios' && (
        <div className="card p-6 space-y-3">
          {comments.length === 0 ? (
            <div className="empty-state py-6">
              <div className="empty-title">Sin comentarios todavía</div>
              <div className="text-sm text-slate-400 mt-1">Cuando el pedido avance, acá va a quedar el registro de cada paso.</div>
            </div>
          ) : comments.map(comment => (
            <div key={comment.id} className={`rounded-2xl border px-4 py-3 ${comment.kind === 'chat' ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-sm text-slate-900">
                    {comment.title || 'Comentario'}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{comment.actor} · {comment.area}</div>
                </div>
                <div className="text-xs text-slate-400 whitespace-nowrap">{formatDateTime(comment.createdAt)}</div>
              </div>
              <div className="text-sm text-slate-600 mt-2">{comment.detail}</div>
            </div>
          ))}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500 mb-2">Escribiendo como {fullName(user || undefined)} · {currentAreaLabel}</div>
            <div className="flex gap-3 items-end">
              <textarea
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Escribí un comentario sobre este pedido..."
                className="flex-1 min-h-24 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-300"
              />
              <button
                onClick={handleSendMessage}
                disabled={!chatInput.trim() || !user}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Presupuestos */}
      {activeTab === 'presupuestos' &&
        (canGestionarPresupuestos ? (
          <PedidoPresupuestosComprasPanel
            pedidoId={pedido.id}
            pedido={pedido}
            compactHeader
            onEnviarFirmaSuccess={() => {
              refetch();
            }}
          />
        ) : (
          <div className="space-y-3">
            {presupuestos.length === 0 ? (
              <div className="card p-8 text-center text-slate-400">Sin presupuestos cargados aún</div>
            ) : (
              <>
                {canFirmar && (
                  <div
                    className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white p-4 sm:p-5 shadow-sm"
                    role="region"
                    aria-label="Instrucciones para firmar"
                  >
                    <div className="text-sm font-extrabold text-amber-950 tracking-tight">
                      Secretaría: tres pasos simples
                    </div>
                    <ol className="mt-2 space-y-1.5 text-sm text-amber-950/90 list-decimal list-inside marker:font-bold">
                      <li>
                        La cotización más baja aparece con la etiqueta <span className="font-semibold">Menor valor</span> (puede haber más de una si empatan).
                      </li>
                      <li>
                        Tocá la tarjeta del proveedor que vas a <span className="font-semibold">autorizar con tu firma</span>. Las demás quedan como sin firmar — no seleccionadas.
                      </li>
                      <li>
                        Usá el botón <span className="font-semibold">Firmar presupuesto</span> arriba cuando esté listo.
                      </li>
                    </ol>
                  </div>
                )}
                {presupuestos.map((p, i) => {
                  const esElegidoFirma = canFirmar && presupuestoParaFirmaId === p.id;
                  const menorValor = presupuestosMenorValorIds.has(p.id);
                  const borderClass = canFirmar
                    ? esElegidoFirma
                      ? 'border-l-blue-500 ring-2 ring-blue-200/90 bg-blue-50/50'
                      : 'border-l-slate-300 bg-white hover:border-l-slate-400'
                    : 'border-l-green-400 hover:shadow-md hover:-translate-y-0.5';
                  return (
                    <div
                      key={p.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (canFirmar) setPresupuestoParaFirmaId(p.id);
                        else setPresupuestoModal(p);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (canFirmar) setPresupuestoParaFirmaId(p.id);
                          else setPresupuestoModal(p);
                        }
                      }}
                      className={`card p-5 border-l-4 cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 ${borderClass}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-8 h-8 shrink-0 rounded-full border-2 font-bold text-sm flex items-center justify-center ${
                              canFirmar
                                ? esElegidoFirma
                                  ? 'bg-blue-600 border-blue-700 text-white'
                                  : 'bg-slate-100 border-slate-300 text-slate-600'
                                : 'bg-green-100 border-green-300 text-green-700'
                            }`}
                          >
                            {canFirmar && esElegidoFirma ? '✓' : i + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 truncate">{p.proveedor}</div>
                            <div className="text-xs text-slate-500">
                              {formatDate(p.createdAt)}
                              {canFirmar ? ' · Tocá la tarjeta para marcar la opción a firmar' : ' · Tocá para ver detalle'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-black font-mono text-lg">{formatMoney(p.monto)}</div>
                          {p.plazoEntrega && <div className="text-xs text-slate-500">Entrega: {p.plazoEntrega}</div>}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {menorValor && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-950 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-full">
                            Menor valor
                          </span>
                        )}
                        {canFirmar &&
                          (esElegidoFirma ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-900 bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-full">
                              ✓ Elegido para firmar
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
                              Sin firmar — No seleccionado
                            </span>
                          ))}
                        {!canFirmar && pedido.proveedorSeleccionado === p.proveedor && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                            Seleccionado por Compras
                          </span>
                        )}
                      </div>
                      {canFirmar && (
                        <button
                          type="button"
                          className="mt-3 text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPresupuestoModal(p);
                          }}
                        >
                          Ver ficha y PDF →
                        </button>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        ))}

      {/* Tab: Documentos */}
      {activeTab === 'documentos' && (
        <div className="card p-6 space-y-4">
          {pedido.referenciasImagenes && pedido.referenciasImagenes.length > 0 && (
            <div className="info-panel" style={{ borderColor: 'var(--sky-brd)', background: 'linear-gradient(135deg,#e0f2fe,#f0f9ff)' }}>
              <div className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--sky-600, #0284c7)' }}>
                📷 Referencias de la solicitud
              </div>
              <p className="text-xs text-slate-600 mb-3">Imágenes adjuntas al crear el pedido.</p>
              <div className="flex flex-wrap gap-2">
                {pedido.referenciasImagenes.map((r, i) => (
                  <a
                    key={r.url}
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-lg border border-slate-200 overflow-hidden bg-white shadow-sm hover:ring-2 hover:ring-sky-300 transition"
                  >
                    <img src={r.url} alt={`Referencia ${i + 1}`} className="h-28 w-28 object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}
          {/* Firma */}
          {pedido.firmaUrlUsada && (
            <div className="info-panel">
              <div className="info-pair-label mb-2">Firma digital</div>
              <img src={pedido.firmaUrlUsada} alt="Firma" className="max-h-20 object-contain bg-white border border-slate-100 rounded p-2" />
              <div className="text-xs text-slate-400 mt-1 font-mono">{pedido.firmaHash}</div>
            </div>
          )}
          {pedido.facturaComprasUrl && (
            <div className="info-panel" style={{ borderColor: 'var(--purple-brd)', background: 'linear-gradient(135deg,#ede9fe,#f5f3ff)' }}>
              <div className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--purple)' }}>🧾 Factura del proveedor (Compras)</div>
              <a href={pedido.facturaComprasUrl} target="_blank" rel="noreferrer" className="doc-link">📄 Ver factura PDF →</a>
              {pedido.facturaSubidaPor && (
                <div className="text-xs text-slate-500 mt-2">Cargada por {fullName(pedido.facturaSubidaPor)}{pedido.facturaSubidaEn ? ` · ${formatDateTime(pedido.facturaSubidaEn)}` : ''}</div>
              )}
            </div>
          )}
          {/* Sellado */}
          {sellado && (
            <div className="info-panel">
              <div className="info-pair-label mb-2">Sellado provincial</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-slate-400">N°</span> <span className="font-mono font-bold">{sellado.numeroSellado}</span></div>
                <div><span className="text-slate-400">Fecha</span> <span className="font-semibold">{formatDate(sellado.fechaSellado)}</span></div>
                <div><span className="text-slate-400">Monto</span> <span className="font-mono font-bold">{formatMoney(sellado.montoSellado)}</span></div>
              </div>
              {sellado.comprobanteUrl && <a href={sellado.comprobanteUrl} target="_blank" rel="noreferrer" className="mt-2 doc-link">📄 Comprobante →</a>}
            </div>
          )}
          {/* Pago */}
          {pago && (
            <div className="info-panel" style={{ borderColor: 'var(--green-brd)', background: 'linear-gradient(135deg,#dcfce7,#f0fdf4)' }}>
              <div className="text-xs font-bold text-green-600 uppercase mb-2">✅ Pago registrado</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-slate-400">Transferencia</span> <span className="font-mono font-bold">{pago.numeroTransferencia}</span></div>
                <div><span className="text-slate-400">Fecha</span> <span className="font-semibold">{formatDate(pago.fechaPago)}</span></div>
                <div><span className="text-slate-400">Monto</span> <span className="font-mono font-bold">{formatMoney(pago.montoPagado)}</span></div>
              </div>
              {pago.facturaUrl && <a href={pago.facturaUrl} target="_blank" rel="noreferrer" className="mt-2 doc-link">📄 Factura →</a>}
            </div>
          )}
          {!pedido.firmaUrlUsada &&
            !pedido.facturaComprasUrl &&
            !sellado &&
            !pago &&
            !(pedido.referenciasImagenes && pedido.referenciasImagenes.length > 0) && (
            <div className="empty-state py-6">
              <div className="empty-title">Sin documentos adjuntos aún</div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Info */}
      {activeTab === 'info' && (
        <div className="card p-6">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><div className="info-pair-label">N° Pedido</div><div className="info-pair-value font-mono">{pedido.numero}</div></div>
            <div><div className="info-pair-label">Estado actual</div><div className="info-pair-value">{stageIcon(pedido.stage)} {pedidoEstadoVisibleLabel(pedido)}</div></div>
            <div><div className="info-pair-label">Solicitado por</div><div className="info-pair-value">{fullName(pedido.creadoPor)}</div></div>
            <div><div className="info-pair-label">Fecha creación</div><div className="info-pair-value">{formatDate(pedido.createdAt)}</div></div>
            <div><div className="info-pair-label">Área solicitante</div><div className="info-pair-value">{pedido.area}</div></div>
            <div><div className="info-pair-label">Equipo actual</div><div className="info-pair-value">{STAGE_OWNER_LABELS[pedido.stage] || '—'}</div></div>
            {pedido.monto != null && <div><div className="info-pair-label">Monto</div><div className="info-pair-value">{formatMoney(pedido.monto)}</div></div>}
            {pedido.proveedorSeleccionado && <div><div className="info-pair-label">Proveedor seleccionado</div><div className="info-pair-value">{pedido.proveedorSeleccionado}</div></div>}
            {pedido.aprobadoPor && <div><div className="info-pair-label">Aprobado por</div><div className="info-pair-value">{fullName(pedido.aprobadoPor)}</div></div>}
            {pedido.firmadoPor && <div><div className="info-pair-label">Firmado por</div><div className="info-pair-value">{fullName(pedido.firmadoPor)}</div></div>}
            {pedido.detalle && <div className="col-span-2"><div className="info-pair-label">Detalle</div><div className="info-pair-value">{pedido.detalle}</div></div>}
            {pedido.firmaHash && <div className="col-span-2"><div className="info-pair-label">Hash firma</div><div className="font-mono text-xs text-slate-600 mt-1">{pedido.firmaHash}</div></div>}
            {pedido.stage === PedidoStage.RECHAZADO && pedido.notaRechazo && (
              <div className="col-span-2"><div className="info-pair-label">Motivo del rechazo</div><div className="info-pair-value whitespace-pre-wrap">{pedido.notaRechazo}</div></div>
            )}
          </div>
        </div>
      )}

      {presupuestoModal && pedido && (
        <PresupuestoDetalleModal
          presupuesto={presupuestoModal}
          pedidoNumero={pedido.numero}
          pedidoDescripcion={pedido.descripcion}
          index={presupuestos.findIndex((x) => x.id === presupuestoModal.id) + 1}
          onClose={() => setPresupuestoModal(null)}
          isSeleccionado={
            canFirmar
              ? presupuestoParaFirmaId === presupuestoModal.id
              : pedido.proveedorSeleccionado === presupuestoModal.proveedor
          }
          isMenorValor={presupuestosMenorValorIds.has(presupuestoModal.id)}
        />
      )}

      {/* Action modal */}
      {modal && (
        <ActionModal
          pedido={pedido}
          action={modal}
          firmarPresupuesto={modal === 'firmar' ? presupuestoElegidoFirma ?? null : null}
          rechazarMeta={modal === 'rechazar' ? { presupuestosCargados: presupuestos.length } : null}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); refetch(); }}
        />
      )}
    </div>
  );
}

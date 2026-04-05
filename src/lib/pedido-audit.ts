import type { Pedido, Presupuesto, Sellado, Pago, User, PedidoAuditLog } from '../types';
import { PedidoStage, STAGE_OWNER_LABELS } from '../types';
import { rolLabel, pedidoEstadoVisibleLabel } from './utils';

export type PedidoAuditEntry = {
  id: string;
  at: string;
  icon: string;
  title: string;
  actor: string;
  actorRol?: string;
  sector: string;
  detail: string;
};

function fullName(person?: User | null): string {
  if (!person) return '—';
  const u = person as User & { nombreCompleto?: string };
  return u.nombreCompleto || [u.nombre, u.apellido].filter(Boolean).join(' ') || '—';
}

function rolEtiqueta(u?: User | null): string | undefined {
  return u?.rol ? rolLabel(u.rol) : undefined;
}

/**
 * Hechos auditables del pedido + presupuestos/sellado/pago, ordenados por fecha.
 */
export function buildPedidoAuditTimeline(
  pedido: Pedido,
  presupuestos: Presupuesto[],
  sellado: Sellado | null | undefined,
  pago: Pago | null | undefined,
): PedidoAuditEntry[] {
  const entries: PedidoAuditEntry[] = [];

  entries.push({
    id: 'creacion',
    at: pedido.createdAt,
    icon: '📥',
    title: 'Inicio del trámite',
    actor: fullName(pedido.creadoPor),
    actorRol: rolEtiqueta(pedido.creadoPor),
    sector: pedido.area,
    detail: [
      `Pedido ${pedido.numero} ingresó al circuito.`,
      pedido.detalle ? `Detalle: ${pedido.detalle}` : null,
      pedido.urgente ? 'Marcado como urgente.' : null,
    ]
      .filter(Boolean)
      .join(' '),
  });

  const presOrdenados = [...presupuestos].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  presOrdenados.forEach((p, idx) => {
    entries.push({
      id: `presupuesto-${p.id}`,
      at: p.createdAt,
      icon: idx === 0 ? '🛒' : '📎',
      title: idx === 0 ? 'Primera cotización (Compras interviene)' : `Cotización adicional #${idx + 1}`,
      actor: fullName(p.cargadoPor),
      actorRol: rolEtiqueta(p.cargadoPor),
      sector: STAGE_OWNER_LABELS[PedidoStage.PRESUPUESTOS],
      detail: `${p.proveedor} · ${p.monto != null ? `$${Number(p.monto).toLocaleString('es-AR')}` : 'Monto —'}`,
    });
  });

  const pasoAprobacion =
    Boolean(pedido.notaAprobacion) ||
    (Boolean(pedido.aprobadoPor) &&
      pedido.stage !== PedidoStage.RECHAZADO &&
      pedido.stage >= PedidoStage.PRESUPUESTOS);

  if (pasoAprobacion && pedido.aprobadoPor) {
    // La aprobación ocurre justo después de la creación; como no tenemos `aprobadoEn`
    // usamos createdAt + 1 ms para que siempre quede por delante de los presupuestos.
    const aprobacionAt = new Date(new Date(pedido.createdAt).getTime() + 1).toISOString();
    entries.push({
      id: 'aprobacion',
      at: aprobacionAt,
      icon: '✅',
      title: 'Aprobación inicial de Secretaría',
      actor: fullName(pedido.aprobadoPor),
      actorRol: rolEtiqueta(pedido.aprobadoPor),
      sector: STAGE_OWNER_LABELS[PedidoStage.APROBACION],
      detail: pedido.notaAprobacion || 'El pedido fue aprobado para continuar el circuito.',
    });
  }

  if (pedido.firmadoPor) {
    const firmaDetail = [
      pedido.proveedorSeleccionado
        ? `Proveedor elegido: ${pedido.proveedorSeleccionado}${pedido.monto != null ? ` · ${formatMoneyEs(pedido.monto)}` : ''}.`
        : null,
      'Presupuesto firmado digitalmente.',
      pedido.firmaHash ? `Huella: ${pedido.firmaHash}` : null,
      pedido.bloqueado ? 'Quedó sujeto a sellado antes de pago.' : null,
    ]
      .filter(Boolean)
      .join(' ');
    entries.push({
      id: 'firma',
      at: pedido.firmadoEn || pedido.updatedAt,
      icon: '✍️',
      title: 'Firma de presupuesto',
      actor: fullName(pedido.firmadoPor),
      actorRol: rolEtiqueta(pedido.firmadoPor),
      sector: STAGE_OWNER_LABELS[PedidoStage.FIRMA],
      detail: firmaDetail,
    });
  }

  if (pedido.facturaComprasUrl && pedido.facturaSubidaPor) {
    entries.push({
      id: 'factura',
      at: pedido.facturaSubidaEn || pedido.updatedAt,
      icon: '🧾',
      title: 'Factura del proveedor cargada',
      actor: fullName(pedido.facturaSubidaPor),
      actorRol: rolEtiqueta(pedido.facturaSubidaPor),
      sector: STAGE_OWNER_LABELS[PedidoStage.CARGA_FACTURA],
      detail: 'Documentación enviada a Tesorería para sellado y/o pago.',
    });
  }

  if (sellado?.registradoPor) {
    entries.push({
      id: 'sellado',
      at: sellado.createdAt,
      icon: '🏛️',
      title: 'Sellado provincial registrado',
      actor: fullName(sellado.registradoPor),
      actorRol: rolEtiqueta(sellado.registradoPor),
      sector: STAGE_OWNER_LABELS[PedidoStage.GESTION_PAGOS],
      detail: `N° ${sellado.numeroSellado} · ${formatMoneyEs(sellado.montoSellado)} · ${sellado.fechaSellado}`,
    });
  }

  if (pago?.registradoPor) {
    entries.push({
      id: 'pago',
      at: pago.createdAt,
      icon: '💳',
      title: 'Pago registrado',
      actor: fullName(pago.registradoPor),
      actorRol: rolEtiqueta(pago.registradoPor),
      sector: STAGE_OWNER_LABELS[PedidoStage.GESTION_PAGOS],
      detail: `Transferencia ${pago.numeroTransferencia} · ${formatMoneyEs(pago.montoPagado)} · ${pago.fechaPago}`,
    });
  }

  if (pedido.recepcionConfirmadaPor) {
    const recepcionDetail = [
      pedido.areaRecepcion ? `Recibido en: ${pedido.areaRecepcion}.` : null,
      pedido.notaRecepcion ? pedido.notaRecepcion : 'El pedido pasó a estado completado en el circuito.',
    ].filter(Boolean).join(' ');
    entries.push({
      id: 'recepcion',
      at: pedido.recepcionEn || pedido.updatedAt,
      icon: '📦',
      title: 'Recepción de suministros confirmada',
      actor: fullName(pedido.recepcionConfirmadaPor),
      actorRol: rolEtiqueta(pedido.recepcionConfirmadaPor),
      sector: pedido.areaRecepcion || STAGE_OWNER_LABELS[PedidoStage.SUMINISTROS_LISTOS],
      detail: recepcionDetail,
    });
  }

  if (pedido.stage === PedidoStage.RECHAZADO && pedido.notaRechazo) {
    entries.push({
      id: 'rechazo',
      at: pedido.updatedAt,
      icon: '⛔',
      title: pedidoEstadoVisibleLabel(pedido),
      actor: fullName(pedido.aprobadoPor),
      actorRol: rolEtiqueta(pedido.aprobadoPor),
      sector:
        pedido.rechazadoDesdeStage != null
          ? STAGE_OWNER_LABELS[pedido.rechazadoDesdeStage]
          : STAGE_OWNER_LABELS[PedidoStage.RECHAZADO],
      detail: pedido.notaRechazo,
    });
  }

  entries.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return entries;
}

const EVENTO_LABELS: Record<string, { icon: string; title: string }> = {
  CREACION:              { icon: '📥', title: 'Inicio del trámite' },
  APROBACION:            { icon: '✅', title: 'Aprobación de Secretaría' },
  RECHAZO:               { icon: '⛔', title: 'Expediente rechazado' },
  PRESUPUESTO_ENVIADO:   { icon: '📋', title: 'Presupuesto enviado a Firma' },
  PRESUPUESTO_RECHAZADO: { icon: '↩️', title: 'Presupuesto devuelto a Compras' },
  FIRMA:                 { icon: '✍️', title: 'Presupuesto firmado' },
  FACTURA_SUBIDA:        { icon: '🧾', title: 'Factura del proveedor cargada' },
  PAGO:                  { icon: '💳', title: 'Pago registrado' },
  RECEPCION_CONFIRMADA:  { icon: '📦', title: 'Recepción de suministros confirmada' },
  ARCHIVADO:             { icon: '🗂️', title: 'Expediente archivado' },
};

/**
 * Convierte los registros de DB (PedidoAuditLog[]) al mismo formato de PedidoAuditEntry
 * para ser renderizados en la misma timeline.
 */
export function buildAuditTimelineFromLog(logs: PedidoAuditLog[]): PedidoAuditEntry[] {
  return logs.map((log) => {
    const label = EVENTO_LABELS[log.evento] ?? { icon: '🔹', title: log.evento };
    const actor = log.usuario
      ? (log.usuario as User & { nombreCompleto?: string }).nombreCompleto
        || [log.usuario.nombre, log.usuario.apellido].filter(Boolean).join(' ')
        || '—'
      : '—';
    const actorRol = log.usuario?.rol ? rolLabel(log.usuario.rol) : undefined;

    const m = (log.metadata ?? {}) as Record<string, unknown>;
    const detailParts: string[] = [];
    // Para recepción: área receptora va primero y es el dato clave
    if (log.evento === 'RECEPCION_CONFIRMADA') {
      if (m.areaRecepcion) detailParts.push(`Área receptora: ${m.areaRecepcion}`);
      if (log.nota) detailParts.push(log.nota);
      if (!detailParts.length) detailParts.push('El circuito quedó cerrado.');
    } else {
      if (log.nota) detailParts.push(log.nota);
      if (m.proveedor) detailParts.push(`Proveedor: ${m.proveedor}`);
      if (m.monto) detailParts.push(`Monto: ${formatMoneyEs(m.monto as number)}`);
      if (m.areaRecepcion) detailParts.push(`Área receptora: ${m.areaRecepcion}`);
      if (m.firmaHash) detailParts.push(`Huella: ${m.firmaHash}`);
    }
    const detail = detailParts.join(' · ') || '—';

    // Para recepción: el sector es el área que recibió, no el label genérico
    const sectorOverride =
      log.evento === 'RECEPCION_CONFIRMADA' && typeof m.areaRecepcion === 'string' && m.areaRecepcion
        ? m.areaRecepcion
        : undefined;

    return {
      id: log.id,
      at: log.createdAt,
      icon: label.icon,
      title: label.title,
      actor,
      actorRol,
      sector: sectorOverride || log.area || '—',
      detail,
    };
  });
}

function formatMoneyEs(n: number | string | undefined): string {
  if (n == null || n === '') return '—';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (Number.isNaN(num)) return '—';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(num);
}

export type PedidoAuditResumen = {
  inicio: { actor: string; at: string; extra?: string };
  compras: { actor: string; at: string; extra?: string };
  secretaria: { actor: string; at: string; label: string; extra?: string };
};

export function buildPedidoAuditResumen(
  pedido: Pedido,
  presupuestos: Presupuesto[],
): PedidoAuditResumen {
  const presOrdenados = [...presupuestos].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const first = presOrdenados[0];

  const pasoAprobacion =
    Boolean(pedido.notaAprobacion) ||
    (Boolean(pedido.aprobadoPor) &&
      pedido.stage !== PedidoStage.RECHAZADO &&
      pedido.stage >= PedidoStage.PRESUPUESTOS);

  let secretariaLabel = 'Pendiente';
  let secretariaActor = '—';
  let secretariaAt = pedido.updatedAt;
  let secretariaExtra: string | undefined;

  if (pedido.stage === PedidoStage.RECHAZADO && pedido.notaRechazo) {
    secretariaLabel = 'Rechazó';
    secretariaActor = fullName(pedido.aprobadoPor);
    secretariaExtra = pedido.notaRechazo;
  } else if (pasoAprobacion && pedido.aprobadoPor) {
    secretariaLabel = 'Aprobó';
    secretariaActor = fullName(pedido.aprobadoPor);
    secretariaExtra = pedido.notaAprobacion || undefined;
  }

  return {
    inicio: {
      actor: fullName(pedido.creadoPor),
      at: pedido.createdAt,
      extra: `${pedido.area}${pedido.urgente ? ' · Urgente' : ''}`,
    },
    compras: {
      actor: first ? fullName(first.cargadoPor) : '—',
      at: first?.createdAt || pedido.createdAt,
      extra: first
        ? `Primera cotización: ${first.proveedor}`
        : 'Aún sin cotizaciones en el sistema',
    },
    secretaria: {
      actor: secretariaActor,
      at: secretariaAt,
      label: secretariaLabel,
      extra: secretariaExtra,
    },
  };
}

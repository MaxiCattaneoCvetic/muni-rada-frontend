import type { UserRole } from '../types';
import type { Pedido } from '../types';
import { PedidoStage } from '../types';
import { pedidoEstadoVisibleLabel } from './utils';

/** Sellado / pago: solo se usan campos necesarios para el copy de etapa actual. */
export type FlowSelladoRef = { numeroSellado: string } | null | undefined;
export type FlowPagoRef = { numeroTransferencia: string } | null | undefined;

/**
 * Indica si el rol del usuario es el área “dueña” operativa de la etapa.
 * `admin` no se trata como dueño (mensajes neutros de observador).
 */
export function isViewerOwnerOfStage(rol: UserRole | undefined, stage: number): boolean {
  if (!rol || rol === 'admin') return false;
  switch (stage) {
    case PedidoStage.APROBACION:
    case PedidoStage.FIRMA:
      return rol === 'secretaria';
    case PedidoStage.PRESUPUESTOS:
    case PedidoStage.CARGA_FACTURA:
      return rol === 'compras';
    case PedidoStage.GESTION_PAGOS:
      return rol === 'tesoreria';
    case PedidoStage.ESPERANDO_SUMINISTROS:
    case PedidoStage.SUMINISTROS_LISTOS:
      return rol === 'admin';
    default:
      return false;
  }
}

export interface CurrentStepMessageContext {
  viewerRol: UserRole | undefined;
  presupuestosCount: number;
  presupuestoCountLabel: string;
  pedido: Pedido;
  sellado: FlowSelladoRef;
  pago: FlowPagoRef;
}

/**
 * Mensaje del paso en curso en la pestaña Flujo: variante “dueño de etapa” (tercera persona sobre el área)
 * u “resto” (dónde está el trámite).
 */
export function getCurrentStepMessage(
  stage: number,
  ctx: CurrentStepMessageContext,
): string | null {
  const { viewerRol, presupuestosCount, presupuestoCountLabel, pedido, sellado, pago } = ctx;
  const owner = isViewerOwnerOfStage(viewerRol, stage);

  switch (stage) {
    case PedidoStage.APROBACION:
      return owner
        ? 'Secretaría debe aprobar o rechazar este pedido antes de que el circuito continúe.'
        : 'El pedido está aquí. Secretaría lo tiene pendiente de aprobación.';
    case PedidoStage.PRESUPUESTOS: {
      if (owner) {
        return presupuestosCount > 0
          ? `Compras tiene el pedido en cotización: ${presupuestoCountLabel}. Debe completar el mínimo exigido y enviar a Secretaría cuando corresponda.`
          : 'Compras debe cargar y comparar presupuestos de proveedores antes de enviar el pedido a Secretaría.';
      }
      return presupuestosCount > 0
        ? `El pedido está aquí. Compras lo tiene revisando ${presupuestoCountLabel} para elegir una opción.`
        : 'El pedido está aquí. Compras lo tiene pendiente de cargar presupuestos.';
    }
    case PedidoStage.FIRMA:
      return owner
        ? 'En la pestaña Presupuestos tocá la cotización que vas a autorizar con tu firma; las demás quedan como no seleccionadas. Después usá el botón Firmar presupuesto.'
        : 'El pedido está aquí. Secretaría lo tiene pendiente de firmar una de las cotizaciones cargadas.';
    case PedidoStage.CARGA_FACTURA:
      return owner
        ? 'Compras debe adjuntar la factura del proveedor para que Tesorería gestione sellado y pago.'
        : 'El pedido está aquí. Compras debe subir la factura del proveedor para enviar el pedido a Tesorería.';
    case PedidoStage.GESTION_PAGOS: {
      if (owner) {
        if (pedido.bloqueado && !sellado) {
          return 'Tesorería debe registrar el sellado para destrabar el pedido hacia Suministros.';
        }
        if (!pedido.bloqueado && !pago) {
          return 'Tesorería debe registrar el pago para que el pedido pueda avanzar.';
        }
        if (pago) {
          return 'Tesorería ya registró el pago; el pedido está listo para avanzar en el circuito.';
        }
        return 'Tesorería debe completar la gestión de sellado o pago según corresponda.';
      }
      if (pedido.bloqueado && !sellado) return 'El pedido está aquí. Tesorería lo tiene pendiente de registrar el sellado.';
      if (!pedido.bloqueado && !pago) return 'El pedido está aquí. Tesorería lo tiene pendiente de registrar el pago.';
      if (pago) return 'El pedido está aquí. Tesorería ya registró el pago y está listo para avanzar.';
      return 'El pedido está aquí. Tesorería lo está gestionando.';
    }
    case PedidoStage.ESPERANDO_SUMINISTROS:
      return owner
        ? 'Administración debe coordinar la entrega o la recepción de los suministros.'
        : 'El pedido está aquí. Administración / Suministros lo tiene esperando la entrega o recepción.';
    case PedidoStage.SUMINISTROS_LISTOS:
      return owner
        ? 'Administración ya cerró la recepción; el circuito de este pedido finalizó.'
        : 'El pedido está aquí. Administración ya confirmó la recepción y el circuito quedó cerrado.';
    case PedidoStage.RECHAZADO:
      return `${pedidoEstadoVisibleLabel(ctx.pedido)}: el expediente está cerrado y no admite nuevas acciones en el circuito.`;
    default:
      return null;
  }
}

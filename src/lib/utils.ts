import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { AreaMunicipal, AuthUser, Pedido } from '../types';
import { AREAS, STAGE_LABELS, STAGE_AREA, STAGE_ICONS, STAGE_COLORS, PedidoStage } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('es-AR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export function stageLabel(stage: number) { return STAGE_LABELS[stage] || 'Desconocido'; }

/** Etiqueta de estado según rechazo desde firma vs aprobación (requiere `rechazadoDesdeStage` del API). */
export function pedidoEstadoVisibleLabel(pedido: Pick<Pedido, 'stage' | 'rechazadoDesdeStage'>): string {
  if (pedido.stage !== PedidoStage.RECHAZADO) {
    return STAGE_LABELS[pedido.stage] || 'Desconocido';
  }
  if (pedido.rechazadoDesdeStage === PedidoStage.FIRMA) {
    return 'Presupuestos rechazados';
  }
  if (pedido.rechazadoDesdeStage === PedidoStage.APROBACION) {
    return 'Solicitud rechazada';
  }
  return STAGE_LABELS[PedidoStage.RECHAZADO];
}

export function stageArea(stage: number) { return STAGE_AREA[stage] || '—'; }
export function stageIcon(stage: number) { return STAGE_ICONS[stage] || '?'; }
export function stageColor(stage: number): string { return STAGE_COLORS[stage] || 'slate'; }

export function stageBadgeClass(stage: number): string {
  const map: Record<string, string> = {
    amber: 'badge-amber', purple: 'badge-purple', blue: 'badge-blue',
    green: 'badge-green', red: 'badge-red', slate: 'badge-slate',
    teal: 'badge-teal', sky: 'badge-sky',
  };
  return map[stageColor(stage)] || 'badge-slate';
}

export function rolLabel(rol: string): string {
  const map: Record<string, string> = {
    secretaria: 'Secretaría', compras: 'Compras',
    tesoreria: 'Tesorería', admin: 'Admin',
  };
  return map[rol] || rol;
}

export function rolBadgeClass(rol: string): string {
  const map: Record<string, string> = {
    secretaria: 'badge-blue',
    compras: 'badge-purple',
    tesoreria: 'badge-teal',
    admin: 'badge-amber',
  };
  return map[rol] || 'badge-slate';
}

export function getInitials(nombre: string, apellido?: string): string {
  if (apellido) return `${nombre[0]}${apellido[0]}`.toUpperCase();
  return nombre.slice(0, 2).toUpperCase();
}

/** Áreas disponibles en el selector de nuevo pedido según permisos del usuario. */
export function areasPedidoSelectOptions(user: AuthUser | null): AreaMunicipal[] {
  const raw = user?.areasPedidoPermitidas;
  if (raw === null || raw === undefined) return [...AREAS];
  return raw;
}

export function userPuedeCrearPedidos(user: AuthUser | null): boolean {
  return areasPedidoSelectOptions(user).length > 0;
}

/** Stages where each role has an active action to take (used for card highlighting). */
export const ROLE_STAGES: Record<string, number[]> = {
  secretaria: [1, 3, 8],
  compras: [2, 4, 8],
  tesoreria: [5],
  admin: [1, 2, 3, 4, 5, 6, 7, 8],
};

/** Stages visible to each role when "solo etapas de mi área" is active.
 *  Includes action stages + downstream tracking stages for each role. */
export const ROLE_VISIBLE_STAGES: Record<string, number[]> = {
  secretaria: [1, 2, 3, 4, 6, 8],
  compras: [2, 3, 4, 6, 8],
  tesoreria: [4, 5, 6, 8],
  admin: [1, 2, 3, 4, 5, 6, 7, 8],
};

export function pedidoNeedsMyAction(stage: number, rol: string): boolean {
  if (stage === PedidoStage.RECHAZADO) return false;
  return ROLE_STAGES[rol]?.includes(stage) ?? false;
}

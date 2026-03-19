import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { STAGE_LABELS, STAGE_AREA, STAGE_ICONS, STAGE_COLORS } from '../types';

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
export function stageArea(stage: number) { return STAGE_AREA[stage] || '—'; }
export function stageIcon(stage: number) { return STAGE_ICONS[stage] || '?'; }
export function stageColor(stage: number): string { return STAGE_COLORS[stage] || 'slate'; }

export function stageBadgeClass(stage: number): string {
  const map: Record<string, string> = {
    amber: 'badge-amber', purple: 'badge-purple', blue: 'badge-blue',
    green: 'badge-green', red: 'badge-red', slate: 'badge-slate',
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
    secretaria: 'badge-blue', compras: 'badge-purple',
    tesoreria: 'badge-green', admin: 'badge-amber',
  };
  return map[rol] || 'badge-slate';
}

export function getInitials(nombre: string, apellido?: string): string {
  if (apellido) return `${nombre[0]}${apellido[0]}`.toUpperCase();
  return nombre.slice(0, 2).toUpperCase();
}

export const ROLE_STAGES: Record<string, number[]> = {
  secretaria: [1, 3],
  compras: [2],
  tesoreria: [4],
  admin: [1, 2, 3, 4, 5, 6],
};

export function pedidoNeedsMyAction(stage: number, rol: string): boolean {
  return ROLE_STAGES[rol]?.includes(stage) ?? false;
}

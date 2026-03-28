import type { LucideIcon } from 'lucide-react';
import { FileSignature, Landmark, ShoppingCart, Shield } from 'lucide-react';
import type { UserRole } from '../types';

export const DEMO_ROLE_ICONS: Record<UserRole, LucideIcon> = {
  secretaria: FileSignature,
  compras: ShoppingCart,
  tesoreria: Landmark,
  admin: Shield,
};

/** Fondo y color del icono (misma paleta que la pantalla de demo / home). */
export function demoRoleIconSurface(rol: UserRole): { background: string; color: string } {
  switch (rol) {
    case 'secretaria':
      return { background: 'rgba(59,130,246,.3)', color: '#93c5fd' };
    case 'compras':
      return { background: 'rgba(139,92,246,.3)', color: '#c4b5fd' };
    case 'tesoreria':
      return { background: 'rgba(34,197,94,.25)', color: '#86efac' };
    case 'admin':
      return { background: 'rgba(245,158,11,.25)', color: '#fcd34d' };
  }
}

/** Botones del header demo cuando no están seleccionados (gris neutro). */
export const DEMO_ROLE_HEADER_IDLE: { background: string; color: string } = {
  background: 'rgba(100,116,139,.12)',
  color: '#64748b',
};

export function demoRoleHeaderActive(rol: UserRole): {
  background: string;
  color: string;
  border: string;
  boxShadow: string;
} {
  switch (rol) {
    case 'secretaria':
      return {
        background: 'rgba(59,130,246,.26)',
        color: '#1d4ed8',
        border: 'rgba(59,130,246,.35)',
        boxShadow: 'inset 0 0 0 1px rgba(59,130,246,.2)',
      };
    case 'compras':
      return {
        background: 'rgba(139,92,246,.24)',
        color: '#6d28d9',
        border: 'rgba(139,92,246,.32)',
        boxShadow: 'inset 0 0 0 1px rgba(139,92,246,.18)',
      };
    case 'tesoreria':
      return {
        background: 'rgba(34,197,94,.2)',
        color: '#15803d',
        border: 'rgba(34,197,94,.3)',
        boxShadow: 'inset 0 0 0 1px rgba(34,197,94,.18)',
      };
    case 'admin':
      return {
        background: 'rgba(245,158,11,.22)',
        color: '#b45309',
        border: 'rgba(245,158,11,.32)',
        boxShadow: 'inset 0 0 0 1px rgba(245,158,11,.18)',
      };
  }
}

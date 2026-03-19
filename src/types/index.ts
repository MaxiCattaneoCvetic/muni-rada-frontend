// ── Auth ──────────────────────────────────────────────────────────────
export type UserRole = 'secretaria' | 'compras' | 'tesoreria' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  rol: UserRole;
  mustChangePassword: boolean;
  firmaUrl?: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

// ── Usuarios ─────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  firmaUrl?: string;
  createdAt: string;
}

export interface CreateUserDto {
  email: string;
  nombre: string;
  apellido: string;
  rol: UserRole;
  password: string;
}

// ── Pedidos ───────────────────────────────────────────────────────────
export enum PedidoStage {
  APROBACION = 1,
  PRESUPUESTOS = 2,
  FIRMA = 3,
  GESTION_PAGOS = 4,
  ESPERANDO_SUMINISTROS = 5,
  SUMINISTROS_LISTOS = 6,
  RECHAZADO = 7,
}

export const STAGE_LABELS: Record<number, string> = {
  1: 'Aprobación de suministros',
  2: 'Búsqueda de presupuestos',
  3: 'Firma de presupuestos',
  4: 'Gestión de sellos y pagos',
  5: 'Esperando suministros',
  6: 'Suministros listos',
  7: 'Rechazado',
};

export const STAGE_AREA: Record<number, string> = {
  1: 'Secretaría',
  2: 'Compras',
  3: 'Secretaría',
  4: 'Tesorería',
  5: 'Administración',
  6: '—',
  7: '—',
};

export const STAGE_ICONS: Record<number, string> = {
  1: '⏳', 2: '🔍', 3: '✍️', 4: '🏛️', 5: '📦', 6: '✅', 7: '❌',
};

export const STAGE_COLORS: Record<number, string> = {
  1: 'amber', 2: 'purple', 3: 'blue', 4: 'green', 5: 'amber', 6: 'green', 7: 'red',
};

export type AreaMunicipal =
  | 'Administración' | 'Obras Públicas' | 'Sistemas' | 'RRHH'
  | 'Catastro' | 'Intendencia' | 'Turismo' | 'Tesorería' | 'Secretaría';

export const AREAS: AreaMunicipal[] = [
  'Administración', 'Catastro', 'Intendencia', 'RRHH',
  'Obras Públicas', 'Sistemas', 'Tesorería', 'Secretaría', 'Turismo',
];

export interface Pedido {
  id: string;
  numero: string;
  descripcion: string;
  cantidad?: string;
  detalle?: string;
  area: AreaMunicipal;
  urgente: boolean;
  stage: PedidoStage;
  monto?: number;
  proveedorSeleccionado?: string;
  bloqueado: boolean;
  notaAprobacion?: string;
  notaRechazo?: string;
  creadoPor?: User;
  aprobadoPor?: User;
  firmadoPor?: User;
  firmaUrlUsada?: string;
  firmaHash?: string;
  firmadoEn?: string;
  recepcionConfirmadaPor?: User;
  recepcionEn?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Presupuestos ──────────────────────────────────────────────────────
export interface Presupuesto {
  id: string;
  pedidoId: string;
  proveedor: string;
  cuit?: string;
  monto: number;
  plazoEntrega?: string;
  contacto?: string;
  notas?: string;
  archivoUrl?: string;
  cargadoPor?: User;
  createdAt: string;
}

// ── Sellados ──────────────────────────────────────────────────────────
export interface Sellado {
  id: string;
  pedidoId: string;
  numeroSellado: string;
  fechaSellado: string;
  montoSellado: number;
  comprobanteUrl?: string;
  registradoPor?: User;
  createdAt: string;
}

// ── Pagos ─────────────────────────────────────────────────────────────
export interface Pago {
  id: string;
  pedidoId: string;
  numeroTransferencia: string;
  fechaPago: string;
  montoPagado: number;
  facturaUrl?: string;
  registradoPor?: User;
  createdAt: string;
}

// ── Config ────────────────────────────────────────────────────────────
export interface SistemaConfig {
  id: string;
  umbralSellado: number;
  minPresupuestos: number;
  bloquearPagoSinSellado: boolean;
  nombreMunicipalidad: string;
  cuitInstitucional?: string;
  updatedAt: string;
}

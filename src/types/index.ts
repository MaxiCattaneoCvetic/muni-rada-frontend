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
  nombreCompleto?: string;
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
export const PedidoStage = {
  APROBACION: 1,
  PRESUPUESTOS: 2,
  FIRMA: 3,
  GESTION_PAGOS: 4,
  ESPERANDO_SUMINISTROS: 5,
  SUMINISTROS_LISTOS: 6,
  RECHAZADO: 7,
} as const;

export type PedidoStage = (typeof PedidoStage)[keyof typeof PedidoStage];

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

export const STAGE_OWNER_LABELS: Record<number, string> = {
  1: 'Secretaría',
  2: 'Compras',
  3: 'Secretaría',
  4: 'Tesorería',
  5: 'Administración / Suministros',
  6: 'Administración',
  7: 'Secretaría / Administración',
};

export const STAGE_HELP_COPY: Record<number, string> = {
  1: 'Pedidos recién cargados que esperan la aprobación inicial de Secretaría para continuar el circuito.',
  2: 'Compras debe buscar proveedores, comparar opciones y cargar los presupuestos de este pedido.',
  3: 'Secretaría revisa los presupuestos cargados y firma la opción elegida para autorizar la compra.',
  4: 'Tesorería registra sellados o pagos y destraba el pedido para que Suministros pueda avanzar.',
  5: 'El pedido ya fue aprobado y pagado; ahora Suministros coordina la recepción o entrega.',
  6: 'Pedidos terminados o recibidos. Ya no requieren acción operativa dentro del circuito normal.',
  7: 'Pedidos rechazados que quedaron frenados hasta una nueva revisión.',
};

export const STAGE_PENDING_COPY: Record<number, string> = {
  1: 'Pendiente de aprobación inicial.',
  2: 'Pendiente de reunir, comparar y cargar presupuestos.',
  3: 'Pendiente de firmar el presupuesto elegido.',
  4: 'Pendiente de completar sellado y pago para destrabar la compra.',
  5: 'Pendiente de entrega o recepción de los suministros.',
  6: 'Pedido recibido y cerrado.',
  7: 'Pedido rechazado y a la espera de revisión.',
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

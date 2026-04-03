// ── Auth ──────────────────────────────────────────────────────────────
export type UserRole = 'secretaria' | 'compras' | 'tesoreria' | 'admin';

export type AreaMunicipal =
  | 'Administración' | 'Obras Públicas' | 'Sistemas' | 'RRHH'
  | 'Catastro' | 'Intendencia' | 'Turismo' | 'Tesorería' | 'Secretaría';

export const AREAS: AreaMunicipal[] = [
  'Administración', 'Catastro', 'Intendencia', 'RRHH',
  'Obras Públicas', 'Sistemas', 'Tesorería', 'Secretaría', 'Turismo',
];

export interface AuthUser {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  rol: UserRole;
  mustChangePassword: boolean;
  firmaUrl?: string;
  /** Área municipal de referencia del usuario. */
  areaAsignada?: AreaMunicipal | null;
  /**
   * Áreas para las que puede crear pedidos. null/undefined = todas (compatibilidad).
   * [] = ninguna.
   */
  areasPedidoPermitidas?: AreaMunicipal[] | null;
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
  areaAsignada?: AreaMunicipal | null;
  areasPedidoPermitidas?: AreaMunicipal[] | null;
}

export interface CreateUserDto {
  email: string;
  nombre: string;
  apellido: string;
  rol: UserRole;
  password: string;
  areaAsignada?: AreaMunicipal | null;
  areasPedidoPermitidas?: AreaMunicipal[] | null;
}

// ── Pedidos ───────────────────────────────────────────────────────────
export const PedidoStage = {
  APROBACION: 1,
  PRESUPUESTOS: 2,
  FIRMA: 3,
  CARGA_FACTURA: 4,
  GESTION_PAGOS: 5,
  ESPERANDO_SUMINISTROS: 6,
  SUMINISTROS_LISTOS: 7,
  RECHAZADO: 8,
} as const;

export type PedidoStage = (typeof PedidoStage)[keyof typeof PedidoStage];

export const STAGE_LABELS: Record<number, string> = {
  1: 'Aprobación de suministros',
  2: 'Búsqueda de presupuestos',
  3: 'Firma de presupuestos',
  4: 'Carga de factura (Compras)',
  5: 'Gestión de sellos y pagos',
  6: 'Esperando suministros',
  7: 'Suministros entregados',
  8: 'Rechazados',
};

export const STAGE_AREA: Record<number, string> = {
  1: 'Secretaría',
  2: 'Compras',
  3: 'Secretaría',
  4: 'Compras',
  5: 'Tesorería',
  6: 'Administración',
  7: '—',
  8: '—',
};

export const STAGE_OWNER_LABELS: Record<number, string> = {
  1: 'Secretaría',
  2: 'Compras',
  3: 'Secretaría',
  4: 'Compras',
  5: 'Tesorería',
  6: 'Administración / Suministros',
  7: 'Administración',
  8: 'Secretaría / Administración',
};

export const STAGE_HELP_COPY: Record<number, string> = {
  1: 'Pedidos recién cargados que esperan la aprobación inicial de Secretaría para continuar el circuito.',
  2: 'Compras debe buscar proveedores, comparar opciones y cargar los presupuestos de este pedido.',
  3: 'Secretaría revisa los presupuestos cargados y firma la opción elegida para autorizar la compra.',
  4: 'Compras adjunta la factura del proveedor elegido para que Tesorería gestione sellado y pago.',
  5: 'Tesorería registra sellados o pagos y destraba el pedido para que Suministros pueda avanzar.',
  6: 'El pedido ya fue aprobado y pagado; ahora Suministros coordina la recepción o entrega.',
  7: 'Pedidos terminados o recibidos. Ya no requieren acción operativa dentro del circuito normal.',
  8: 'Expedientes cerrados por rechazo de Secretaría. No admiten nuevas acciones en el circuito.',
};

export const STAGE_PENDING_COPY: Record<number, string> = {
  1: 'Pendiente de aprobación inicial.',
  2: 'Pendiente de reunir, comparar y cargar presupuestos.',
  3: 'Pendiente de firmar el presupuesto elegido.',
  4: 'Pendiente de subir la factura del proveedor.',
  5: 'Pendiente de completar sellado y pago para destrabar la compra.',
  6: 'Pendiente de entrega o recepción de los suministros.',
  7: 'Pedido recibido y cerrado.',
  8: 'Cerrado por rechazo. Sin movimiento posible en el flujo.',
};

export const STAGE_ICONS: Record<number, string> = {
  1: '⏳', 2: '🔍', 3: '✍️', 4: '🧾', 5: '🏛️', 6: '📦', 7: '✅', 8: '❌',
};

/**
 * Color por sector responsable de la etapa (badges / KPI):
 * Secretaría → blue · Compras → purple · Tesorería → teal · Admin/suministros activo → sky · Cierre → green · Rechazo → red
 */
export const STAGE_COLORS: Record<number, string> = {
  1: 'blue',
  2: 'purple',
  3: 'blue',
  4: 'purple',
  5: 'teal',
  6: 'sky',
  7: 'green',
  8: 'red',
};

export interface Pedido {
  id: string;
  numero: string;
  descripcion: string;
  cantidad?: string;
  detalle?: string;
  area: AreaMunicipal;
  areaDestino?: AreaMunicipal | null;
  urgente: boolean;
  stage: PedidoStage;
  monto?: number;
  proveedorSeleccionado?: string;
  bloqueado: boolean;
  notaAprobacion?: string;
  notaRechazo?: string;
  /** Si está rechazado: etapa desde la que se rechazó (p. ej. firma → presupuestos rechazados en UI). */
  rechazadoDesdeStage?: number | null;
  /** Imágenes de referencia adjuntas al crear la solicitud. */
  referenciasImagenes?: { url: string; path: string }[] | null;
  creadoPor?: User;
  aprobadoPor?: User;
  firmadoPor?: User;
  firmaUrlUsada?: string;
  firmaHash?: string;
  firmadoEn?: string;
  ordenCompraNumero?: string;
  ordenCompraUrl?: string;
  facturaComprasUrl?: string;
  facturaSubidaPor?: User;
  facturaSubidaEn?: string;
  fechaLimitePago?: string;
  recepcionConfirmadaPor?: User;
  recepcionEn?: string;
  createdAt: string;
  updatedAt: string;
  /** Fecha en que el pedido fue archivado. NULL = activo en el kanban. */
  archivedAt?: string | null;
  /** Cantidad de presupuestos cargados (viene del listado de pedidos). */
  presupuestosCargados?: number;
}

// ── Proveedores (catálogo) ────────────────────────────────────────────
export interface Proveedor {
  id: string;
  nombre: string;
  nombreFantasia?: string;
  cuit?: string;
  condicionIva?: string;
  domicilioCalle?: string;
  localidad?: string;
  provincia?: string;
  codigoPostal?: string;
  telefono?: string;
  email?: string;
  contacto?: string;
  notas?: string;
  createdAt: string;
}

export interface CreateProveedorDto {
  nombre: string;
  nombreFantasia?: string;
  cuit?: string;
  condicionIva?: string;
  domicilioCalle?: string;
  localidad?: string;
  provincia?: string;
  codigoPostal?: string;
  telefono?: string;
  email?: string;
  contacto?: string;
  notas?: string;
}

export type UpdateProveedorDto = Partial<CreateProveedorDto>;

export type FacturaAsociadaTipo = 'factura_compras' | 'factura_pago' | 'cotizacion';

/** Facturas y cotizaciones vinculadas a un proveedor (por nombre en pedidos/presupuestos). */
export interface FacturaAsociada {
  tipo: FacturaAsociadaTipo;
  pedidoId: string;
  pedidoNumero: string;
  descripcion: string;
  url: string;
  fecha: string;
  monto?: number;
  etiqueta: string;
}

export interface ProveedorComentario {
  id: string;
  proveedorId: string;
  usuarioId: string;
  texto: string;
  createdAt: string;
  usuario?: User;
}

export interface PedidoComentario {
  id: string;
  pedidoId: string;
  usuarioId: string;
  texto: string;
  createdAt: string;
  usuario?: User;
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

// ── Finanzas ───────────────────────────────────────────────────────────
export interface GastoFinanzas {
  id: string;
  pedidoId: string;
  pedidoNumero: string;
  descripcion: string;
  area: AreaMunicipal;
  proveedor: string;
  fechaPago: string;
  mes: string;
  montoPagado: number;
  numeroTransferencia: string;
  facturaUrl?: string | null;
}

export interface FinanzasResumenPorMes {
  mes: string;
  total: number;
}

export interface FinanzasResumenPorArea {
  area: AreaMunicipal;
  mes: string;
  total: number;
}

export interface FinanzasResumenPorProveedor {
  proveedor: string;
  mes: string;
  total: number;
}

export interface FinanzasResumen {
  year: number;
  filters: {
    area: AreaMunicipal | null;
    proveedor: string | null;
  };
  totalGastado: number;
  cantidadPagos: number;
  areaMayorGasto: { area: AreaMunicipal; total: number } | null;
  proveedorMayorGasto: { proveedor: string; total: number } | null;
  porMes: FinanzasResumenPorMes[];
  porArea: FinanzasResumenPorArea[];
  porProveedor: FinanzasResumenPorProveedor[];
}

// ── Config ────────────────────────────────────────────────────────────
export interface SistemaConfig {
  id: string;
  umbralSellado: number;
  minPresupuestos: number;
  /** Máximo de cotizaciones por pedido (tope). */
  maxPresupuestos: number;
  bloquearPagoSinSellado: boolean;
  nombreMunicipalidad: string;
  cuitInstitucional?: string;
  updatedAt: string;
}

import api from './client';
import type {
  LoginResponse, Pedido, Presupuesto, Proveedor, ProveedorComentario, PedidoComentario, FacturaAsociada,
  CreateProveedorDto, UpdateProveedorDto,
  Sellado, Pago, User,
  SistemaConfig, CreateUserDto, UserRole, FinanzasResumen, GastoFinanzas,
} from '../types';

// ── AUTH ──────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }).then(r => r.data),
  demo: (rol: UserRole) =>
    api.post<LoginResponse>('/auth/demo', { rol }).then(r => r.data),
};

// ── USERS ─────────────────────────────────────────────────────────────
export const usersApi = {
  getAll: () => api.get<User[]>('/users').then(r => r.data),
  getMe: () => api.get<User>('/users/me').then(r => r.data),
  create: (dto: CreateUserDto) => api.post<User>('/users', dto).then(r => r.data),
  update: (id: string, dto: Partial<User>) => api.put<User>(`/users/${id}`, dto).then(r => r.data),
  resetPassword: (id: string, newPassword: string) =>
    api.post(`/users/${id}/reset-password`, { newPassword }).then(r => r.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/users/me/change-password', { currentPassword, newPassword }).then(r => r.data),
  uploadFirma: (file: File) => {
    const form = new FormData();
    form.append('firma', file);
    return api.post<{ firmaUrl: string }>('/users/me/firma', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
  activate: (id: string) => api.patch(`/users/${id}/activate`).then(r => r.data),
  deactivate: (id: string) => api.patch(`/users/${id}/deactivate`).then(r => r.data),
};

// ── PEDIDOS ───────────────────────────────────────────────────────────
export const pedidosApi = {
  getAll: (params?: { stage?: number; area?: string; urgente?: boolean; includeArchived?: boolean }) =>
    api.get<Pedido[]>('/pedidos', { params }).then(r => r.data),
  archivar: (id: string) => api.patch<Pedido>(`/pedidos/${id}/archivar`).then(r => r.data),
  desarchivar: (id: string) => api.patch<Pedido>(`/pedidos/${id}/desarchivar`).then(r => r.data),
  getAllAdmin: (params?: object) =>
    api.get<Pedido[]>('/pedidos/todos', { params }).then(r => r.data),
  getStats: () => api.get('/pedidos/stats').then(r => r.data),
  getById: (id: string) => api.get<Pedido>(`/pedidos/${id}`).then(r => r.data),
  create: (
    dto: { descripcion: string; cantidad?: string; detalle?: string; area: string; urgente?: boolean },
    referencias?: File[],
  ) => {
    const form = new FormData();
    form.append('descripcion', dto.descripcion);
    form.append('area', dto.area);
    if (dto.cantidad != null && dto.cantidad !== '') form.append('cantidad', dto.cantidad);
    if (dto.detalle != null && dto.detalle !== '') form.append('detalle', dto.detalle);
    form.append('urgente', dto.urgente ? 'true' : 'false');
    referencias?.forEach((file) => form.append('referencias', file));
    return api.post<Pedido>('/pedidos', form).then((r) => r.data);
  },
  aprobar: (id: string, nota?: string) =>
    api.patch<Pedido>(`/pedidos/${id}/aprobar`, { nota }).then(r => r.data),
  rechazar: (id: string, motivo: string) =>
    api.patch<Pedido>(`/pedidos/${id}/rechazar`, { motivo }).then(r => r.data),
  enviarFirma: (id: string) =>
    api.patch<Pedido>(`/pedidos/${id}/enviar-firma`).then(r => r.data),
  seleccionarPresupuesto: (id: string, presupuestoId: string) =>
    api.patch<Pedido>(`/pedidos/${id}/seleccionar-presupuesto/${presupuestoId}`).then(r => r.data),
  firmar: (id: string, body: { presupuestoId: string; nota?: string }) =>
    api.patch<Pedido>(`/pedidos/${id}/firmar`, body).then(r => r.data),
  rechazarPresupuesto: (id: string, motivo: string) =>
    api.patch<Pedido>(`/pedidos/${id}/rechazar-presupuesto`, { motivo }).then(r => r.data),
  confirmarRecepcion: (id: string, nota?: string) =>
    api.patch<Pedido>(`/pedidos/${id}/confirmar-recepcion`, { nota }).then(r => r.data),
  subirFactura: (id: string, factura: File, fechaLimitePago?: string) => {
    const form = new FormData();
    form.append('factura', factura);
    if (fechaLimitePago) form.append('fechaLimitePago', fechaLimitePago);
    return api.patch<Pedido>(`/pedidos/${id}/subir-factura`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
  getOrdenCompra: (id: string) =>
    api.get<{ numero: string; url: string; available: boolean }>(`/pedidos/${id}/orden-compra`).then(r => r.data),
  getComentarios: (pedidoId: string) =>
    api.get<PedidoComentario[]>(`/pedidos/${pedidoId}/comentarios`).then(r => r.data),
  addComentario: (pedidoId: string, texto: string) =>
    api.post<PedidoComentario>(`/pedidos/${pedidoId}/comentarios`, { texto }).then(r => r.data),
};

// ── PROVEEDORES ───────────────────────────────────────────────────────
export const proveedoresApi = {
  getAll: () => api.get<Proveedor[]>('/proveedores').then(r => r.data),
  getById: (id: string) => api.get<Proveedor>(`/proveedores/${id}`).then(r => r.data),
  getFacturas: (id: string) =>
    api.get<FacturaAsociada[]>(`/proveedores/${id}/facturas`).then(r => r.data),
  getComentarios: (id: string) =>
    api.get<ProveedorComentario[]>(`/proveedores/${id}/comentarios`).then(r => r.data),
  addComentario: (id: string, texto: string) =>
    api.post<ProveedorComentario>(`/proveedores/${id}/comentarios`, { texto }).then(r => r.data),
  create: (dto: CreateProveedorDto) =>
    api.post<Proveedor>('/proveedores', dto).then(r => r.data),
  update: (id: string, dto: UpdateProveedorDto) =>
    api.patch<Proveedor>(`/proveedores/${id}`, dto).then(r => r.data),
  remove: (id: string) =>
    api.delete<{ deleted: true; id: string }>(`/proveedores/${id}`).then(r => r.data),
};

// ── PRESUPUESTOS ──────────────────────────────────────────────────────
export const presupuestosApi = {
  getByPedido: (pedidoId: string) =>
    api.get<Presupuesto[]>(`/pedidos/${pedidoId}/presupuestos`).then(r => r.data),
  create: (pedidoId: string, dto: object, archivo?: File) => {
    const form = new FormData();
    Object.entries(dto).forEach(([k, v]) => { if (v != null && v !== '') form.append(k, String(v)); });
    if (archivo) form.append('archivo', archivo);
    // No fijar Content-Type: el navegador debe enviar multipart con boundary (evita cuerpo vacío en el servidor).
    return api.post<Presupuesto>(`/pedidos/${pedidoId}/presupuestos`, form).then(r => r.data);
  },
  delete: (pedidoId: string, id: string) =>
    api.delete(`/pedidos/${pedidoId}/presupuestos/${id}`).then(r => r.data),
};

// ── SELLADOS ──────────────────────────────────────────────────────────
export const selladosApi = {
  getByPedido: (pedidoId: string) =>
    api.get<Sellado | null>(`/pedidos/${pedidoId}/sellado`).then(r => r.data),
  registrar: (pedidoId: string, dto: { numeroSellado: string; fechaSellado: string; montoSellado: number }, comprobante?: File) => {
    const form = new FormData();
    Object.entries(dto).forEach(([k, v]) => form.append(k, String(v)));
    if (comprobante) form.append('comprobante', comprobante);
    return api.post<Sellado>(`/pedidos/${pedidoId}/sellado`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
};

// ── PAGOS ─────────────────────────────────────────────────────────────
export const pagosApi = {
  getByPedido: (pedidoId: string) =>
    api.get<Pago | null>(`/pedidos/${pedidoId}/pago`).then(r => r.data),
  getAll: () => api.get<Pago[]>('/pagos').then(r => r.data),
  registrar: (pedidoId: string, dto: { numeroTransferencia: string; fechaPago: string; montoPagado: number }, factura?: File) => {
    const form = new FormData();
    Object.entries(dto).forEach(([k, v]) => form.append(k, String(v)));
    if (factura) form.append('factura', factura);
    return api.post<Pago>(`/pedidos/${pedidoId}/pago`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
};

// ── FINANZAS ──────────────────────────────────────────────────────────
export const finanzasApi = {
  getResumen: (params?: { year?: number; area?: string; proveedor?: string }) =>
    api.get<FinanzasResumen>('/finanzas/resumen', { params }).then(r => r.data),
  getGastos: (params?: { year?: number; area?: string; proveedor?: string }) =>
    api.get<GastoFinanzas[]>('/finanzas/gastos', { params }).then(r => r.data),
};

// ── CONFIG ────────────────────────────────────────────────────────────
export const configApi = {
  get: () => api.get<SistemaConfig>('/config').then(r => r.data),
  update: (dto: Partial<SistemaConfig>) =>
    api.put<SistemaConfig>('/config', dto).then(r => r.data),
};

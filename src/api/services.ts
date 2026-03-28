import api from './client';
import type {
  LoginResponse, Pedido, Presupuesto, Sellado, Pago, User,
  SistemaConfig, CreateUserDto, UserRole,
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
  getAll: (params?: { stage?: number; area?: string; urgente?: boolean }) =>
    api.get<Pedido[]>('/pedidos', { params }).then(r => r.data),
  getAllAdmin: (params?: object) =>
    api.get<Pedido[]>('/pedidos/todos', { params }).then(r => r.data),
  getStats: () => api.get('/pedidos/stats').then(r => r.data),
  getById: (id: string) => api.get<Pedido>(`/pedidos/${id}`).then(r => r.data),
  create: (dto: { descripcion: string; cantidad?: string; detalle?: string; area: string; urgente?: boolean }) =>
    api.post<Pedido>('/pedidos', dto).then(r => r.data),
  aprobar: (id: string, nota?: string) =>
    api.patch<Pedido>(`/pedidos/${id}/aprobar`, { nota }).then(r => r.data),
  rechazar: (id: string, motivo: string) =>
    api.patch<Pedido>(`/pedidos/${id}/rechazar`, { motivo }).then(r => r.data),
  enviarFirma: (id: string) =>
    api.patch<Pedido>(`/pedidos/${id}/enviar-firma`).then(r => r.data),
  seleccionarPresupuesto: (id: string, presupuestoId: string) =>
    api.patch<Pedido>(`/pedidos/${id}/seleccionar-presupuesto/${presupuestoId}`).then(r => r.data),
  firmar: (id: string, nota?: string) =>
    api.patch<Pedido>(`/pedidos/${id}/firmar`, { nota }).then(r => r.data),
  rechazarPresupuesto: (id: string, motivo: string) =>
    api.patch<Pedido>(`/pedidos/${id}/rechazar-presupuesto`, { motivo }).then(r => r.data),
  confirmarRecepcion: (id: string, nota?: string) =>
    api.patch<Pedido>(`/pedidos/${id}/confirmar-recepcion`, { nota }).then(r => r.data),
};

// ── PRESUPUESTOS ──────────────────────────────────────────────────────
export const presupuestosApi = {
  getByPedido: (pedidoId: string) =>
    api.get<Presupuesto[]>(`/pedidos/${pedidoId}/presupuestos`).then(r => r.data),
  create: (pedidoId: string, dto: object, archivo?: File) => {
    const form = new FormData();
    Object.entries(dto).forEach(([k, v]) => { if (v != null) form.append(k, String(v)); });
    if (archivo) form.append('archivo', archivo);
    return api.post<Presupuesto>(`/pedidos/${pedidoId}/presupuestos`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
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

// ── CONFIG ────────────────────────────────────────────────────────────
export const configApi = {
  get: () => api.get<SistemaConfig>('/config').then(r => r.data),
  update: (dto: Partial<SistemaConfig>) =>
    api.put<SistemaConfig>('/config', dto).then(r => r.data),
};

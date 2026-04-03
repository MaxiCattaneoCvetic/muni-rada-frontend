import api from './client';

export type TipoReporte =
  | 'error_sistema'
  | 'datos_incorrectos'
  | 'acceso'
  | 'lentitud'
  | 'interfaz'
  | 'otro';

export type PrioridadReporte = 'baja' | 'media' | 'alta';
export type EstadoReporte =
  | 'pendiente'
  | 'en_proceso'
  | 'solucionado'
  | 'cerrado'
  | 'abierto'   // legacy
  | 'resuelto'; // legacy

export interface Reporte {
  id: string;
  tipo: TipoReporte;
  descripcion: string;
  prioridad: PrioridadReporte;
  estado: EstadoReporte;
  screenshotUrl?: string | null;
  notaAdmin?: string | null;
  reportadoPor?: { id: string; nombre: string; apellido: string; email: string } | null;
  createdAt: string;
}

export interface Mensaje {
  id: string;
  reporteId: string;
  contenido: string;
  esAdmin: boolean;
  autorId: string;
  autor?: { id: string; nombre: string; apellido: string; email: string } | null;
  createdAt: string;
}

export interface CreateReportePayload {
  tipo: TipoReporte;
  descripcion: string;
  prioridad: PrioridadReporte;
  screenshot?: File | null;
}

export const reportesApi = {
  create: (payload: CreateReportePayload) => {
    const form = new FormData();
    form.append('tipo', payload.tipo);
    form.append('descripcion', payload.descripcion);
    form.append('prioridad', payload.prioridad);
    if (payload.screenshot) {
      form.append('screenshot', payload.screenshot);
    }
    return api.post<Reporte>('/reportes', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getAll: () => api.get<Reporte[]>('/reportes').then((r) => r.data),

  getMios: () => api.get<Reporte[]>('/reportes/mis-reportes').then((r) => r.data),

  updateEstado: (id: string, estado: EstadoReporte, notaAdmin?: string) =>
    api.patch<Reporte>(`/reportes/${id}/estado`, { estado, notaAdmin }).then((r) => r.data),

  getMensajes: (reporteId: string) =>
    api.get<Mensaje[]>(`/reportes/${reporteId}/mensajes`).then((r) => r.data),

  postMensaje: (reporteId: string, contenido: string) =>
    api.post<Mensaje>(`/reportes/${reporteId}/mensajes`, { contenido }).then((r) => r.data),
};

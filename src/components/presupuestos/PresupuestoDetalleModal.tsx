import { useEffect, type ReactNode } from 'react';
import type { Presupuesto, User } from '../../types';
import { formatMoney, formatDate } from '../../lib/utils';
import { X, FileText, Calendar, Building2, Banknote, Clock, Mail, Trash2 } from 'lucide-react';

function nombreCargadoPor(u?: User) {
  if (!u) return '—';
  return u.nombreCompleto || [u.nombre, u.apellido].filter(Boolean).join(' ') || '—';
}

export interface PresupuestoDetalleModalProps {
  presupuesto: Presupuesto;
  pedidoNumero: string;
  pedidoDescripcion: string;
  index: number;
  onClose: () => void;
  /** Si se pasa, muestra botón eliminar */
  onDelete?: () => void;
  deletePending?: boolean;
  /** Marca cuando coincide con el proveedor elegido del pedido */
  isSeleccionado?: boolean;
  /** Menor monto entre las cotizaciones del pedido (puede haber empate). */
  isMenorValor?: boolean;
}

export function PresupuestoDetalleModal({
  presupuesto: p,
  pedidoNumero,
  pedidoDescripcion,
  index,
  onClose,
  onDelete,
  deletePending,
  isSeleccionado,
  isMenorValor,
}: PresupuestoDetalleModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const row = (icon: ReactNode, label: string, value: ReactNode) => (
    <div className="flex gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="shrink-0 w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 [&_svg]:shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
        <div className="text-sm font-semibold text-slate-900 mt-0.5 break-words">{value}</div>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-5 backdrop-blur-sm"
      style={{ background: 'rgba(15,23,42,.55)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl"
        style={{
          background: 'var(--white)',
          borderRadius: '20px',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid rgba(255,255,255,.8)',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="presupuesto-detalle-titulo"
      >
        <div
          className="px-5 py-4 border-b flex items-start justify-between gap-3 flex-shrink-0 sticky top-0 z-10"
          style={{
            borderBottom: '1px solid var(--border)',
            background: 'linear-gradient(135deg, #ecfdf5 0%, #fff 55%)',
          }}
        >
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Presupuesto #{index}</div>
            <h3 id="presupuesto-detalle-titulo" className="font-extrabold text-slate-900 text-lg mt-0.5 leading-tight break-words">
              {p.proveedor}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {pedidoNumero} · {pedidoDescripcion}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text2)',
            }}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {(isSeleccionado || isMenorValor) && (
          <div className="px-5 pt-3 flex flex-wrap gap-2">
            {isMenorValor && (
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-full">
                Menor valor
              </div>
            )}
            {isSeleccionado && (
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-green-800 bg-green-100 border border-green-200 px-3 py-1.5 rounded-full">
                ✅ Cotización seleccionada para la compra
              </div>
            )}
          </div>
        )}

        <div className="px-5 py-2">
          <div
            className="rounded-2xl p-4 mb-2 flex items-center justify-between gap-3"
            style={{ background: 'linear-gradient(135deg, #dbeafe, #eff6ff)', border: '1px solid #bfdbfe' }}
          >
            <div className="flex items-center gap-2 text-blue-900">
              <Banknote size={22} strokeWidth={2.2} />
              <span className="text-xs font-bold uppercase tracking-wide">Monto cotizado</span>
            </div>
            <span className="font-mono font-black text-2xl text-blue-950 tabular-nums">{formatMoney(p.monto)}</span>
          </div>

          <div className="rounded-xl px-1" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
            {row(<Calendar size={16} />, 'Fecha de carga', formatDate(p.createdAt))}
            {p.plazoEntrega && row(<Clock size={16} />, 'Plazo de entrega', p.plazoEntrega)}
            {p.cuit && row(<Building2 size={16} />, 'CUIT', p.cuit)}
            {p.contacto && row(<Mail size={16} />, 'Contacto', p.contacto)}
            {p.notas && row(<FileText size={16} />, 'Notas', <span className="whitespace-pre-wrap font-normal">{p.notas}</span>)}
            {row(<span className="text-sm">👤</span>, 'Cargado por', nombreCargadoPor(p.cargadoPor))}
          </div>

          <div className="mt-4 rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2">Documento</div>
            {p.archivoUrl ? (
              <a href={p.archivoUrl} target="_blank" rel="noreferrer" className="doc-link inline-flex items-center gap-2 font-semibold">
                <FileText size={16} /> Abrir PDF del presupuesto
              </a>
            ) : (
              <p className="text-sm text-slate-500 m-0">No hay PDF adjunto para esta cotización.</p>
            )}
          </div>
        </div>

        <div
          className="px-5 py-4 flex flex-wrap gap-2 justify-end border-t"
          style={{ borderColor: 'var(--border)', background: 'linear-gradient(180deg, #fafbfd, #fff)' }}
        >
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cerrar
          </button>
          {onDelete && (
            <button
              type="button"
              className="btn btn-danger gap-1"
              disabled={deletePending}
              onClick={onDelete}
            >
              <Trash2 size={14} /> Eliminar presupuesto
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

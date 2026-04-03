import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { proveedoresApi, presupuestosApi } from '../../api/services';
import { X, Building2 } from 'lucide-react';
import { ButtonSpinner } from '../ui/loading';

const NUEVO_VALUE = '__nuevo__';

function formatApiError(e: unknown): string {
  const any = e as { response?: { data?: { message?: string | string[] } }; message?: string };
  const m = any.response?.data?.message;
  if (Array.isArray(m)) return m.join(' ');
  if (typeof m === 'string' && m) return m;
  return any.message || 'Error';
}

export interface PresupuestoCargaModalProps {
  open: boolean;
  onClose: () => void;
  pedidoId: string;
  pedidoNumero: string;
  pedidoDescripcion: string;
  /** Orden del presupuesto (1-based), ej. si ya hay 2, este es el 3. */
  indicePresupuesto: number;
  onSaved: () => void;
}

export function PresupuestoCargaModal({
  open,
  onClose,
  pedidoId,
  pedidoNumero,
  pedidoDescripcion,
  indicePresupuesto,
  onSaved,
}: PresupuestoCargaModalProps) {
  const qc = useQueryClient();
  const { data: proveedores = [] } = useQuery({
    queryKey: ['proveedores'],
    queryFn: () => proveedoresApi.getAll(),
    enabled: open,
    staleTime: 30_000,
  });

  const [proveedorSelect, setProveedorSelect] = useState('');
  const [nuevo, setNuevo] = useState({ nombre: '', cuit: '', contacto: '' });
  const [form, setForm] = useState({ monto: '', plazoEntrega: '', contacto: '', cuit: '', notas: '' });
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setProveedorSelect('');
    setNuevo({ nombre: '', cuit: '', contacto: '' });
    setForm({ monto: '', plazoEntrega: '', contacto: '', cuit: '', notas: '' });
    setArchivo(null);
    setError('');
    setSaving(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, saving, onClose]);

  const esNuevo = proveedorSelect === NUEVO_VALUE;

  const onChangeProveedorSelect = (v: string) => {
    setProveedorSelect(v);
    setError('');
    if (v === '' || v === NUEVO_VALUE) {
      setForm((f) => ({ ...f, contacto: '', cuit: '' }));
      return;
    }
    const p = proveedores.find((x) => x.id === v);
    if (p) {
      setForm((f) => ({
        ...f,
        contacto: p.contacto || '',
        cuit: p.cuit || '',
      }));
    }
  };

  const handleGuardar = async () => {
    setError('');
    let nombreProveedor = '';
    let cuitPresupuesto = form.cuit.trim() || undefined;
    let contactoFallback = '';

    if (!proveedorSelect) {
      setError('Elegí un proveedor del listado o la opción para crear uno nuevo.');
      return;
    }

    if (!form.monto?.toString().trim()) {
      setError('Completá el monto cotizado.');
      return;
    }

    if (esNuevo) {
      const n = nuevo.nombre.trim();
      if (!n) {
        setError('Completá el nombre del nuevo proveedor para registrarlo en el catálogo.');
        return;
      }
      try {
        setSaving(true);
        const created = await proveedoresApi.create({
          nombre: n,
          cuit: nuevo.cuit.trim() || undefined,
          contacto: nuevo.contacto.trim() || undefined,
        });
        await qc.invalidateQueries({ queryKey: ['proveedores'] });
        nombreProveedor = created.nombre;
        cuitPresupuesto =
          created.cuit?.trim() || nuevo.cuit.trim() || form.cuit.trim() || undefined;
        contactoFallback = created.contacto?.trim() || nuevo.contacto.trim();
      } catch (e) {
        setError(formatApiError(e));
        setSaving(false);
        return;
      }
    } else {
      const p = proveedores.find((x) => x.id === proveedorSelect);
      if (!p) {
        setError('Proveedor no encontrado. Volvé a elegir.');
        return;
      }
      nombreProveedor = p.nombre;
      contactoFallback = p.contacto?.trim() || '';
    }

    const contactoFin = form.contacto.trim() || contactoFallback || undefined;
    const dto = {
      proveedor: nombreProveedor,
      monto: form.monto,
      plazoEntrega: form.plazoEntrega.trim() || undefined,
      contacto: contactoFin,
      cuit: cuitPresupuesto,
      notas: form.notas.trim() || undefined,
    };

    try {
      setSaving(true);
      await presupuestosApi.create(pedidoId, dto, archivo || undefined);
      onSaved();
      onClose();
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-5 backdrop-blur-sm"
      style={{ background: 'rgba(15,23,42,.55)' }}
      onClick={(e) => e.target === e.currentTarget && !saving && onClose()}
      role="presentation"
    >
      <div
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto flex flex-col shadow-2xl"
        style={{
          background: 'var(--white)',
          borderRadius: '20px',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid rgba(255,255,255,.8)',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="presupuesto-carga-titulo"
      >
        <div
          className="px-5 py-4 border-b flex items-start justify-between gap-3 shrink-0 sticky top-0 z-10"
          style={{
            borderBottom: '1px solid var(--border)',
            background: 'linear-gradient(135deg, #dbeafe 0%, #fff 50%)',
          }}
        >
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
              <Building2 size={14} /> Nueva cotización
            </div>
            <h3 id="presupuesto-carga-titulo" className="font-extrabold text-slate-900 text-lg mt-0.5">
              Presupuesto #{indicePresupuesto}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {pedidoNumero} · {pedidoDescripcion}
            </p>
          </div>
          <button
            type="button"
            onClick={() => !saving && onClose()}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
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

        <div className="px-5 py-4 space-y-4">
          {error && <div className="alert alert-danger mb-0">{error}</div>}

          <div>
            <label className="label">Proveedor *</label>
            <select
              className="input"
              value={proveedorSelect}
              onChange={(e) => onChangeProveedorSelect(e.target.value)}
            >
              <option value="">— Elegí del catálogo —</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}{p.cuit ? ` · ${p.cuit}` : ''}
                </option>
              ))}
              <option value={NUEVO_VALUE}>+ Crear proveedor nuevo…</option>
            </select>
            <p className="text-xs text-slate-400 mt-1">
              Los proveedores se guardan en el sistema para reutilizarlos en futuras cotizaciones.
            </p>
          </div>

          {esNuevo && (
            <div
              className="rounded-xl p-4 space-y-3 border-2 border-dashed"
              style={{ borderColor: '#93c5fd', background: 'linear-gradient(135deg,#eff6ff,#fff)' }}
            >
              <div className="text-xs font-bold text-blue-800 uppercase tracking-wide">Alta rápida en catálogo</div>
              <div>
                <label className="label">Nombre / razón social *</label>
                <input
                  className="input"
                  value={nuevo.nombre}
                  onChange={(e) => setNuevo((n) => ({ ...n, nombre: e.target.value }))}
                  placeholder="Ej: Ferretería del Centro"
                />
              </div>
              <div>
                <label className="label">CUIT</label>
                <input
                  className="input"
                  value={nuevo.cuit}
                  onChange={(e) => setNuevo((n) => ({ ...n, cuit: e.target.value }))}
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label className="label">Contacto</label>
                <input
                  className="input"
                  value={nuevo.contacto}
                  onChange={(e) => setNuevo((n) => ({ ...n, contacto: e.target.value }))}
                  placeholder="Teléfono o email"
                />
              </div>
            </div>
          )}

          {!esNuevo && proveedorSelect && (
            <div>
              <label className="label">CUIT (para esta cotización)</label>
              <input
                className="input"
                value={form.cuit}
                onChange={(e) => setForm((f) => ({ ...f, cuit: e.target.value }))}
                placeholder="Se completa desde el catálogo; podés editar"
              />
            </div>
          )}

          <div>
            <label className="label">Monto ($) *</label>
            <input
              type="number"
              className="input"
              value={form.monto}
              onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
              placeholder="0"
            />
          </div>
          <div>
            <label className="label">Plazo de entrega</label>
            <input
              className="input"
              value={form.plazoEntrega}
              onChange={(e) => setForm((f) => ({ ...f, plazoEntrega: e.target.value }))}
              placeholder="Ej: 15 días hábiles"
            />
          </div>
          <div>
            <label className="label">Contacto de la cotización</label>
            <input
              className="input"
              value={form.contacto}
              onChange={(e) => setForm((f) => ({ ...f, contacto: e.target.value }))}
              placeholder="Email o teléfono (podés sobrescribir el del catálogo)"
            />
          </div>
          <div>
            <label className="label">Notas</label>
            <textarea
              value={form.notas}
              onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
              className="input resize-none"
              rows={2}
            />
          </div>
          <div>
            <label className="label">PDF del presupuesto</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setArchivo(e.target.files?.[0] || null)}
              className="input py-2 text-sm"
            />
          </div>
        </div>

        <div
          className="px-5 py-4 flex flex-wrap gap-2 justify-end border-t sticky bottom-0"
          style={{ borderColor: 'var(--border)', background: 'linear-gradient(180deg, #fafbfd, #fff)' }}
        >
          <button type="button" className="btn btn-ghost" disabled={saving} onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary gap-1" disabled={saving} onClick={handleGuardar}>
            {saving ? <ButtonSpinner label="Guardando" /> : '✅ Guardar cotización'}
          </button>
        </div>
      </div>
    </div>
  );
}

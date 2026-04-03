import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, AlertCircle, Upload, ImageIcon, CheckCircle2 } from 'lucide-react';
import { reportesApi, type TipoReporte, type PrioridadReporte } from '../../api/reportes';
import { ButtonSpinner } from '../ui/loading';

interface Props {
  onClose: () => void;
}

const TIPOS: { value: TipoReporte; label: string }[] = [
  { value: 'error_sistema', label: 'Error de sistema' },
  { value: 'datos_incorrectos', label: 'Datos incorrectos' },
  { value: 'acceso', label: 'Problema de acceso' },
  { value: 'lentitud', label: 'Lentitud' },
  { value: 'interfaz', label: 'Interfaz/visual' },
  { value: 'otro', label: 'Otro' },
];

const PRIORIDADES: { value: PrioridadReporte; label: string; style: React.CSSProperties; activeStyle: React.CSSProperties }[] = [
  {
    value: 'baja',
    label: 'Baja',
    style: { background: 'var(--surface)', border: '1.5px solid var(--border)', color: 'var(--text2)' },
    activeStyle: { background: 'var(--surface2)', border: '1.5px solid var(--text3)', color: 'var(--text)' },
  },
  {
    value: 'media',
    label: 'Media',
    style: { background: 'var(--amber-lt)', border: '1.5px solid var(--amber-brd)', color: 'var(--amber)' },
    activeStyle: { background: 'var(--amber-lt)', border: '2px solid var(--amber-mid)', color: 'var(--amber)', fontWeight: 800 },
  },
  {
    value: 'alta',
    label: 'Alta',
    style: { background: 'var(--red-lt)', border: '1.5px solid var(--red-brd)', color: 'var(--red)' },
    activeStyle: { background: 'var(--red-lt)', border: '2px solid var(--red-mid)', color: 'var(--red)', fontWeight: 800 },
  },
];

export function ReportarProblemaModal({ onClose }: Props) {
  const [tipo, setTipo] = useState<TipoReporte>('error_sistema');
  const [descripcion, setDescripcion] = useState('');
  const [prioridad, setPrioridad] = useState<PrioridadReporte>('media');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleFile = (file: File | null) => {
    setScreenshot(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const mut = useMutation({
    mutationFn: () => reportesApi.create({ tipo, descripcion, prioridad, screenshot }),
    onSuccess: () => setSuccess(true),
    onError: (e: any) =>
      setError(e.response?.data?.message || 'No se pudo enviar el reporte. Intentá de nuevo.'),
  });

  const submit = () => {
    setError('');
    if (!descripcion.trim()) {
      setError('La descripción es obligatoria.');
      return;
    }
    mut.mutate();
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-5"
      style={{ background: 'rgba(15,23,42,.55)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-[500px] max-h-[92dvh] overflow-y-auto flex flex-col"
        style={{
          background: 'var(--white)',
          borderRadius: '20px 20px 0 0',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid rgba(255,255,255,.8)',
        }}
        // desktop rounded bottom too
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderRadius = '20px';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderRadius = '20px 20px 0 0';
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex items-start justify-between gap-3 flex-shrink-0 sticky top-0 z-10"
          style={{
            borderBottom: '1px solid var(--border)',
            background: 'linear-gradient(135deg, #fff, #fafbfd)',
            borderRadius: '20px 20px 0 0',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ background: 'var(--amber-lt)', border: '1px solid var(--amber-brd)' }}
            >
              <AlertCircle size={18} style={{ color: 'var(--amber)' }} />
            </div>
            <div>
              <h3
                className="font-extrabold"
                style={{ fontSize: '15px', color: 'var(--text)', letterSpacing: '-.2px' }}
              >
                Reportar un problema
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '1px' }}>
                Nos ayuda a mejorar el sistema
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-[30px] h-[30px] rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer transition-all"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text2)',
              boxShadow: 'var(--shadow-xs)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--red-lt)';
              e.currentTarget.style.color = 'var(--red)';
              e.currentTarget.style.borderColor = 'var(--red-brd)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--surface)';
              e.currentTarget.style.color = 'var(--text2)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 flex-1">
          {success ? (
            <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ background: 'var(--green-lt)', border: '1px solid var(--green-brd)' }}
              >
                <CheckCircle2 size={32} style={{ color: 'var(--green-mid)' }} />
              </div>
              <div>
                <p
                  className="font-extrabold"
                  style={{ fontSize: '16px', color: 'var(--text)', letterSpacing: '-.2px' }}
                >
                  Reporte enviado
                </p>
                <p className="mt-1" style={{ fontSize: '13px', color: 'var(--text2)' }}>
                  Gracias. Lo revisaremos pronto.
                </p>
              </div>
            </div>
          ) : (
            <>
              {error && <div className="alert alert-danger">{error}</div>}

              {/* Tipo */}
              <div>
                <label className="label">Tipo de problema *</label>
                <select
                  className="input"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoReporte)}
                >
                  {TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Descripcion */}
              <div>
                <label className="label">Descripción *</label>
                <textarea
                  className="input resize-none"
                  rows={4}
                  placeholder="Describí el problema con el mayor detalle posible: qué estabas haciendo, qué pasó, cómo debería funcionar..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              </div>

              {/* Prioridad */}
              <div>
                <label className="label">Prioridad</label>
                <div className="flex gap-2">
                  {PRIORIDADES.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPrioridad(p.value)}
                      className="flex-1 py-2 rounded-lg font-bold transition-all active:scale-95"
                      style={{
                        fontSize: '12px',
                        ...(prioridad === p.value ? p.activeStyle : p.style),
                        boxShadow: prioridad === p.value ? 'var(--shadow-xs)' : 'none',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Screenshot */}
              <div>
                <label className="label">Screenshot — opcional</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                />
                {previewUrl ? (
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Screenshot"
                      className="w-full rounded-xl object-cover"
                      style={{
                        maxHeight: '180px',
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-xs)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleFile(null)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{
                        background: 'rgba(15,23,42,.65)',
                        backdropFilter: 'blur(4px)',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,.2)',
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full flex flex-col items-center gap-2 py-5 rounded-xl transition-all"
                    style={{
                      border: '1.5px dashed var(--border2)',
                      background: 'var(--surface)',
                      color: 'var(--text3)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--blue-mid)';
                      e.currentTarget.style.background = 'var(--blue-lt)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border2)';
                      e.currentTarget.style.background = 'var(--surface)';
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <ImageIcon size={16} />
                      <Upload size={14} />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>
                      Adjuntar imagen
                    </span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3.5 flex gap-2 justify-end flex-shrink-0 sticky bottom-0"
          style={{
            borderTop: '1px solid var(--border)',
            background: 'var(--white)',
          }}
        >
          <button onClick={onClose} className="btn btn-ghost">
            {success ? 'Cerrar' : 'Cancelar'}
          </button>
          {!success && (
            <button
              onClick={submit}
              disabled={mut.isPending || !descripcion.trim()}
              className="btn btn-primary"
              style={{ background: 'var(--amber-mid)', borderColor: 'var(--amber-mid)' }}
            >
              {mut.isPending ? <ButtonSpinner label="Enviando" /> : 'Enviar reporte'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { proveedoresApi } from '../../api/services';
import type { CreateProveedorDto } from '../../types';
import { ArrowLeft, Check, ChevronRight, ClipboardList, MapPin, Phone, Scale, UserRound } from 'lucide-react';
import {
  CONDICIONES_IVA,
  PROVINCIAS_AR,
  formatCuitInput,
  isValidCuitFormat,
  cuitDigits,
} from './proveedor-wizard.constants';

const STEPS = [
  { id: 0, title: 'Identidad', short: 'Datos del proveedor', icon: UserRound },
  { id: 1, title: 'Datos fiscales', short: 'CUIT e IVA', icon: Scale },
  { id: 2, title: 'Domicilio fiscal', short: 'Ubicación legal', icon: MapPin },
  { id: 3, title: 'Contacto', short: 'Medios y referente', icon: Phone },
  { id: 4, title: 'Confirmación', short: 'Revisá y guardá', icon: ClipboardList },
] as const;

const emptyForm: CreateProveedorDto = {
  nombre: '',
  nombreFantasia: '',
  cuit: '',
  condicionIva: '',
  domicilioCalle: '',
  localidad: '',
  provincia: '',
  codigoPostal: '',
  telefono: '',
  email: '',
  contacto: '',
  notas: '',
};

export function ProveedorAltaWizardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CreateProveedorDto>(emptyForm);
  const [stepError, setStepError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: (dto: CreateProveedorDto) => {
      const payload: CreateProveedorDto = {
        ...dto,
        cuit: formatCuitPayload(dto.cuit),
        nombre: dto.nombre.trim(),
      };
      return proveedoresApi.create(payload);
    },
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['proveedores'] });
      navigate(`/proveedores/${p.id}`, { replace: true });
    },
  });

  const set = <K extends keyof CreateProveedorDto>(key: K, value: CreateProveedorDto[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setStepError(null);
  };

  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!form.nombre.trim() || form.nombre.trim().length < 2) {
        return 'Ingresá la razón social o denominación (mínimo 2 caracteres).';
      }
    }
    if (s === 1) {
      if (!isValidCuitFormat(form.cuit || '')) {
        return 'El CUIT debe tener 11 dígitos (formato XX-XXXXXXXX-X).';
      }
      if (!form.condicionIva?.trim()) {
        return 'Seleccioná la condición frente al IVA.';
      }
    }
    if (s === 2) {
      if (!form.domicilioCalle?.trim()) {
        return 'Indicá calle y número del domicilio fiscal.';
      }
      if (!form.localidad?.trim()) return 'Indicá la localidad.';
      if (!form.provincia?.trim()) return 'Seleccioná la provincia.';
      if (!form.codigoPostal?.trim()) return 'Indicá el código postal.';
    }
    if (s === 3) {
      const mail = form.email?.trim();
      const tel = form.telefono?.trim();
      if (!mail && !tel) {
        return 'Debe haber al menos un teléfono o un correo electrónico de contacto.';
      }
      if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
        return 'El correo electrónico no es válido.';
      }
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError(null);
    if (step < STEPS.length - 1) setStep((x) => x + 1);
  };

  const goBack = () => {
    setStepError(null);
    if (step > 0) setStep((x) => x - 1);
  };

  const submit = () => {
    const err = validateStep(0) || validateStep(1) || validateStep(2) || validateStep(3);
    if (err) {
      setStepError(err);
      return;
    }
    mut.mutate(form);
  };

  return (
    <div className="page-shell-form max-w-3xl mx-auto">
      <Link
        to="/proveedores"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[var(--purple)] mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al listado
      </Link>

      <div className="page-heading">
        <div className="page-kicker">Alta de proveedor</div>
        <h1 className="page-title">Nuevo proveedor</h1>
        <p className="page-subtitle">
          Completá los pasos con la información básica y legal del proveedor para el catálogo municipal.
        </p>
      </div>

      {/* Stepper */}
      <div className="mb-8 overflow-x-auto pb-2">
        <div className="flex items-center gap-1 min-w-max sm:min-w-0 sm:flex-wrap">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = i === step;
            const done = i < step;
            return (
              <div key={s.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (i < step) {
                      setStepError(null);
                      setStep(i);
                    }
                  }}
                  disabled={i > step}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors ${
                    active
                      ? 'text-white shadow-md'
                      : done
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-white/80 text-slate-400 border border-slate-200'
                  }`}
                  style={active ? { background: 'var(--purple)' } : undefined}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm ${
                      done && !active ? 'bg-emerald-200 text-emerald-900' : ''
                    }`}
                  >
                    {done && !active ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </span>
                  <span className="hidden sm:block">
                    <span className="block text-xs font-bold opacity-80">{s.title}</span>
                    <span className="block text-[11px] opacity-70">{s.short}</span>
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-slate-300 mx-0.5 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card p-6 sm:p-8">
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="font-bold text-slate-800 text-lg">Identidad del proveedor</h2>
            <p className="text-sm text-slate-500">
              El nombre legal se utilizará para emparejar cotizaciones y pedidos en el sistema.
            </p>
            <div>
              <label className="label">Razón social o denominación *</label>
              <input
                className="input"
                value={form.nombre}
                onChange={(e) => set('nombre', e.target.value)}
                placeholder="Ej: Distribuidora Sur S.A."
                autoComplete="organization"
              />
            </div>
            <div>
              <label className="label">Nombre de fantasía</label>
              <input
                className="input"
                value={form.nombreFantasia || ''}
                onChange={(e) => set('nombreFantasia', e.target.value)}
                placeholder="Si difiere de la razón social"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="font-bold text-slate-800 text-lg">Datos fiscales</h2>
            <p className="text-sm text-slate-500">
              Información tributaria tal como figura en constancia de AFIP o documentación legal.
            </p>
            <div>
              <label className="label">CUIT *</label>
              <input
                className="input font-mono tracking-wide"
                value={form.cuit || ''}
                onChange={(e) => set('cuit', formatCuitInput(e.target.value))}
                placeholder="XX-XXXXXXXX-X"
                inputMode="numeric"
                autoComplete="off"
              />
              <p className="text-xs text-slate-400 mt-1">11 dígitos; podés escribir con o sin guiones.</p>
            </div>
            <div>
              <label className="label">Condición frente al IVA *</label>
              <select
                className="input"
                value={form.condicionIva || ''}
                onChange={(e) => set('condicionIva', e.target.value)}
              >
                <option value="">Seleccioná…</option>
                {CONDICIONES_IVA.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="font-bold text-slate-800 text-lg">Domicilio fiscal</h2>
            <p className="text-sm text-slate-500">
              Dirección declarada ante AFIP o la que figure en facturas y contratos.
            </p>
            <div>
              <label className="label">Calle y número *</label>
              <input
                className="input"
                value={form.domicilioCalle || ''}
                onChange={(e) => set('domicilioCalle', e.target.value)}
                placeholder="Ej: Av. San Martín 1234, piso 2"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Localidad *</label>
                <input
                  className="input"
                  value={form.localidad || ''}
                  onChange={(e) => set('localidad', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Código postal *</label>
                <input
                  className="input"
                  value={form.codigoPostal || ''}
                  onChange={(e) => set('codigoPostal', e.target.value)}
                  placeholder="Ej: 9400"
                />
              </div>
            </div>
            <div>
              <label className="label">Provincia *</label>
              <select
                className="input"
                value={form.provincia || ''}
                onChange={(e) => set('provincia', e.target.value)}
              >
                <option value="">Seleccioná…</option>
                {PROVINCIAS_AR.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="font-bold text-slate-800 text-lg">Contacto comercial</h2>
            <p className="text-sm text-slate-500">
              Al menos un medio (teléfono o correo) para gestiones de compras y facturación.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Teléfono</label>
                <input
                  className="input"
                  value={form.telefono || ''}
                  onChange={(e) => set('telefono', e.target.value)}
                  placeholder="Código área + número"
                  inputMode="tel"
                />
              </div>
              <div>
                <label className="label">Correo electrónico</label>
                <input
                  className="input"
                  type="email"
                  value={form.email || ''}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="facturacion@empresa.com"
                  autoComplete="email"
                />
              </div>
            </div>
            <div>
              <label className="label">Persona o área de contacto</label>
              <input
                className="input"
                value={form.contacto || ''}
                onChange={(e) => set('contacto', e.target.value)}
                placeholder="Ej: Área compras — Nombre y apellido"
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <h2 className="font-bold text-slate-800 text-lg">Observaciones y confirmación</h2>
            <div>
              <label className="label">Notas internas (opcional)</label>
              <textarea
                className="input min-h-[88px]"
                value={form.notas || ''}
                onChange={(e) => set('notas', e.target.value)}
                placeholder="Referencias bancarias, horarios de atención, acuerdos marco, etc."
              />
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3 text-sm">
              <div className="font-bold text-slate-700 uppercase text-xs tracking-wide">Resumen</div>
              <SummaryRow label="Razón social" value={form.nombre} />
              {form.nombreFantasia?.trim() && (
                <SummaryRow label="Nombre de fantasía" value={form.nombreFantasia} />
              )}
              <SummaryRow label="CUIT" value={formatCuitPayload(form.cuit)} />
              <SummaryRow label="IVA" value={form.condicionIva} />
              <SummaryRow
                label="Domicilio fiscal"
                value={[form.domicilioCalle, form.localidad, form.provincia, form.codigoPostal].filter(Boolean).join(' · ')}
              />
              <SummaryRow
                label="Contacto"
                value={[form.telefono, form.email, form.contacto].filter(Boolean).join(' · ') || '—'}
              />
            </div>
          </div>
        )}

        {stepError && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
            {stepError}
          </div>
        )}
        {mut.isError && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
            No se pudo guardar. Verificá los datos o intentá más tarde.
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={goBack}
            disabled={step === 0 || mut.isPending}
          >
            Anterior
          </button>
          <div className="flex gap-2">
            {step < STEPS.length - 1 ? (
              <button type="button" className="btn btn-primary" onClick={goNext}>
                Siguiente
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={submit}
                disabled={mut.isPending}
              >
                {mut.isPending ? 'Guardando…' : 'Guardar proveedor'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-800 font-medium">{value}</span>
    </div>
  );
}

function formatCuitPayload(raw: string | undefined): string {
  const d = cuitDigits(raw || '');
  if (d.length !== 11) return (raw || '').trim();
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`;
}

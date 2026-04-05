import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  Building2,
  Camera,
  Car,
  Check,
  ChevronDown,
  Coins,
  Eye,
  FileText,
  Hash,
  IdCard,
  ImageIcon,
  Landmark,
  Leaf,
  Link,
  Monitor,
  Mountain,
  Package,
  Palette,
  Plus,
  RotateCcw,
  Send,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Users,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import { pedidosApi, usersApi } from '../../api/services';
import { ButtonSpinner } from '../../components/ui/loading';
import { areasPedidoSelectOptions, formatDate, userPuedeCrearPedidos } from '../../lib/utils';
import { useAuthStore } from '../../store/auth.store';
import type { AreaMunicipal } from '../../types';

// ─── Area visual config ───────────────────────────────────────────────────────

type AreaItem = {
  area: AreaMunicipal;
  Icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
  activeBorder: string;
  activeBg: string;
  activeText: string;
};

const AREA_ITEMS: AreaItem[] = [
  {
    area: 'Automotores',
    Icon: Car,
    iconColor: 'text-blue-700',
    iconBg: 'bg-blue-100',
    activeBorder: 'border-blue-500',
    activeBg: 'bg-blue-50',
    activeText: 'text-blue-800',
  },
  {
    area: 'Compras',
    Icon: ShoppingBag,
    iconColor: 'text-violet-700',
    iconBg: 'bg-violet-100',
    activeBorder: 'border-violet-500',
    activeBg: 'bg-violet-50',
    activeText: 'text-violet-800',
  },
  {
    area: 'Cultura',
    Icon: Palette,
    iconColor: 'text-fuchsia-700',
    iconBg: 'bg-fuchsia-100',
    activeBorder: 'border-fuchsia-500',
    activeBg: 'bg-fuchsia-50',
    activeText: 'text-fuchsia-800',
  },
  {
    area: 'Gobierno',
    Icon: Landmark,
    iconColor: 'text-indigo-700',
    iconBg: 'bg-indigo-100',
    activeBorder: 'border-indigo-500',
    activeBg: 'bg-indigo-50',
    activeText: 'text-indigo-800',
  },
  {
    area: 'Guardia Urbana',
    Icon: Shield,
    iconColor: 'text-slate-700',
    iconBg: 'bg-slate-200',
    activeBorder: 'border-slate-500',
    activeBg: 'bg-slate-100',
    activeText: 'text-slate-800',
  },
  {
    area: 'Hacienda',
    Icon: Coins,
    iconColor: 'text-amber-800',
    iconBg: 'bg-amber-100',
    activeBorder: 'border-amber-500',
    activeBg: 'bg-amber-50',
    activeText: 'text-amber-900',
  },
  {
    area: 'Licencia de Conducir',
    Icon: IdCard,
    iconColor: 'text-cyan-700',
    iconBg: 'bg-cyan-100',
    activeBorder: 'border-cyan-500',
    activeBg: 'bg-cyan-50',
    activeText: 'text-cyan-800',
  },
  {
    area: 'Medio Ambiente',
    Icon: Leaf,
    iconColor: 'text-green-700',
    iconBg: 'bg-green-100',
    activeBorder: 'border-green-500',
    activeBg: 'bg-green-50',
    activeText: 'text-green-800',
  },
  {
    area: 'Obras Públicas',
    Icon: Wrench,
    iconColor: 'text-amber-700',
    iconBg: 'bg-amber-100',
    activeBorder: 'border-amber-500',
    activeBg: 'bg-amber-50',
    activeText: 'text-amber-800',
  },
  {
    area: 'Rentas',
    Icon: Banknote,
    iconColor: 'text-lime-800',
    iconBg: 'bg-lime-100',
    activeBorder: 'border-lime-500',
    activeBg: 'bg-lime-50',
    activeText: 'text-lime-900',
  },
  {
    area: 'RRHH',
    Icon: Users,
    iconColor: 'text-sky-700',
    iconBg: 'bg-sky-100',
    activeBorder: 'border-sky-500',
    activeBg: 'bg-sky-50',
    activeText: 'text-sky-800',
  },
  {
    area: 'Secretaría',
    Icon: FileText,
    iconColor: 'text-rose-700',
    iconBg: 'bg-rose-100',
    activeBorder: 'border-rose-500',
    activeBg: 'bg-rose-50',
    activeText: 'text-rose-800',
  },
  {
    area: 'Sistemas',
    Icon: Monitor,
    iconColor: 'text-slate-600',
    iconBg: 'bg-slate-100',
    activeBorder: 'border-slate-500',
    activeBg: 'bg-slate-100',
    activeText: 'text-slate-800',
  },
  {
    area: 'Tesorería',
    Icon: Wallet,
    iconColor: 'text-emerald-700',
    iconBg: 'bg-emerald-100',
    activeBorder: 'border-emerald-500',
    activeBg: 'bg-emerald-50',
    activeText: 'text-emerald-800',
  },
  {
    area: 'Turismo y Deportes',
    Icon: Mountain,
    iconColor: 'text-orange-700',
    iconBg: 'bg-orange-100',
    activeBorder: 'border-orange-500',
    activeBg: 'bg-orange-50',
    activeText: 'text-orange-800',
  },
];

// ─── Wizard steps ─────────────────────────────────────────────────────────────

const STEPS = [
  { id: 0, title: 'Pedido',         Icon: ShoppingCart },
  { id: 1, title: 'Área',           Icon: Building2    },
  { id: 2, title: 'Especificaciones', Icon: Package    },
  { id: 3, title: 'Imágenes',       Icon: Camera       },
  { id: 4, title: 'Revisión',       Icon: Eye          },
] as const;

const MAX_REFS = 8;

// ─── Parse detalle back into structured fields ────────────────────────────────

function parseDetalle(raw: string) {
  const result = { marca: '', modelo: '', nroParte: '', links: [] as string[], detalle: '' };
  if (!raw) return result;
  const lines = raw.split('\n');
  const notesLines: string[] = [];
  let inRefs = false;
  for (const line of lines) {
    if (line.startsWith('Marca: '))                  { result.marca    = line.slice(7);  inRefs = false; }
    else if (line.startsWith('Modelo: '))             { result.modelo   = line.slice(8);  inRefs = false; }
    else if (line.startsWith('N° de parte / código: ')) { result.nroParte = line.slice(22); inRefs = false; }
    else if (line === 'Referencias:')                 { inRefs = true; }
    else if (inRefs && line.startsWith('- '))         { result.links.push(line.slice(2)); }
    else                                              { inRefs = false; notesLines.push(line); }
  }
  result.detalle = notesLines.join('\n').trim();
  return result;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NuevoPedidoPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const fromId = searchParams.get('from') ?? undefined;

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    descripcion: '',
    cantidad: '',
    marca: '',
    modelo: '',
    nroParte: '',
    detalle: '',
    area: '',
    urgente: false,
    links: [''],
  });
  const [referencias, setReferencias] = useState<File[]>([]);
  const [stepError, setStepError] = useState<string | null>(null);
  const [serverError, setServerError] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [basedOnPedido, setBasedOnPedido] = useState<{ numero: string; descripcion: string } | null>(null);

  // Fetch recent pedidos for the template picker
  const { data: pedidosRecientes = [], isLoading: loadingRecientes } = useQuery({
    queryKey: ['pedidos-recientes-picker'],
    queryFn: () => pedidosApi.getAll(),
    staleTime: 60_000,
  });

  // Fetch source pedido when ?from=id is in the URL
  const { data: sourcePedido } = useQuery({
    queryKey: ['pedido-template', fromId],
    queryFn: () => pedidosApi.getById(fromId!),
    enabled: !!fromId,
  });

  // Pre-fill form when source pedido loads
  useEffect(() => {
    if (!sourcePedido) return;
    const parsed = parseDetalle(sourcePedido.detalle ?? '');
    setForm({
      descripcion: sourcePedido.descripcion,
      cantidad: sourcePedido.cantidad ?? '',
      marca: parsed.marca,
      modelo: parsed.modelo,
      nroParte: parsed.nroParte,
      detalle: parsed.detalle,
      area: sourcePedido.area,
      urgente: false,
      links: parsed.links.length > 0 ? parsed.links : [''],
    });
    setBasedOnPedido({ numero: sourcePedido.numero, descripcion: sourcePedido.descripcion });
  }, [sourcePedido]);

  const aplicarTemplate = (p: { id: string; numero: string; descripcion: string; cantidad?: string; area: string; urgente: boolean; detalle?: string }) => {
    const parsed = parseDetalle(p.detalle ?? '');
    setForm({
      descripcion: p.descripcion,
      cantidad: p.cantidad ?? '',
      marca: parsed.marca,
      modelo: parsed.modelo,
      nroParte: parsed.nroParte,
      detalle: parsed.detalle,
      area: p.area,
      urgente: false,
      links: parsed.links.length > 0 ? parsed.links : [''],
    });
    setBasedOnPedido({ numero: p.numero, descripcion: p.descripcion });
    setShowPicker(false);
    setStepError(null);
  };

  const previewUrls = useMemo(() => referencias.map((f) => URL.createObjectURL(f)), [referencias]);
  useEffect(() => () => previewUrls.forEach((u) => URL.revokeObjectURL(u)), [previewUrls]);

  useEffect(() => {
    usersApi
      .getMe()
      .then((me) => {
        useAuthStore.getState().updateUser({
          id: me.id,
          email: me.email,
          nombre: me.nombre,
          apellido: me.apellido,
          nombreCompleto: `${me.nombre} ${me.apellido}`,
          rol: me.rol,
          mustChangePassword: me.mustChangePassword,
          firmaUrl: me.firmaUrl,
          areaAsignada: me.areaAsignada ?? null,
          areasPedidoPermitidas: me.areasPedidoPermitidas ?? null,
        });
      })
      .catch(() => {});
  }, []);

  const areaOptions = useMemo(() => areasPedidoSelectOptions(user), [user]);

  // Pre-select assigned area or single available area
  useEffect(() => {
    if (form.area) return;
    const aa = user?.areaAsignada;
    if (aa && areaOptions.includes(aa)) {
      setForm((f) => ({ ...f, area: aa }));
    } else if (areaOptions.length === 1) {
      setForm((f) => ({ ...f, area: areaOptions[0] }));
    }
  }, [user?.areaAsignada, areaOptions, form.area]);

  const puede = userPuedeCrearPedidos(user);

  const buildDetalle = (): string => {
    const parts: string[] = [];
    if (form.marca.trim())    parts.push(`Marca: ${form.marca.trim()}`);
    if (form.modelo.trim())   parts.push(`Modelo: ${form.modelo.trim()}`);
    if (form.nroParte.trim()) parts.push(`N° de parte / código: ${form.nroParte.trim()}`);
    const validLinks = form.links.map((l) => l.trim()).filter(Boolean);
    if (validLinks.length)    parts.push(`Referencias:\n${validLinks.map((l) => `- ${l}`).join('\n')}`);
    if (form.detalle.trim())  parts.push(form.detalle.trim());
    return parts.join('\n');
  };

  // ─── Link helpers ─────────────────────────────────────────────────────────────

  const setLink = (i: number, value: string) =>
    setForm((f) => { const links = [...f.links]; links[i] = value; return { ...f, links }; });

  const addLink = () =>
    setForm((f) => ({ ...f, links: [...f.links, ''] }));

  const removeLink = (i: number) =>
    setForm((f) => ({ ...f, links: f.links.filter((_, j) => j !== i) }));

  const mut = useMutation({
    mutationFn: () =>
      pedidosApi.create(
        {
          descripcion: form.descripcion,
          area: form.area as AreaMunicipal,
          cantidad: form.cantidad || undefined,
          detalle: buildDetalle() || undefined,
          urgente: form.urgente,
        },
        referencias.length ? referencias : undefined,
      ),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['pedidos'] });
      navigate(`/pedidos/${p.id}`);
    },
    onError: (e: { response?: { data?: { message?: string | string[]; statusCode?: number } }; message?: string }) => {
      console.error('[NuevoPedido] Error al crear:', e?.response?.data ?? e);
      const msg = e.response?.data?.message;
      setServerError(Array.isArray(msg) ? msg.join('. ') : (msg || e?.message || 'Error al crear pedido'));
    },
  });

  // ─── Validation ──────────────────────────────────────────────────────────────

  const validateStep = (s: number): string | null => {
    if (s === 0 && !form.descripcion.trim()) return 'Describí qué necesitás antes de continuar.';
    if (s === 1 && !form.area) return 'Seleccioná el área que hace este pedido.';
    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) { setStepError(err); return; }
    setStepError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setStepError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const submit = () => {
    const err = validateStep(0) || validateStep(1);
    if (err) { setStepError(err); return; }
    setServerError('');
    mut.mutate();
  };

  // ─── Image handlers ───────────────────────────────────────────────────────────

  const agregarReferencias = (files: FileList | null) => {
    if (!files?.length) return;
    const next = [...referencias];
    for (let i = 0; i < files.length; i++) {
      if (next.length >= MAX_REFS) break;
      if (!files[i].type.startsWith('image/')) continue;
      next.push(files[i]);
    }
    setReferencias(next.slice(0, MAX_REFS));
  };

  const quitarReferencia = (i: number) => setReferencias((prev) => prev.filter((_, j) => j !== i));

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const filteredAreas = AREA_ITEMS.filter((a) => areaOptions.includes(a.area));
  const areaGridClass =
    filteredAreas.length <= 2
      ? 'grid-cols-2'
      : filteredAreas.length === 3
        ? 'grid-cols-3'
        : 'grid-cols-2 sm:grid-cols-3';

  const selectedAreaItem = AREA_ITEMS.find((a) => a.area === form.area);

  const hasSpecs = form.marca || form.modelo || form.nroParte || form.links.some((l) => l.trim());
  const validLinks = form.links.map((l) => l.trim()).filter(Boolean);

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="page-shell-form max-w-2xl mx-auto">
      {/* Back link */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver
      </button>

      {/* Page heading */}
      <div className="page-heading mb-8">
        <div className="page-kicker">Solicitud</div>
        <h1 className="page-title">Nuevo pedido</h1>
        <p className="page-subtitle">
          El pedido irá a Secretaría para aprobación y luego seguirá el flujo interno.
        </p>
      </div>

      {/* Permissions warning */}
      {!puede && (
        <div className="alert alert-warning mb-6">
          No tenés permisos para crear pedidos para ninguna área. Pedí a administración que configure tus
          áreas permitidas.
        </div>
      )}

      {/* ── Step indicator ─────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center">
        {STEPS.map((s, i) => {
          const active = i === step;
          const done   = i < step;
          const { Icon } = s;
          return (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <button
                type="button"
                onClick={() => { if (done) { setStepError(null); setStep(i); } }}
                disabled={!done}
                aria-current={active ? 'step' : undefined}
                className="flex flex-col items-center gap-1 group disabled:cursor-default"
              >
                <div
                  className={[
                    'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200',
                    active ? 'bg-[var(--blue)] text-white shadow-lg shadow-blue-200'
                           : done  ? 'bg-emerald-500 text-white'
                                   : 'bg-slate-200 text-slate-400',
                    done ? 'cursor-pointer' : '',
                  ].join(' ')}
                >
                  {done ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <span
                  className={[
                    'text-[10px] font-semibold hidden sm:block whitespace-nowrap transition-colors leading-none',
                    active ? 'text-[var(--blue)]' : done ? 'text-emerald-600' : 'text-slate-400',
                  ].join(' ')}
                >
                  {s.title}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div
                  className={[
                    'flex-1 h-0.5 mx-1.5 rounded-full transition-all duration-500',
                    i < step ? 'bg-emerald-400' : 'bg-slate-200',
                  ].join(' ')}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Step card ──────────────────────────────────────────────────────── */}
      <div
        key={step}
        className="card p-6 sm:p-8"
        style={{ animation: 'fadeSlideUp 0.22s ease-out both' }}
      >

        {/* "Basado en" banner – visible in all steps once a template is chosen */}
        {basedOnPedido && (
          <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
            <div className="flex items-center gap-2 text-sm text-emerald-800 min-w-0">
              <RotateCcw className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
              <span className="truncate">
                Basado en <span className="font-semibold">{basedOnPedido.numero}</span>
                {' · '}
                <span className="text-emerald-700">{basedOnPedido.descripcion.length > 45 ? basedOnPedido.descripcion.slice(0, 45) + '…' : basedOnPedido.descripcion}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setBasedOnPedido(null);
                setForm({ descripcion: '', cantidad: '', marca: '', modelo: '', nroParte: '', detalle: '', area: '', urgente: false, links: [''] });
              }}
              className="text-xs text-emerald-600 hover:text-emerald-900 font-semibold shrink-0 transition-colors"
            >
              Limpiar
            </button>
          </div>
        )}

        {/* ── Step 0: Qué necesitás ── */}
        {step === 0 && (
          <div className="space-y-6">

            {/* Template picker */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowPicker((v) => !v)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-slate-400" />
                  ¿Repetir un pedido anterior?
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showPicker ? 'rotate-180' : ''}`} />
              </button>

              {showPicker && (
                <div className="border-t border-slate-100 divide-y divide-slate-100 bg-white">
                  {loadingRecientes && (
                    <div className="px-4 py-3 text-xs text-slate-400 text-center">Cargando pedidos…</div>
                  )}
                  {!loadingRecientes && pedidosRecientes.length === 0 && (
                    <div className="px-4 py-3 text-xs text-slate-400 text-center">No hay pedidos anteriores</div>
                  )}
                  {pedidosRecientes.slice(0, 6).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => aplicarTemplate(p)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-800 truncate group-hover:text-[var(--blue)]">{p.descripcion}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{p.numero} · {p.area} · {formatDate(p.createdAt)}</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[var(--blue)] shrink-0 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <StepHeader Icon={ShoppingCart} title="Describí el pedido" subtitle="Contanos qué artículo o servicio necesitás" />

            <div>
              <label className="label">¿Qué necesitás? *</label>
              <input
                value={form.descripcion}
                onChange={(e) => { setForm((f) => ({ ...f, descripcion: e.target.value })); setStepError(null); }}
                className="input"
                placeholder="Ej: Resmas papel A4, tóner HP 85A, sillas de oficina..."
                autoFocus
                disabled={!puede}
              />
              <p className="text-xs text-slate-400 mt-1.5">
                Sé específico para que Compras pueda cotizar correctamente.
              </p>
            </div>

            <div>
              <label className="label">Cantidad</label>
              <input
                value={form.cantidad}
                onChange={(e) => setForm((f) => ({ ...f, cantidad: e.target.value }))}
                className="input"
                placeholder="Ej: 5 resmas, 2 unidades, 1 caja de 500 hojas"
                disabled={!puede}
              />
            </div>
          </div>
        )}

        {/* ── Step 1: Área ── */}
        {step === 1 && (
          <div className="space-y-5">
            <StepHeader Icon={Building2} title="¿Desde qué área?" subtitle="Seleccioná el área que realiza este pedido" />

            <div className={`grid gap-3 ${areaGridClass}`}>
              {filteredAreas.map(({ area, Icon, iconColor, iconBg, activeBorder, activeBg, activeText }) => {
                const selected = form.area === area;
                return (
                  <button
                    key={area}
                    type="button"
                    onClick={() => { setForm((f) => ({ ...f, area })); setStepError(null); }}
                    disabled={!puede}
                    className={[
                      'relative flex flex-col items-center gap-2.5 px-3 py-4 rounded-xl border-2 transition-all duration-150 text-center',
                      selected
                        ? `${activeBorder} ${activeBg} shadow-md`
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm',
                      !puede ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                    ].join(' ')}
                  >
                    {selected && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--blue)] flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </span>
                    )}
                    <div className={['w-11 h-11 rounded-xl flex items-center justify-center transition-colors', selected ? 'bg-white/70' : iconBg].join(' ')}>
                      <Icon className={`w-5 h-5 ${iconColor}`} />
                    </div>
                    <span className={['text-sm font-semibold leading-tight', selected ? activeText : 'text-slate-700'].join(' ')}>
                      {area}
                    </span>
                  </button>
                );
              })}
            </div>

            {areaOptions.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">No tenés áreas disponibles para solicitar.</p>
            )}
          </div>
        )}

        {/* ── Step 2: Especificaciones del producto ── */}
        {step === 2 && (
          <div className="space-y-6">
            <StepHeader Icon={Package} title="Especificaciones del producto" subtitle="Marca, modelo y código para ayudar a Compras (todo opcional)" />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">
                  <Tag className="w-3.5 h-3.5 inline-block mr-1 text-slate-400" />
                  Marca
                </label>
                <input
                  value={form.marca}
                  onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value }))}
                  className="input"
                  placeholder="Ej: HP, Canon, 3M, Bostik..."
                  autoFocus
                  disabled={!puede}
                />
              </div>
              <div>
                <label className="label">
                  <Tag className="w-3.5 h-3.5 inline-block mr-1 text-slate-400" />
                  Modelo
                </label>
                <input
                  value={form.modelo}
                  onChange={(e) => setForm((f) => ({ ...f, modelo: e.target.value }))}
                  className="input"
                  placeholder="Ej: LaserJet 85A, XP-2200..."
                  disabled={!puede}
                />
              </div>
            </div>

            <div>
              <label className="label">
                <Hash className="w-3.5 h-3.5 inline-block mr-1 text-slate-400" />
                N° de parte / código de producto
              </label>
              <input
                value={form.nroParte}
                onChange={(e) => setForm((f) => ({ ...f, nroParte: e.target.value }))}
                className="input"
                placeholder="Ej: CE285A, SKU-4892, MPN-X7..."
                disabled={!puede}
              />
            </div>

            <div>
              <label className="label">Notas adicionales</label>
              <textarea
                value={form.detalle}
                onChange={(e) => setForm((f) => ({ ...f, detalle: e.target.value }))}
                className="input resize-none"
                rows={3}
                placeholder="Color, tamaño, voltaje, cualquier aclaración extra..."
                disabled={!puede}
              />
            </div>

            {/* Links de referencia */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="label mb-0">
                  <Link className="w-3.5 h-3.5 inline-block mr-1 text-slate-400" />
                  Links de referencia
                  <span className="ml-1.5 text-[11px] text-slate-400 font-normal">(opcional)</span>
                </label>
              </div>
              <p className="text-xs text-slate-400">
                Pegá URLs de catálogos, fichas técnicas o tiendas para que Compras pueda ver el producto.
              </p>

              <div className="space-y-2">
                {form.links.map((link, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      <input
                        value={link}
                        onChange={(e) => setLink(i, e.target.value)}
                        className="input pl-8 text-sm"
                        placeholder="https://ejemplo.com/producto"
                        type="url"
                        inputMode="url"
                        disabled={!puede}
                      />
                    </div>
                    {form.links.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLink(i)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                        aria-label="Quitar link"
                        disabled={!puede}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {form.links.length < 5 && (
                <button
                  type="button"
                  onClick={addLink}
                  disabled={!puede}
                  className="inline-flex items-center gap-1.5 text-sm text-[var(--blue)] hover:text-blue-800 font-medium transition-colors disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar otro link
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Step 3: Imágenes y urgencia ── */}
        {step === 3 && (
          <div className="space-y-6">
            <StepHeader Icon={Camera} title="Imágenes de referencia" subtitle="Adjuntá fotos del producto, etiqueta o catálogo (opcional)" />

            <div>
              <p className="text-xs text-slate-400 mb-3">
                Las imágenes ayudan a Compras a identificar exactamente lo que necesitás. Hasta {MAX_REFS} imágenes, máx. 5 MB c/u.
              </p>
              <label
                className={[
                  'flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed p-8 transition-colors',
                  referencias.length >= MAX_REFS || !puede
                    ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                    : 'border-slate-300 hover:border-[var(--blue-mid)] hover:bg-blue-50/30 cursor-pointer',
                ].join(' ')}
              >
                <ImageIcon className="w-9 h-9 text-slate-300" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-600">Hacé clic para adjuntar imágenes</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {referencias.length}/{MAX_REFS} adjuntas · solo imágenes · JPG, PNG, WEBP
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  disabled={!puede || referencias.length >= MAX_REFS}
                  onChange={(e) => { agregarReferencias(e.target.files); e.target.value = ''; }}
                />
              </label>

              {referencias.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {referencias.map((file, i) => (
                    <div key={`${file.name}-${i}-${file.size}`} className="relative group">
                      <img
                        src={previewUrls[i]}
                        alt=""
                        className="h-24 w-24 object-cover rounded-xl border border-slate-200 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => quitarReferencia(i)}
                        className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Quitar imagen"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <p className="mt-1 text-[10px] text-slate-400 text-center truncate w-24">{file.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ── Step 4: Revisión final ── */}
        {step === 4 && (
          <div className="space-y-6">
            <StepHeader Icon={Eye} title="Revisión final" subtitle="Verificá todo antes de enviar el pedido a Secretaría" />

            {/* Block: El pedido */}
            <ReviewBlock title="El pedido">
              <ReviewRow label="Descripción" value={form.descripcion} strong />
              <ReviewRow label="Cantidad"    value={form.cantidad} />
            </ReviewBlock>

            {/* Block: Área */}
            <ReviewBlock title="Área solicitante">
              <div className="flex items-center gap-2.5 py-0.5">
                {selectedAreaItem && (
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${selectedAreaItem.iconBg}`}>
                    <selectedAreaItem.Icon className={`w-4 h-4 ${selectedAreaItem.iconColor}`} />
                  </div>
                )}
                <span className="text-sm font-semibold text-slate-800">{form.area}</span>
              </div>
            </ReviewBlock>

            {/* Block: Especificaciones (only if any filled) */}
            {hasSpecs && (
              <ReviewBlock title="Especificaciones">
                <ReviewRow label="Marca"    value={form.marca} />
                <ReviewRow label="Modelo"   value={form.modelo} />
                <ReviewRow label="N° parte" value={form.nroParte} />
                {validLinks.length > 0 && (
                  <div className="flex items-start gap-2 pt-0.5">
                    <span className="text-xs text-slate-400 w-20 shrink-0 pt-0.5">Links</span>
                    <div className="space-y-1 min-w-0">
                      {validLinks.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-[var(--blue)] hover:underline break-all leading-snug"
                        >
                          <Link className="w-3 h-3 shrink-0 mt-0.5" />
                          {url}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </ReviewBlock>
            )}

            {/* Block: Notas (only if filled) */}
            {form.detalle.trim() && (
              <ReviewBlock title="Notas adicionales">
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{form.detalle.trim()}</p>
              </ReviewBlock>
            )}

            {/* Block: Imágenes */}
            <ReviewBlock title="Imágenes de referencia">
              {referencias.length === 0 ? (
                <p className="text-sm text-slate-400 italic">Sin imágenes adjuntas</p>
              ) : (
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {referencias.map((file, i) => (
                    <img
                      key={`${file.name}-${i}`}
                      src={previewUrls[i]}
                      alt={file.name}
                      className="h-16 w-16 object-cover rounded-lg border border-slate-200"
                    />
                  ))}
                  <span className="self-center text-xs text-slate-500 ml-1">
                    {referencias.length} imagen{referencias.length !== 1 ? 'es' : ''}
                  </span>
                </div>
              )}
            </ReviewBlock>

            {/* Urgente toggle */}
            <div
              className="toggle-card cursor-pointer"
              onClick={() => puede && setForm((f) => ({ ...f, urgente: !f.urgente }))}
              style={!puede ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
            >
              <div className={`toggle-pill ${form.urgente ? 'on' : ''}`} />
              <div>
                <div className="text-sm font-semibold text-amber-800">Marcar como urgente</div>
                <div className="text-xs text-amber-600">Solo para casos realmente prioritarios</div>
              </div>
            </div>

            {/* Urgente badge (confirmación visual) */}
            {form.urgente && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                <span className="text-base">⚡</span>
                <div>
                  <p className="text-sm font-semibold text-amber-800">Pedido urgente</p>
                  <p className="text-xs text-amber-600">Se notificará como prioritario</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Error messages ── */}
        {stepError && (
          <div className="mt-5 flex items-center gap-2.5 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-800">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {stepError}
          </div>
        )}
        {serverError && (
          <div className="mt-5 flex items-center gap-2.5 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-800">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {serverError}
          </div>
        )}

        {/* ── Navigation ── */}
        <div className="mt-8 flex items-center justify-between gap-3 pt-5 border-t border-slate-100">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0 || mut.isPending}
            className="btn btn-ghost gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Anterior
          </button>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={[
                  'h-1.5 rounded-full transition-all duration-300',
                  i === step ? 'bg-[var(--blue)] w-5' : i < step ? 'bg-emerald-400 w-1.5' : 'bg-slate-200 w-1.5',
                ].join(' ')}
              />
            ))}
          </div>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="btn btn-primary gap-1.5"
              disabled={!puede}
            >
              Siguiente
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              className="btn btn-primary gap-1.5"
              disabled={mut.isPending || !puede}
            >
              {mut.isPending ? (
                <ButtonSpinner label="Enviando" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar pedido
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepHeader({
  Icon,
  title,
  subtitle,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-blue-700" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function ReviewBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{title}</p>
      </div>
      <div className="px-4 py-3.5 space-y-2.5 bg-white">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value, strong }: { label: string; value?: string | null; strong?: boolean }) {
  if (!value?.trim()) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-slate-400 w-20 pt-0.5 shrink-0">{label}</span>
      <span className={`text-sm break-words leading-snug ${strong ? 'font-semibold text-slate-800' : 'text-slate-700'}`}>
        {value}
      </span>
    </div>
  );
}

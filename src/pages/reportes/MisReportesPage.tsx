import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertOctagon,
  Database,
  Lock,
  Gauge,
  Monitor,
  HelpCircle,
  Clock,
  CheckCircle2,
  Plus,
  ImageIcon,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  XCircle,
  Loader2,
  Info,
} from 'lucide-react';
import { reportesApi, type Reporte, type TipoReporte, type EstadoReporte } from '../../api/reportes';
import { formatDateTime } from '../../lib/utils';
import { ReportarProblemaModal } from '../../components/reportar/ReportarProblemaModal';
import { RadaTillyLoader } from '../../components/ui/loading';
import { TicketChat } from '../../components/reportar/TicketChat';

// ── helpers ──────────────────────────────────────────────────────────

const TIPO_META: Record<TipoReporte, { label: string; icon: React.ReactNode; badgeClass: string; iconColor: string; iconBg: string }> = {
  error_sistema:     { label: 'Error de sistema',     icon: <AlertOctagon size={16} />,  badgeClass: 'badge-red',    iconColor: '#ef4444', iconBg: '#fee2e2' },
  datos_incorrectos: { label: 'Datos incorrectos',    icon: <Database size={16} />,       badgeClass: 'badge-amber',  iconColor: '#f59e0b', iconBg: '#fef3c7' },
  acceso:            { label: 'Acceso',               icon: <Lock size={16} />,           badgeClass: 'badge-purple', iconColor: '#8b5cf6', iconBg: '#ede9fe' },
  lentitud:          { label: 'Lentitud',             icon: <Gauge size={16} />,          badgeClass: 'badge-sky',    iconColor: '#0ea5e9', iconBg: '#e0f2fe' },
  interfaz:          { label: 'Interfaz/visual',      icon: <Monitor size={16} />,        badgeClass: 'badge-teal',   iconColor: '#14b8a6', iconBg: '#ccfbf1' },
  otro:              { label: 'Otro',                 icon: <HelpCircle size={16} />,     badgeClass: 'badge-slate',  iconColor: '#94a3b8', iconBg: '#f1f5f9' },
};

const ESTADO_META: Record<EstadoReporte, { label: string; icon: React.ReactNode; colorText: string; colorBg: string; colorBorder: string }> = {
  pendiente:   { label: 'Pendiente',   icon: <Clock size={14} />,        colorText: 'var(--text2)',  colorBg: 'var(--surface)',   colorBorder: 'var(--border2)' },
  en_proceso:  { label: 'En proceso',  icon: <Loader2 size={14} />,      colorText: 'var(--blue)',   colorBg: 'var(--blue-lt)',   colorBorder: 'var(--blue-brd)' },
  solucionado: { label: 'Solucionado', icon: <CheckCircle2 size={14} />, colorText: 'var(--green)',  colorBg: 'var(--green-lt)',  colorBorder: 'var(--green-brd)' },
  cerrado:     { label: 'Cerrado',     icon: <XCircle size={14} />,      colorText: '#ef4444',       colorBg: '#fef2f2',          colorBorder: '#fecaca' },
  // legacy
  abierto:     { label: 'Pendiente',   icon: <Clock size={14} />,        colorText: 'var(--text2)',  colorBg: 'var(--surface)',   colorBorder: 'var(--border2)' },
  resuelto:    { label: 'Solucionado', icon: <CheckCircle2 size={14} />, colorText: 'var(--green)',  colorBg: 'var(--green-lt)',  colorBorder: 'var(--green-brd)' },
};

// ── estado badge ──────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: EstadoReporte }) {
  const meta = ESTADO_META[estado];
  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold"
      style={{
        fontSize: '11px',
        background: meta.colorBg,
        color: meta.colorText,
        border: `1.5px solid ${meta.colorBorder}`,
      }}
    >
      {meta.icon}
      {meta.label}
    </div>
  );
}

// ── ticket card ───────────────────────────────────────────────────────

function TicketCard({ reporte }: { reporte: Reporte }) {
  const [expanded, setExpanded] = useState(false);
  const tipo   = TIPO_META[reporte.tipo];
  const estado = ESTADO_META[reporte.estado];

  return (
    <div
      className="card overflow-visible transition-all"
      style={{
        borderLeft: `3px solid ${estado.colorBorder}`,
        borderRadius: '14px',
      }}
    >
      {/* Main row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-4 py-4 flex items-start gap-3"
        style={{ outline: 'none' }}
      >
        {/* Type icon */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl mt-0.5"
          style={{ background: tipo.iconBg, color: tipo.iconColor }}
        >
          {tipo.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`badge ${tipo.badgeClass} gap-1`} style={{ fontSize: '10px' }}>{tipo.label}</span>
            <EstadoBadge estado={reporte.estado} />
          </div>
          <p
            className="font-semibold leading-snug"
            style={{
              fontSize: '13px',
              color: 'var(--text)',
              WebkitLineClamp: expanded ? undefined : 2,
              display: expanded ? 'block' : '-webkit-box',
              WebkitBoxOrient: 'vertical',
              overflow: expanded ? 'visible' : 'hidden',
            }}
          >
            {reporte.descripcion}
          </p>
          <p className="mt-1" style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 600 }}>
            {formatDateTime(reporte.createdAt)}
          </p>
        </div>

        {/* Screenshot thumb + expand */}
        <div className="flex items-center gap-2 shrink-0">
          {reporte.screenshotUrl && (
            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0" style={{ border: '1px solid var(--border)' }}>
              <img src={reporte.screenshotUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          {expanded
            ? <ChevronUp size={15} style={{ color: 'var(--text3)' }} />
            : <ChevronDown size={15} style={{ color: 'var(--text3)' }} />
          }
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>
          {/* Screenshot full */}
          {reporte.screenshotUrl && (
            <div className="pt-3">
              <div className="label flex items-center gap-1.5 mb-2">
                <ImageIcon size={11} />Screenshot adjunto
              </div>
              <div className="relative overflow-hidden rounded-xl" style={{ border: '1px solid var(--border)' }}>
                <img src={reporte.screenshotUrl} alt="Screenshot" className="w-full object-cover" style={{ maxHeight: '180px' }} />
                <a
                  href={reporte.screenshotUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute bottom-2 right-2 flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-white"
                  style={{ fontSize: '11px', background: 'rgba(15,23,42,.65)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,.15)' }}
                >
                  <ExternalLink size={10} />Ver completo
                </a>
              </div>
            </div>
          )}

          {/* Banners de estado */}
          {(reporte.estado === 'pendiente' || reporte.estado === 'abierto') && (
            <div
              className="rounded-xl px-4 py-3 font-semibold flex items-start gap-2"
              style={{ background: 'var(--surface)', border: '1px solid var(--border2)', fontSize: '13px', color: 'var(--text2)' }}
            >
              <Clock size={15} style={{ marginTop: '1px', flexShrink: 0 }} />
              Tu ticket está pendiente de atención. Te responderemos a la brevedad.
            </div>
          )}
          {reporte.estado === 'en_proceso' && (
            <div
              className="rounded-xl px-4 py-3 font-semibold flex items-start gap-2"
              style={{ background: 'var(--blue-lt)', border: '1px solid var(--blue-brd)', fontSize: '13px', color: 'var(--blue)' }}
            >
              <Loader2 size={15} style={{ marginTop: '1px', flexShrink: 0 }} />
              El equipo de sistemas está trabajando en este ticket.
            </div>
          )}
          {(reporte.estado === 'solucionado' || reporte.estado === 'resuelto') && (
            <div
              className="rounded-xl px-4 py-3 font-semibold flex items-start gap-2"
              style={{ background: 'var(--green-lt)', border: '1px solid var(--green-brd)', fontSize: '13px', color: 'var(--green)' }}
            >
              <CheckCircle2 size={15} style={{ marginTop: '1px', flexShrink: 0 }} />
              Este ticket fue marcado como solucionado por el equipo de sistemas.
            </div>
          )}
          {reporte.estado === 'cerrado' && (
            <div
              className="rounded-xl px-4 py-3 font-semibold flex items-start gap-2"
              style={{ background: '#fef2f2', border: '1px solid #fecaca', fontSize: '13px', color: '#ef4444' }}
            >
              <XCircle size={15} style={{ marginTop: '1px', flexShrink: 0 }} />
              Este ticket fue cerrado. Si el problema persiste, podés abrir uno nuevo.
            </div>
          )}

          {/* Aclaración del admin */}
          {reporte.notaAdmin && (
            <div
              className="rounded-xl px-4 py-3 flex items-start gap-2"
              style={{ background: 'var(--blue-lt)', border: '1px solid var(--blue-brd)' }}
            >
              <Info size={15} style={{ color: 'var(--blue)', marginTop: '2px', flexShrink: 0 }} />
              <div>
                <div className="font-bold" style={{ fontSize: '11px', color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: '3px' }}>
                  Nota del equipo de sistemas
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500, lineHeight: 1.55 }}>
                  {reporte.notaAdmin}
                </p>
              </div>
            </div>
          )}

          {/* Chat */}
          <TicketChat reporteId={reporte.id} isAdmin={false} />
        </div>
      )}
    </div>
  );
}

// ── empty state ───────────────────────────────────────────────────────

function EmptyState({ onNuevo }: { onNuevo: () => void }) {
  return (
    <div className="card px-6 py-12 flex flex-col items-center gap-4 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ background: 'linear-gradient(135deg, var(--blue-lt), var(--surface))', border: '1px solid var(--blue-brd)' }}
      >
        <CheckCircle2 size={30} style={{ color: 'var(--blue-mid)' }} />
      </div>
      <div>
        <p className="font-extrabold" style={{ fontSize: '16px', color: 'var(--text)', letterSpacing: '-.2px' }}>
          Sin reportes todavía
        </p>
        <p className="mt-1.5" style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.6 }}>
          Si encontrás algún problema con el sistema,<br />podés reportarlo y te responderemos a la brevedad.
        </p>
      </div>
      <button onClick={onNuevo} className="btn btn-primary btn-sm">
        <Plus size={14} />Reportar un problema
      </button>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────

export function MisReportesPage() {
  const [showModal, setShowModal] = useState(false);
  const { data: reportes = [], isLoading, refetch } = useQuery({
    queryKey: ['mis-reportes'],
    queryFn: reportesApi.getMios,
    refetchInterval: 60_000,
  });

  const pendientes = reportes.filter((r) => r.estado === 'pendiente' || r.estado === 'abierto').length;
  const enProceso  = reportes.filter((r) => r.estado === 'en_proceso').length;
  const cerrados   = reportes.filter((r) => r.estado === 'cerrado').length;
  const resueltos  = reportes.filter((r) => r.estado === 'solucionado' || r.estado === 'resuelto').length;

  return (
    <div className="page-shell-form">
      {/* Heading */}
      <div className="page-heading">
        <div className="page-kicker">Soporte</div>
        <h1 className="page-title">Mis reportes</h1>
        <p className="page-subtitle">Seguí el estado de los problemas que reportaste al equipo de sistemas.</p>
      </div>

      {/* Stats strip */}
      {reportes.length > 0 && (
        <div className="grid grid-cols-4 gap-2 anim">
          {[
            { label: 'Pendientes',  value: pendientes, ...ESTADO_META['pendiente'] },
            { label: 'En proceso',  value: enProceso,  ...ESTADO_META['en_proceso'] },
            { label: 'Resueltos',   value: resueltos,  ...ESTADO_META['solucionado'] },
            { label: 'Cerrados',    value: cerrados,   ...ESTADO_META['cerrado'] },
          ].map(({ label, value, colorText, colorBg, colorBorder, icon }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl"
              style={{ background: colorBg, border: `1px solid ${colorBorder}` }}
            >
              <div style={{ color: colorText }}>{icon}</div>
              <div className="font-black tabular-nums" style={{ fontSize: '22px', color: colorText, letterSpacing: '-1px', lineHeight: 1 }}>
                {value}
              </div>
              <div className="font-semibold text-center leading-tight" style={{ fontSize: '11px', color: colorText }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-between gap-3">
        <p style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: 600 }}>
          {isLoading ? 'Actualizando reportes…' : `${reportes.length} reporte${reportes.length !== 1 ? 's' : ''} en total`}
        </p>
        <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm">
          <Plus size={14} />Nuevo reporte
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <RadaTillyLoader variant="contained" label="Cargando tus reportes" />
      ) : reportes.length === 0 ? (
        <EmptyState onNuevo={() => setShowModal(true)} />
      ) : (
        <div className="space-y-3 anim">
          {reportes.map((r) => (
            <TicketCard key={r.id} reporte={r} />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ReportarProblemaModal
          onClose={() => {
            setShowModal(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}

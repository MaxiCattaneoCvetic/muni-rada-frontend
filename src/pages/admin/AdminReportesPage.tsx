import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pagination, usePagination } from '../../components/ui/Pagination';
import {
  AlertOctagon,
  Database,
  Lock,
  Gauge,
  Monitor,
  HelpCircle,
  X,
  ExternalLink,
  Clock,
  CheckCircle2,
  ChevronDown,
  Search,
  RotateCcw,
  XCircle,
  PlayCircle,
  Loader2,
  MessageSquarePlus,
} from 'lucide-react';
import { reportesApi, type Reporte, type EstadoReporte, type TipoReporte, type PrioridadReporte } from '../../api/reportes';
import { ButtonSpinner, RadaTillyLoader } from '../../components/ui/loading';
import { formatDateTime } from '../../lib/utils';
import { TicketChat } from '../../components/reportar/TicketChat';

// ── helpers ──────────────────────────────────────────────────────────

const TIPO_META: Record<TipoReporte, { label: string; icon: React.ReactNode; badgeClass: string }> = {
  error_sistema:     { label: 'Error de sistema',     icon: <AlertOctagon size={14} />,  badgeClass: 'badge-red' },
  datos_incorrectos: { label: 'Datos incorrectos',    icon: <Database size={14} />,       badgeClass: 'badge-amber' },
  acceso:            { label: 'Acceso',               icon: <Lock size={14} />,           badgeClass: 'badge-purple' },
  lentitud:          { label: 'Lentitud',             icon: <Gauge size={14} />,          badgeClass: 'badge-sky' },
  interfaz:          { label: 'Interfaz/visual',      icon: <Monitor size={14} />,        badgeClass: 'badge-teal' },
  otro:              { label: 'Otro',                 icon: <HelpCircle size={14} />,     badgeClass: 'badge-slate' },
};

const PRIORIDAD_META: Record<PrioridadReporte, { label: string; badgeClass: string; dot: string }> = {
  baja:  { label: 'Baja',  badgeClass: 'badge-slate',  dot: 'bg-slate-400' },
  media: { label: 'Media', badgeClass: 'badge-amber',  dot: 'bg-amber-400' },
  alta:  { label: 'Alta',  badgeClass: 'badge-red',    dot: 'bg-red-500' },
};

const ESTADO_META: Record<EstadoReporte, { label: string; badgeClass: string; icon: React.ReactNode; dot: string }> = {
  pendiente:   { label: 'Pendiente',    badgeClass: 'badge-slate',  icon: <Clock size={12} />,        dot: 'bg-slate-400' },
  en_proceso:  { label: 'En proceso',   badgeClass: 'badge-blue',   icon: <Loader2 size={12} />,      dot: 'bg-blue-500' },
  solucionado: { label: 'Solucionado',  badgeClass: 'badge-green',  icon: <CheckCircle2 size={12} />, dot: 'bg-green-500' },
  cerrado:     { label: 'Cerrado',      badgeClass: 'badge-red',    icon: <XCircle size={12} />,      dot: 'bg-red-500' },
  // legacy
  abierto:     { label: 'Pendiente',    badgeClass: 'badge-slate',  icon: <Clock size={12} />,        dot: 'bg-slate-400' },
  resuelto:    { label: 'Solucionado',  badgeClass: 'badge-green',  icon: <CheckCircle2 size={12} />, dot: 'bg-green-500' },
};

type Accion = { nextEstado: EstadoReporte; label: string; btnClass: string; icon: React.ReactNode };

function getAcciones(estado: EstadoReporte): Accion[] {
  switch (estado) {
    case 'pendiente':
    case 'abierto':  // legacy
      return [
        { nextEstado: 'en_proceso',  label: 'Tomar ticket',      btnClass: 'btn-primary', icon: <PlayCircle size={14} /> },
        { nextEstado: 'cerrado',     label: 'Cerrar sin resolver', btnClass: 'btn-ghost',  icon: <XCircle size={14} /> },
      ];
    case 'en_proceso':
      return [
        { nextEstado: 'solucionado', label: 'Marcar solucionado', btnClass: 'btn-success', icon: <CheckCircle2 size={14} /> },
        { nextEstado: 'cerrado',     label: 'Cerrar ticket',      btnClass: 'btn-ghost',   icon: <XCircle size={14} /> },
      ];
    case 'cerrado':
      return [
        { nextEstado: 'en_proceso', label: 'Reabrir', btnClass: 'btn-primary', icon: <RotateCcw size={14} /> },
      ];
    case 'solucionado':
    case 'resuelto':  // legacy
      return [];
  }
}

function nombreUsuario(r: Reporte) {
  if (!r.reportadoPor) return 'Usuario desconocido';
  return `${r.reportadoPor.nombre} ${r.reportadoPor.apellido}`.trim() || r.reportadoPor.email;
}

// ── stat card ─────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: 'blue' | 'amber' | 'red' | 'green' | 'slate' }) {
  const styles: Record<string, { iconBg: string; text: string }> = {
    blue:  { iconBg: 'var(--blue)',       text: 'var(--blue)' },
    amber: { iconBg: 'var(--amber-mid)',  text: 'var(--amber)' },
    red:   { iconBg: '#ef4444',           text: '#ef4444' },
    green: { iconBg: 'var(--green-mid)',  text: 'var(--green)' },
    slate: { iconBg: 'var(--text3)',      text: 'var(--text)' },
  };
  const s = styles[color];

  return (
    <div className="card kpi-card px-5 py-4 flex items-center gap-4">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
        style={{ background: s.iconBg, boxShadow: `0 4px 12px color-mix(in srgb, ${s.iconBg} 40%, transparent)` }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="font-black tabular-nums" style={{ fontSize: '26px', color: s.text, letterSpacing: '-1px', lineHeight: 1 }}>
          {value}
        </div>
        <div className="mt-0.5 font-semibold truncate" style={{ fontSize: '12px', color: 'var(--text2)' }}>
          {label}
        </div>
      </div>
    </div>
  );
}

// ── ticket row ────────────────────────────────────────────────────────

function TicketRow({ ticket, onSelect }: { ticket: Reporte; onSelect: () => void }) {
  const tipo      = TIPO_META[ticket.tipo];
  const estado    = ESTADO_META[ticket.estado];

  return (
    <button onClick={onSelect} className="w-full text-left group transition-all" style={{ outline: 'none' }}>
      <div
        className="flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all group-hover:-translate-y-px"
        style={{ background: 'var(--white)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-xs)' }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)';
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border2)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-xs)';
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
        }}
      >
        <div className={`w-2 h-2 rounded-full shrink-0 ${estado.dot}`} />
        <span className={`badge ${tipo.badgeClass} gap-1 shrink-0 hidden sm:inline-flex`}>
          {tipo.icon}{tipo.label}
        </span>
        <p className="flex-1 min-w-0 font-semibold truncate" style={{ fontSize: '13px', color: 'var(--text)' }}>
          {ticket.descripcion}
        </p>
        <span className="shrink-0 hidden md:block" style={{ fontSize: '12px', color: 'var(--text2)', fontWeight: 600 }}>
          {nombreUsuario(ticket)}
        </span>
        <span className="shrink-0 hidden lg:block" style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 600, minWidth: '120px', textAlign: 'right' }}>
          {formatDateTime(ticket.createdAt)}
        </span>
        <span className={`badge ${estado.badgeClass} gap-1 shrink-0`}>
          {estado.icon}
          <span className="hidden sm:inline">{estado.label}</span>
        </span>
        <ChevronDown size={14} className="shrink-0 transition-transform group-hover:rotate-180" style={{ color: 'var(--text3)' }} />
      </div>
    </button>
  );
}

// ── detail modal ──────────────────────────────────────────────────────

function TicketDetailModal({ ticket, onClose, onEstadoChange }: {
  ticket: Reporte;
  onClose: () => void;
  onEstadoChange: (t: Reporte) => void;
}) {
  const qc        = useQueryClient();
  const [nota, setNota] = useState('');
  const [showNota, setShowNota] = useState(false);
  const tipo      = TIPO_META[ticket.tipo];
  const prioridad = PRIORIDAD_META[ticket.prioridad];
  const estado    = ESTADO_META[ticket.estado];
  const acciones  = getAcciones(ticket.estado);

  const mut = useMutation({
    mutationFn: ({ nextEstado, notaAdmin }: { nextEstado: EstadoReporte; notaAdmin?: string }) =>
      reportesApi.updateEstado(ticket.id, nextEstado, notaAdmin || undefined),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['reportes-admin'] });
      onEstadoChange(updated);
      setNota('');
      setShowNota(false);
    },
  });

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-5"
      style={{ background: 'rgba(15,23,42,.55)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-[680px] max-h-[90vh] overflow-y-auto flex flex-col anim"
        style={{
          background: 'var(--white)',
          borderRadius: '20px',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid rgba(255,255,255,.8)',
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex items-start justify-between gap-3 sticky top-0 z-10"
          style={{
            borderBottom: '1px solid var(--border)',
            background: 'linear-gradient(135deg, #fff, #fafbfd)',
            borderRadius: '20px 20px 0 0',
          }}
        >
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className={`badge ${tipo.badgeClass} gap-1.5 shrink-0`}>{tipo.icon}{tipo.label}</span>
            <span className={`badge ${prioridad.badgeClass} shrink-0`}>{prioridad.label}</span>
            <span className={`badge ${estado.badgeClass} gap-1 shrink-0`}>{estado.icon}{estado.label}</span>
          </div>
          <button
            onClick={onClose}
            className="w-[30px] h-[30px] rounded-lg flex items-center justify-center shrink-0 transition-all"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)', boxShadow: 'var(--shadow-xs)' }}
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
        <div className="px-5 py-5 space-y-5 flex-1">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div>
              <div className="label">Reportado por</div>
              <div className="font-bold" style={{ fontSize: '13px', color: 'var(--text)' }}>{nombreUsuario(ticket)}</div>
              {ticket.reportadoPor?.email && (
                <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{ticket.reportadoPor.email}</div>
              )}
            </div>
            <div>
              <div className="label">Fecha</div>
              <div className="font-bold" style={{ fontSize: '13px', color: 'var(--text)' }}>{formatDateTime(ticket.createdAt)}</div>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <div className="label">Descripción</div>
            <div
              className="rounded-xl p-4 whitespace-pre-wrap leading-relaxed"
              style={{ background: 'var(--white)', border: '1px solid var(--border)', fontSize: '13px', color: 'var(--text)', boxShadow: 'var(--shadow-xs)' }}
            >
              {ticket.descripcion}
            </div>
          </div>

          {/* Screenshot */}
          {ticket.screenshotUrl && (
            <div>
              <div className="label">Screenshot adjunto</div>
              <div className="relative overflow-hidden rounded-xl" style={{ border: '1px solid var(--border)' }}>
                <img src={ticket.screenshotUrl} alt="Screenshot del problema" className="w-full object-cover" style={{ maxHeight: '220px' }} />
                <a
                  href={ticket.screenshotUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-white"
                  style={{ fontSize: '11px', background: 'rgba(15,23,42,.7)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,.15)' }}
                >
                  <ExternalLink size={11} />Ver completo
                </a>
              </div>
            </div>
          )}

          {/* Nota admin actual */}
          {ticket.notaAdmin && (
            <div
              className="rounded-xl px-4 py-3"
              style={{ background: 'var(--blue-lt)', border: '1px solid var(--blue-brd)' }}
            >
              <div className="label" style={{ color: 'var(--blue)', marginBottom: '4px' }}>Aclaración del equipo de sistemas</div>
              <p style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500, lineHeight: 1.55 }}>
                {ticket.notaAdmin}
              </p>
            </div>
          )}

          {/* Chat */}
          <TicketChat reporteId={ticket.id} isAdmin={true} />
        </div>

        {/* Footer */}
        <div
          className="px-5 pb-4 pt-3 space-y-3 sticky bottom-0"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--white)' }}
        >
          {/* Nota / aclaración de estado */}
          {acciones.length > 0 && (
            <div>
              {!showNota ? (
                <button
                  onClick={() => setShowNota(true)}
                  className="flex items-center gap-1.5 font-semibold transition-colors"
                  style={{ fontSize: '12px', color: 'var(--text3)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--blue)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text3)')}
                >
                  <MessageSquarePlus size={13} />
                  Agregar aclaración de estado para el usuario
                </button>
              ) : (
                <div className="space-y-1.5">
                  <div className="label" style={{ marginBottom: 0 }}>
                    Aclaración de estado <span style={{ color: 'var(--text3)', fontWeight: 500 }}>(visible para el usuario)</span>
                  </div>
                  <textarea
                    className="input resize-none w-full"
                    rows={2}
                    placeholder="Ej: Estamos revisando el problema, te contactamos en breve…"
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    style={{ fontSize: '13px' }}
                    autoFocus
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-between items-center">
            <button onClick={onClose} className="btn btn-ghost btn-sm">
              Cerrar
            </button>
            <div className="flex gap-2">
              {acciones.map((accion) => (
                <button
                  key={accion.nextEstado}
                  onClick={() => mut.mutate({ nextEstado: accion.nextEstado, notaAdmin: nota })}
                  disabled={mut.isPending}
                  className={`btn btn-sm ${accion.btnClass}`}
                >
                  {mut.isPending ? (
                    <ButtonSpinner label="Actualizando" />
                  ) : (
                    <>{accion.icon}{accion.label}</>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── filter pill ───────────────────────────────────────────────────────

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full font-bold transition-all"
      style={{
        fontSize: '12px',
        background: active ? 'var(--gradient-blue)' : 'var(--white)',
        color: active ? '#fff' : 'var(--text2)',
        border: active ? 'none' : '1.5px solid var(--border2)',
        boxShadow: active ? 'var(--shadow-blue)' : 'var(--shadow-xs)',
        transform: active ? 'translateY(-1px)' : 'none',
      }}
    >
      {children}
    </button>
  );
}

// ── main page ─────────────────────────────────────────────────────────

type EstadoFilter   = 'todos' | 'activos' | EstadoReporte;
type PrioridadFilter = 'todos' | PrioridadReporte;

export function AdminReportesPage() {
  const qc = useQueryClient();
  const { data: reportes = [], isLoading, isError } = useQuery({
    queryKey: ['reportes-admin'],
    queryFn: reportesApi.getAll,
    refetchInterval: 60_000,
  });

  const [search, setSearch]               = useState('');
  const [estadoFilter, setEstadoFilter]   = useState<EstadoFilter>('todos');
  const [prioridadFilter, setPrioridadFilter] = useState<PrioridadFilter>('todos');
  const [selected, setSelected]           = useState<Reporte | null>(null);
  const [page, setPage]                   = useState(1);

  const total      = reportes.length;
  const pendientes = reportes.filter((r) => r.estado === 'pendiente' || r.estado === 'abierto').length;
  const enProceso  = reportes.filter((r) => r.estado === 'en_proceso').length;
  const resueltos  = reportes.filter((r) => r.estado === 'solucionado' || r.estado === 'resuelto').length;

  // normaliza estados legacy para que los filtros sean consistentes
  const normalizeEstado = (e: EstadoReporte): EstadoReporte =>
    e === 'abierto' ? 'pendiente' : e === 'resuelto' ? 'solucionado' : e;

  const filtered = reportes.filter((r) => {
    if (estadoFilter !== 'todos') {
      const norm = normalizeEstado(r.estado);
      if (estadoFilter === 'activos') {
        if (norm !== 'pendiente' && norm !== 'en_proceso') return false;
      } else if (norm !== estadoFilter) return false;
    }
    if (prioridadFilter !== 'todos' && r.prioridad !== prioridadFilter) return false;
    if (search) {
      const q    = search.toLowerCase();
      const desc = r.descripcion.toLowerCase();
      const user = nombreUsuario(r).toLowerCase();
      const tipo = TIPO_META[r.tipo].label.toLowerCase();
      if (!desc.includes(q) && !user.includes(q) && !tipo.includes(q)) return false;
    }
    return true;
  });

  const { page: safePage, totalPages, start, end } = usePagination({
    total: filtered.length,
    pageSize: 15,
    page,
    setPage,
    resetDeps: [search, estadoFilter, prioridadFilter],
  });

  const pageItems = filtered.slice(start, end);

  return (
    <div className="page-shell space-y-5">
      {/* Heading */}
      <div className="page-heading">
        <div className="page-kicker">Sistema</div>
        <h1 className="page-title">Soporte · Tickets</h1>
        <p className="page-subtitle">Gestioná los reportes de problemas enviados por los usuarios.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 anim">
        <StatCard label="Total de tickets"  value={total}      icon={<AlertOctagon size={20} />} color="slate" />
        <StatCard label="Pendientes"        value={pendientes} icon={<Clock size={20} />}        color="amber" />
        <StatCard label="En proceso"        value={enProceso}  icon={<Loader2 size={20} />}      color="blue" />
        <StatCard label="Solucionados"      value={resueltos}  icon={<CheckCircle2 size={20} />} color="green" />
      </div>

      {/* Filters */}
      <div className="card px-4 py-3.5 space-y-3" style={{ animationDelay: '60ms' }}>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }} />
          <input
            type="text"
            className="input pl-9"
            placeholder="Buscar por descripción, usuario o tipo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="label self-center mr-1">Estado:</span>
          {(
            [
              { key: 'todos',       label: 'Todos' },
              { key: 'activos',     label: 'Activos' },
              { key: 'pendiente',   label: 'Pendiente' },
              { key: 'en_proceso',  label: 'En proceso' },
              { key: 'solucionado', label: 'Solucionado' },
              { key: 'cerrado',     label: 'Cerrado' },
            ] as { key: EstadoFilter; label: string }[]
          ).map(({ key, label }) => (
            <FilterPill key={key} active={estadoFilter === key} onClick={() => setEstadoFilter(key)}>
              {label}
            </FilterPill>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="label self-center mr-1">Prioridad:</span>
          {(['todos', 'alta', 'media', 'baja'] as const).map((p) => (
            <FilterPill key={p} active={prioridadFilter === p} onClick={() => setPrioridadFilter(p)}>
              {p === 'todos' ? 'Todas' : PRIORIDAD_META[p as PrioridadReporte]?.label ?? p}
            </FilterPill>
          ))}
        </div>
      </div>

      {/* Ticket list */}
      <div className="space-y-2 anim" style={{ animationDelay: '100ms' }}>
        {isLoading && <RadaTillyLoader variant="contained" label="Cargando tickets" />}
        {isError && (
          <div className="alert alert-danger">No se pudieron cargar los tickets. Intentá refrescar.</div>
        )}
        {!isLoading && !isError && filtered.length === 0 && (
          <div className="card px-5 py-10 flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <CheckCircle2 size={26} style={{ color: 'var(--text3)' }} />
            </div>
            <div>
              <p className="font-extrabold" style={{ fontSize: '14px', color: 'var(--text)' }}>
                {search || estadoFilter !== 'todos' || prioridadFilter !== 'todos'
                  ? 'Sin resultados con esos filtros'
                  : 'Sin tickets por ahora'}
              </p>
              <p className="mt-1" style={{ fontSize: '12px', color: 'var(--text2)' }}>
                {search || estadoFilter !== 'todos' || prioridadFilter !== 'todos'
                  ? 'Probá cambiando los filtros de búsqueda.'
                  : 'Cuando los usuarios reporten problemas aparecerán acá.'}
              </p>
            </div>
            {(search || estadoFilter !== 'todos' || prioridadFilter !== 'todos') && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setEstadoFilter('todos'); setPrioridadFilter('todos'); }}>
                Limpiar filtros
              </button>
            )}
          </div>
        )}

        {pageItems.map((ticket) => (
          <TicketRow key={ticket.id} ticket={ticket} onSelect={() => setSelected(ticket)} />
        ))}

        <Pagination
          page={safePage}
          totalPages={totalPages}
          total={filtered.length}
          start={start}
          end={end}
          onPage={setPage}
          itemLabel={`ticket${filtered.length !== 1 ? 's' : ''}`}
        />
      </div>

      {/* Detail modal */}
      {selected && (
        <TicketDetailModal
          ticket={selected}
          onClose={() => setSelected(null)}
          onEstadoChange={(updated) => {
            setSelected(updated);
            qc.invalidateQueries({ queryKey: ['reportes-admin'] });
          }}
        />
      )}
    </div>
  );
}

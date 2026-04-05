import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configApi, pagosApi, pedidosApi } from '../../api/services';
import { formatMoney, formatDate, stageLabel, stageBadgeClass, stageIcon, pedidoEstadoVisibleLabel } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { ActionModal } from '../../components/ui/ActionModal';
import { OcViewerModal } from '../../components/ui/OcViewerModal';
import { ButtonSpinner, RadaTillyLoader } from '../../components/ui/loading';
import { Pagination, usePagination } from '../../components/ui/Pagination';
import type { Pedido, Pago } from '../../types';
import { PedidoStage } from '../../types';

// ── ADMIN CONFIG ─────────────────────────────────────────────────────
export function AdminConfigPage() {
  const qc = useQueryClient();
  const { data: config } = useQuery({ queryKey: ['config'], queryFn: configApi.get });
  const [form, setForm] = useState<any>(null);
  const [saved, setSaved] = useState(false);

  const cfg = form || config;

  const mut = useMutation({
    mutationFn: () => configApi.update(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['config'] }); setSaved(true); setTimeout(() => setSaved(false), 3000); },
  });

  if (!config) return <RadaTillyLoader variant="fullscreen" label="Cargando configuración" />;

  return (
    <div className="page-shell-form">
      <div className="page-heading">
        <div className="page-kicker">Sistema</div>
        <h1 className="page-title">Configuración del sistema</h1>
        <p className="page-subtitle">Ajustá el comportamiento del flujo y los datos institucionales.</p>
      </div>

      <div className="card p-6 space-y-5">
        <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wide">⚙️ Parámetros del flujo</h2>
        <div>
          <label className="label">Monto límite para sellado provincial ($)</label>
          <input
            type="number"
            defaultValue={config.umbralSellado}
            onChange={e => setForm((f: any) => ({ ...(f || config), umbralSellado: parseFloat(e.target.value) }))}
            className="input"
          />
          <p className="text-xs text-slate-400 mt-1">Pedidos que superen este monto requerirán sellado antes del pago.</p>
        </div>
        <div>
          <label className="label">Máximo de cotizaciones por pedido</label>
          <input
            type="number"
            min={1}
            max={5}
            defaultValue={config.maxPresupuestos ?? 5}
            onChange={e => setForm((f: any) => ({ ...(f || config), maxPresupuestos: parseInt(e.target.value, 10) }))}
            className="input"
          />
          <p className="text-xs text-slate-400 mt-1">Tope absoluto: no se pueden cargar más presupuestos que este número (máx. 5).</p>
        </div>
        <div className="flex items-center gap-3">
          <div
            onClick={() => setForm((f: any) => ({ ...(f || config), bloquearPagoSinSellado: !cfg?.bloquearPagoSinSellado }))}
            className={`toggle-pill ${cfg?.bloquearPagoSinSellado ? 'on' : ''}`}
          />
          <div>
            <div className="text-sm font-semibold">Bloquear pago si sellado está pendiente</div>
            <div className="text-xs text-slate-400">Impide registrar pago hasta completar el sellado.</div>
          </div>
        </div>
        {saved && <div className="alert alert-success">✅ Configuración guardada</div>}
        <button onClick={() => mut.mutate()} disabled={!form || mut.isPending} className="btn btn-primary">
          {mut.isPending ? <ButtonSpinner label="Guardando" /> : 'Guardar cambios'}
        </button>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wide">🏛️ Institución</h2>
        <div>
          <label className="label">Nombre de la municipalidad</label>
          <input defaultValue={config.nombreMunicipalidad} onChange={e => setForm((f: any) => ({ ...(f || config), nombreMunicipalidad: e.target.value }))} className="input" />
        </div>
        <div>
          <label className="label">CUIT institucional</label>
          <input defaultValue={config.cuitInstitucional || ''} onChange={e => setForm((f: any) => ({ ...(f || config), cuitInstitucional: e.target.value }))} className="input" />
        </div>
      </div>
    </div>
  );
}

// ── HISTORIAL ─────────────────────────────────────────────────────────
export function HistorialPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'activos' | 'archivados'>('activos');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data: pedidosActivos = [], isLoading: loadingActivos } = useQuery({
    queryKey: ['pedidos-historial-activos', user?.rol],
    queryFn: () => pedidosApi.getAll(),
  });

  const { data: pedidosConArchivados = [], isLoading: loadingArchivados } = useQuery({
    queryKey: ['pedidos-historial-archivados', user?.rol],
    queryFn: () => pedidosApi.getAll({ includeArchived: true }),
    enabled: activeTab === 'archivados',
  });

  const pedidos = activeTab === 'activos'
    ? pedidosActivos
    : pedidosConArchivados.filter(p => !!p.archivedAt);
  const isLoading = activeTab === 'activos' ? loadingActivos : loadingArchivados;

  const filtered = pedidos.filter(p => {
    const matchSearch = !search || p.descripcion.toLowerCase().includes(search.toLowerCase()) || p.numero.includes(search) || p.area.toLowerCase().includes(search.toLowerCase());
    const matchStage = !stageFilter || p.stage === parseInt(stageFilter);
    return matchSearch && matchStage;
  });

  const { page: safePage, totalPages, start, end } = usePagination({
    total: filtered.length,
    pageSize: 15,
    page,
    setPage,
    resetDeps: [search, stageFilter, activeTab],
  });

  const pageItems = filtered.slice(start, end);

  return (
    <div className="page-shell space-y-4">
      <div className="page-heading">
        <div className="page-kicker">Consulta</div>
        <h1 className="page-title">Historial de pedidos</h1>
      </div>

      {/* Tabs */}
      <div className="segmented-tabs">
        <button
          className={`segmented-tab${activeTab === 'activos' ? ' active' : ''}`}
          onClick={() => { setActiveTab('activos'); setSearch(''); setStageFilter(''); }}
        >
          Activos
        </button>
        <button
          className={`segmented-tab${activeTab === 'archivados' ? ' active' : ''}`}
          onClick={() => { setActiveTab('archivados'); setSearch(''); setStageFilter(''); }}
        >
          Archivados
        </button>
      </div>

      {activeTab === 'archivados' && (
        <div className="alert alert-info text-sm">
          Los pedidos archivados son aquellos en estado <strong>Suministros entregados</strong> o <strong>Rechazados</strong> que superaron los 3 días sin actividad. Son solo lectura.
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)} className="input flex-1 min-w-48" placeholder="🔍 Buscar por descripción, área o N°..." />
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className="input w-auto">
          <option value="">Todas las etapas</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>{stageLabel(s)}</option>)}
        </select>
      </div>
      <div className="card overflow-hidden">
        {isLoading ? <RadaTillyLoader variant="contained" label="Cargando historial" /> : (
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['N°', 'Descripción', 'Área', 'Estado', 'Monto', 'Fecha'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">{h}</th>
                ))}
                {activeTab === 'archivados' && (
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">Archivado</th>
                )}
              </tr>
            </thead>
            <tbody>
              {pageItems.map(p => {
                const isDelivered = p.stage === 7;
                return (
                  <tr key={p.id} onClick={() => navigate(`/pedidos/${p.id}`)} className={`cursor-pointer transition-colors ${isDelivered ? 'bg-emerald-50/50 hover:bg-emerald-50' : 'hover:bg-slate-50'}`}>
                    <td className={`px-4 py-3 font-mono text-xs ${isDelivered ? 'text-emerald-600' : 'text-slate-400'}`}>{p.numero}</td>
                    <td className={`px-4 py-3 font-semibold ${isDelivered ? 'text-emerald-800' : ''}`}>
                      {isDelivered && <span className="mr-1.5">✅</span>}
                      {p.descripcion}
                      {p.urgente && <span className="ml-2 badge badge-amber text-xs">URG</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{p.area}</td>
                    <td className="px-4 py-3"><span className={`badge ${stageBadgeClass(p.stage)}`}>{pedidoEstadoVisibleLabel(p)}</span></td>
                    <td className="px-4 py-3 font-mono text-sm">{formatMoney(p.monto)}</td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(p.createdAt)}</td>
                    {activeTab === 'archivados' && (
                      <td className="px-4 py-3 text-slate-400">{p.archivedAt ? formatDate(p.archivedAt) : '—'}</td>
                    )}
                  </tr>
                );
              })}
              {pageItems.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={activeTab === 'archivados' ? 7 : 6} className="px-4 py-10 text-center text-slate-400 text-sm">
                    {activeTab === 'archivados' ? 'No hay pedidos archivados todavía.' : 'No se encontraron pedidos.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      <Pagination
        page={safePage}
        totalPages={totalPages}
        total={filtered.length}
        start={start}
        end={end}
        onPage={setPage}
        itemLabel="pedidos"
      />
    </div>
  );
}

// ── TESORERÍA ─────────────────────────────────────────────────────────
// ── TESORERÍA HELPERS ────────────────────────────────────────────────

type UrgenciaTipo = 'vencida' | 'urgente' | 'proxima' | 'normal' | 'sin-fecha';

function getUrgencia(fechaLimitePago?: string): UrgenciaTipo {
  if (!fechaLimitePago) return 'sin-fecha';
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);
  const enSieteDias = new Date(hoy);
  enSieteDias.setDate(enSieteDias.getDate() + 7);
  const fecha = new Date(fechaLimitePago);
  fecha.setHours(0, 0, 0, 0);
  if (fecha < hoy) return 'vencida';
  if (fecha <= manana) return 'urgente';
  if (fecha <= enSieteDias) return 'proxima';
  return 'normal';
}

const URGENCIA_ORDER: Record<UrgenciaTipo, number> = {
  vencida: 0, urgente: 1, proxima: 2, normal: 3, 'sin-fecha': 4,
};

function UrgenciaBadge({ urgencia, fecha }: { urgencia: UrgenciaTipo; fecha?: string }) {
  if (urgencia === 'sin-fecha') return null;
  const label = fecha ? formatDate(fecha) : '';
  const styles: Record<Exclude<UrgenciaTipo, 'sin-fecha'>, string> = {
    vencida: 'bg-red-100 text-red-700',
    urgente: 'bg-amber-100 text-amber-700',
    proxima: 'bg-yellow-100 text-yellow-700',
    normal:  'bg-blue-100 text-blue-600',
  };
  const icons: Record<Exclude<UrgenciaTipo, 'sin-fecha'>, string> = {
    vencida: '⚠️',
    urgente: '🔴',
    proxima: '🟡',
    normal:  '📅',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${styles[urgencia as Exclude<UrgenciaTipo, 'sin-fecha'>]}`}>
      {icons[urgencia as Exclude<UrgenciaTipo, 'sin-fecha'>]}
      {urgencia === 'vencida' ? `Vencida el ${label}` : `Vence ${label}`}
    </span>
  );
}

function cardBorderClass(p: Pedido): string {
  if (p.bloqueado) return 'border-l-red-500 bg-red-50/30';
  const urg = getUrgencia(p.fechaLimitePago);
  if (urg === 'vencida') return 'border-l-red-500';
  if (urg === 'urgente') return 'border-l-amber-400';
  if (urg === 'proxima') return 'border-l-yellow-400';
  return 'border-l-blue-500';
}

// ── TESORERÍA PAGE ────────────────────────────────────────────────────

export function TesoreriaPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const { data: pedidos = [], isLoading: pedidosLoading } = useQuery({
    queryKey: ['pedidos', user?.rol],
    queryFn: () => pedidosApi.getAll(),
  });
  const { data: pagos = [], isLoading: pagosLoading } = useQuery({
    queryKey: ['pagos'],
    queryFn: () => pagosApi.getAll(),
  });
  const [modal, setModal] = useState<{ pedido: Pedido; action: string } | null>(null);
  const [historialOpen, setHistorialOpen] = useState(false);
  const [facturaViewer, setFacturaViewer] = useState<{ url: string; numero: string; pedidoNumero: string } | null>(null);

  const pendientes = pedidos.filter(p => p.stage === PedidoStage.GESTION_PAGOS);
  const bloqueados = pendientes.filter(p => p.bloqueado);
  const vencidas = pendientes.filter(p => getUrgencia(p.fechaLimitePago) === 'vencida');
  const urgentes = pendientes.filter(p => getUrgencia(p.fechaLimitePago) === 'urgente');

  const pendientesOrdenados = [...pendientes].sort((a, b) => {
    const diff = URGENCIA_ORDER[getUrgencia(a.fechaLimitePago)] - URGENCIA_ORDER[getUrgencia(b.fechaLimitePago)];
    if (diff !== 0) return diff;
    if (a.fechaLimitePago && b.fechaLimitePago) {
      return new Date(a.fechaLimitePago).getTime() - new Date(b.fechaLimitePago).getTime();
    }
    return 0;
  });

  return (
    <div className="page-shell space-y-6">
      <div className="page-heading">
        <div className="page-kicker">Tesorería</div>
        <h1 className="page-title">Gestión de pagos</h1>
        <p className="page-subtitle">Sellados y pagos pendientes, con seguimiento de vencimientos de factura.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat-card text-center">
          <div className={`stat-number ${vencidas.length > 0 ? 'text-red-600' : 'text-slate-400'}`}>{vencidas.length}</div>
          <div className="stat-label">Vencidas</div>
        </div>
        <div className="stat-card text-center">
          <div className={`stat-number ${urgentes.length > 0 ? 'text-amber-500' : 'text-slate-400'}`}>{urgentes.length}</div>
          <div className="stat-label">Hoy / mañana</div>
        </div>
        <div className="stat-card text-center">
          <div className={`stat-number ${bloqueados.length > 0 ? 'text-orange-500' : 'text-slate-400'}`}>{bloqueados.length}</div>
          <div className="stat-label">Con sellado pendiente</div>
        </div>
        <div className="stat-card text-center">
          <div className="stat-number text-blue-600">{pendientes.length}</div>
          <div className="stat-label">Total pendientes</div>
        </div>
      </div>

      {vencidas.length > 0 && (
        <div className="alert alert-danger">
          ⚠️ {vencidas.length} factura{vencidas.length !== 1 ? 's' : ''} vencida{vencidas.length !== 1 ? 's' : ''} — requieren pago inmediato.
        </div>
      )}
      {bloqueados.length > 0 && (
        <div className="alert alert-danger">
          🔒 {bloqueados.length} pedido{bloqueados.length !== 1 ? 's' : ''} bloqueado{bloqueados.length !== 1 ? 's' : ''} — registrá el sellado provincial para habilitar el pago.
        </div>
      )}

      {pedidosLoading ? (
        <RadaTillyLoader variant="contained" label="Cargando pedidos" />
      ) : (
        <div className="space-y-4">
          {pendientesOrdenados.map(p => {
            const urg = getUrgencia(p.fechaLimitePago);
            return (
              <div key={p.id} className={`card p-5 border-l-4 ${cardBorderClass(p)}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-slate-400">{p.numero}</span>
                      {p.fechaLimitePago && <UrgenciaBadge urgencia={urg} fecha={p.fechaLimitePago} />}
                      {p.bloqueado && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                          🔒 Req. sellado
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-slate-800 mt-1">{p.descripcion}</div>
                    <div className="text-sm text-slate-500 mt-0.5">
                      📍 {p.area}{p.proveedorSeleccionado ? ` · ${p.proveedorSeleccionado}` : ''}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-black font-mono text-xl">{formatMoney(p.monto)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-4 flex-wrap">
                  {p.facturaComprasUrl && (
                    <button
                      type="button"
                      onClick={() => setFacturaViewer({ url: p.facturaComprasUrl!, numero: 'Factura proveedor', pedidoNumero: p.numero })}
                      className="doc-link text-sm"
                    >
                      🧾 Ver factura proveedor
                    </button>
                  )}
                  {p.bloqueado ? (
                    <button onClick={() => setModal({ pedido: p, action: 'sellado' })} className="btn btn-danger btn-sm gap-1">
                      🏛️ Registrar sellado
                    </button>
                  ) : (
                    <button onClick={() => setModal({ pedido: p, action: 'pago' })} className="btn btn-success btn-sm gap-1">
                      💳 Registrar pago
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {pendientes.length === 0 && (
            <div className="card p-12 text-center text-slate-400">
              <div className="empty-icon">✅</div>
              <div className="empty-title">Sin pedidos pendientes de pago</div>
            </div>
          )}
        </div>
      )}

      {/* Historial de pagos registrados */}
      <div className="card overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-4 text-left font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          onClick={() => setHistorialOpen(v => !v)}
        >
          <span>📋 Historial de pagos registrados</span>
          <span className="text-slate-400 text-sm font-normal">
            {historialOpen ? '▲ Ocultar' : `▼ Ver ${pagos.length} pago${pagos.length !== 1 ? 's' : ''}`}
          </span>
        </button>
        {historialOpen && (
          pagosLoading ? (
            <div className="px-5 py-4">
              <RadaTillyLoader variant="contained" label="Cargando historial" />
            </div>
          ) : pagos.length === 0 ? (
            <div className="px-5 py-6 text-center text-slate-400 text-sm">
              Aún no hay pagos registrados.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {['Pedido', 'Transferencia', 'Fecha pago', 'Monto', 'Comprobante'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(pagos as Pago[]).map(pago => (
                  <tr key={pago.id}>
                    <td className="font-mono text-xs text-slate-400">{pago.pedidoId}</td>
                    <td className="font-semibold">{pago.numeroTransferencia}</td>
                    <td className="text-slate-500">{formatDate(pago.fechaPago)}</td>
                    <td className="font-mono">{formatMoney(pago.montoPagado)}</td>
                    <td>
                      {pago.facturaUrl ? (
                        <a href={pago.facturaUrl} target="_blank" rel="noreferrer" className="doc-link">📄 Ver comprobante</a>
                      ) : (
                        <span className="badge badge-amber">Sin adjunto</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

      {modal && (
        <ActionModal
          pedido={modal.pedido}
          action={modal.action}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); qc.invalidateQueries({ queryKey: ['pedidos'] }); }}
        />
      )}

      {facturaViewer && (
        <OcViewerModal
          url={facturaViewer.url}
          numero={facturaViewer.numero}
          pedidoNumero={facturaViewer.pedidoNumero}
          onClose={() => setFacturaViewer(null)}
        />
      )}
    </div>
  );
}

// ── ADMIN PEDIDOS ─────────────────────────────────────────────────────
export function AdminPedidosPage() {
  const navigate = useNavigate();
  const { data: pedidos = [], isLoading } = useQuery({ queryKey: ['pedidos-admin'], queryFn: () => pedidosApi.getAllAdmin() });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filtered = pedidos.filter(p =>
    !search || p.descripcion.toLowerCase().includes(search.toLowerCase()) || p.numero.includes(search)
  );

  const byStage = [1, 2, 3, 4, 5, 6, 7, 8].map((s) => ({
    stage: s,
    count: pedidos.filter((p) => p.stage === s).length,
  }));

  const { page: safePage, totalPages, start, end } = usePagination({
    total: filtered.length,
    pageSize: 15,
    page,
    setPage,
    resetDeps: [search],
  });

  const pageItems = filtered.slice(start, end);

  return (
    <div className="page-shell space-y-6">
      <div className="page-heading">
        <div className="page-kicker">Administración</div>
        <h1 className="page-title">Todos los pedidos</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
        {byStage.map(({ stage, count }) => (
          <div key={stage} className="stat-card p-3 text-center">
            <div className="text-xl font-black">{count}</div>
            <div className="text-xs text-slate-400 font-medium mt-0.5 leading-tight" style={{ fontSize: '9px' }}>{stageIcon(stage)} {stageLabel(stage)}</div>
          </div>
        ))}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} className="input" placeholder="🔍 Buscar..." />

      <div className="card overflow-hidden">
        {isLoading ? <RadaTillyLoader variant="contained" label="Cargando pedidos" /> : (
          <table className="w-full text-sm">
            <thead>
              <tr>{['N°','Descripción','Área','Responsable','Estado','Monto'].map(h => <th key={h} className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase">{h}</th>)}</tr>
            </thead>
            <tbody>
              {pageItems.map(p => {
                const isDelivered = p.stage === 7;
                return (
                  <tr key={p.id} onClick={() => navigate(`/pedidos/${p.id}`)} className={`cursor-pointer transition-colors ${isDelivered ? 'bg-emerald-50/50 hover:bg-emerald-50' : 'hover:bg-slate-50'}`}>
                    <td className={`px-4 py-3 font-mono text-xs ${isDelivered ? 'text-emerald-600' : 'text-slate-400'}`}>{p.numero}</td>
                    <td className={`px-4 py-3 font-semibold ${isDelivered ? 'text-emerald-800' : ''}`}>
                      {isDelivered && <span className="mr-1.5">✅</span>}
                      {p.descripcion}
                      {p.urgente && <span className="ml-1 badge badge-amber" style={{fontSize:'9px'}}>URG</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{p.area}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {p.stage === 1 || p.stage === 3
                        ? 'Secretaría'
                        : p.stage === 2 || p.stage === 4
                          ? 'Compras'
                          : p.stage === 5
                            ? 'Tesorería'
                            : p.stage === 6
                              ? 'Admin'
                              : '—'}
                    </td>
                    <td className="px-4 py-3"><span className={`badge ${stageBadgeClass(p.stage)}`}>{pedidoEstadoVisibleLabel(p)}</span></td>
                    <td className="px-4 py-3 font-mono text-sm">{formatMoney(p.monto)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <Pagination
        page={safePage}
        totalPages={totalPages}
        total={filtered.length}
        start={start}
        end={end}
        onPage={setPage}
        itemLabel="pedidos"
      />
    </div>
  );
}

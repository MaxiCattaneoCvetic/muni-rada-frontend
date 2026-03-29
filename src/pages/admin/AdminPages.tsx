import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configApi, pagosApi, pedidosApi } from '../../api/services';
import { formatMoney, formatDate, stageLabel, stageBadgeClass, stageIcon, pedidoEstadoVisibleLabel } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { ActionModal } from '../../components/ui/ActionModal';
import type { Pedido } from '../../types';
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

  if (!config) return <div className="p-8 text-center text-slate-400">Cargando...</div>;

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
        <div>
          <label className="label">Mínimo de cotizaciones para enviar a Secretaría</label>
          <input
            type="number"
            min={1}
            max={5}
            defaultValue={config.minPresupuestos}
            onChange={e => setForm((f: any) => ({ ...(f || config), minPresupuestos: parseInt(e.target.value, 10) }))}
            className="input"
          />
          <p className="text-xs text-slate-400 mt-1">Debe ser menor o igual al máximo.</p>
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
          {mut.isPending ? 'Guardando...' : 'Guardar cambios'}
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
  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['pedidos-todos', user?.rol],
    queryFn: () => pedidosApi.getAll(),
  });
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');

  const filtered = pedidos.filter(p => {
    const matchSearch = !search || p.descripcion.toLowerCase().includes(search.toLowerCase()) || p.numero.includes(search) || p.area.toLowerCase().includes(search.toLowerCase());
    const matchStage = !stageFilter || p.stage === parseInt(stageFilter);
    return matchSearch && matchStage;
  });

  return (
    <div className="page-shell space-y-4">
      <div className="page-heading">
        <div className="page-kicker">Consulta</div>
        <h1 className="page-title">Historial de pedidos</h1>
      </div>
      <div className="flex gap-3 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)} className="input flex-1 min-w-48" placeholder="🔍 Buscar por descripción, área o N°..." />
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className="input w-auto">
          <option value="">Todas las etapas</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>{stageLabel(s)}</option>)}
        </select>
      </div>
      <div className="card overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-slate-400">Cargando...</div> : (
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['N°', 'Descripción', 'Área', 'Estado', 'Monto', 'Fecha'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} onClick={() => navigate(`/pedidos/${p.id}`)} className="hover:bg-slate-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{p.numero}</td>
                  <td className="px-4 py-3 font-semibold">{p.descripcion}{p.urgente && <span className="ml-2 badge badge-red text-xs">URG</span>}</td>
                  <td className="px-4 py-3 text-slate-500">{p.area}</td>
                  <td className="px-4 py-3"><span className={`badge ${stageBadgeClass(p.stage)}`}>{stageIcon(p.stage)} {pedidoEstadoVisibleLabel(p)}</span></td>
                  <td className="px-4 py-3 font-mono text-sm">{formatMoney(p.monto)}</td>
                  <td className="px-4 py-3 text-slate-400">{formatDate(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── TESORERÍA ─────────────────────────────────────────────────────────
export function TesoreriaPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos', user?.rol],
    queryFn: () => pedidosApi.getAll(),
  });
  const [modal, setModal] = useState<{ pedido: Pedido; action: string } | null>(null);

  const pendientes = pedidos.filter(p => p.stage === PedidoStage.GESTION_PAGOS);
  const bloqueados = pendientes.filter(p => p.bloqueado);
  const libres = pendientes.filter(p => !p.bloqueado);

  return (
    <div className="page-shell space-y-6">
      <div className="page-heading">
        <div className="page-kicker">Tesorería</div>
        <h1 className="page-title">Pagos y sellados</h1>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card text-center"><div className="stat-number text-red-600">{bloqueados.length}</div><div className="stat-label">Bloqueados</div></div>
        <div className="stat-card text-center"><div className="stat-number text-blue-600">{libres.length}</div><div className="stat-label">Listos para pagar</div></div>
        <div className="stat-card text-center"><div className="stat-number text-green-600">{pedidos.filter(p => p.stage >= 5).length}</div><div className="stat-label">Procesados</div></div>
      </div>

      {bloqueados.length > 0 && (
        <div className="alert alert-danger">
          🔒 {bloqueados.length} pedido{bloqueados.length !== 1 ? 's' : ''} bloqueado{bloqueados.length !== 1 ? 's' : ''} — registrá el sellado provincial para habilitar el pago.
        </div>
      )}

      <div className="space-y-4">
        {pendientes.map(p => (
          <div key={p.id} className={`card p-5 border-l-4 ${p.bloqueado ? 'border-l-red-500 bg-red-50/30' : 'border-l-blue-500'}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-mono text-xs text-slate-400">{p.numero}</div>
                <div className="font-bold text-slate-800 mt-0.5">{p.descripcion}</div>
                <div className="text-sm text-slate-500">📍 {p.area} · {p.proveedorSeleccionado}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-black font-mono text-xl">{formatMoney(p.monto)}</div>
                {p.bloqueado && <div className="text-xs font-bold text-amber-600 mt-0.5">⚠️ Req. sellado</div>}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              {p.bloqueado ? (
                <button onClick={() => setModal({ pedido: p, action: 'sellado' })} className="btn btn-danger btn-sm gap-1">🏛️ Registrar sellado</button>
              ) : (
                <button onClick={() => setModal({ pedido: p, action: 'pago' })} className="btn btn-success btn-sm gap-1">💳 Registrar pago</button>
              )}
            </div>
          </div>
        ))}
        {pendientes.length === 0 && (
          <div className="card p-12 text-center text-slate-400">
            <div className="empty-icon">✅</div>
            <div className="empty-title">Sin pedidos pendientes de pago</div>
          </div>
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
    </div>
  );
}

export function FacturasPage() {
  const { data: pagos = [], isLoading } = useQuery({ queryKey: ['pagos'], queryFn: () => pagosApi.getAll() });

  return (
    <div className="page-shell space-y-6">
      <div className="page-heading">
        <div className="page-kicker">Tesorería</div>
        <h1 className="page-title">Facturas por vencer</h1>
        <p className="page-subtitle">Seguimiento de comprobantes y facturas vinculadas a pagos registrados.</p>
      </div>

      {isLoading ? (
        <div className="card p-8 text-center text-slate-400">Cargando facturas...</div>
      ) : pagos.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">🧾</div>
          <div className="empty-title">Sin facturas registradas</div>
          <div className="empty-copy">Aparecerán acá a medida que Tesorería cargue pagos con factura.</div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Pedido', 'Transferencia', 'Fecha', 'Monto', 'Factura'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagos.map((pago) => (
                <tr key={pago.id}>
                  <td className="font-mono text-xs text-slate-400">{pago.pedidoId}</td>
                  <td className="font-semibold">{pago.numeroTransferencia}</td>
                  <td className="text-slate-500">{formatDate(pago.fechaPago)}</td>
                  <td className="font-mono">{formatMoney(pago.montoPagado)}</td>
                  <td>
                    {pago.facturaUrl ? (
                      <a href={pago.facturaUrl} target="_blank" rel="noreferrer" className="doc-link">📄 Ver factura</a>
                    ) : (
                      <span className="badge badge-amber">Pendiente</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── ADMIN PEDIDOS ─────────────────────────────────────────────────────
export function AdminPedidosPage() {
  const navigate = useNavigate();
  const { data: pedidos = [], isLoading } = useQuery({ queryKey: ['pedidos-admin'], queryFn: () => pedidosApi.getAllAdmin() });
  const [search, setSearch] = useState('');

  const filtered = pedidos.filter(p =>
    !search || p.descripcion.toLowerCase().includes(search.toLowerCase()) || p.numero.includes(search)
  );

  const byStage = [1, 2, 3, 4, 5, 6, 7, 8].map((s) => ({
    stage: s,
    count: pedidos.filter((p) => p.stage === s).length,
  }));

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
        {isLoading ? <div className="p-8 text-center text-slate-400">Cargando...</div> : (
          <table className="w-full text-sm">
            <thead>
              <tr>{['N°','Descripción','Área','Responsable','Estado','Monto'].map(h => <th key={h} className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} onClick={() => navigate(`/pedidos/${p.id}`)} className="hover:bg-slate-50 cursor-pointer">
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{p.numero}</td>
                  <td className="px-4 py-3 font-semibold">{p.descripcion}{p.urgente && <span className="ml-1 badge badge-red" style={{fontSize:'9px'}}>URG</span>}</td>
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
                  <td className="px-4 py-3"><span className={`badge ${stageBadgeClass(p.stage)}`}>{stageIcon(p.stage)} {pedidoEstadoVisibleLabel(p)}</span></td>
                  <td className="px-4 py-3 font-mono text-sm">{formatMoney(p.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

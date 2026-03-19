import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configApi, pedidosApi, pagosApi } from '../../api/services';
import { formatMoney, formatDate, stageLabel, stageBadgeClass, stageIcon } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
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
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Configuración del sistema</h1>

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
          <label className="label">Presupuestos mínimos requeridos</label>
          <input
            type="number" min={1} max={5}
            defaultValue={config.minPresupuestos}
            onChange={e => setForm((f: any) => ({ ...(f || config), minPresupuestos: parseInt(e.target.value) }))}
            className="input"
          />
        </div>
        <div className="flex items-center gap-3">
          <div
            onClick={() => setForm((f: any) => ({ ...(f || config), bloquearPagoSinSellado: !cfg?.bloquearPagoSinSellado }))}
            className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${cfg?.bloquearPagoSinSellado ? 'bg-blue-500' : 'bg-slate-200'}`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${cfg?.bloquearPagoSinSellado ? 'translate-x-5' : 'translate-x-1'}`} />
          </div>
          <div>
            <div className="text-sm font-semibold">Bloquear pago si sellado está pendiente</div>
            <div className="text-xs text-slate-400">Impide registrar pago hasta completar el sellado.</div>
          </div>
        </div>
        {saved && <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">✅ Configuración guardada</div>}
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
  const { data: pedidos = [], isLoading } = useQuery({ queryKey: ['pedidos-todos'], queryFn: () => pedidosApi.getAll() });
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');

  const filtered = pedidos.filter(p => {
    const matchSearch = !search || p.descripcion.toLowerCase().includes(search.toLowerCase()) || p.numero.includes(search) || p.area.toLowerCase().includes(search.toLowerCase());
    const matchStage = !stageFilter || p.stage === parseInt(stageFilter);
    return matchSearch && matchStage;
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Historial de pedidos</h1>
      <div className="flex gap-3 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)} className="input flex-1 min-w-48" placeholder="🔍 Buscar por descripción, área o N°..." />
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className="input w-auto">
          <option value="">Todas las etapas</option>
          {[1,2,3,4,5,6,7].map(s => <option key={s} value={s}>{stageLabel(s)}</option>)}
        </select>
      </div>
      <div className="card overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-slate-400">Cargando...</div> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['N°', 'Descripción', 'Área', 'Estado', 'Monto', 'Fecha'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(p => (
                <tr key={p.id} onClick={() => navigate(`/pedidos/${p.id}`)} className="hover:bg-slate-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{p.numero}</td>
                  <td className="px-4 py-3 font-semibold">{p.descripcion}{p.urgente && <span className="ml-2 badge badge-red text-xs">URG</span>}</td>
                  <td className="px-4 py-3 text-slate-500">{p.area}</td>
                  <td className="px-4 py-3"><span className={`badge ${stageBadgeClass(p.stage)}`}>{stageIcon(p.stage)} {stageLabel(p.stage)}</span></td>
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
  const { data: pedidos = [] } = useQuery({ queryKey: ['pedidos'], queryFn: () => pedidosApi.getAll() });
  const [modal, setModal] = useState<{ pedido: Pedido; action: string } | null>(null);

  const pendientes = pedidos.filter(p => p.stage === PedidoStage.GESTION_PAGOS);
  const bloqueados = pendientes.filter(p => p.bloqueado);
  const libres = pendientes.filter(p => !p.bloqueado);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Pagos y sellados</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center border-t-4 border-t-red-400"><div className="text-3xl font-black text-red-600">{bloqueados.length}</div><div className="text-xs font-semibold text-slate-500 uppercase mt-1">Bloqueados</div></div>
        <div className="card p-4 text-center border-t-4 border-t-blue-400"><div className="text-3xl font-black text-blue-600">{libres.length}</div><div className="text-xs font-semibold text-slate-500 uppercase mt-1">Listos para pagar</div></div>
        <div className="card p-4 text-center border-t-4 border-t-green-400"><div className="text-3xl font-black text-green-600">{pedidos.filter(p => p.stage >= 5).length}</div><div className="text-xs font-semibold text-slate-500 uppercase mt-1">Procesados</div></div>
      </div>

      {bloqueados.length > 0 && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
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
            <div className="text-4xl mb-3">✅</div>
            <div className="font-semibold">Sin pedidos pendientes de pago</div>
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

// ── ADMIN PEDIDOS ─────────────────────────────────────────────────────
export function AdminPedidosPage() {
  const navigate = useNavigate();
  const { data: pedidos = [], isLoading } = useQuery({ queryKey: ['pedidos-admin'], queryFn: () => pedidosApi.getAllAdmin() });
  const [search, setSearch] = useState('');

  const filtered = pedidos.filter(p =>
    !search || p.descripcion.toLowerCase().includes(search.toLowerCase()) || p.numero.includes(search)
  );

  const byStage = [1,2,3,4,5,6].map(s => ({ stage: s, count: pedidos.filter(p => p.stage === s).length }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Todos los pedidos</h1>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {byStage.map(({ stage, count }) => (
          <div key={stage} className="card p-3 text-center">
            <div className="text-xl font-black">{count}</div>
            <div className="text-xs text-slate-400 font-medium mt-0.5 leading-tight" style={{ fontSize: '9px' }}>{stageIcon(stage)} {stageLabel(stage)}</div>
          </div>
        ))}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} className="input" placeholder="🔍 Buscar..." />

      <div className="card overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-slate-400">Cargando...</div> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{['N°','Descripción','Área','Responsable','Estado','Monto'].map(h => <th key={h} className="px-4 py-3 text-left font-semibold text-slate-500 text-xs uppercase">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(p => (
                <tr key={p.id} onClick={() => navigate(`/pedidos/${p.id}`)} className="hover:bg-slate-50 cursor-pointer">
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{p.numero}</td>
                  <td className="px-4 py-3 font-semibold">{p.descripcion}{p.urgente && <span className="ml-1 badge badge-red" style={{fontSize:'9px'}}>URG</span>}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{p.area}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{p.stage === 1 || p.stage === 3 ? 'Secretaría' : p.stage === 2 ? 'Compras' : p.stage === 4 ? 'Tesorería' : p.stage === 5 ? 'Admin' : '—'}</td>
                  <td className="px-4 py-3"><span className={`badge ${stageBadgeClass(p.stage)}`}>{stageIcon(p.stage)} {stageLabel(p.stage)}</span></td>
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

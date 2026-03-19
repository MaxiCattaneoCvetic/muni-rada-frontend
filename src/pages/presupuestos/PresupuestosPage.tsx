import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pedidosApi, presupuestosApi } from '../../api/services';
import { formatMoney, formatDate } from '../../lib/utils';
import { Trash2, Plus, ArrowLeft, Send } from 'lucide-react';

export function PresupuestosPage() {
  const { pedidoId } = useParams<{ pedidoId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: pedido } = useQuery({ queryKey: ['pedido', pedidoId], queryFn: () => pedidosApi.getById(pedidoId!) });
  const { data: presupuestos = [] } = useQuery({ queryKey: ['presupuestos', pedidoId], queryFn: () => presupuestosApi.getByPedido(pedidoId!) });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ proveedor: '', monto: '', plazoEntrega: '', contacto: '', notas: '' });
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState('');

  const addMut = useMutation({
    mutationFn: () => presupuestosApi.create(pedidoId!, form, archivo || undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['presupuestos', pedidoId] }); setShowForm(false); setForm({ proveedor: '', monto: '', plazoEntrega: '', contacto: '', notas: '' }); setArchivo(null); },
    onError: (e: any) => setError(e.response?.data?.message || 'Error'),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => presupuestosApi.delete(pedidoId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['presupuestos', pedidoId] }),
  });

  const enviarMut = useMutation({
    mutationFn: () => pedidosApi.enviarFirma(pedidoId!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pedidos'] }); navigate('/dashboard'); },
    onError: (e: any) => setError(e.response?.data?.message || 'Error'),
  });

  const minPresup = 3;
  const listo = presupuestos.length >= minPresup;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-medium">
        <ArrowLeft size={16} /> Volver
      </button>

      {pedido && (
        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-mono text-xs text-slate-400">{pedido.numero}</div>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">{pedido.descripcion}</h2>
              <p className="text-slate-500 text-sm">📍 {pedido.area}</p>
            </div>
            {listo && (
              <button onClick={() => enviarMut.mutate()} disabled={enviarMut.isPending} className="btn btn-success gap-2">
                <Send size={15} /> Enviar a Secretaría
              </button>
            )}
          </div>
          {!listo && (
            <div className="mt-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm font-medium">
              ⏳ Faltan {minPresup - presupuestos.length} presupuesto{minPresup - presupuestos.length !== 1 ? 's' : ''} para poder enviar a Secretaría
            </div>
          )}
          {error && <div className="mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}
        </div>
      )}

      {/* Progress bar */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-700">Presupuestos cargados</span>
          <span className="text-sm font-bold text-blue-600">{presupuestos.length} / {minPresup}</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${listo ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${Math.min((presupuestos.length / minPresup) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Presupuestos list */}
      <div className="space-y-3">
        {presupuestos.map((p, i) => (
          <div key={p.id} className="card p-5 border-l-4 border-l-green-400">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 border-2 border-green-300 text-green-700 font-bold text-sm flex items-center justify-center">{i + 1}</div>
                <div>
                  <div className="font-bold text-slate-800">{p.proveedor}</div>
                  <div className="text-xs text-slate-500">{formatDate(p.createdAt)}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-black font-mono text-lg">{formatMoney(p.monto)}</div>
                {p.plazoEntrega && <div className="text-xs text-slate-500">Entrega: {p.plazoEntrega}</div>}
              </div>
            </div>
            {(p.contacto || p.notas) && (
              <div className="mt-3 pt-3 border-t border-slate-100 text-sm text-slate-600 space-y-1">
                {p.contacto && <div>📧 {p.contacto}</div>}
                {p.notas && <div className="text-slate-500">{p.notas}</div>}
              </div>
            )}
            <div className="mt-3 flex items-center justify-between">
              {p.archivoUrl && <a href={p.archivoUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 font-semibold hover:underline">📄 Ver PDF</a>}
              <button onClick={() => delMut.mutate(p.id)} className="btn btn-xs btn-danger ml-auto gap-1">
                <Trash2 size={12} /> Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {presupuestos.length < minPresup && !showForm && (
        <button onClick={() => setShowForm(true)} className="btn btn-primary w-full justify-center gap-2 py-3">
          <Plus size={16} /> Agregar presupuesto {presupuestos.length + 1}
        </button>
      )}

      {showForm && (
        <div className="card p-6 border-2 border-blue-200">
          <h3 className="font-bold text-slate-800 mb-4">Presupuesto #{presupuestos.length + 1}</h3>
          <div className="space-y-4">
            <div><label className="label">Proveedor *</label><input value={form.proveedor} onChange={e => setForm(f => ({ ...f, proveedor: e.target.value }))} className="input" placeholder="Nombre del proveedor" /></div>
            <div><label className="label">Monto ($) *</label><input type="number" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} className="input" placeholder="0" /></div>
            <div><label className="label">Plazo de entrega</label><input value={form.plazoEntrega} onChange={e => setForm(f => ({ ...f, plazoEntrega: e.target.value }))} className="input" placeholder="Ej: 15 días hábiles" /></div>
            <div><label className="label">Contacto</label><input value={form.contacto} onChange={e => setForm(f => ({ ...f, contacto: e.target.value }))} className="input" placeholder="Email o teléfono" /></div>
            <div><label className="label">Notas</label><textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} className="input resize-none" rows={2} /></div>
            <div><label className="label">PDF del presupuesto</label><input type="file" accept=".pdf" onChange={e => setArchivo(e.target.files?.[0] || null)} className="input py-2 text-sm" /></div>
            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)} className="btn btn-ghost flex-1 justify-center">Cancelar</button>
              <button onClick={() => { if (!form.proveedor || !form.monto) { setError('Completá proveedor y monto'); return; } addMut.mutate(); }} disabled={addMut.isPending} className="btn btn-primary flex-1 justify-center">
                {addMut.isPending ? 'Guardando...' : '✅ Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

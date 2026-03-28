// NuevoPedidoPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pedidosApi } from '../../api/services';
import { AREAS } from '../../types';

export function NuevoPedidoPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({ descripcion: '', cantidad: '', detalle: '', area: '', urgente: false });
  const [error, setError] = useState('');

  const mut = useMutation({
    mutationFn: () => pedidosApi.create(form as any),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['pedidos'] });
      navigate(`/pedidos/${p.id}`);
    },
    onError: (e: any) => setError(e.response?.data?.message || 'Error al crear pedido'),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.descripcion || !form.area) { setError('Completá descripción y área'); return; }
    mut.mutate();
  };

  return (
    <div className="page-shell-compact">
      <div className="page-heading">
        <div className="page-kicker">Solicitud</div>
        <h1 className="page-title">Nuevo pedido</h1>
        <p className="page-subtitle">El pedido irá a Secretaría para aprobación y luego seguirá el flujo interno.</p>
      </div>
      <div className="card p-6">
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="label">¿Qué necesitás? *</label>
            <input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} className="input" placeholder="Ej: Resmas papel A4, tóner HP, sillas de oficina..." required />
          </div>
          <div>
            <label className="label">Cantidad</label>
            <input value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} className="input" placeholder="Ej: x5 resmas, x2 unidades" />
          </div>
          <div>
            <label className="label">Área solicitante *</label>
            <select value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} className="input" required>
              <option value="">Seleccioná un área</option>
              {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Detalles adicionales</label>
            <textarea value={form.detalle} onChange={e => setForm(f => ({ ...f, detalle: e.target.value }))} className="input resize-none" rows={3} placeholder="Marca, modelo, especificaciones técnicas..." />
          </div>
          <div className="toggle-card cursor-pointer" onClick={() => setForm(f => ({ ...f, urgente: !f.urgente }))}>
            <div className={`toggle-pill ${form.urgente ? 'on' : ''}`} />
            <div>
              <div className="text-sm font-semibold text-amber-800">Marcar como urgente</div>
              <div className="text-xs text-amber-600">Solo para casos realmente prioritarios</div>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate(-1)} className="btn btn-ghost flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={mut.isPending} className="btn btn-primary flex-1 justify-center">
              {mut.isPending ? 'Enviando...' : '✅ Enviar pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

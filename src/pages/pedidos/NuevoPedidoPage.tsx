// NuevoPedidoPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pedidosApi, usersApi } from '../../api/services';
import { ButtonSpinner } from '../../components/ui/loading';
import { areasPedidoSelectOptions, userPuedeCrearPedidos } from '../../lib/utils';
import { useAuthStore } from '../../store/auth.store';
import type { AreaMunicipal } from '../../types';

export function NuevoPedidoPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [form, setForm] = useState({ descripcion: '', cantidad: '', detalle: '', area: '', urgente: false });
  const [referencias, setReferencias] = useState<File[]>([]);
  const [error, setError] = useState('');

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

  useEffect(() => {
    const aa = user?.areaAsignada;
    if (!aa || !areaOptions.includes(aa) || form.area) return;
    setForm((f) => ({ ...f, area: aa }));
  }, [user?.areaAsignada, areaOptions, form.area]);

  const mut = useMutation({
    mutationFn: () =>
      pedidosApi.create(
        form as { descripcion: string; area: AreaMunicipal; cantidad?: string; detalle?: string; urgente?: boolean },
        referencias.length ? referencias : undefined,
      ),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['pedidos'] });
      navigate(`/pedidos/${p.id}`);
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setError(e.response?.data?.message || 'Error al crear pedido'),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.descripcion || !form.area) {
      setError('Completá descripción y área');
      return;
    }
    mut.mutate();
  };

  const puede = userPuedeCrearPedidos(user);

  const maxReferencias = 8;
  const previewUrls = useMemo(() => referencias.map((f) => URL.createObjectURL(f)), [referencias]);
  useEffect(() => {
    return () => {
      previewUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [previewUrls]);

  const agregarReferencias = (files: FileList | null) => {
    if (!files?.length) return;
    const next: File[] = [...referencias];
    for (let i = 0; i < files.length; i++) {
      if (next.length >= maxReferencias) break;
      const f = files[i];
      if (!f.type.startsWith('image/')) continue;
      next.push(f);
    }
    setReferencias(next.slice(0, maxReferencias));
  };

  const quitarReferencia = (index: number) => {
    setReferencias((prev) => prev.filter((_, i) => i !== index));
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
        {!puede && (
          <div className="alert alert-warning mb-4">
            No tenés permisos para crear pedidos para ninguna área. Pedí a administración que configure tus áreas
            permitidas.
          </div>
        )}
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="label">¿Qué necesitás? *</label>
            <input
              value={form.descripcion}
              onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              className="input"
              placeholder="Ej: Resmas papel A4, tóner HP, sillas de oficina..."
              required
              disabled={!puede}
            />
          </div>
          <div>
            <label className="label">Cantidad</label>
            <input
              value={form.cantidad}
              onChange={(e) => setForm((f) => ({ ...f, cantidad: e.target.value }))}
              className="input"
              placeholder="Ej: x5 resmas, x2 unidades"
              disabled={!puede}
            />
          </div>
          <div>
            <label className="label">Área solicitante *</label>
            <select
              value={form.area}
              onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
              className="input"
              required
              disabled={!puede}
            >
              <option value="">Seleccioná un área</option>
              {areaOptions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Detalles adicionales</label>
            <textarea
              value={form.detalle}
              onChange={(e) => setForm((f) => ({ ...f, detalle: e.target.value }))}
              className="input resize-none"
              rows={3}
              placeholder="Marca, modelo, especificaciones técnicas..."
              disabled={!puede}
            />
          </div>
          <div>
            <label className="label">Imágenes de referencia (opcional)</label>
            <p className="text-xs text-slate-500 mb-2">Fotos del producto, etiqueta o ejemplo para que Compras y Secretaría entiendan mejor el pedido. Hasta {maxReferencias} imágenes, máx. 5&nbsp;MB c/u.</p>
            <input
              type="file"
              accept="image/*"
              multiple
              className="input text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
              disabled={!puede || referencias.length >= maxReferencias}
              onChange={(e) => {
                agregarReferencias(e.target.files);
                e.target.value = '';
              }}
            />
            {referencias.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {referencias.map((file, i) => (
                  <div key={`${file.name}-${i}-${file.size}`} className="relative group">
                    <img
                      src={previewUrls[i]}
                      alt=""
                      className="h-20 w-20 object-cover rounded-lg border border-slate-200"
                    />
                    <button
                      type="button"
                      className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-red-600 text-white text-xs font-bold shadow opacity-90 hover:opacity-100"
                      onClick={() => quitarReferencia(i)}
                      aria-label="Quitar imagen"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
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
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate(-1)} className="btn btn-ghost flex-1 justify-center">
              Cancelar
            </button>
            <button type="submit" disabled={mut.isPending || !puede} className="btn btn-primary flex-1 justify-center">
              {mut.isPending ? <ButtonSpinner label="Enviando" /> : '✅ Enviar pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

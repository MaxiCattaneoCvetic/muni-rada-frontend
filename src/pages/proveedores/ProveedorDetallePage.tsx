import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { proveedoresApi } from '../../api/services';
import { formatDate, formatDateTime, formatMoney } from '../../lib/utils';
import { ArrowLeft, ExternalLink, FileText, MessageSquare, UserCircle } from 'lucide-react';

type TabId = 'datos' | 'facturas' | 'comentarios';

export function ProveedorDetallePage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabId>('datos');
  const [nuevoComentario, setNuevoComentario] = useState('');

  const { data: prov, isLoading, isError } = useQuery({
    queryKey: ['proveedores', id],
    queryFn: () => proveedoresApi.getById(id!),
    enabled: !!id,
  });

  const { data: facturas = [] } = useQuery({
    queryKey: ['proveedores', id, 'facturas'],
    queryFn: () => proveedoresApi.getFacturas(id!),
    enabled: !!id,
  });

  const { data: comentarios = [] } = useQuery({
    queryKey: ['proveedores', id, 'comentarios'],
    queryFn: () => proveedoresApi.getComentarios(id!),
    enabled: !!id,
  });

  const addMut = useMutation({
    mutationFn: () => proveedoresApi.addComentario(id!, nuevoComentario.trim()),
    onSuccess: () => {
      setNuevoComentario('');
      qc.invalidateQueries({ queryKey: ['proveedores', id, 'comentarios'] });
    },
  });

  if (!id) {
    return (
      <div className="page-shell-form">
        <Link to="/proveedores" className="text-[var(--purple)] font-semibold">Volver a proveedores</Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="page-shell-form">
        <p className="text-center text-slate-400 py-12">Cargando…</p>
      </div>
    );
  }

  if (isError || !prov) {
    return (
      <div className="page-shell-form">
        <p className="text-center text-red-500 py-12">Proveedor no encontrado.</p>
        <div className="text-center">
          <Link to="/proveedores" className="text-[var(--purple)] font-semibold">Volver al listado</Link>
        </div>
      </div>
    );
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'datos', label: 'Datos' },
    { id: 'facturas', label: 'Facturas y cotizaciones' },
    { id: 'comentarios', label: 'Comentarios' },
  ];

  return (
    <div className="page-shell-form">
      <Link
        to="/proveedores"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[var(--purple)] mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Proveedores
      </Link>

      <div className="page-heading">
        <div className="page-kicker">Proveedor</div>
        <h1 className="page-title">{prov.nombre}</h1>
        {prov.nombreFantasia && (
          <p className="text-sm text-slate-500 -mt-1 mb-1">Nombre de fantasía: {prov.nombreFantasia}</p>
        )}
        <p className="page-subtitle">Información del catálogo y documentación vinculada en pedidos.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              tab === t.id
                ? 'text-white shadow-sm'
                : 'bg-white/80 text-slate-600 hover:bg-white border border-slate-200/80'
            }`}
            style={tab === t.id ? { background: 'var(--purple)' } : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'datos' && (
        <div className="card p-6 space-y-6">
          <div>
            <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wide mb-3">Identidad y fiscal</h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold uppercase text-slate-400">Razón social</dt>
                <dd className="text-slate-800 font-medium">{prov.nombre}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-slate-400">CUIT</dt>
                <dd className="text-slate-800 font-mono">{prov.cuit || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-slate-400">Condición IVA</dt>
                <dd className="text-slate-800">{prov.condicionIva || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-slate-400">Alta en sistema</dt>
                <dd className="text-slate-800">{formatDateTime(prov.createdAt)}</dd>
              </div>
            </dl>
          </div>
          <div>
            <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wide mb-3">Domicilio fiscal</h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-xs font-bold uppercase text-slate-400">Calle y número</dt>
                <dd className="text-slate-800">{prov.domicilioCalle || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-slate-400">Localidad</dt>
                <dd className="text-slate-800">{prov.localidad || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-slate-400">Código postal</dt>
                <dd className="text-slate-800">{prov.codigoPostal || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-slate-400">Provincia</dt>
                <dd className="text-slate-800">{prov.provincia || '—'}</dd>
              </div>
            </dl>
          </div>
          <div>
            <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wide mb-3">Contacto</h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold uppercase text-slate-400">Teléfono</dt>
                <dd className="text-slate-800">{prov.telefono || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-slate-400">Correo</dt>
                <dd className="text-slate-800 break-all">{prov.email || '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-bold uppercase text-slate-400">Persona o área</dt>
                <dd className="text-slate-800">{prov.contacto || '—'}</dd>
              </div>
            </dl>
          </div>
          {prov.notas && (
            <div>
              <div className="text-xs font-bold uppercase text-slate-400 mb-1">Notas internas</div>
              <p className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">{prov.notas}</p>
            </div>
          )}
        </div>
      )}

      {tab === 'facturas' && (
        <div className="card overflow-hidden">
          {facturas.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              No hay facturas ni cotizaciones PDF asociadas a este nombre en pedidos todavía.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="text-left p-3 font-bold text-slate-600">Tipo</th>
                    <th className="text-left p-3 font-bold text-slate-600">Pedido</th>
                    <th className="text-left p-3 font-bold text-slate-600 hidden md:table-cell">Descripción</th>
                    <th className="text-right p-3 font-bold text-slate-600 hidden sm:table-cell">Monto</th>
                    <th className="text-left p-3 font-bold text-slate-600">Fecha</th>
                    <th className="text-right p-3 font-bold text-slate-600">Archivo</th>
                  </tr>
                </thead>
                <tbody>
                  {facturas.map((f, i) => (
                    <tr key={`${f.url}-${i}`} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                          <FileText className="w-3.5 h-3.5 opacity-60" />
                          {f.etiqueta}
                        </span>
                      </td>
                      <td className="p-3">
                        <Link
                          to={`/pedidos/${f.pedidoId}`}
                          className="font-bold text-[var(--purple)] hover:underline"
                        >
                          {f.pedidoNumero}
                        </Link>
                      </td>
                      <td className="p-3 text-slate-600 hidden md:table-cell max-w-[240px] truncate" title={f.descripcion}>
                        {f.descripcion || '—'}
                      </td>
                      <td className="p-3 text-right text-slate-700 hidden sm:table-cell">
                        {f.monto != null ? formatMoney(f.monto) : '—'}
                      </td>
                      <td className="p-3 text-slate-500 whitespace-nowrap">{formatDate(f.fecha)}</td>
                      <td className="p-3 text-right">
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[var(--purple)] font-semibold hover:underline"
                        >
                          Abrir
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'comentarios' && (
        <div className="space-y-4">
          <div className="card p-4">
            <label className="label flex items-center gap-2">
              <MessageSquare className="w-4 h-4 opacity-60" />
              Nuevo comentario
            </label>
            <textarea
              className="input min-h-[100px] w-full"
              placeholder="Acuerdos, seguimiento, observaciones del expediente…"
              value={nuevoComentario}
              onChange={(e) => setNuevoComentario(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-primary mt-3"
              disabled={!nuevoComentario.trim() || addMut.isPending}
              onClick={() => addMut.mutate()}
            >
              {addMut.isPending ? 'Guardando…' : 'Publicar comentario'}
            </button>
            {addMut.isError && (
              <p className="text-sm text-red-600 mt-2">No se pudo guardar. Intentá de nuevo.</p>
            )}
          </div>

          <div className="space-y-3">
            {comentarios.length === 0 ? (
              <div className="card p-6 text-center text-slate-500 text-sm">
                Todavía no hay comentarios para este proveedor.
              </div>
            ) : (
              comentarios.map((c) => (
                <div key={c.id} className="card p-4">
                  <div className="flex items-start gap-3">
                    <UserCircle className="w-9 h-9 text-slate-300 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                        <span className="font-bold text-slate-800">
                          {c.usuario?.nombreCompleto
                            || [c.usuario?.nombre, c.usuario?.apellido].filter(Boolean).join(' ')
                            || 'Usuario'}
                        </span>
                        <span className="text-xs text-slate-400">{formatDateTime(c.createdAt)}</span>
                      </div>
                      <p className="text-slate-700 mt-2 whitespace-pre-wrap text-sm leading-relaxed">{c.texto}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

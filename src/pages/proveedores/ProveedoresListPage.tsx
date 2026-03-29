import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { proveedoresApi } from '../../api/services';
import { ChevronRight, Building2, PlusCircle } from 'lucide-react';

export function ProveedoresListPage() {
  const { data: proveedores = [], isLoading, isError } = useQuery({
    queryKey: ['proveedores'],
    queryFn: () => proveedoresApi.getAll(),
  });

  if (isLoading) {
    return (
      <div className="page-shell-form">
        <p className="text-center text-slate-400 py-12">Cargando proveedores…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="page-shell-form">
        <p className="text-center text-red-500 py-12">No se pudo cargar el catálogo de proveedores.</p>
      </div>
    );
  }

  return (
    <div className="page-shell-form">
      <div className="page-heading flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="page-kicker">Catálogo</div>
          <h1 className="page-title">Proveedores</h1>
          <p className="page-subtitle">
            Consultá datos de contacto, facturas asociadas a pedidos y comentarios del expediente por proveedor.
          </p>
        </div>
        <Link
          to="/proveedores/nuevo"
          className="btn btn-primary inline-flex items-center justify-center gap-2 shrink-0"
        >
          <PlusCircle className="w-5 h-5" />
          Nuevo proveedor
        </Link>
      </div>

      {proveedores.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-slate-700">Aún no hay proveedores registrados</p>
          <p className="text-sm mt-1">Usá el botón «Nuevo proveedor» para el asistente de alta con datos legales y de contacto.</p>
          <Link to="/proveedores/nuevo" className="btn btn-primary inline-flex items-center gap-2 mt-4">
            <PlusCircle className="w-5 h-5" />
            Dar de alta un proveedor
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {proveedores.map((p) => (
            <li key={p.id}>
              <Link
                to={`/proveedores/${p.id}`}
                className="card flex items-center gap-4 p-4 hover:shadow-md transition-shadow group"
              >
                <div
                  className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-lg"
                  style={{ background: 'rgba(139,92,246,.15)', color: 'var(--purple)' }}
                >
                  🏪
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-800 truncate group-hover:text-[var(--purple)] transition-colors">
                    {p.nombre}
                  </div>
                  <div className="text-sm text-slate-500 truncate">
                    {[
                      p.cuit,
                      [p.localidad, p.provincia].filter(Boolean).join(', '),
                      p.email || p.telefono || p.contacto,
                    ].filter(Boolean).join(' · ') || 'Sin datos de contacto en ficha'}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[var(--purple)] flex-shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

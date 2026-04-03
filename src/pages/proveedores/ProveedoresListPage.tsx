import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { proveedoresApi } from '../../api/services';
import { RadaTillyLoader } from '../../components/ui/loading';
import { Pagination, usePagination } from '../../components/ui/Pagination';
import { ChevronRight, Building2, PlusCircle, Search, X } from 'lucide-react';

export function ProveedoresListPage() {
  const { data: proveedores = [], isLoading, isError } = useQuery({
    queryKey: ['proveedores'],
    queryFn: () => proveedoresApi.getAll(),
  });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? proveedores.filter((p) => {
        const q = search.toLowerCase();
        return (
          p.nombre?.toLowerCase().includes(q) ||
          p.cuit?.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q) ||
          p.contacto?.toLowerCase().includes(q) ||
          p.localidad?.toLowerCase().includes(q) ||
          p.provincia?.toLowerCase().includes(q)
        );
      })
    : proveedores;

  const { page: safePage, totalPages, start, end } = usePagination({
    total: filtered.length,
    pageSize: 12,
    page,
    setPage,
  });

  const pageItems = filtered.slice(start, end);

  if (isLoading) {
    return (
      <div className="page-shell-form">
        <RadaTillyLoader variant="contained" label="Cargando proveedores" />
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

      {proveedores.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por nombre, CUIT, localidad…"
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--purple)] focus:border-transparent transition"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

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
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-slate-700">Sin resultados para «{search}»</p>
          <p className="text-sm mt-1">Intentá con otro nombre, CUIT o localidad.</p>
          <button onClick={() => setSearch('')} className="btn btn-ghost mt-4 text-sm">
            Limpiar búsqueda
          </button>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {pageItems.map((p) => (
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
          <Pagination
            page={safePage}
            totalPages={totalPages}
            total={filtered.length}
            start={start}
            end={end}
            onPage={setPage}
            itemLabel="proveedores"
          />
        </>
      )}
    </div>
  );
}

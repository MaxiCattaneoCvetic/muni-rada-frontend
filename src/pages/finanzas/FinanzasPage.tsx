import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { finanzasApi } from '../../api/services';
import { AREAS, type AreaMunicipal, type FinanzasResumen, type GastoFinanzas } from '../../types';
import { exportFinanzasExcel } from '../../lib/finanzas-excel';
import { formatDate, formatMoney } from '../../lib/utils';
import { ButtonSpinner } from '../../components/ui/loading';

const AREA_COLORS: Record<AreaMunicipal, string> = {
  'Administración': '#1d4ed8',
  'Catastro': '#7c3aed',
  'Intendencia': '#f59e0b',
  'RRHH': '#0f766e',
  'Obras Públicas': '#0ea5e9',
  'Sistemas': '#22c55e',
  'Tesorería': '#14b8a6',
  'Secretaría': '#3b82f6',
  'Turismo': '#ec4899',
};

function buildMonthKeys(year: number) {
  return Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`);
}

function monthLabel(monthKey: string) {
  const label = new Date(`${monthKey}-01T12:00:00`).toLocaleDateString('es-AR', { month: 'short' });
  return label.replace('.', '').replace(/^\w/, (char) => char.toUpperCase());
}

function formatCompactMoney(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return formatMoney(value);
}

function rowValue<T extends { mes: string; total: number }>(
  items: T[],
  matcher: (item: T) => boolean,
  month: string,
) {
  return items.find((item) => matcher(item) && item.mes === month)?.total ?? 0;
}

function LoadingCard({ label }: { label: string }) {
  return (
    <div className="stat-card">
      <div className="animate-pulse">
        <div className="h-3 w-24 rounded-full bg-slate-200" />
        <div className="mt-4 h-8 w-28 rounded-full bg-slate-200" />
        <div className="mt-3 h-5 w-20 rounded-full bg-slate-100" />
      </div>
      <div className="mt-5 text-[11px] font-bold uppercase tracking-[.5px] text-slate-400">{label}</div>
    </div>
  );
}

function buildChartData(summary: FinanzasResumen | undefined, months: string[], areaRows: string[]) {
  return months.map((month) => {
    const base: Record<string, string | number> = {
      mes: month,
      mesLabel: monthLabel(month),
      total: summary?.porMes.find((item) => item.mes === month)?.total ?? 0,
    };

    for (const area of areaRows) {
      base[area] = rowValue(summary?.porArea ?? [], (item) => item.area === area, month);
    }

    return base;
  });
}

function buildProviderTotals(summary: FinanzasResumen | undefined) {
  const totals = new Map<string, number>();
  for (const item of summary?.porProveedor ?? []) {
    totals.set(item.proveedor, (totals.get(item.proveedor) ?? 0) + item.total);
  }
  return [...totals.entries()]
    .sort(([leftName, leftTotal], [rightName, rightTotal]) => rightTotal - leftTotal || leftName.localeCompare(rightName))
    .map(([proveedor]) => proveedor);
}

export function FinanzasPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [area, setArea] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [exportMode, setExportMode] = useState<'resumen' | 'completo' | null>(null);

  const yearOptions = useMemo(() => {
    const start = currentYear + 1;
    return Array.from({ length: 6 }, (_, index) => start - index);
  }, [currentYear]);

  const catalogoQuery = useQuery({
    queryKey: ['finanzas', 'catalogo', year],
    queryFn: () => finanzasApi.getGastos({ year }),
  });

  const catalogoGastos = useMemo(() => catalogoQuery.data ?? [], [catalogoQuery.data]);
  const proveedoresDisponibles = useMemo(() => {
    const items = area
      ? catalogoGastos.filter((item) => item.area === area)
      : catalogoGastos;
    return [...new Set(items.map((item) => item.proveedor))].sort((left, right) => left.localeCompare(right));
  }, [area, catalogoGastos]);
  const proveedorSeleccionado = proveedoresDisponibles.includes(proveedor) ? proveedor : '';

  const resumenQuery = useQuery({
    queryKey: ['finanzas', 'resumen', year, area, proveedorSeleccionado],
    queryFn: () => finanzasApi.getResumen({
      year,
      area: area || undefined,
      proveedor: proveedorSeleccionado || undefined,
    }),
  });

  const gastosQuery = useQuery({
    queryKey: ['finanzas', 'gastos', year, area, proveedorSeleccionado],
    queryFn: () => finanzasApi.getGastos({
      year,
      area: area || undefined,
      proveedor: proveedorSeleccionado || undefined,
    }),
  });

  const resumen = resumenQuery.data;
  const gastos = gastosQuery.data ?? [];
  const months = useMemo(() => buildMonthKeys(year), [year]);

  const areaRows = useMemo(() => (area ? [area] : AREAS), [area]);
  const providerRows = useMemo(() => {
    if (proveedorSeleccionado) return [proveedorSeleccionado];
    return buildProviderTotals(resumen);
  }, [proveedorSeleccionado, resumen]);
  const chartData = useMemo(() => buildChartData(resumen, months, areaRows), [resumen, months, areaRows]);

  const areaColumnTotals = useMemo(() => {
    return months.map((month) =>
      areaRows.reduce(
        (acc, areaName) => acc + rowValue(resumen?.porArea ?? [], (item) => item.area === areaName, month),
        0,
      ));
  }, [months, areaRows, resumen]);

  const providerColumnTotals = useMemo(() => {
    return months.map((month) =>
      providerRows.reduce(
        (acc, proveedorName) =>
          acc + rowValue(resumen?.porProveedor ?? [], (item) => item.proveedor === proveedorName, month),
        0,
      ));
  }, [months, providerRows, resumen]);

  const isLoading = catalogoQuery.isLoading || resumenQuery.isLoading || gastosQuery.isLoading;
  const hasData = (resumen?.cantidadPagos ?? 0) > 0;
  const exportDisabled = isLoading || !hasData || !resumen || exportMode !== null;

  const handleExport = async (mode: 'resumen' | 'completo') => {
    if (!resumen) return;

    setExportMode(mode);
    try {
      await exportFinanzasExcel({
        mode,
        year,
        area: area || undefined,
        proveedor: proveedorSeleccionado || undefined,
        resumen,
        gastos,
        months,
        areaRows,
        providerRows,
      });
    } finally {
      setExportMode(null);
    }
  };

  return (
    <div className="page-shell-wide">
      <header className="page-heading">
        <div className="page-kicker">Finanzas</div>
        <h1 className="page-title">Gastos por área y proveedor</h1>
        <p className="page-subtitle">
          Cada gasto nace cuando Tesorería registra una factura como pagada. Acá podés seguir el gasto mes a mes.
        </p>
      </header>

      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-[.7px] text-slate-400">Filtros</div>
            <div className="mt-2 text-sm text-slate-500">
              Ajustá el período y segmentá la vista por área o proveedor.
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[720px]">
            <div>
              <label className="label">Año</label>
              <select value={year} onChange={(event) => setYear(Number(event.target.value))} className="input">
                {yearOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Área</label>
              <select value={area} onChange={(event) => setArea(event.target.value)} className="input">
                <option value="">Todas las áreas</option>
                {AREAS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Proveedor</label>
              <select value={proveedorSeleccionado} onChange={(event) => setProveedor(event.target.value)} className="input">
                <option value="">Todos los proveedores</option>
                {proveedoresDisponibles.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-medium text-slate-500">
            Las descargas respetan el año y los filtros activos.
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleExport('resumen')}
              disabled={exportDisabled}
              className="btn btn-ghost btn-sm"
            >
              {exportMode === 'resumen' ? <ButtonSpinner label="Generando Excel" /> : '📊 Excel resumen'}
            </button>
            <button
              type="button"
              onClick={() => void handleExport('completo')}
              disabled={exportDisabled}
              className="btn btn-primary btn-sm"
            >
              {exportMode === 'completo' ? <ButtonSpinner label="Generando Excel" /> : '📥 Excel completo'}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          <>
            <LoadingCard label="Total del período" />
            <LoadingCard label="Pagos registrados" />
            <LoadingCard label="Área con más gasto" />
            <LoadingCard label="Proveedor con más gasto" />
          </>
        ) : (
          <>
            <article className="stat-card">
              <div className="text-xs font-extrabold uppercase tracking-[.7px] text-slate-400">Total del período</div>
              <div className="stat-number mt-3 text-slate-900">{formatMoney(resumen?.totalGastado)}</div>
              <div className="stat-hint">Año {year}</div>
            </article>

            <article className="stat-card">
              <div className="text-xs font-extrabold uppercase tracking-[.7px] text-slate-400">Pagos registrados</div>
              <div className="stat-number mt-3 text-blue-700">{resumen?.cantidadPagos ?? 0}</div>
              <div className="stat-hint">Facturas pagadas</div>
            </article>

            <article className="stat-card">
              <div className="text-xs font-extrabold uppercase tracking-[.7px] text-slate-400">Área con más gasto</div>
              <div className="mt-3 text-xl font-black tracking-[-.5px] text-slate-900">
                {resumen?.areaMayorGasto?.area ?? 'Sin datos'}
              </div>
              <div className="stat-hint">{formatMoney(resumen?.areaMayorGasto?.total)}</div>
            </article>

            <article className="stat-card">
              <div className="text-xs font-extrabold uppercase tracking-[.7px] text-slate-400">Proveedor con más gasto</div>
              <div className="mt-3 text-xl font-black tracking-[-.5px] text-slate-900">
                {resumen?.proveedorMayorGasto?.proveedor ?? 'Sin datos'}
              </div>
              <div className="stat-hint">{formatMoney(resumen?.proveedorMayorGasto?.total)}</div>
            </article>
          </>
        )}
      </section>

      <section className="card p-5 sm:p-6">
        <div className="page-heading">
          <div className="page-kicker">Mensual</div>
          <h2 className="page-title text-[22px]">Gasto por mes</h2>
          <p className="page-subtitle">
            Barras agrupadas por área para visualizar cómo se distribuye el gasto durante el año.
          </p>
        </div>

        {!isLoading && !hasData ? (
          <div className="empty-state">
            <div className="empty-icon">📉</div>
            <div className="empty-title">Sin gastos registrados para los filtros elegidos</div>
            <div className="empty-copy">Probá con otro año o quitá alguno de los filtros.</div>
          </div>
        ) : (
          <div className="mt-6 h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.25)" />
                <XAxis dataKey="mesLabel" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(value) => formatCompactMoney(Number(value))}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={78}
                />
                <Tooltip
                  formatter={(value, name) => [formatMoney(Number(value ?? 0)), String(name)]}
                  labelFormatter={(label) => `Mes: ${label}`}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #dbe3ef',
                    boxShadow: '0 10px 30px rgba(15,23,42,.12)',
                  }}
                />
                <Legend />
                {areaRows.map((areaName) => (
                  <Bar
                    key={areaName}
                    dataKey={areaName}
                    name={areaName}
                    fill={AREA_COLORS[areaName as AreaMunicipal] ?? '#3b82f6'}
                    radius={[6, 6, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="card p-5 sm:p-6">
          <div className="page-heading">
            <div className="page-kicker">Áreas</div>
            <h2 className="page-title text-[22px]">Matriz por área</h2>
            <p className="page-subtitle">Cada celda muestra el total pagado en el mes para esa área.</p>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-[980px] text-sm">
              <thead>
                <tr>
                  <th>Área</th>
                  {months.map((month) => <th key={month}>{monthLabel(month)}</th>)}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {areaRows.map((areaName) => {
                  const totalRow = months.reduce(
                    (acc, month) =>
                      acc + rowValue(resumen?.porArea ?? [], (item) => item.area === areaName, month),
                    0,
                  );

                  return (
                    <tr key={areaName}>
                      <td className="font-semibold text-slate-700">{areaName}</td>
                      {months.map((month) => (
                        <td key={`${areaName}-${month}`} className="font-mono text-xs text-slate-500">
                          {formatMoney(rowValue(resumen?.porArea ?? [], (item) => item.area === areaName, month))}
                        </td>
                      ))}
                      <td className="font-mono text-sm font-bold text-slate-900">{formatMoney(totalRow)}</td>
                    </tr>
                  );
                })}
                <tr>
                  <td className="font-bold text-slate-900">Total mensual</td>
                  {areaColumnTotals.map((value, index) => (
                    <td key={`area-total-${months[index]}`} className="font-mono text-sm font-bold text-slate-900">
                      {formatMoney(value)}
                    </td>
                  ))}
                  <td className="font-mono text-sm font-black text-blue-700">
                    {formatMoney(resumen?.totalGastado)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article className="card p-5 sm:p-6">
          <div className="page-heading">
            <div className="page-kicker">Proveedores</div>
            <h2 className="page-title text-[22px]">Matriz por proveedor</h2>
            <p className="page-subtitle">Ordenada por gasto acumulado para ver rápidamente quién concentra más pagos.</p>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-[980px] text-sm">
              <thead>
                <tr>
                  <th>Proveedor</th>
                  {months.map((month) => <th key={month}>{monthLabel(month)}</th>)}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {providerRows.map((proveedorName) => {
                  const totalRow = months.reduce(
                    (acc, month) =>
                      acc + rowValue(resumen?.porProveedor ?? [], (item) => item.proveedor === proveedorName, month),
                    0,
                  );

                  return (
                    <tr key={proveedorName}>
                      <td className="font-semibold text-slate-700">{proveedorName}</td>
                      {months.map((month) => (
                        <td key={`${proveedorName}-${month}`} className="font-mono text-xs text-slate-500">
                          {formatMoney(rowValue(resumen?.porProveedor ?? [], (item) => item.proveedor === proveedorName, month))}
                        </td>
                      ))}
                      <td className="font-mono text-sm font-bold text-slate-900">{formatMoney(totalRow)}</td>
                    </tr>
                  );
                })}
                <tr>
                  <td className="font-bold text-slate-900">Total mensual</td>
                  {providerColumnTotals.map((value, index) => (
                    <td key={`provider-total-${months[index]}`} className="font-mono text-sm font-bold text-slate-900">
                      {formatMoney(value)}
                    </td>
                  ))}
                  <td className="font-mono text-sm font-black text-blue-700">
                    {formatMoney(resumen?.totalGastado)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="page-heading">
          <div className="page-kicker">Detalle</div>
          <h2 className="page-title text-[22px]">Gastos registrados</h2>
          <p className="page-subtitle">Listado individual de pagos que generaron el gasto contable.</p>
        </div>

        {!isLoading && gastos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🧾</div>
            <div className="empty-title">No hay gastos para mostrar</div>
            <div className="empty-copy">Los gastos aparecerán acá cuando Tesorería marque facturas como pagadas.</div>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-[1100px] text-sm">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Descripción</th>
                  <th>Área</th>
                  <th>Proveedor</th>
                  <th>Fecha pago</th>
                  <th>Transferencia</th>
                  <th>Monto</th>
                  <th>Factura</th>
                </tr>
              </thead>
              <tbody>
                {gastos.map((item: GastoFinanzas) => (
                  <tr key={item.id}>
                    <td className="font-mono text-xs text-slate-400">{item.pedidoNumero}</td>
                    <td className="font-semibold text-slate-800">{item.descripcion}</td>
                    <td className="text-slate-500">{item.area}</td>
                    <td className="text-slate-500">{item.proveedor}</td>
                    <td className="text-slate-500">{formatDate(item.fechaPago)}</td>
                    <td className="font-mono text-xs text-slate-500">{item.numeroTransferencia}</td>
                    <td className="font-mono text-sm font-bold text-slate-900">{formatMoney(item.montoPagado)}</td>
                    <td>
                      {item.facturaUrl ? (
                        <a href={item.facturaUrl} target="_blank" rel="noreferrer" className="doc-link">
                          📄 Ver factura
                        </a>
                      ) : (
                        <span className="badge badge-amber">Sin adjunto</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

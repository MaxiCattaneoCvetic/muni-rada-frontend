import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MouseHandlerDataParam } from 'recharts';
import { finanzasApi } from '../../api/services';
import { AREAS, type AreaMunicipal, type FinanzasResumen, type GastoFinanzas } from '../../types';
import { exportFinanzasExcel } from '../../lib/finanzas-excel';
import { formatDate, formatMoney } from '../../lib/utils';
import { ButtonSpinner } from '../../components/ui/loading';
import { getMockGastos, getMockResumen } from './finanzas-mock';

const AREA_COLORS: Record<AreaMunicipal, string> = {
  Automotores: '#2563eb',
  Compras: '#7c3aed',
  Cultura: '#c026d3',
  Gobierno: '#4f46e5',
  'Guardia Urbana': '#475569',
  Hacienda: '#d97706',
  'Licencia de Conducir': '#0891b2',
  'Medio Ambiente': '#15803d',
  'Obras Públicas': '#0ea5e9',
  Rentas: '#65a30d',
  RRHH: '#0f766e',
  Secretaría: '#3b82f6',
  Sistemas: '#22c55e',
  Tesorería: '#14b8a6',
  'Turismo y Deportes': '#ea580c',
};

const OTHERS_AREA_COLOR = '#94a3b8';
const PROVIDER_CHART_COLORS = ['#2563eb', '#7c3aed', '#14b8a6', '#ea580c', '#0f766e', '#94a3b8'];

function buildMonthKeys(year: number) {
  return Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`);
}

function monthLabel(monthKey: string) {
  const label = new Date(`${monthKey}-01T12:00:00`).toLocaleDateString('es-AR', { month: 'short' });
  return label.replace('.', '').replace(/^\w/, (char) => char.toUpperCase());
}

function monthLabelLong(monthKey: string) {
  return new Date(`${monthKey}-01T12:00:00`).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    .replace(/^\w/, (char) => char.toUpperCase());
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

function buildMonthlyTotalChartData(summary: FinanzasResumen | undefined, months: string[]) {
  return months.map((month) => ({
    mes: month,
    mesLabel: monthLabel(month),
    total: rowValue(summary?.porMes ?? [], () => true, month),
  }));
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

function buildProviderLeaderboard(summary: FinanzasResumen | undefined) {
  const totals = new Map<string, number>();
  for (const item of summary?.porProveedor ?? []) {
    totals.set(item.proveedor, (totals.get(item.proveedor) ?? 0) + item.total);
  }
  return [...totals.entries()]
    .map(([proveedor, total]) => ({ proveedor, total }))
    .sort((left, right) => right.total - left.total || left.proveedor.localeCompare(right.proveedor));
}

function compactLabel(value: string, max = 18) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export function FinanzasPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [monthStart, setMonthStart] = useState(1);
  const [monthEnd, setMonthEnd] = useState(12);
  const [area, setArea] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<{ key: string; label: string } | null>(null);
  const [exportMode, setExportMode] = useState<'resumen' | 'completo' | null>(null);

  const yearOptions = useMemo(() => {
    const start = currentYear + 1;
    return Array.from({ length: 6 }, (_, index) => start - index);
  }, [currentYear]);
  const months = useMemo(() => buildMonthKeys(year), [year]);
  const visibleMonths = useMemo(() => months.slice(monthStart - 1, monthEnd), [monthEnd, monthStart, months]);
  const monthOptions = useMemo(
    () => months.map((month, index) => ({ value: index + 1, label: monthLabel(month) })),
    [months],
  );

  const catalogoQuery = useQuery({
    queryKey: ['finanzas', 'catalogo', year, monthStart, monthEnd, demoMode],
    queryFn: () => demoMode
      ? Promise.resolve(getMockGastos({ year, monthStart, monthEnd }))
      : finanzasApi.getGastos({ year, monthStart, monthEnd }),
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
    queryKey: ['finanzas', 'resumen', year, monthStart, monthEnd, area, proveedorSeleccionado, demoMode],
    queryFn: () => demoMode
      ? Promise.resolve(getMockResumen({
        year,
        monthStart,
        monthEnd,
        area: area || undefined,
        proveedor: proveedorSeleccionado || undefined,
      }))
      : finanzasApi.getResumen({
        year,
        monthStart,
        monthEnd,
        area: area || undefined,
        proveedor: proveedorSeleccionado || undefined,
      }),
  });

  const gastosQuery = useQuery({
    queryKey: ['finanzas', 'gastos', year, monthStart, monthEnd, area, proveedorSeleccionado, demoMode],
    queryFn: () => demoMode
      ? Promise.resolve(getMockGastos({
        year,
        monthStart,
        monthEnd,
        area: area || undefined,
        proveedor: proveedorSeleccionado || undefined,
      }))
      : finanzasApi.getGastos({
        year,
        monthStart,
        monthEnd,
        area: area || undefined,
        proveedor: proveedorSeleccionado || undefined,
      }),
  });

  const resumen = resumenQuery.data;
  const gastos = useMemo(() => gastosQuery.data ?? [], [gastosQuery.data]);

  const areaRows = useMemo(() => (area ? [area] : AREAS), [area]);
  const providerRows = useMemo(() => {
    if (proveedorSeleccionado) return [proveedorSeleccionado];
    return buildProviderTotals(resumen);
  }, [proveedorSeleccionado, resumen]);
  const providerLeaderboard = useMemo(() => buildProviderLeaderboard(resumen), [resumen]);
  const topProviderChart = useMemo(
    () => providerLeaderboard.slice(0, 8).map((item, index) => ({
      ...item,
      fill: PROVIDER_CHART_COLORS[index % PROVIDER_CHART_COLORS.length],
      proveedorShort: compactLabel(item.proveedor, 20),
    })),
    [providerLeaderboard],
  );
  const monthlyTotalChartData = useMemo(
    () => buildMonthlyTotalChartData(resumen, visibleMonths),
    [resumen, visibleMonths],
  );
  const topAreaLeaderboard = useMemo(() => {
    if (area) {
      return areaRows
        .map((areaName) => ({
          area: areaName,
          total: visibleMonths.reduce(
            (acc, month) => acc + rowValue(resumen?.porArea ?? [], (item) => item.area === areaName, month),
            0,
          ),
        }))
        .filter((item) => item.total > 0);
    }

    return AREAS
      .map((areaName) => ({
        area: areaName,
        total: visibleMonths.reduce(
          (acc, month) => acc + rowValue(resumen?.porArea ?? [], (item) => item.area === areaName, month),
          0,
        ),
      }))
      .filter((item) => item.total > 0)
      .sort((left, right) => right.total - left.total || left.area.localeCompare(right.area));
  }, [area, areaRows, resumen, visibleMonths]);
  const compositionAreaKeys = useMemo(() => {
    if (area) return topAreaLeaderboard.map((item) => item.area);
    return topAreaLeaderboard.slice(0, 5).map((item) => item.area);
  }, [area, topAreaLeaderboard]);
  const monthlyAreaCompositionData = useMemo(() => {
    return visibleMonths.map((month) => {
      const row: Record<string, string | number> = {
        mes: month,
        mesLabel: monthLabel(month),
      };
      let othersTotal = 0;

      for (const areaName of areaRows) {
        const total = rowValue(resumen?.porArea ?? [], (item) => item.area === areaName, month);
        if (compositionAreaKeys.includes(areaName)) {
          row[areaName] = total;
        } else {
          othersTotal += total;
        }
      }

      if (!area && areaRows.length > compositionAreaKeys.length) {
        row.Otras = othersTotal;
      }

      return row;
    });
  }, [area, areaRows, compositionAreaKeys, resumen, visibleMonths]);
  const compositionSeries = useMemo(() => {
    const topSeries = compositionAreaKeys.map((areaName) => ({
      key: areaName,
      color: AREA_COLORS[areaName as AreaMunicipal] ?? '#3b82f6',
    }));
    if (!area && areaRows.length > compositionAreaKeys.length) {
      return [...topSeries, { key: 'Otras', color: OTHERS_AREA_COLOR }];
    }
    return topSeries;
  }, [area, areaRows.length, compositionAreaKeys]);
  const selectedMonthAreas = useMemo(() => {
    if (!selectedMonth) return [];
    return areaRows
      .map((areaName) => ({
        area: areaName,
        total: rowValue(resumen?.porArea ?? [], (item) => item.area === areaName, selectedMonth.key),
      }))
      .filter((item) => item.total > 0)
      .sort((left, right) => right.total - left.total || left.area.localeCompare(right.area));
  }, [areaRows, resumen, selectedMonth]);
  const selectedMonthGastos = useMemo(() => {
    if (!selectedMonth) return [];
    return gastos
      .filter((item) => item.mes === selectedMonth.key)
      .sort((left, right) => right.montoPagado - left.montoPagado || right.fechaPago.localeCompare(left.fechaPago));
  }, [gastos, selectedMonth]);
  const selectedMonthTotal = selectedMonthAreas.reduce((acc, item) => acc + item.total, 0);
  const topProviderShare = useMemo(() => {
    if (!resumen?.totalGastado || providerLeaderboard.length === 0) return 0;
    return (providerLeaderboard[0].total / resumen.totalGastado) * 100;
  }, [providerLeaderboard, resumen]);
  const top3ProviderShare = useMemo(() => {
    if (!resumen?.totalGastado || providerLeaderboard.length === 0) return 0;
    const top3Total = providerLeaderboard.slice(0, 3).reduce((acc, item) => acc + item.total, 0);
    return (top3Total / resumen.totalGastado) * 100;
  }, [providerLeaderboard, resumen]);

  const areaColumnTotals = useMemo(() => {
    return visibleMonths.map((month) =>
      areaRows.reduce(
        (acc, areaName) => acc + rowValue(resumen?.porArea ?? [], (item) => item.area === areaName, month),
        0,
      ));
  }, [visibleMonths, areaRows, resumen]);

  const providerColumnTotals = useMemo(() => {
    return visibleMonths.map((month) =>
      providerRows.reduce(
        (acc, proveedorName) =>
          acc + rowValue(resumen?.porProveedor ?? [], (item) => item.proveedor === proveedorName, month),
        0,
      ));
  }, [visibleMonths, providerRows, resumen]);

  const isLoading = catalogoQuery.isLoading || resumenQuery.isLoading || gastosQuery.isLoading;
  const hasData = (resumen?.cantidadPagos ?? 0) > 0;
  const exportDisabled = isLoading || !hasData || !resumen || exportMode !== null;

  useEffect(() => {
    if (selectedMonth && !visibleMonths.includes(selectedMonth.key)) {
      setSelectedMonth(null);
    }
  }, [selectedMonth, visibleMonths]);

  const handleChartClick = (state: MouseHandlerDataParam) => {
    const idx = state.activeTooltipIndex ?? state.activeIndex;
    if (typeof idx !== 'number' || idx < 0 || idx >= monthlyTotalChartData.length) return;
    const payload = monthlyTotalChartData[idx];
    if (!payload?.mes) return;
    setSelectedMonth({
      key: payload.mes,
      label: monthLabelLong(payload.mes),
    });
  };

  const handleExport = async (mode: 'resumen' | 'completo') => {
    if (!resumen) return;

    setExportMode(mode);
    try {
      await exportFinanzasExcel({
        mode,
        year,
        months: visibleMonths,
        area: area || undefined,
        proveedor: proveedorSeleccionado || undefined,
        resumen,
        gastos,
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
        <div className="flex flex-wrap items-center gap-3">
          <div className="page-kicker">Finanzas</div>
          <button
            type="button"
            onClick={() => setDemoMode((value) => !value)}
            className={`btn btn-sm ${demoMode ? 'btn-primary' : 'btn-ghost'}`}
          >
            {demoMode ? 'Modo demo activo' : 'Ver demo'}
          </button>
        </div>
        <h1 className="page-title">Gastos por área y proveedor</h1>
        <p className="page-subtitle">
          Cada gasto nace cuando Tesorería registra una factura como pagada. Acá podés seguir el gasto mes a mes.
        </p>
        {demoMode && (
          <div className="mt-3 inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            Estás viendo datos mock generados en el navegador.
          </div>
        )}
      </header>

      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-[.7px] text-slate-400">Filtros</div>
            <div className="mt-2 text-sm text-slate-500">
              Ajustá el período y segmentá la vista por área o proveedor.
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[980px] xl:grid-cols-5">
            <div>
              <label className="label">Año</label>
              <select value={year} onChange={(event) => setYear(Number(event.target.value))} className="input">
                {yearOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Mes inicio</label>
              <select
                value={monthStart}
                onChange={(event) => {
                  const nextStart = Number(event.target.value);
                  setMonthStart(nextStart);
                  if (nextStart > monthEnd) setMonthEnd(nextStart);
                }}
                className="input"
              >
                {monthOptions.map((option) => (
                  <option key={`month-start-${option.value}`} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Mes fin</label>
              <select
                value={monthEnd}
                onChange={(event) => {
                  const nextEnd = Number(event.target.value);
                  setMonthEnd(nextEnd);
                  if (nextEnd < monthStart) setMonthStart(nextEnd);
                }}
                className="input"
              >
                {monthOptions.map((option) => (
                  <option key={`month-end-${option.value}`} value={option.value}>{option.label}</option>
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
            El gráfico principal muestra el total gastado por mes para detectar rápido picos, caídas y tendencia.
          </p>
          <div className="mt-2 text-xs font-medium text-slate-500">
            Hacé click en cualquier mes para abrir el detalle completo y ver todas las áreas involucradas.
          </div>
        </div>

        {!isLoading && !hasData ? (
          <div className="empty-state">
            <div className="empty-icon">📉</div>
            <div className="empty-title">Sin gastos registrados para los filtros elegidos</div>
            <div className="empty-copy">Probá con otro año o quitá alguno de los filtros.</div>
          </div>
        ) : (
          <>
            <div className="mt-6">
              <div className="text-xs font-extrabold uppercase tracking-[.7px] text-slate-400">Total mensual</div>
              <div className="mt-4 h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTotalChartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }} onClick={handleChartClick}>
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
                      formatter={(value) => [formatMoney(Number(value ?? 0)), 'Total']}
                      labelFormatter={(label) => `Mes: ${label}`}
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid #dbe3ef',
                        boxShadow: '0 10px 30px rgba(15,23,42,.12)',
                      }}
                    />
                    <Bar dataKey="total" name="Total mensual" fill="#2563eb" radius={[8, 8, 0, 0]} className="cursor-pointer" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-8 border-t border-slate-100 pt-6">
              <div className="text-xs font-extrabold uppercase tracking-[.7px] text-slate-400">Composición</div>
              <h3 className="mt-2 text-lg font-black tracking-[-.4px] text-slate-900">Top 5 áreas + Otras</h3>
              <p className="mt-2 text-sm text-slate-500">
                Esta vista resume la composición mensual mostrando solo las áreas más relevantes del período.
              </p>

              <div className="mt-5 h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyAreaCompositionData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }} onClick={handleChartClick}>
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
                    {compositionSeries.map(({ key, color }, index) => (
                      <Bar
                        key={key}
                        dataKey={key}
                        name={key}
                        fill={color}
                        stackId="monthly-composition"
                        radius={index === compositionSeries.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                        className="cursor-pointer"
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="card p-5 sm:p-6">
        <div className="page-heading">
          <div className="page-kicker">Proveedores</div>
          <h2 className="page-title text-[22px]">Top proveedores</h2>
          <p className="page-subtitle">
            Ranking por gasto acumulado para detectar rápido quién concentra más pagos en el período.
          </p>
        </div>

        {!isLoading && topProviderChart.length === 0 ? (
          <div className="empty-state">
            <div className="empty-title">No hay proveedores para mostrar</div>
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <article className="stat-card">
                <div className="text-xs font-extrabold uppercase tracking-[.7px] text-slate-400">Proveedor líder</div>
                <div className="mt-3 text-lg font-black text-slate-900">
                  {providerLeaderboard[0]?.proveedor ?? 'Sin datos'}
                </div>
                <div className="stat-hint">
                  {providerLeaderboard[0] ? `${formatMoney(providerLeaderboard[0].total)} · ${formatPercent(topProviderShare)}` : 'Sin datos'}
                </div>
              </article>
              <article className="stat-card">
                <div className="text-xs font-extrabold uppercase tracking-[.7px] text-slate-400">Top 3 concentran</div>
                <div className="mt-3 text-2xl font-black text-blue-700">{formatPercent(top3ProviderShare)}</div>
                <div className="stat-hint">Del gasto total del período</div>
              </article>
              <article className="stat-card">
                <div className="text-xs font-extrabold uppercase tracking-[.7px] text-slate-400">Proveedores activos</div>
                <div className="mt-3 text-2xl font-black text-emerald-700">{providerLeaderboard.length}</div>
                <div className="stat-hint">Con pagos registrados</div>
              </article>
            </div>

            <div className="mt-6 h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProviderChart} layout="vertical" margin={{ top: 0, right: 16, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.18)" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => formatCompactMoney(Number(value))}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="proveedorShort"
                    tick={{ fill: '#334155', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={150}
                  />
                  <Tooltip
                    formatter={(value) => [formatMoney(Number(value ?? 0)), 'Total']}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.proveedor ?? 'Proveedor'}
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #dbe3ef',
                      boxShadow: '0 10px 30px rgba(15,23,42,.12)',
                    }}
                  />
                  <Bar dataKey="total" radius={[0, 10, 10, 0]}>
                    {topProviderChart.map((item) => (
                      <Cell key={item.proveedor} fill={item.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
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
                  {visibleMonths.map((month) => <th key={month}>{monthLabel(month)}</th>)}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {areaRows.map((areaName) => {
                  const totalRow = visibleMonths.reduce(
                    (acc, month) =>
                      acc + rowValue(resumen?.porArea ?? [], (item) => item.area === areaName, month),
                    0,
                  );

                  return (
                    <tr key={areaName}>
                      <td className="font-semibold text-slate-700">{areaName}</td>
                      {visibleMonths.map((month) => (
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
                    <td key={`area-total-${visibleMonths[index]}`} className="font-mono text-sm font-bold text-slate-900">
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
                  {visibleMonths.map((month) => <th key={month}>{monthLabel(month)}</th>)}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {providerRows.map((proveedorName) => {
                  const totalRow = visibleMonths.reduce(
                    (acc, month) =>
                      acc + rowValue(resumen?.porProveedor ?? [], (item) => item.proveedor === proveedorName, month),
                    0,
                  );

                  return (
                    <tr key={proveedorName}>
                      <td className="font-semibold text-slate-700">{proveedorName}</td>
                      {visibleMonths.map((month) => (
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
                    <td key={`provider-total-${visibleMonths[index]}`} className="font-mono text-sm font-bold text-slate-900">
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
                  <th>Comprobante</th>
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
                          📄 Ver comprobante
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

      {selectedMonth && (
        <div
          className="fixed inset-0 z-[260] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          onClick={() => setSelectedMonth(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-[28px] bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <div className="text-xs font-extrabold uppercase tracking-[.7px] text-slate-400">Detalle mensual</div>
                <h3 className="mt-1 text-2xl font-black tracking-[-.5px] text-slate-900">{selectedMonth.label}</h3>
                <p className="mt-2 text-sm text-slate-500">
                  {selectedMonthAreas.length} area{selectedMonthAreas.length !== 1 ? 's' : ''} con gasto y {selectedMonthGastos.length} pago{selectedMonthGastos.length !== 1 ? 's' : ''} registrado{selectedMonthGastos.length !== 1 ? 's' : ''}.
                </p>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedMonth(null)}>
                Cerrar
              </button>
            </div>

            <div className="max-h-[calc(88vh-84px)] overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid gap-4 md:grid-cols-3">
                <article className="stat-card">
                  <div className="text-xs font-extrabold uppercase tracking-[.7px] text-slate-400">Total del mes</div>
                  <div className="mt-3 text-2xl font-black text-slate-900">{formatMoney(selectedMonthTotal)}</div>
                </article>
                <article className="stat-card">
                  <div className="text-xs font-extrabold uppercase tracking-[.7px] text-slate-400">Areas con gasto</div>
                  <div className="mt-3 text-2xl font-black text-blue-700">{selectedMonthAreas.length}</div>
                </article>
                <article className="stat-card">
                  <div className="text-xs font-extrabold uppercase tracking-[.7px] text-slate-400">Pagos del mes</div>
                  <div className="mt-3 text-2xl font-black text-emerald-700">{selectedMonthGastos.length}</div>
                </article>
              </div>

              <section className="mt-6">
                <div className="page-heading">
                  <div className="page-kicker">Areas</div>
                  <h4 className="page-title text-[20px]">Desglose del mes</h4>
                  <p className="page-subtitle">Ordenado de mayor a menor para que se vea rápido qué áreas concentraron el gasto.</p>
                </div>

                {selectedMonthAreas.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-title">No hay gasto por área para este mes</div>
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {selectedMonthAreas.map(({ area, total }) => (
                      <div key={area} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className="h-3 w-3 flex-shrink-0 rounded-full"
                              style={{ backgroundColor: AREA_COLORS[area as AreaMunicipal] ?? '#3b82f6' }}
                            />
                            <span className="truncate font-semibold text-slate-800">{area}</span>
                          </div>
                          <span className="font-mono text-sm font-bold text-slate-900">{formatMoney(total)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="mt-8">
                <div className="page-heading">
                  <div className="page-kicker">Pagos</div>
                  <h4 className="page-title text-[20px]">Movimientos del mes</h4>
                  <p className="page-subtitle">Detalle individual de los pagos que componen ese total mensual.</p>
                </div>

                {selectedMonthGastos.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-title">No hay pagos para mostrar</div>
                  </div>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-[900px] text-sm">
                      <thead>
                        <tr>
                          <th>Pedido</th>
                          <th>Descripcion</th>
                          <th>Area</th>
                          <th>Proveedor</th>
                          <th>Fecha</th>
                          <th>Transferencia</th>
                          <th>Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedMonthGastos.map((item) => (
                          <tr key={item.id}>
                            <td className="font-mono text-xs text-slate-400">{item.pedidoNumero}</td>
                            <td className="font-semibold text-slate-800">{item.descripcion}</td>
                            <td className="text-slate-500">{item.area}</td>
                            <td className="text-slate-500">{item.proveedor}</td>
                            <td className="text-slate-500">{formatDate(item.fechaPago)}</td>
                            <td className="font-mono text-xs text-slate-500">{item.numeroTransferencia}</td>
                            <td className="font-mono text-sm font-bold text-slate-900">{formatMoney(item.montoPagado)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

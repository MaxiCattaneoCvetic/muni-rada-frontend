import { AREAS, type AreaMunicipal, type FinanzasResumen, type GastoFinanzas } from '../../types';

type FinanzasMockParams = {
  year?: number;
  area?: string;
  proveedor?: string;
  monthStart?: number;
  monthEnd?: number;
};

const MOCK_PROVEEDORES = [
  'Distribuidora Norte SRL',
  'Insumos del Sur SA',
  'TechProv Sistemas',
  'Ferreteria Central',
  'Papeleria Modelo',
  'Automotriz Regional',
  'Limpieza Total SRL',
  'Eventos y Catering SA',
] as const;

const AREA_DESCRIPTIONS: Record<AreaMunicipal, string[]> = {
  Automotores: ['Cubiertas y repuestos', 'Service de flota', 'Lubricantes y filtros'],
  Compras: ['Insumos de contratacion', 'Papeleria operativa', 'Gastos administrativos'],
  Cultura: ['Produccion de eventos', 'Sonido e iluminacion', 'Material para talleres'],
  Gobierno: ['Insumos institucionales', 'Servicios de apoyo', 'Material de oficina'],
  'Guardia Urbana': ['Equipamiento de patrulla', 'Uniformes y calzado', 'Mantenimiento de moviles'],
  Hacienda: ['Licencias administrativas', 'Servicios profesionales', 'Insumos contables'],
  'Licencia de Conducir': ['Formularios y credenciales', 'Mantenimiento de box', 'Elementos de evaluacion'],
  'Medio Ambiente': ['Herramientas de mantenimiento', 'Elementos de limpieza', 'Insumos de vivero'],
  'Obras Públicas': ['Materiales de obra', 'Alquiler de maquinaria', 'Elementos de seguridad'],
  Rentas: ['Talonarios y formularios', 'Servicios de impresion', 'Insumos de atencion'],
  RRHH: ['Capacitaciones', 'Indumentaria laboral', 'Insumos de bienestar'],
  Secretaría: ['Mobiliario menor', 'Articulos de oficina', 'Servicios generales'],
  Sistemas: ['Hardware y perifericos', 'Licencias de software', 'Cableado y redes'],
  Tesorería: ['Resguardo documental', 'Insumos de caja', 'Servicios bancarios'],
  'Turismo y Deportes': ['Elementos deportivos', 'Promocion turistica', 'Equipamiento recreativo'],
};

const AREA_WEIGHTS: Record<AreaMunicipal, number> = {
  Automotores: 1.06,
  Compras: 1.12,
  Cultura: 1.2,
  Gobierno: 1.1,
  'Guardia Urbana': 1.18,
  Hacienda: 1.08,
  'Licencia de Conducir': 0.94,
  'Medio Ambiente': 1.04,
  'Obras Públicas': 1.42,
  Rentas: 0.92,
  RRHH: 0.98,
  Secretaría: 1.16,
  Sistemas: 1.24,
  Tesorería: 1.02,
  'Turismo y Deportes': 1.14,
};

function buildMonths(year: number) {
  return Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`);
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 1_000_003;
  }
  return hash;
}

function buildAmount(year: number, monthIndex: number, area: AreaMunicipal, paymentIndex: number) {
  const weight = AREA_WEIGHTS[area];
  const seasonalFactor = 0.86 + ((monthIndex % 6) * 0.08);
  const yearlyFactor = year === 2026 ? 1.14 : 1;
  const areaSeed = (hashString(area) % 17) * 2_900;
  const paymentSeed = paymentIndex * 23_000;
  const amount = 42_000 + areaSeed + paymentSeed;
  return Math.round(amount * weight * seasonalFactor * yearlyFactor);
}

function buildMockGastosSource(): GastoFinanzas[] {
  const result: GastoFinanzas[] = [];
  const years = [2025, 2026];

  for (const year of years) {
    const monthLimit = year === 2026 ? 4 : 12;

    for (let monthIndex = 0; monthIndex < monthLimit; monthIndex += 1) {
      const month = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

      AREAS.forEach((area, areaIndex) => {
        const paymentCount = 1 + ((monthIndex + areaIndex) % 2);

        for (let paymentIndex = 0; paymentIndex < paymentCount; paymentIndex += 1) {
          const proveedor = MOCK_PROVEEDORES[(areaIndex + monthIndex + paymentIndex) % MOCK_PROVEEDORES.length];
          const descriptions = AREA_DESCRIPTIONS[area];
          const descripcionBase = descriptions[(monthIndex + paymentIndex) % descriptions.length];
          const day = 3 + ((areaIndex * 2 + paymentIndex * 5 + monthIndex) % 24);
          const fechaPago = `${month}-${String(day).padStart(2, '0')}`;
          const idBase = `${year}${String(monthIndex + 1).padStart(2, '0')}${String(areaIndex + 1).padStart(2, '0')}${paymentIndex + 1}`;

          result.push({
            id: `mock-gasto-${idBase}`,
            pedidoId: `mock-pedido-${idBase}`,
            pedidoNumero: `PED-${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(areaIndex + 1).padStart(2, '0')}${paymentIndex + 1}`,
            descripcion: `${descripcionBase} - ${area}`,
            area,
            proveedor,
            fechaPago,
            mes: month,
            montoPagado: buildAmount(year, monthIndex, area, paymentIndex),
            numeroTransferencia: `TRF-${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(areaIndex + 1).padStart(2, '0')}${paymentIndex + 1}`,
            facturaUrl: null,
          });
        }
      });
    }
  }

  return result.sort((left, right) => right.fechaPago.localeCompare(left.fechaPago));
}

const MOCK_GASTOS = buildMockGastosSource();

function normalizeFilters(params?: FinanzasMockParams) {
  return {
    year: params?.year,
    area: params?.area ?? undefined,
    proveedor: params?.proveedor ?? undefined,
    monthStart: params?.monthStart,
    monthEnd: params?.monthEnd,
  };
}

function filterMockGastos(params?: FinanzasMockParams) {
  const filters = normalizeFilters(params);
  return MOCK_GASTOS.filter((item) => {
    if (filters.year && !item.mes.startsWith(`${filters.year}-`)) return false;
    if (filters.area && item.area !== filters.area) return false;
    if (filters.proveedor && item.proveedor !== filters.proveedor) return false;
    const monthNumber = Number(item.mes.split('-')[1]);
    if (filters.monthStart && monthNumber < filters.monthStart) return false;
    if (filters.monthEnd && monthNumber > filters.monthEnd) return false;
    return true;
  });
}

function sumByMonth(items: GastoFinanzas[], month: string) {
  return items
    .filter((item) => item.mes === month)
    .reduce((acc, item) => acc + item.montoPagado, 0);
}

function sumByArea(items: GastoFinanzas[], area: AreaMunicipal) {
  return items
    .filter((item) => item.area === area)
    .reduce((acc, item) => acc + item.montoPagado, 0);
}

function sumByProveedor(items: GastoFinanzas[], proveedor: string) {
  return items
    .filter((item) => item.proveedor === proveedor)
    .reduce((acc, item) => acc + item.montoPagado, 0);
}

export function getMockGastos(params?: FinanzasMockParams): GastoFinanzas[] {
  return filterMockGastos(params);
}

export function getMockResumen(params?: FinanzasMockParams): FinanzasResumen {
  const { year = new Date().getFullYear() } = normalizeFilters(params);
  const items = filterMockGastos({ ...params, year });
  const months = buildMonths(year);
  const proveedores = [...new Set(items.map((item) => item.proveedor))].sort((left, right) => left.localeCompare(right));
  const areaTotals = AREAS
    .map((area) => ({ area, total: sumByArea(items, area) }))
    .filter((item) => item.total > 0)
    .sort((left, right) => right.total - left.total || left.area.localeCompare(right.area));
  const providerTotals = proveedores
    .map((proveedor) => ({ proveedor, total: sumByProveedor(items, proveedor) }))
    .filter((item) => item.total > 0)
    .sort((left, right) => right.total - left.total || left.proveedor.localeCompare(right.proveedor));

  return {
    year,
    filters: {
      area: (params?.area as AreaMunicipal | undefined) ?? null,
      proveedor: params?.proveedor ?? null,
      monthStart: params?.monthStart ?? null,
      monthEnd: params?.monthEnd ?? null,
    },
    totalGastado: items.reduce((acc, item) => acc + item.montoPagado, 0),
    cantidadPagos: items.length,
    areaMayorGasto: areaTotals[0] ?? null,
    proveedorMayorGasto: providerTotals[0] ?? null,
    porMes: months.map((month) => ({
      mes: month,
      total: sumByMonth(items, month),
    })),
    porArea: months.flatMap((month) =>
      AREAS.map((area) => ({
        area,
        mes: month,
        total: items
          .filter((item) => item.area === area && item.mes === month)
          .reduce((acc, item) => acc + item.montoPagado, 0),
      })),
    ),
    porProveedor: months.flatMap((month) =>
      proveedores.map((proveedor) => ({
        proveedor,
        mes: month,
        total: items
          .filter((item) => item.proveedor === proveedor && item.mes === month)
          .reduce((acc, item) => acc + item.montoPagado, 0),
      })),
    ),
  };
}

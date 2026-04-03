import type { Sheet } from 'xlsx-populate/browser/xlsx-populate';
import type { FinanzasResumen, GastoFinanzas } from '../types';

type ExportMode = 'resumen' | 'completo';

interface ExportFinanzasExcelParams {
  mode: ExportMode;
  year: number;
  area?: string;
  proveedor?: string;
  resumen: FinanzasResumen;
  gastos: GastoFinanzas[];
  months: string[];
  areaRows: string[];
  providerRows: string[];
}

type CellValue = string | number;

const HEADER_FILL = 'DBEAFE';
const SUBHEADER_FILL = 'EFF6FF';
const BORDER_COLOR = 'DDE3EF';
const MONEY_FORMAT = '"$"#,##0';

function monthLabel(monthKey: string) {
  const label = new Date(`${monthKey}-01T12:00:00`).toLocaleDateString('es-AR', { month: 'short' });
  return label.replace('.', '').replace(/^\w/, (char) => char.toUpperCase());
}

function rowValue<T extends { mes: string; total: number }>(
  items: T[],
  matcher: (item: T) => boolean,
  month: string,
) {
  return items.find((item) => matcher(item) && item.mes === month)?.total ?? 0;
}

function columnName(index: number) {
  let result = '';
  let current = index;

  while (current > 0) {
    const remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }

  return result;
}

function sanitizePart(value?: string) {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  document.body.appendChild(anchor);
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(anchor);
}

function writeTable(
  sheet: Sheet,
  startRow: number,
  startColumn: number,
  rows: CellValue[][],
  options?: {
    title?: string;
    moneyColumns?: number[];
    totalRow?: boolean;
    widths?: number[];
  },
) {
  let currentRow = startRow;

  if (options?.title) {
    sheet.cell(currentRow, startColumn).value(options.title).style({
      bold: true,
      fontSize: 14,
      fontColor: '1E3A8A',
    });
    currentRow += 1;
  }

  sheet.cell(currentRow, startColumn).value(rows);

  const endRow = currentRow + rows.length - 1;
  const endColumn = startColumn + rows[0].length - 1;
  const startAddress = `${columnName(startColumn)}${currentRow}`;
  const endAddress = `${columnName(endColumn)}${endRow}`;
  const tableRange = sheet.range(`${startAddress}:${endAddress}`);

  tableRange.style({
    border: {
      top: { style: 'thin', color: BORDER_COLOR },
      bottom: { style: 'thin', color: BORDER_COLOR },
      left: { style: 'thin', color: BORDER_COLOR },
      right: { style: 'thin', color: BORDER_COLOR },
    },
    verticalAlignment: 'center',
  });

  sheet.range(`${columnName(startColumn)}${currentRow}:${columnName(endColumn)}${currentRow}`).style({
    bold: true,
    fill: HEADER_FILL,
    fontColor: '1E3A8A',
  });

  if (options?.totalRow) {
    sheet.range(`${columnName(startColumn)}${endRow}:${columnName(endColumn)}${endRow}`).style({
      bold: true,
      fill: SUBHEADER_FILL,
    });
  }

  for (const moneyColumn of options?.moneyColumns ?? []) {
    const absoluteColumn = startColumn + moneyColumn;
    if (rows.length > 1) {
      sheet
        .range(`${columnName(absoluteColumn)}${currentRow + 1}:${columnName(absoluteColumn)}${endRow}`)
        .style('numberFormat', MONEY_FORMAT);
    }
  }

  (options?.widths ?? []).forEach((width, index) => {
    sheet.column(columnName(startColumn + index)).width(width);
  });

  return endRow;
}

function buildAreaMatrix(params: ExportFinanzasExcelParams) {
  const header = ['Área', ...params.months.map(monthLabel), 'Total'];
  const rows = params.areaRows.map((areaName) => {
    const values = params.months.map((month) =>
      rowValue(params.resumen.porArea, (item) => item.area === areaName, month),
    );
    return [areaName, ...values, values.reduce((acc, value) => acc + value, 0)];
  });

  const totals = params.months.map((month) =>
    params.areaRows.reduce(
      (acc, areaName) => acc + rowValue(params.resumen.porArea, (item) => item.area === areaName, month),
      0,
    ),
  );

  return [header, ...rows, ['Total mensual', ...totals, params.resumen.totalGastado]];
}

function buildProviderMatrix(params: ExportFinanzasExcelParams) {
  const header = ['Proveedor', ...params.months.map(monthLabel), 'Total'];
  const rows = params.providerRows.map((providerName) => {
    const values = params.months.map((month) =>
      rowValue(params.resumen.porProveedor, (item) => item.proveedor === providerName, month),
    );
    return [providerName, ...values, values.reduce((acc, value) => acc + value, 0)];
  });

  const totals = params.months.map((month) =>
    params.providerRows.reduce(
      (acc, providerName) =>
        acc + rowValue(params.resumen.porProveedor, (item) => item.proveedor === providerName, month),
      0,
    ),
  );

  return [header, ...rows, ['Total mensual', ...totals, params.resumen.totalGastado]];
}

function buildDetalleTable(gastos: GastoFinanzas[]) {
  return [
    ['Pedido', 'Descripción', 'Área', 'Proveedor', 'Fecha pago', 'Mes', 'Transferencia', 'Monto', 'Factura'],
    ...gastos.map((item) => [
      item.pedidoNumero,
      item.descripcion,
      item.area,
      item.proveedor,
      new Date(item.fechaPago).toLocaleDateString('es-AR'),
      monthLabel(item.mes),
      item.numeroTransferencia,
      item.montoPagado,
      item.facturaUrl ? 'Adjunta' : 'Sin adjunto',
    ]),
  ];
}

function buildFilename(params: ExportFinanzasExcelParams) {
  const parts = [
    'finanzas',
    params.mode,
    String(params.year),
    sanitizePart(params.area),
    sanitizePart(params.proveedor),
  ].filter(Boolean);

  return `${parts.join('-')}.xlsx`;
}

export async function exportFinanzasExcel(params: ExportFinanzasExcelParams) {
  const { default: XlsxPopulate } = await import('xlsx-populate/browser/xlsx-populate');
  const workbook = await XlsxPopulate.fromBlankAsync();

  const resumenSheet = workbook.sheet(0).name('Resumen');
  resumenSheet.column('A').width(28);
  resumenSheet.column('B').width(22);

  resumenSheet.cell('A1').value('Reporte de Finanzas').style({
    bold: true,
    fontSize: 18,
    fontColor: '1E3A8A',
  });

  resumenSheet.cell('A3').value([
    ['Año', params.year],
    ['Área', params.area || 'Todas'],
    ['Proveedor', params.proveedor || 'Todos'],
    ['Exportado', new Date().toLocaleString('es-AR')],
    ['Total gastado', params.resumen.totalGastado],
    ['Pagos registrados', params.resumen.cantidadPagos],
    ['Área con mayor gasto', params.resumen.areaMayorGasto?.area ?? 'Sin datos'],
    ['Proveedor con mayor gasto', params.resumen.proveedorMayorGasto?.proveedor ?? 'Sin datos'],
  ]);

  resumenSheet.range('A3:B10').style({
    border: {
      top: { style: 'thin', color: BORDER_COLOR },
      bottom: { style: 'thin', color: BORDER_COLOR },
      left: { style: 'thin', color: BORDER_COLOR },
      right: { style: 'thin', color: BORDER_COLOR },
    },
  });
  resumenSheet.range('A3:A10').style({ bold: true, fill: SUBHEADER_FILL });
  resumenSheet.range('B7:B7').style('numberFormat', MONEY_FORMAT);

  writeTable(
    resumenSheet,
    13,
    1,
    [
      ['Mes', 'Total'],
      ...params.months.map((month) => [
        monthLabel(month),
        params.resumen.porMes.find((item) => item.mes === month)?.total ?? 0,
      ]),
    ],
    { title: 'Resumen mensual', moneyColumns: [1], widths: [16, 18] },
  );

  const areaSheet = workbook.addSheet('Por área');
  writeTable(areaSheet, 1, 1, buildAreaMatrix(params), {
    title: 'Gastos por área y mes',
    moneyColumns: params.months.map((_, index) => index + 1).concat(params.months.length + 1),
    totalRow: true,
    widths: [24, ...params.months.map(() => 14), 16],
  });
  areaSheet.freezePanes('B2');

  const providerSheet = workbook.addSheet('Por proveedor');
  writeTable(providerSheet, 1, 1, buildProviderMatrix(params), {
    title: 'Gastos por proveedor y mes',
    moneyColumns: params.months.map((_, index) => index + 1).concat(params.months.length + 1),
    totalRow: true,
    widths: [30, ...params.months.map(() => 14), 16],
  });
  providerSheet.freezePanes('B2');

  if (params.mode === 'completo') {
    const detailSheet = workbook.addSheet('Detalle');
    writeTable(detailSheet, 1, 1, buildDetalleTable(params.gastos), {
      title: 'Detalle de gastos registrados',
      moneyColumns: [7],
      widths: [14, 34, 18, 26, 14, 12, 18, 14, 14],
    });
    detailSheet.freezePanes('A2');
  }

  const blob = await workbook.outputAsync();
  downloadBlob(blob, buildFilename(params));
}

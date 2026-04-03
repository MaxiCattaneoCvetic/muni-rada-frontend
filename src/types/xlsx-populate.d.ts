declare module 'xlsx-populate' {
  export interface Cell {
    value(value: unknown): Cell;
    style(name: string, value: unknown): Cell;
    style(styles: Record<string, unknown>): Cell;
  }

  export interface Range {
    value(value: unknown): Range;
    style(name: string, value: unknown): Range;
    style(styles: Record<string, unknown>): Range;
  }

  export interface Column {
    width(width: number): Column;
  }

  export interface Sheet {
    name(name: string): Sheet;
    cell(address: string): Cell;
    cell(row: number, column: number): Cell;
    range(address: string): Range;
    column(name: string): Column;
    freezePanes(address: string): Sheet;
  }

  export interface Workbook {
    sheet(index: number | string): Sheet;
    addSheet(name: string, indexOrBeforeSheet?: number | string | Sheet): Sheet;
    outputAsync(): Promise<Blob>;
  }

  const XlsxPopulate: {
    fromBlankAsync(): Promise<Workbook>;
  };

  export default XlsxPopulate;
}

declare module 'xlsx-populate/browser/xlsx-populate' {
  export * from 'xlsx-populate';
  import XlsxPopulate from 'xlsx-populate';
  export default XlsxPopulate;
}

// src/types/exceljs.d.ts
// Ambient declaration for exceljs

declare module "exceljs" {
  export interface Column {
    header?: string;
    key?: string;
    width?: number;
    numFmt?: string;
  }

  export interface Row {
    font?: { bold?: boolean };
    commit(): void;
    getCell(keyOrIndex: string | number): {
      value: any;
      numFmt?: string;
    };
  }

  export interface Worksheet {
    columns: Column[];
    getRow(index: number): Row;
    getColumn(keyOrIndex: string | number): Column;
    getCell(ref: string): {
      value: any;
      numFmt?: string;
    };
    addRow(data: Record<string, any>): Row;
  }

  export class Workbook {
    xlsx: {
      writeBuffer(): Promise<ArrayBuffer>;
    };
    addWorksheet(name: string): Worksheet;
  }

  const ExcelJS: {
    Workbook: typeof Workbook;
  };

  export default ExcelJS;
}

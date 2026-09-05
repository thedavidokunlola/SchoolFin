// src/types/date-fns.d.ts
// Ambient declaration for date-fns format function

declare module "date-fns" {
  export function format(date: Date | number, formatStr: string): string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// Utilidades del servidor falso (modo demo sin backend)

export type R = Record<string, any>;

/** Generador pseudoaleatorio determinista (mulberry32) */
export function crearRng(semilla: number) {
  let a = semilla >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    rnd,
    int: (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min,
    pick: <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)],
    chance: (p: number) => rnd() < p,
  };
}

const p2 = (n: number) => String(n).padStart(2, '0');

export const ymd = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const isoLocal = (d: Date) => `${ymd(d)}T${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
export const hhmmss = (d: Date) => `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
export const sumarDias = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const inicioDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
export const redondear = (n: number) => Math.round(n * 100) / 100;

/** Interpreta "yyyy-MM-dd" o "yyyy-MM-ddTHH:mm:ss" como hora local */
export function aFecha(s: string): Date {
  if (!s) return new Date(NaN);
  return s.length <= 10 ? new Date(`${s}T00:00:00`) : new Date(s);
}

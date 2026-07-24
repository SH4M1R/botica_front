import jsPDF from 'jspdf';
import type { ArqueoCaja } from '@/api/arqueo';

export interface FilaMetodoPago {
  metodo: string;
  cantidadVentas: number;
  totalVendido: number;
  ganancia: number;
}

function formatFechaHora(fecha: string) {
  return new Date(fecha).toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function generarReporteMetodoPagoPos80(
  caja: ArqueoCaja,
  filas: FilaMetodoPago[],
  totales: FilaMetodoPago
): Blob {
  const ANCHO = 80;
  const MARGEN = 6;

  const alturaEstimada = 55 + filas.length * 20 + 25;
  const doc = new jsPDF({ unit: 'mm', format: [ANCHO, Math.max(alturaEstimada, 90)] });

  let y = 6;
  const centerX = ANCHO / 2;

  const linea = (dashed = true) => {
    doc.setLineDashPattern(dashed ? [0.5, 0.5] : [], 0);
    doc.setDrawColor(0);
    doc.line(MARGEN, y, ANCHO - MARGEN, y);
    y += 3;
  };

  const texto = (
    contenido: string,
    opts: { align?: 'left' | 'center' | 'right'; size?: number; bold?: boolean } = {}
  ) => {
    const { align = 'left', size = 8, bold = false } = opts;
    doc.setFont('courier', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const posX = align === 'center' ? centerX : align === 'right' ? ANCHO - MARGEN : MARGEN;
    doc.text(contenido, posX, y, { align });
    y += size * 0.42 + 1.2;
  };

  texto('REPORTE POR MÉTODO DE PAGO', { align: 'center', size: 9.5, bold: true });
  texto(`Caja N° ${caja.numero}`, { align: 'center', size: 8, bold: true });

  linea();

  texto(`Empleado: ${caja.empleadoNombre}`, { size: 7.5 });
  texto(`Apertura: ${formatFechaHora(caja.fechaInicio)}`, { size: 7.5 });
  texto(`Emitido: ${new Date().toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, { size: 7.5 });

  linea();

  filas.forEach((fila) => {
    texto(fila.metodo, { bold: true, size: 8 });
    texto(`  Ventas: ${fila.cantidadVentas}`, { size: 7 });
    texto(`  Total vendido: S/ ${fila.totalVendido.toFixed(2)}`, { size: 7 });
    texto(`  Ganancia: S/ ${fila.ganancia.toFixed(2)}`, { size: 7 });
    y += 1;
  });

  linea(false);

  texto(`Total ventas: ${totales.cantidadVentas}`, { bold: true, size: 8 });
  texto(`Total vendido: S/ ${totales.totalVendido.toFixed(2)}`, { bold: true, size: 8 });
  texto(`Ganancia total: S/ ${totales.ganancia.toFixed(2)}`, { bold: true, size: 8 });

  linea();
  texto('Reporte generado por el sistema', { align: 'center', size: 6.5 });

  return doc.output('blob');
}

export function generarReporteMetodoPagoA4(
  caja: ArqueoCaja,
  filas: FilaMetodoPago[],
  totales: FilaMetodoPago
): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const MARGEN = 20;
  const ANCHO_PAGINA = 210;
  const ANCHO_UTIL = ANCHO_PAGINA - MARGEN * 2; // 170mm

  const COL_METODO = 55;
  const COL_VENTAS = 30;
  const COL_TOTAL = 42;
  const COL_GANANCIA = 43; // suma = 170

  const X_METODO = MARGEN;
  const X_VENTAS_R = X_METODO + COL_METODO + COL_VENTAS;
  const X_TOTAL_R = X_VENTAS_R + COL_TOTAL;
  const X_GANANCIA_R = X_TOTAL_R + COL_GANANCIA;

  let y = 25;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Reporte de Ganancias por Método de Pago', MARGEN, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Caja N°: ${caja.numero}`, MARGEN, y);
  y += 6;
  doc.text(`Empleado: ${caja.empleadoNombre}`, MARGEN, y);
  y += 6;
  doc.text(`Apertura de caja: ${formatFechaHora(caja.fechaInicio)}`, MARGEN, y);
  y += 6;
  doc.text(
    `Fecha de emisión: ${new Date().toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`,
    MARGEN,
    y
  );
  y += 10;

  doc.setDrawColor(180);
  doc.line(MARGEN, y, MARGEN + ANCHO_UTIL, y);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Método de Pago', X_METODO, y);
  doc.text('N° Ventas', X_VENTAS_R, y, { align: 'right' });
  doc.text('Total Vendido', X_TOTAL_R, y, { align: 'right' });
  doc.text('Ganancia', X_GANANCIA_R, y, { align: 'right' });
  y += 3;

  doc.setDrawColor(0);
  doc.line(MARGEN, y, MARGEN + ANCHO_UTIL, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  filas.forEach((fila) => {
    doc.text(fila.metodo, X_METODO, y);
    doc.text(String(fila.cantidadVentas), X_VENTAS_R, y, { align: 'right' });
    doc.text(`S/ ${fila.totalVendido.toFixed(2)}`, X_TOTAL_R, y, { align: 'right' });
    doc.text(`S/ ${fila.ganancia.toFixed(2)}`, X_GANANCIA_R, y, { align: 'right' });
    y += 8;
  });

  doc.setDrawColor(180);
  doc.line(MARGEN, y, MARGEN + ANCHO_UTIL, y);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', X_METODO, y);
  doc.text(String(totales.cantidadVentas), X_VENTAS_R, y, { align: 'right' });
  doc.text(`S/ ${totales.totalVendido.toFixed(2)}`, X_TOTAL_R, y, { align: 'right' });
  doc.text(`S/ ${totales.ganancia.toFixed(2)}`, X_GANANCIA_R, y, { align: 'right' });

  doc.setDrawColor(0);
  y += 3;
  doc.line(MARGEN, y, MARGEN + ANCHO_UTIL, y);

  return doc.output('blob');
}
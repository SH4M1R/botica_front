import jsPDF from 'jspdf';
import type { ArqueoCaja } from '@/api/arqueo';
import type { Venta } from '@/api/ventas';

const ANCHO = 80;
const MARGEN = 6; 
const ANCHO_UTIL = ANCHO - MARGEN * 2;

const COL_CLIENTE = 26;
const COL_HORA = 12;
const COL_METODO = 18;
const COL_MONTO = 12;

const X_CLIENTE = MARGEN;
const X_HORA_R = X_CLIENTE + COL_CLIENTE + COL_HORA;
const X_METODO_R = X_HORA_R + COL_METODO;
const X_MONTO_R = X_METODO_R + COL_MONTO;

function formatFechaHora(fecha: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(fecha).toLocaleString('es-PE', opts);
}

export function generarReporteCajaPdf(arqueo: ArqueoCaja, ventas: Venta[]): Blob {
  const alturaEstimada = 60 + ventas.length * 8 + 20;
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
    opts: { align?: 'left' | 'center' | 'right'; size?: number; bold?: boolean; x?: number } = {}
  ) => {
    const { align = 'left', size = 8, bold = false, x } = opts;
    doc.setFont('courier', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const posX = x ?? (align === 'center' ? centerX : align === 'right' ? ANCHO - MARGEN : MARGEN);
    doc.text(contenido, posX, y, { align });
    y += size * 0.42 + 1.2;
  };

  texto('CIERRE DE CAJA', { align: 'center', size: 10, bold: true });
  texto(`N° ${arqueo.numero}`, { align: 'center', size: 9, bold: true });

  linea();

  texto(`Empleado: ${arqueo.empleadoNombre}`);
  texto(`Apertura: ${formatFechaHora(arqueo.fechaInicio, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`);
  texto(
    `Cierre: ${
      arqueo.fechaFin
        ? formatFechaHora(arqueo.fechaFin, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : 'En curso'
    }`
  );
  texto(`Monto Inicial: S/ ${arqueo.montoInicial.toFixed(2)}`);
  if (arqueo.montoFinal !== null) {
    texto(`Monto Final: S/ ${arqueo.montoFinal.toFixed(2)}`);
  }

  linea();

  doc.setFont('courier', 'bold');
  doc.setFontSize(7);
  doc.text('Cliente', X_CLIENTE, y);
  doc.text('Hora', X_HORA_R, y, { align: 'right' });
  doc.text('Método', X_METODO_R, y, { align: 'right' });
  doc.text('Monto', X_MONTO_R, y, { align: 'right' });
  y += 3.2;

  linea();

  let total = 0;

  ventas.forEach((v) => {
    const nombreCliente = v.cliente?.nombre ?? 'Clientes Varios';
    const hora = new Date(v.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    const lineasNombre: string[] = doc.splitTextToSize(nombreCliente, COL_CLIENTE);

    doc.text(lineasNombre[0], X_CLIENTE, y);
    doc.text(hora, X_HORA_R, y, { align: 'right' });
    doc.text(v.metodoPago, X_METODO_R, y, { align: 'right' });
    doc.text(v.total.toFixed(2), X_MONTO_R, y, { align: 'right' });
    y += 3.6;

    for (let i = 1; i < lineasNombre.length; i++) {
      doc.text(lineasNombre[i], X_CLIENTE, y);
      y += 3.6;
    }

    total += v.total;
  });

  linea(false);
  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.text('TOTAL', MARGEN, y);
  doc.text(`S/ ${total.toFixed(2)}`, ANCHO - MARGEN, y, { align: 'right' });
  y += 5;

  linea();
  texto(`Ventas registradas: ${ventas.length}`, { size: 7 });
  texto('Reporte generado por el sistema', { align: 'center', size: 6.5 });

  return doc.output('blob');
}
import jsPDF from 'jspdf';
import type { Asistencia } from '@/api/asistencia';

function formatFecha(fecha: string) {
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatHora(fechaHora: string | null) {
  if (!fechaHora) return '—';
  return new Date(fechaHora).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

async function cargarImagenBase64(url: string): Promise<{ data: string; ratio: number } | null> {
  try {
    let data: string;
    if (url.startsWith('data:')) {
      data = url;
    } else {
      const res = await fetch(url);
      const blob = await res.blob();
      data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    const dim = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.width, h: img.height });
      img.onerror = () => resolve({ w: 100, h: 100 });
      img.src = data;
    });
    return { data, ratio: dim.h / dim.w };
  } catch {
    return null;
  }
}

/**
 * Reporte Formato POS Ticket (80mm)
 */
export async function generarReporteAsistenciaPos80(
  fechaInicio: string,
  fechaFin: string,
  registros: Asistencia[],
  logoUrl?: string
): Promise<Blob> {
  const ANCHO = 80;
  const MARGEN = 6;

  const alturaEstimada = 90 + registros.length * 16 + (logoUrl ? 20 : 0);
  const doc = new jsPDF({ unit: 'mm', format: [ANCHO, Math.max(alturaEstimada, 120)] });

  let y = 6;
  const centerX = ANCHO / 2;

  if (logoUrl) {
    const logo = await cargarImagenBase64(logoUrl);
    if (logo) {
      const formato = logo.data.includes('image/jpeg') || logo.data.includes('image/jpg') ? 'JPEG' : 'PNG';
      const anchoLogo = 50;
      const altoLogo = anchoLogo * logo.ratio;
      const xLogo = centerX - anchoLogo / 2;
      doc.addImage(logo.data, formato, xLogo, y, anchoLogo, altoLogo);
      y += altoLogo + 4;
    }
  }

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

  texto('REPORTE DE ASISTENCIA', { align: 'center', size: 9.5, bold: true });
  texto(`Del ${formatFecha(fechaInicio)} al ${formatFecha(fechaFin)}`, { align: 'center', size: 7.5 });

  linea();

  const tardanzas = registros.filter((r) => r.tardanza).length;
  texto(`Total registros: ${registros.length}`, { size: 7.5 });
  texto(`Tardanzas: ${tardanzas}`, { size: 7.5 });

  linea();

  registros.forEach((r) => {
    texto(`${r.nombreEmpleado}`, { bold: true, size: 8 });
    texto(`  Fecha: ${formatFecha(r.fecha)}`, { size: 7 });
    texto(`  Entrada: ${formatHora(r.horaEntrada)}   Salida: ${formatHora(r.horaSalida)}`, { size: 7 });
    if (r.tardanza) {
      texto(`  ** Tardanza: ${r.minutosTardanza} min **`, { size: 7, bold: true });
    }
    y += 1;
  });

  linea(false);
  texto('Reporte generado por el sistema', { align: 'center', size: 6.5 });

  return doc.output('blob');
}

/**
 * Reporte Formato Hoja A4
 */
export async function generarReporteAsistenciaA4(
  fechaInicio: string,
  fechaFin: string,
  registros: Asistencia[],
  logoUrl?: string
): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const MARGEN = 20;
  const ANCHO_PAGINA = 210;
  const ANCHO_UTIL = ANCHO_PAGINA - MARGEN * 2;

  const COL_EMPLEADO = 55;
  const COL_FECHA = 30;
  const COL_ENTRADA = 30;
  const COL_SALIDA = 30;
  const COL_TARDANZA = 25; // suma = 170

  const X_EMPLEADO = MARGEN;
  const X_FECHA_R = X_EMPLEADO + COL_EMPLEADO + COL_FECHA;
  const X_ENTRADA_R = X_FECHA_R + COL_ENTRADA;
  const X_SALIDA_R = X_ENTRADA_R + COL_SALIDA;
  const X_TARDANZA_R = X_SALIDA_R + COL_TARDANZA;

  let y = 20;

  if (logoUrl) {
    const logo = await cargarImagenBase64(logoUrl);
    if (logo) {
      const formato = logo.data.includes('image/jpeg') || logo.data.includes('image/jpg') ? 'JPEG' : 'PNG';
      const altoMax = 22;
      const anchoLogo = altoMax / logo.ratio;
      doc.addImage(logo.data, formato, ANCHO_PAGINA - MARGEN - anchoLogo, y, anchoLogo, altoMax);
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Reporte de Asistencia', MARGEN, y + 6);
  y += 16;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Periodo: ${formatFecha(fechaInicio)} al ${formatFecha(fechaFin)}`, MARGEN, y);
  y += 6;

  const tardanzas = registros.filter((r) => r.tardanza).length;
  doc.text(`Total registros: ${registros.length}   Tardanzas: ${tardanzas}`, MARGEN, y);
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
  doc.setFontSize(9);
  doc.text('Empleado', X_EMPLEADO, y);
  doc.text('Fecha', X_FECHA_R, y, { align: 'right' });
  doc.text('Entrada', X_ENTRADA_R, y, { align: 'right' });
  doc.text('Salida', X_SALIDA_R, y, { align: 'right' });
  doc.text('Tardanza', X_TARDANZA_R, y, { align: 'right' });
  y += 3;

  doc.setDrawColor(0);
  doc.line(MARGEN, y, MARGEN + ANCHO_UTIL, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  registros.forEach((r) => {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
    doc.text(r.nombreEmpleado, X_EMPLEADO, y);
    doc.text(formatFecha(r.fecha), X_FECHA_R, y, { align: 'right' });
    doc.text(formatHora(r.horaEntrada), X_ENTRADA_R, y, { align: 'right' });
    doc.text(formatHora(r.horaSalida), X_SALIDA_R, y, { align: 'right' });
    doc.text(r.tardanza ? `${r.minutosTardanza} min` : '—', X_TARDANZA_R, y, { align: 'right' });
    y += 7;
  });

  doc.setDrawColor(180);
  doc.line(MARGEN, y, MARGEN + ANCHO_UTIL, y);

  return doc.output('blob');
}
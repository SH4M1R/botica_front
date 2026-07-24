import jsPDF from 'jspdf';
import type { Traslado } from '@/api/traslados';

function formatFechaHora(fecha: string) {
  return new Date(fecha).toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
export async function generarReporteTrasladoPos80(
  traslado: Traslado,
  logoUrl?: string
): Promise<Blob> {
  const ANCHO = 80;
  const MARGEN = 6;

  // Ajustamos la altura estimada para incluir el logo y las firmas
  const alturaEstimada = 100 + traslado.detalles.length * 14 + (logoUrl ? 20 : 0);
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

  const titulo = traslado.tipo === 'INGRESO' ? 'REPORTE DE INGRESO' : 'REPORTE DE EGRESO';

  texto(titulo, { align: 'center', size: 9.5, bold: true });
  texto(`Traslado N° ${traslado.id}`, { align: 'center', size: 8, bold: true });

  linea();

  texto(`Sucursal: ${traslado.nombreSucursal}`, { size: 7.5 });
  texto(`Fecha: ${formatFechaHora(traslado.fecha)}`, { size: 7.5 });
  if (traslado.observacion) {
    texto(`Obs: ${traslado.observacion}`, { size: 7 });
  }

  linea();

  traslado.detalles.forEach((d) => {
    texto(d.nombreProducto, { bold: true, size: 8 });
    texto(`  Cant: ${d.cantidad}  x  S/ ${d.precioUnitario.toFixed(2)}`, { size: 7 });
    texto(`  Subtotal: S/ ${d.subtotal.toFixed(2)}`, { size: 7 });
    y += 1;
  });

  linea(false);

  texto(`Total productos: ${traslado.detalles.length}`, { bold: true, size: 8 });
  texto(`Total: S/ ${traslado.total.toFixed(2)}`, { bold: true, size: 8 });

  linea();

  y += 4;
  texto('DATOS DE EMISIÓN Y RECEPCIÓN', { align: 'center', size: 7, bold: true });
  y += 3;

  texto('Nombre Emisor: _________________', { size: 8 });
  texto('Firma Emisor:  _________________', { size: 8 });
  y += 3;
  texto('Nombre Receptor: _______________', { size: 8 });
  texto('Firma Receptor:  _______________', { size: 8 });

  y += 3;
  linea();
  texto('Reporte generado por el sistema', { align: 'center', size: 6.5 });

  return doc.output('blob');
}

/**
 * Reporte Formato Hoja A4
 */
export async function generarReporteTrasladoA4(
  traslado: Traslado,
  logoUrl?: string
): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const MARGEN = 20;
  const ANCHO_PAGINA = 210;
  const ANCHO_UTIL = ANCHO_PAGINA - MARGEN * 2; // 170mm

  const COL_PRODUCTO = 70;
  const COL_CANTIDAD = 30;
  const COL_PRECIO = 35;
  const COL_SUBTOTAL = 35; // suma = 170

  const X_PRODUCTO = MARGEN;
  const X_CANTIDAD_R = X_PRODUCTO + COL_PRODUCTO + COL_CANTIDAD;
  const X_PRECIO_R = X_CANTIDAD_R + COL_PRECIO;
  const X_SUBTOTAL_R = X_PRECIO_R + COL_SUBTOTAL;

  let y = 20;

if (logoUrl) {
    const logo = await cargarImagenBase64(logoUrl);
    if (logo) {
      const formato = logo.data.includes('image/jpeg') || logo.data.includes('image/jpg') ? 'JPEG' : 'PNG';
      const altoMax = 22; // Alto máximo de 22mm
      const anchoLogo = altoMax / logo.ratio;
      // Posiciona el logo a la derecha de la cabecera
      doc.addImage(logo.data, formato, ANCHO_PAGINA - MARGEN - anchoLogo, y, anchoLogo, altoMax);
    }
  }

  const titulo = traslado.tipo === 'INGRESO' ? 'Reporte de Ingreso de Productos' : 'Reporte de Egreso de Productos';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(titulo, MARGEN, y + 6);
  y += 16;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Traslado N°: ${traslado.id}`, MARGEN, y);
  y += 6;
  doc.text(`Sucursal: ${traslado.nombreSucursal}`, MARGEN, y);
  y += 6;
  doc.text(`Fecha del traslado: ${formatFechaHora(traslado.fecha)}`, MARGEN, y);
  y += 6;
  if (traslado.observacion) {
    doc.text(`Observación: ${traslado.observacion}`, MARGEN, y);
    y += 6;
  }
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
  doc.text('Producto', X_PRODUCTO, y);
  doc.text('Cantidad', X_CANTIDAD_R, y, { align: 'right' });
  doc.text('Precio Unit.', X_PRECIO_R, y, { align: 'right' });
  doc.text('Subtotal', X_SUBTOTAL_R, y, { align: 'right' });
  y += 3;

  doc.setDrawColor(0);
  doc.line(MARGEN, y, MARGEN + ANCHO_UTIL, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  traslado.detalles.forEach((d) => {
    doc.text(d.nombreProducto, X_PRODUCTO, y);
    doc.text(String(d.cantidad), X_CANTIDAD_R, y, { align: 'right' });
    doc.text(`S/ ${d.precioUnitario.toFixed(2)}`, X_PRECIO_R, y, { align: 'right' });
    doc.text(`S/ ${d.subtotal.toFixed(2)}`, X_SUBTOTAL_R, y, { align: 'right' });
    y += 8;
  });

  doc.setDrawColor(180);
  doc.line(MARGEN, y, MARGEN + ANCHO_UTIL, y);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', X_PRODUCTO, y);
  doc.text(`S/ ${traslado.total.toFixed(2)}`, X_SUBTOTAL_R, y, { align: 'right' });

  doc.setDrawColor(0);
  y += 3;
  doc.line(MARGEN, y, MARGEN + ANCHO_UTIL, y);

  // --- SECCIÓN DE DATOS Y FIRMAS EN A4 ---
  y += 25; 

  const anchoColumna = 75;
  const xEmisor = MARGEN;
  const xReceptor = MARGEN + 95;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  doc.text('Nombre Emisor: ________________________', xEmisor, y);
  y += 12;
  doc.text('Firma Emisor:  ________________________', xEmisor, y);

  y -= 12;

  doc.text('Nombre Receptor: ________________________', xReceptor, y);
  y += 12;
  doc.text('Firma Receptor:  ________________________', xReceptor, y);

  return doc.output('blob');
}
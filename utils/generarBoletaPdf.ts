import jsPDF from 'jspdf';
import type { Venta, TipoVenta } from '@/api/ventas';
import { getNombreCompleto } from '@/api/ventas';
import type { EmpresaForm } from '@/api/empresa';
import { montoEnLetras } from './Montoenletras';

const labelTipo: Record<TipoVenta, string> = {
  unidad: '',
  blister: 'Blister',
  caja: 'Caja',
};

const ANCHO = 80; // mm
const MARGEN = 5; // mm
const ANCHO_UTIL = ANCHO - MARGEN * 2;

const COL_PROD = 38;
const X_PROD = MARGEN;
const X_CANT_R = MARGEN + 48; 
const X_PUNIT_R = MARGEN + 59; 
const X_IMP_R = ANCHO - MARGEN;

async function cargarImagenBase64(url: string): Promise<{ data: string; ratio: number } | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const data: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const dim = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.width, h: img.height });
      img.src = data;
    });
    return { data, ratio: dim.h / dim.w };
  } catch {
    return null;
  }
}

// --- CAMBIO: nuevo parámetro opcional `vuelto` ---
export async function generarBoletaPdf(venta: Venta, empresa: EmpresaForm, vuelto?: number): Promise<Blob> {
  let imgLogo: { data: string; ratio: number } | null = null;
  if (empresa.logo) {
    imgLogo = await cargarImagenBase64(empresa.logo);
  }

  const docSimulado = new jsPDF({ unit: 'mm', format: [ANCHO, 1000] });
  let altoCalculado = 5;

  if (imgLogo) {
    altoCalculado += (ANCHO_UTIL * imgLogo.ratio) + 4;
  }

  altoCalculado += 12; // Nombre / Razón social
  if (empresa.ruc) altoCalculado += 4;
  if (empresa.direccion) altoCalculado += 4;
  if (empresa.departamento || empresa.ciudad) altoCalculado += 4;

  // Título ticket
  altoCalculado += 12;

  // Datos cliente
  altoCalculado += 16;
  if (venta.cliente?.dni) altoCalculado += 4;

  // Cabecera de la tabla de productos
  altoCalculado += 8;

  docSimulado.setFont('helvetica', 'normal');
  docSimulado.setFontSize(10);
  venta.detalles.forEach((d) => {
    const nombre = d.producto.nombre + (labelTipo[d.tipoVenta] ? ` (${labelTipo[d.tipoVenta]})` : '');
    const lineas = docSimulado.splitTextToSize(nombre, COL_PROD);
    altoCalculado += Math.max(lineas.length * 4, 4) + 1.5;
  });

  // Calcular líneas de Monto en Letras
  docSimulado.setFontSize(8);
  const lineasMontoSim = docSimulado.splitTextToSize(`SON: ${montoEnLetras(venta.total)}`, ANCHO_UTIL);
  altoCalculado += lineasMontoSim.length * 3.5 + 4;

  // Calcular líneas de Método de Pago
  docSimulado.setFontSize(9);
  const lineasMetodoPagoSim = docSimulado.splitTextToSize(`Metodo Pago: ${venta.metodoPago}`, ANCHO_UTIL);
  altoCalculado += lineasMetodoPagoSim.length * 3.8 + 6;

  // Totales y pie de página estático
  altoCalculado += 20;
  if (vuelto && vuelto > 0) altoCalculado += 5; // --- NUEVO: espacio para la línea de vuelto ---
  const ALTO_FINAL = Math.ceil(altoCalculado) + 10;

  // --- PASO 2: Renderizar el documento con la altura exacta ---
  const doc = new jsPDF({ unit: 'mm', format: [ANCHO, ALTO_FINAL] });
  let y = 5;
  const centerX = ANCHO / 2;

  const linea = (dashed = true) => {
    doc.setLineDashPattern(dashed ? [1, 1] : [], 0);
    doc.setDrawColor(150);
    doc.line(MARGEN, y, ANCHO - MARGEN, y);
    y += 3;
  };

  const texto = (
    contenido: string,
    opts: { align?: 'left' | 'center' | 'right'; size?: number; bold?: boolean; x?: number } = {}
  ) => {
    const { align = 'left', size = 11, bold = false, x } = opts;
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const posX = x ?? (align === 'center' ? centerX : align === 'right' ? ANCHO - MARGEN : MARGEN);
    doc.text(contenido, posX, y, { align });
    y += size * 0.35 + 1.5;
  };

  const textoMultilinea = (
    contenido: string,
    opts: { size?: number; bold?: boolean } = {}
  ) => {
    const { size = 9, bold = false } = opts;
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const lineas = doc.splitTextToSize(contenido, ANCHO_UTIL);
    doc.text(lineas, MARGEN, y);
    y += lineas.length * (size * 0.35 + 1.2) + 1;
  };

  if (imgLogo) {
    const anchoImg = ANCHO_UTIL;
    const altoImg = anchoImg * imgLogo.ratio;
    doc.addImage(imgLogo.data, MARGEN, y, anchoImg, altoImg);
    y += altoImg + 4;
  }

  texto(empresa.nombreComercial || empresa.razonSocial, { align: 'center', size: 10, bold: true });
  if (empresa.razonSocial && empresa.nombreComercial && empresa.razonSocial !== empresa.nombreComercial) {
    texto(empresa.razonSocial, { align: 'center', size: 9 });
  }
  if (empresa.ruc) texto(`RUC: ${empresa.ruc}`, { align: 'center', size: 9 });
  if (empresa.direccion) texto(empresa.direccion, { align: 'center', size: 9 });
  if (empresa.departamento || empresa.ciudad) {
    texto([empresa.departamento, empresa.ciudad].filter(Boolean).join(' - '), { align: 'center', size: 9 });
  }

  linea();
  texto(`NOTA DE VENTA NV01 - ${String(venta.id).padStart(8, '0')}`, { align: 'center', bold: true, size: 10 });
  linea();

  const fecha = new Date(venta.fecha).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  texto(`Fecha: ${fecha}`, { size: 9 });
  // --- CAMBIO: usa getNombreCompleto ---
  texto(`Cliente: ${venta.cliente ? getNombreCompleto(venta.cliente) : 'CLIENTES VARIOS'}`, { size: 9 });
  if (venta.cliente?.dni) texto(`DNI: ${venta.cliente.dni}`, { size: 9 });

  linea();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Producto', X_PROD, y);
  doc.text('Cant.', X_CANT_R, y, { align: 'right' });
  doc.text('P.Unit', X_PUNIT_R, y, { align: 'right' });
  doc.text('Imp.', X_IMP_R, y, { align: 'right' });
  y += 3.5;

  linea();

  venta.detalles.forEach((d) => {
    const nombre = d.producto.nombre + (labelTipo[d.tipoVenta] ? ` (${labelTipo[d.tipoVenta]})` : '');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const lineasNombre: string[] = doc.splitTextToSize(nombre, COL_PROD);

    const yInicialFila = y;
    doc.text(lineasNombre, X_PROD, y);

    doc.text(String(d.cantidad), X_CANT_R, yInicialFila, { align: 'right' });
    doc.text(d.precioUnitario.toFixed(2), X_PUNIT_R, yInicialFila, { align: 'right' });
    doc.text(d.subtotal.toFixed(2), X_IMP_R, yInicialFila, { align: 'right' });

    y += Math.max(lineasNombre.length * 3.8, 3.8) + 1.5;
  });

  // Totales
  linea(false);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('TOTAL:', MARGEN, y);
  doc.text(`S/ ${venta.total.toFixed(2)}`, ANCHO - MARGEN, y, { align: 'right' });
  y += 5;

  // --- NUEVO: línea de vuelto, solo si corresponde ---
  if (vuelto && vuelto > 0) {
    doc.text('VUELTO:', MARGEN, y);
    doc.text(`S/ ${vuelto.toFixed(2)}`, ANCHO - MARGEN, y, { align: 'right' });
    y += 5;
  }

  // Monto en Letras Multilinea
  textoMultilinea(`SON: ${montoEnLetras(venta.total)}`, { size: 8 });

  linea();
  // Método de Pago Multilinea (evita desbordamiento)
  textoMultilinea(`Metodo Pago: ${venta.metodoPago}`, { size: 9 });
  linea();

  texto('¡Gracias por su compra!', { align: 'center', bold: true, size: 10 });

  return doc.output('blob');
}
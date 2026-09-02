import jsPDF from 'jspdf';
import type { TipoVenta } from '@/components/ventaShared';
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

export interface ItemCotizacion {
  nombre: string;
  tipoVenta: TipoVenta;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface DatosCotizacion {
  items: ItemCotizacion[];
  clienteNombre: string;
  clienteDni?: string;
  total: number;
  folio?: string;
}

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

export async function generarCotizacionPdf(datos: DatosCotizacion, empresa?: EmpresaForm): Promise<Blob> {
  let imgLogo: { data: string; ratio: number } | null = null;
  if (empresa?.logo) {
    imgLogo = await cargarImagenBase64(empresa.logo);
  }

  // --- PASO 1: Calcular la altura exacta requerida ---
  const docSimulado = new jsPDF({ unit: 'mm', format: [ANCHO, 1000] });
  let altoCalculado = 5;

  if (imgLogo) {
    altoCalculado += (ANCHO_UTIL * imgLogo.ratio) + 3;
  }

  if (empresa) {
    altoCalculado += 8; // Nombre / Razón social
    if (empresa.ruc) altoCalculado += 3.5;
    if (empresa.direccion) altoCalculado += 3.5;
    if (empresa.departamento || empresa.ciudad) altoCalculado += 3.5;
  }

  // Encabezado del documento
  altoCalculado += 10;
  if (datos.folio) altoCalculado += 3.5;

  // Datos del cliente y empleado
  altoCalculado += 11;
  if (datos.clienteDni) altoCalculado += 3.5;

  // Cabecera de la tabla
  altoCalculado += 7;

  // Filas de productos
  docSimulado.setFont('helvetica', 'normal');
  docSimulado.setFontSize(9);
  datos.items.forEach((item) => {
    const nombre = item.nombre + (labelTipo[item.tipoVenta] ? ` (${labelTipo[item.tipoVenta]})` : '');
    const lineas = docSimulado.splitTextToSize(nombre, COL_PROD);
    altoCalculado += Math.max(lineas.length * 3.5, 3.5) + 1;
  });

  // Totales, monto en letras y pie de página
  altoCalculado += 8; // Total

  docSimulado.setFontSize(8);
  const lineasMontoSim = docSimulado.splitTextToSize(`SON: ${montoEnLetras(datos.total)}`, ANCHO_UTIL);
  altoCalculado += lineasMontoSim.length * 3.2 + 3;

  altoCalculado += 14; // Avisos legales / pie

  const ALTO_FINAL = Math.ceil(altoCalculado) + 5; // Margen final ajustado

  // --- PASO 2: Renderizar el documento con la altura exacta ---
  const doc = new jsPDF({ unit: 'mm', format: [ANCHO, ALTO_FINAL] });
  let y = 5;
  const centerX = ANCHO / 2;

  const linea = (dashed = true) => {
    doc.setLineDashPattern(dashed ? [1, 1] : [], 0);
    doc.setDrawColor(150);
    doc.line(MARGEN, y, ANCHO - MARGEN, y);
    y += 2.5;
  };

  const texto = (
    contenido: string,
    opts: { align?: 'left' | 'center' | 'right'; size?: number; bold?: boolean; x?: number } = {}
  ) => {
    const { align = 'left', size = 9, bold = false, x } = opts;
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const posX = x ?? (align === 'center' ? centerX : align === 'right' ? ANCHO - MARGEN : MARGEN);
    doc.text(contenido, posX, y, { align });
    y += size * 0.32 + 1;
  };

  const textoMultilinea = (
    contenido: string,
    opts: { size?: number; bold?: boolean; align?: 'left' | 'center' } = {}
  ) => {
    const { size = 8, bold = false, align = 'left' } = opts;
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const lineas = doc.splitTextToSize(contenido, ANCHO_UTIL);
    const posX = align === 'center' ? centerX : MARGEN;
    doc.text(lineas, posX, y, { align });
    y += lineas.length * (size * 0.32 + 0.8) + 1;
  };

  // Renderizado Empresa / Logo
  if (imgLogo) {
    const anchoImg = ANCHO_UTIL;
    const altoImg = anchoImg * imgLogo.ratio;
    doc.addImage(imgLogo.data, MARGEN, y, anchoImg, altoImg);
    y += altoImg + 3;
  }

  if (empresa) {
    texto(empresa.nombreComercial || empresa.razonSocial, { align: 'center', size: 10, bold: true });
    if (empresa.razonSocial && empresa.nombreComercial && empresa.razonSocial !== empresa.nombreComercial) {
      texto(empresa.razonSocial, { align: 'center', size: 8.5 });
    }
    if (empresa.ruc) texto(`RUC: ${empresa.ruc}`, { align: 'center', size: 8.5 });
    if (empresa.direccion) texto(empresa.direccion, { align: 'center', size: 8.5 });
    if (empresa.departamento || empresa.ciudad) {
      texto([empresa.departamento, empresa.ciudad].filter(Boolean).join(' - '), { align: 'center', size: 8.5 });
    }
  }

  linea();
  texto('COTIZACIÓN DE VENTA', { align: 'center', bold: true, size: 10 });
  if (datos.folio) texto(datos.folio, { align: 'center', bold: true, size: 8 });
  texto('Documento sin valor tributario', { align: 'center', size: 7 });
  linea();

  const fecha = new Date().toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  texto(`Fecha: ${fecha}`, { size: 8.5 });
  texto(`Cliente: ${datos.clienteNombre}`, { size: 8.5 });
  if (datos.clienteDni) texto(`DNI: ${datos.clienteDni}`, { size: 8.5 });

  linea();

  // Cabecera Tabla
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Producto', X_PROD, y);
  doc.text('Cant.', X_CANT_R, y, { align: 'right' });
  doc.text('P.Unit', X_PUNIT_R, y, { align: 'right' });
  doc.text('Imp.', X_IMP_R, y, { align: 'right' });
  y += 3;

  linea();

  // Detalle Productos
  datos.items.forEach((item) => {
    const nombre = item.nombre + (labelTipo[item.tipoVenta] ? ` (${labelTipo[item.tipoVenta]})` : '');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const lineasNombre: string[] = doc.splitTextToSize(nombre, COL_PROD);

    const yInicialFila = y;
    doc.text(lineasNombre, X_PROD, y);

    doc.text(String(item.cantidad), X_CANT_R, yInicialFila, { align: 'right' });
    doc.text(item.precioUnitario.toFixed(2), X_PUNIT_R, yInicialFila, { align: 'right' });
    doc.text(item.subtotal.toFixed(2), X_IMP_R, yInicialFila, { align: 'right' });

    y += Math.max(lineasNombre.length * 3.2, 3.2) + 1;
  });

  // Total
  linea(false);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('TOTAL:', MARGEN, y);
  doc.text(`S/ ${datos.total.toFixed(2)}`, ANCHO - MARGEN, y, { align: 'right' });
  y += 4;

  // Monto en letras
  textoMultilinea(`SON: ${montoEnLetras(datos.total)}`, { size: 7.5 });

  linea();
  textoMultilinea('Esta cotización NO descuenta stock ni se registra como venta. Precios sujetos a variación.', { align: 'center', size: 7 });

  return doc.output('blob');
}
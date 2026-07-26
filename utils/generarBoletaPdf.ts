import jsPDF from 'jspdf';
import type { Venta, TipoVenta } from '@/api/ventas';
import type { EmpresaForm } from '@/api/empresa';
import { montoEnLetras } from './Montoenletras';

const labelTipo: Record<TipoVenta, string> = {
  unidad: '',
  blister: 'Blister',
  caja: 'Caja',
};

const ANCHO = 80; // mm
const MARGEN = 6; // mm
const ANCHO_UTIL = ANCHO - MARGEN * 2;

const COL_PROD = 34;
const COL_CANT = 10;
const COL_PUNIT = 12;
const COL_IMP = 12;

const X_PROD = MARGEN;
const X_CANT_R = X_PROD + COL_PROD + COL_CANT; 
const X_PUNIT_R = X_CANT_R + COL_PUNIT;      
const X_IMP_R = X_PUNIT_R + COL_IMP;

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

export async function generarBoletaPdf(venta: Venta, empresa: EmpresaForm): Promise<Blob> {
  // Pre-cargar la imagen si existe para saber su altura real previa al dibujado
  let logoImg: { data: string; ratio: number } | null = null;
  if (empresa.logo) {
    logoImg = await cargarImagenBase64(empresa.logo);
  }

  // 1. PRIMERA PASADA: Calcular la altura real requerida (`altoRequerido`)
  const calcDoc = new jsPDF({ unit: 'mm', format: [ANCHO, 1000] });
  let altoRequerido = 5; // Padding inicial top

  // Logo
  if (logoImg) {
    const altoImg = ANCHO_UTIL * logoImg.ratio;
    altoRequerido += altoImg + 4;
  }

  // Encabezado
  altoRequerido += (10 * 0.42 + 1.2); // Nombre comercial / Razón social
  if (empresa.razonSocial && empresa.nombreComercial && empresa.razonSocial !== empresa.nombreComercial) {
    altoRequerido += (8 * 0.42 + 1.2);
  }
  if (empresa.ruc) altoRequerido += (8 * 0.42 + 1.2);
  if (empresa.direccion) altoRequerido += (8 * 0.42 + 1.2);
  if (empresa.departamento || empresa.ciudad) altoRequerido += (8 * 0.42 + 1.2);
  if (empresa.telefono) altoRequerido += (8 * 0.42 + 1.2);

  altoRequerido += 3; // Linea
  altoRequerido += (9 * 0.42 + 1.2); // Nota de venta
  altoRequerido += 3; // Linea

  // Datos de venta
  altoRequerido += (8 * 0.42 + 1.2); // Fecha
  altoRequerido += (8 * 0.42 + 1.2); // Cliente
  if (venta.cliente?.dni) altoRequerido += (8 * 0.42 + 1.2);
  altoRequerido += (8 * 0.42 + 1.2); // Atendido por

  altoRequerido += 3; // Linea
  altoRequerido += 3.5; // Cabecera tabla
  altoRequerido += 3; // Linea

  // Detalles de los productos
  calcDoc.setFont('courier', 'normal');
  calcDoc.setFontSize(7.5);
  venta.detalles.forEach((d) => {
    const nombre = d.producto.nombre + (labelTipo[d.tipoVenta] ? ` (${labelTipo[d.tipoVenta]})` : '');
    const lineasNombre: string[] = calcDoc.splitTextToSize(nombre, COL_PROD);
    altoRequerido += lineasNombre.length * 3.8;
  });

  altoRequerido += 3; // Linea
  altoRequerido += 5; // Total
  altoRequerido += (7 * 0.42 + 1.2); // Son en letras
  altoRequerido += 3; // Linea
  altoRequerido += (8 * 0.42 + 1.2); // Método de pago
  altoRequerido += 3; // Linea
  altoRequerido += (8 * 0.42 + 1.2); // Gracias por su compra
  altoRequerido += 8; // Margen final inferior para impresoras térmicas

  // 2. SEGUNDA PASADA: Generar el PDF con el tamaño dinámico exacto
  const doc = new jsPDF({ unit: 'mm', format: [ANCHO, Math.max(altoRequerido, 80)] });

  let y = 5;
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

  // Dibujar Logo
  if (logoImg) {
    const anchoImg = ANCHO_UTIL;
    const altoImg = anchoImg * logoImg.ratio;
    doc.addImage(logoImg.data, MARGEN, y, anchoImg, altoImg);
    y += altoImg + 4;
  }

  // Dibujar Datos Empresa
  texto(empresa.nombreComercial || empresa.razonSocial, { align: 'center', size: 10, bold: true });
  if (empresa.razonSocial && empresa.nombreComercial && empresa.razonSocial !== empresa.nombreComercial) {
    texto(empresa.razonSocial, { align: 'center' });
  }
  if (empresa.ruc) texto(`RUC ${empresa.ruc}`, { align: 'center' });
  if (empresa.direccion) texto(empresa.direccion, { align: 'center' });
  if (empresa.departamento || empresa.ciudad) {
    texto([empresa.departamento, empresa.ciudad].filter(Boolean).join(' - '), { align: 'center' });
  }
  if (empresa.telefono) texto(`Telf: ${empresa.telefono}`, { align: 'center' });

  linea();
  texto(`NOTA DE VENTA N° ${String(venta.id).padStart(8, '0')}`, { align: 'center', bold: true, size: 9 });
  linea();

  const fecha = new Date(venta.fecha).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  texto(`Fecha: ${fecha}`);
  texto(`Cliente: ${venta.cliente?.nombre ?? 'CLIENTES VARIOS'}`);
  if (venta.cliente?.dni) texto(`DNI: ${venta.cliente.dni}`);
  texto(`Atendido por: ${venta.empleado?.nombre}`);

  linea();

  // Dibujar Encabezado de Tabla
  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.text('Producto', X_PROD, y);
  doc.text('Cant.', X_CANT_R, y, { align: 'right' });
  doc.text('P.Unit', X_PUNIT_R, y, { align: 'right' });
  doc.text('Imp.', X_IMP_R, y, { align: 'right' });
  y += 3.5;

  linea();

  // Dibujar Detalles
  venta.detalles.forEach((d) => {
    const nombre = d.producto.nombre + (labelTipo[d.tipoVenta] ? ` (${labelTipo[d.tipoVenta]})` : '');

    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    const lineasNombre: string[] = doc.splitTextToSize(nombre, COL_PROD);

    doc.text(lineasNombre[0], X_PROD, y);
    doc.text(String(d.cantidad), X_CANT_R, y, { align: 'right' });
    doc.text(d.precioUnitario.toFixed(2), X_PUNIT_R, y, { align: 'right' });
    doc.text(d.subtotal.toFixed(2), X_IMP_R, y, { align: 'right' });
    y += 3.8;

    for (let i = 1; i < lineasNombre.length; i++) {
      doc.text(lineasNombre[i], X_PROD, y);
      y += 3.8;
    }
  });

  linea(false);
  doc.setFont('courier', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL', MARGEN, y);
  doc.text(`S/ ${venta.total.toFixed(2)}`, ANCHO - MARGEN, y, { align: 'right' });
  y += 5;

  texto(`SON: ${montoEnLetras(venta.total)}`, { size: 7 });

  linea();
  texto(`Método de pago: ${venta.metodoPago}`);
  linea();
  texto('¡Gracias por su compra!', { align: 'center', bold: true });

  return doc.output('blob');
}
import type { Traslado } from '@/api/traslados';
import { crearPos80Builder, crearA4Builder, formatFechaHora, ColumnaReporte } from './reportes/pdfBase'

interface DetalleTraslado {
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

const columnas: ColumnaReporte<DetalleTraslado>[] = [
  { header: 'Producto', align: 'left', widthA4: 70, render: (f) => f.nombreProducto },
  { header: 'Cantidad', align: 'right', widthA4: 30, render: (f) => String(f.cantidad) },
  { header: 'Precio Unit.', align: 'right', widthA4: 35, render: (f) => `S/ ${f.precioUnitario.toFixed(2)}` },
  { header: 'Subtotal', align: 'right', widthA4: 35, render: (f) => `S/ ${f.subtotal.toFixed(2)}` },
];

export async function generarReporteTrasladoPos80(traslado: Traslado, logo?: string): Promise<Blob> {
  const altura = 100 + traslado.detalles.length * 16;
  const b = crearPos80Builder(altura);
  await b.encabezadoEmpresa(logo);

  const titulo = traslado.tipo === 'INGRESO' ? 'REPORTE DE INGRESO' : 'REPORTE DE EGRESO';
  b.texto(titulo, { align: 'center', size: 9.5, bold: true });
  b.texto(`Traslado N° ${traslado.id}`, { align: 'center', size: 8, bold: true });
  b.linea();
  b.texto(`Sucursal: ${traslado.nombreSucursal}`, { size: 7.5 });
  b.texto(`Fecha: ${formatFechaHora(traslado.fecha)}`, { size: 7.5 });
  if (traslado.observacion) b.texto(`Obs: ${traslado.observacion}`, { size: 7 });
  b.linea();

  b.tabla(columnas, traslado.detalles);

  b.linea(false);
  b.texto(`Total: S/ ${traslado.total.toFixed(2)}`, { bold: true, size: 8 });
  b.linea();
  b.espacio(4);
  b.texto('DATOS DE EMISIÓN Y RECEPCIÓN', { align: 'center', size: 7, bold: true });
  b.espacio(3);
  b.texto('Nombre Emisor: _________________', { size: 8 });
  b.texto('Firma Emisor:  _________________', { size: 8 });
  b.espacio(3);
  b.texto('Nombre Receptor: _______________', { size: 8 });
  b.texto('Firma Receptor:  _______________', { size: 8 });
  b.linea();
  b.texto('Reporte generado por el sistema', { align: 'center', size: 6.5 });

  return b.finalizar();
}

export async function generarReporteTrasladoA4(traslado: Traslado, logo?: string): Promise<Blob> {
  const b = crearA4Builder();
  await b.encabezadoEmpresa(logo);

  const titulo = traslado.tipo === 'INGRESO' ? 'Reporte de Ingreso de Productos' : 'Reporte de Egreso de Productos';
  b.titulo(titulo);
  b.subtitulo([
    `Traslado N°: ${traslado.id}`,
    `Sucursal: ${traslado.nombreSucursal}`,
    `Fecha del traslado: ${formatFechaHora(traslado.fecha)}`,
    ...(traslado.observacion ? [`Observación: ${traslado.observacion}`] : []),
  ]);
  b.lineaSeparadora();

  b.encabezadoTabla(columnas);
  traslado.detalles.forEach((d) => b.filaTabla(columnas, d));

  b.lineaSeparadora();
  b.avanzar(2);
  b.campoValor('TOTAL', `S/ ${traslado.total.toFixed(2)}`, true);

  b.avanzar(15);
  b.firmasDobles('Nombre Emisor: ________________________', 'Nombre Receptor: ________________________');
  b.avanzar(3);
  b.firmasDobles('Firma Emisor:', 'Firma Receptor:');

  return b.finalizar();
}
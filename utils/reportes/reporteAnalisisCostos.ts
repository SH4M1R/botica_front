import type { AnalisisCostos, PrecioEntrada } from '@/api/reportes';
import { crearPos80Builder, crearA4Builder, formatFecha, formatEmision, formatMoneda, ColumnaReporte } from './pdfBase';

const columnas: ColumnaReporte<PrecioEntrada>[] = [
  { header: 'Fecha', align: 'left', widthA4: 30, render: (f) => formatFecha(f.fecha) },
  { header: 'Proveedor', align: 'left', widthA4: 55, render: (f) => f.proveedor },
  { header: 'Cant.', align: 'right', widthA4: 25, render: (f) => String(f.cantidad) },
  { header: 'Precio Unit.', align: 'right', widthA4: 40, render: (f) => formatMoneda(f.precioUnitario) },
];

export function generarAnalisisCostosPos80(data: AnalisisCostos): Blob {
  const altura = 60 + data.historico.length * 20 + 25;
  const b = crearPos80Builder(altura);

  b.texto('ANÁLISIS DE COSTOS', { align: 'center', size: 9.5, bold: true });
  b.texto('Precios de Entrada', { align: 'center', size: 8 });
  b.linea();
  b.texto(`Producto: ${data.nombreProducto}`, { size: 7.5, bold: true });
  b.texto(`Emitido: ${formatEmision()}`, { size: 7.5 });
  b.linea();

  b.tabla(columnas, data.historico);

  b.linea(false);
  b.texto(`Precio mínimo: ${data.precioMinimo != null ? formatMoneda(data.precioMinimo) : '—'}`, { size: 7.5 });
  b.texto(`Precio máximo: ${data.precioMaximo != null ? formatMoneda(data.precioMaximo) : '—'}`, { size: 7.5 });
  b.texto(`Precio promedio: ${data.precioPromedio != null ? formatMoneda(data.precioPromedio) : '—'}`, {
    bold: true,
    size: 8,
  });
  b.texto(`Precio de venta actual: ${data.precioVentaActual != null ? formatMoneda(data.precioVentaActual) : '—'}`, {
    bold: true,
    size: 8,
  });
  b.linea();
  b.texto('Reporte generado por el sistema', { align: 'center', size: 6.5 });

  return b.finalizar();
}

export function generarAnalisisCostosA4(data: AnalisisCostos): Blob {
  const b = crearA4Builder();

  b.titulo('Análisis de Costos y Precios de Entrada');
  b.subtitulo([`Producto: ${data.nombreProducto}`, `Fecha de emisión: ${formatEmision()}`]);
  b.lineaSeparadora();

  b.encabezadoTabla(columnas);
  data.historico.forEach((fila) => b.filaTabla(columnas, fila));

  b.lineaSeparadora();
  b.avanzar(2);
  b.campoValor('Precio mínimo', data.precioMinimo != null ? formatMoneda(data.precioMinimo) : '—');
  b.campoValor('Precio máximo', data.precioMaximo != null ? formatMoneda(data.precioMaximo) : '—');
  b.campoValor('Precio promedio', data.precioPromedio != null ? formatMoneda(data.precioPromedio) : '—', true);
  b.campoValor(
    'Precio de venta actual',
    data.precioVentaActual != null ? formatMoneda(data.precioVentaActual) : '—',
    true
  );

  return b.finalizar();
}

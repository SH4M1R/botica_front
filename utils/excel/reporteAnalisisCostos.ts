import type { AnalisisCostos, PrecioEntrada } from '@/api/reportes';
import { crearExcelBuilder, formatFecha, formatEmision, formatMoneda, ColumnaExcel } from './excelBase';

const columnas: ColumnaExcel<PrecioEntrada>[] = [
  { header: 'Fecha', align: 'left', width: 14, render: (f) => formatFecha(f.fecha) },
  { header: 'Proveedor', align: 'left', width: 30, render: (f) => f.proveedor },
  { header: 'Cant.', align: 'right', width: 10, render: (f) => f.cantidad },
  { header: 'Precio Unit.', align: 'right', width: 14, render: (f) => formatMoneda(f.precioUnitario) },
];

export async function generarAnalisisCostosExcel(data: AnalisisCostos, logo?: string): Promise<Blob> {
  const b = crearExcelBuilder('Análisis de Costos');
  await b.encabezadoEmpresa(logo);

  b.titulo('Análisis de Costos y Precios de Entrada');
  b.subtitulo([`Producto: ${data.nombreProducto}`, `Fecha de emisión: ${formatEmision()}`]);

  b.tabla(columnas, data.historico);

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
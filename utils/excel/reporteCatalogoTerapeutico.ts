import type { CatalogoTerapeutico } from '@/api/reportes';
import { crearExcelBuilder, formatEmision, formatMoneda, ColumnaExcel } from './excelBase';

const columnas: ColumnaExcel<CatalogoTerapeutico>[] = [
  { header: 'Producto', align: 'left', width: 30, render: (f) => f.nombreProducto },
  { header: 'Principio Activo', align: 'left', width: 25, render: (f) => f.principioActivo ?? '—' },
  { header: 'Acción Terapéutica', align: 'left', width: 25, render: (f) => f.accionTerapeutica ?? '—' },
  { header: 'Stock', align: 'right', width: 10, render: (f) => f.stock },
  { header: 'P. Venta', align: 'right', width: 12, render: (f) => formatMoneda(f.precioVenta) },
];

export async function generarCatalogoTerapeuticoExcel(
  filas: CatalogoTerapeutico[],
  titulo = 'Catálogo por Principio Activo y Acción Terapéutica',
  logo?: string
): Promise<Blob> {
  const b = crearExcelBuilder('Catálogo Terapéutico');
  await b.encabezadoEmpresa(logo);

  b.titulo(titulo);
  b.subtitulo([`Fecha de emisión: ${formatEmision()}`, `Total de productos: ${filas.length}`]);

  b.tabla(columnas, filas);

  return b.finalizar();
}
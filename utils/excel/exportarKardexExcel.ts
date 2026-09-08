import * as XLSX from 'xlsx';
import type { Producto } from '@/api/productos';
import type { FilaKardex } from '@/app/dashboard/productos/kardex/page';

export function exportarKardexExcel(
  producto: Producto,
  filas: FilaKardex[],
  desde: string,
  hasta: string
) {
  const encabezado1 = ['', '', 'ENTRADAS', '', '', 'SALIDAS', '', '', 'EXISTENCIAS', '', ''];
  const encabezado2 = [
    'Fecha',
    'Descripción',
    'Unidades',
    'Costo Unit',
    'Valor Total',
    'Unidades',
    'Costo Unit',
    'Valor Total',
    'Unidades',
    'Costo Unit',
    'Valor Total',
  ];

  const filasDatos = filas.map((f) => [
    f.fecha.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    f.descripcion,
    f.entradaUnidades || '',
    f.entradaUnidades ? Number(f.entradaCostoUnit.toFixed(2)) : '',
    f.entradaUnidades ? Number(f.entradaValorTotal.toFixed(2)) : '',
    f.salidaUnidades || '',
    f.salidaUnidades ? Number(f.salidaCostoUnit.toFixed(2)) : '',
    f.salidaUnidades ? Number(f.salidaValorTotal.toFixed(2)) : '',
    f.existenciaUnidades,
    Number(f.existenciaCostoUnit.toFixed(2)),
    Number(f.existenciaValorTotal.toFixed(2)),
  ]);

  const aoa = [
    [`KARDEX DE INVENTARIO — ${producto.nombre}`],
    [`Periodo: ${desde} al ${hasta}`],
    [],
    encabezado1,
    encabezado2,
    ...filasDatos,
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Fusionar celdas de título, subtítulo, y de los grupos Entradas/Salidas/Existencias
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }, // título
    { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } }, // periodo
    { s: { r: 3, c: 2 }, e: { r: 3, c: 4 } }, // ENTRADAS
    { s: { r: 3, c: 5 }, e: { r: 3, c: 7 } }, // SALIDAS
    { s: { r: 3, c: 8 }, e: { r: 3, c: 10 } }, // EXISTENCIAS
    { s: { r: 3, c: 0 }, e: { r: 4, c: 0 } }, // Fecha (rowspan)
    { s: { r: 3, c: 1 }, e: { r: 4, c: 1 } }, // Descripción (rowspan)
  ];

  ws['!cols'] = [
    { wch: 12 }, // Fecha
    { wch: 32 }, // Descripción
    { wch: 10 }, // Unidades
    { wch: 10 }, // Costo Unit
    { wch: 12 }, // Valor Total
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Kardex');

  const nombreArchivo = `kardex-${producto.nombre.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}-${desde}-${hasta}.xlsx`;
  XLSX.writeFile(wb, nombreArchivo);
}
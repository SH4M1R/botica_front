import type { ArqueoCaja } from '@/api/arqueo';
import type { Venta } from '@/api/ventas';
import { getNombreCompleto, METODOS_PAGO } from '@/api/ventas';
import {
  crearPos80Builder,
  formatEmision,
  formatFechaHora,
  formatMoneda,
  ColumnaReporte,
} from './/reportes/pdfBase'; // Ajusta la ruta a tu pdfBase si es distinta

export interface FilaMetodoPago {
  metodo: string;
  cantidadVentas: number;
  totalVendido: number;
}

/**
 * Agrupa las ventas por método de pago base (usando METODOS_PAGO como
 * categorías, igual que en la página de Medios de Pago). Se exporta para
 * poder reutilizarla al cerrar caja y así mostrar el mismo resumen ANTES
 * de generar el PDF (por ejemplo, para que el empleado lo revise en pantalla
 * antes de confirmar el cierre).
 */
export function calcularResumenMetodoPago(ventas: Venta[]): {
  filas: FilaMetodoPago[];
  totales: FilaMetodoPago;
} {
  const acumulado = new Map<string, FilaMetodoPago>();

  METODOS_PAGO.forEach((m) => acumulado.set(m, { metodo: m, cantidadVentas: 0, totalVendido: 0 }));

  ventas.forEach((v) => {
    const metodoBase =
      METODOS_PAGO.find((m) => v.metodoPago?.toLowerCase().startsWith(m.toLowerCase())) ?? 'Otro';

    const fila = acumulado.get(metodoBase) ?? { metodo: metodoBase, cantidadVentas: 0, totalVendido: 0 };
    fila.cantidadVentas += 1;
    fila.totalVendido += v.total;
    acumulado.set(metodoBase, fila);
  });

  // Solo mostramos métodos con al menos una venta (evita filas vacías tipo
  // "Yape: 0 ventas" cuando nadie pagó con Yape en esa caja)
  const filas = Array.from(acumulado.values()).filter((f) => f.cantidadVentas > 0);

  const totales: FilaMetodoPago = filas.reduce(
    (acc, f) => ({
      metodo: 'TOTAL',
      cantidadVentas: acc.cantidadVentas + f.cantidadVentas,
      totalVendido: acc.totalVendido + f.totalVendido,
    }),
    { metodo: 'TOTAL', cantidadVentas: 0, totalVendido: 0 }
  );

  return { filas, totales };
}

const columnasMetodoPago: ColumnaReporte<FilaMetodoPago>[] = [
  { header: 'Método', align: 'left', widthA4: 50, render: (f) => f.metodo },
  { header: 'N° Ventas', align: 'right', widthA4: 25, render: (f) => String(f.cantidadVentas) },
  { header: 'Total', align: 'right', widthA4: 25, render: (f) => formatMoneda(f.totalVendido) },
];

export async function generarReporteCajaPdf(
  arqueo: ArqueoCaja,
  ventas: Venta[],
  logo?: string
): Promise<Blob> {
  const { filas: resumenMetodos, totales: totalMetodos } = calcularResumenMetodoPago(ventas);

  // Se suma espacio extra para la tabla de métodos de pago (cabecera +
  // una fila por método usado)
  const alturaEstimada = 70 + ventas.length * 12 + resumenMetodos.length * 8 + 40;
  const b = crearPos80Builder(alturaEstimada);

  // 1. Renderizar el logo y datos iniciales de la empresa
  await b.encabezadoEmpresa(logo);

  // 2. Encabezado del reporte
  b.texto('CIERRE DE CAJA', { align: 'center', size: 10, bold: true });
  b.texto(`N° ${arqueo.numero}`, { align: 'center', size: 9, bold: true });

  b.linea();

  b.texto(`Empleado: ${arqueo.empleadoNombre}`, { size: 7.5 });
  // CAMBIO: formatFechaHora en vez de formatFecha, para que se vea la hora
  // de apertura y cierre (antes formatFecha solo mostraba día/mes/año)
  b.texto(`Apertura: ${formatFechaHora(arqueo.fechaInicio)}`, { size: 7.5 });
  b.texto(
    `Cierre: ${arqueo.fechaFin ? formatFechaHora(arqueo.fechaFin) : 'En curso'}`,
    { size: 7.5 }
  );
  b.texto(`Monto Inicial: ${formatMoneda(arqueo.montoInicial)}`, { size: 7.5 });
  if (arqueo.montoFinal !== null && arqueo.montoFinal !== undefined) {
    b.texto(`Monto Final: ${formatMoneda(arqueo.montoFinal)}`, { size: 7.5 });
  }

  b.linea();

  // 3. NUEVO: Resumen por Método de Pago (tabla)
  b.texto('RESUMEN POR MÉTODO DE PAGO', { align: 'center', size: 8.5, bold: true });
  b.espacio(1);

  if (resumenMetodos.length === 0) {
    b.texto('No hay ventas registradas en esta caja.', { align: 'center', size: 7.5 });
  } else {
    b.tabla(columnasMetodoPago, resumenMetodos);
    b.linea(false);
    b.texto(`Total ventas: ${totalMetodos.cantidadVentas}`, { bold: true, size: 7.5 });
    b.texto(`Total vendido: ${formatMoneda(totalMetodos.totalVendido)}`, { bold: true, size: 7.5 });
  }

  b.linea();

  // 4. Detalle de ventas (se mantiene igual)
  b.texto('DETALLE DE VENTAS', { align: 'center', size: 8.5, bold: true });
  b.espacio(1);

  let total = 0;

  ventas.forEach((v) => {
    const cliente = v.cliente ? getNombreCompleto(v.cliente) : 'Clientes Varios';
    const hora = new Date(v.fecha).toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
    });

    b.texto(`${cliente}`, { bold: true, size: 7.5 });
    b.texto(
      `  Hora: ${hora} | Método: ${v.metodoPago} | Total: ${formatMoneda(v.total)}`,
      { size: 7 }
    );
    b.espacio(1);

    total += v.total;
  });

  // 5. Totales finales
  b.linea(false);
  b.texto(`TOTAL: ${formatMoneda(total)}`, { bold: true, size: 9 });
  b.espacio(1);

  b.linea();
  b.texto(`Ventas registradas: ${ventas.length}`, { size: 7 });
  b.texto(`Emitido: ${formatEmision()}`, { size: 6.5 });
  b.texto('Reporte generado por el sistema', { align: 'center', size: 6.5 });

  return b.finalizar();
}
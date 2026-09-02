export interface ItemMenu {
  ruta: string;
  label: string;
}

export interface ModuloMenu {
  modulo: string;
  items: ItemMenu[];
}

export const ESTRUCTURA_MENU: ModuloMenu[] = [
  {
    modulo: 'General',
    items: [
      { ruta: '/dashboard/asistencia', label: 'Asistencia' },
      { ruta: '/dashboard/reportes', label: 'Reportes' },
    ],
  },
  {
    modulo: 'Caja',
    items: [
      { ruta: '/dashboard/caja', label: 'Arqueo de caja' },
      { ruta: '/dashboard/caja/movimientos', label: 'Movimientos' },
      { ruta: '/dashboard/caja/medios-pago', label: 'Medio de pago' },
    ],
  },
  {
    modulo: 'Ventas',
    items: [
      { ruta: '/dashboard/ventas', label: 'Listado de ventas' },
      { ruta: '/dashboard/ventas/generar', label: 'Generar venta' },
      { ruta: '/dashboard/clientes', label: 'Clientes' },
    ],
  },

  {
  modulo: 'Cotizaciones',
    items: [
      { ruta: '/dashboard/cotizaciones', label: 'Listado de cotizaciones' },
      { ruta: '/dashboard/cotizaciones/generar', label: 'Generar cotización' },
    ],
  },

  {
    modulo: 'Compras',
    items: [
      { ruta: '/dashboard/compras', label: 'Listado de compras' },
      { ruta: '/dashboard/compras/generar', label: 'Ingresar compra' },
      { ruta: '/dashboard/proveedores', label: 'Proveedores' },
    ],
  },
  {
    modulo: 'Productos',
    items: [
      { ruta: '/dashboard/productos', label: 'Listado productos' },
      { ruta: '/dashboard/productos/atributos', label: 'Atributos' },
    ],
  },
  {
    modulo: 'Traslados',
    items: [
      { ruta: '/dashboard/ingresos', label: 'Ingresos' },
      { ruta: '/dashboard/egresos', label: 'Egresos' },
    ],
  },
  {
    modulo: 'Empleados',
    items: [
      { ruta: '/dashboard/empleados', label: 'Listado de empleados' },
    ],
  },
];

export const RUTAS_IMPLICITAS: Record<string, string[]> = {
  '/dashboard/ventas/generar': ['/dashboard/ventas/boleta'],
};

export function rutaEstaPermitida(rutaActual: string, rutasPermitidas: Set<string>): boolean {
  if (rutasPermitidas.has(rutaActual)) return true;

  for (const ruta of rutasPermitidas) {
    const implicitas = RUTAS_IMPLICITAS[ruta];
    if (implicitas?.includes(rutaActual)) return true;
  }

  return false;
}
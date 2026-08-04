const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Error ${res.status} al llamar ${path}`);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  if (!text) return undefined as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined as T;
  }
}

export interface Proveedor {
  id: number;
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  direccion?: string;
  telefono?: string;
  correo?: string;
  contactoNombres?: string;
  contactoCelular?: string;
  contactoCorreo?: string;
}

export interface ProveedorRequestDTO {
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  direccion?: string;
  telefono?: string;
  correo?: string;
  contactoNombres?: string;
  contactoCelular?: string;
  contactoCorreo?: string;
}

export interface Empleado {
  id: number;
  nombre: string;
  rol?: string;
}

export interface Producto {
  id: number;
  nombre: string;
  codigoBarra?: string;
  unidadMedida: string;
  gravada: boolean;
  precioUnitario: number;
  precioMayorista: number;
  costoUnitario?: number;
  stockActual?: number;
  unidadesPorPresentacion?: number;
}

export type AfectacionIgv = "GRAVADO_ONEROSO" | "EXONERADO" | "INAFECTO";

export const AFECTACION_IGV_OPTIONS: { value: AfectacionIgv; label: string }[] = [
  { value: "GRAVADO_ONEROSO", label: "Gravado - Operación Onerosa" },
  { value: "EXONERADO", label: "Exonerado" },
  { value: "INAFECTO", label: "Inafecto" },
];

export type TipoPrecio = "UNITARIO" | "MAYORISTA";

export interface DetalleCompraItem {
  key: string;
  idProducto: number;
  nombreProducto: string;
  tipoPrecio: TipoPrecio;
  afectacionIgv: AfectacionIgv;
  lote?: string;
  fechaVencimiento?: string;
  unidadMedida: string;
  cantidad: number;
  precioUnitario: number;
  importe: number;
}

export interface ItemCompraRequestDTO {
  idProducto: number;
  lote?: string;
  fechaVencimiento?: string;
  unidadMedida: string;
  cantidad: number;
  precioUnitario: number;
}

export interface CompraRequestDTO {
  comprobante: string;
  serie: string;
  numero: string;
  fechaEmision: string; // yyyy-MM-dd
  regularizar: boolean;
  idProveedor: number;
  idEmpleado: number;
  precioIncluyeIgv: boolean;
  descripcion?: string;
  percepcion?: number;
  tipoPago: string;
  medioPago: string;
  items: ItemCompraRequestDTO[];
}

export interface DetalleCompraResponse {
  id: number;
  producto: Producto;
  lote?: string;
  fechaVencimiento?: string;
  unidadMedida: string;
  cantidad: number;
  precioUnitario: number;
  importe: number;
}

export interface Compra {
  id: number;
  comprobante: string;
  serie: string;
  numero: string;
  fechaEmision: string;
  fechaRegistro: string;
  regularizar: boolean;
  proveedor: Proveedor;
  empleado: Empleado;
  precioIncluyeIgv: boolean;
  descripcion?: string;
  subtotal: number;
  igv: number;
  total: number;
  percepcion?: number;
  pagar: number;
  tipoPago: string;
  medioPago: string;
  estado: boolean;
  estadoPago: boolean;
  detalles: DetalleCompraResponse[];
}

export const IGV_RATE = 0.18;

export const comprasApi = {
  listar: () => apiFetch<Compra[]>("/compras"),
  obtener: (id: number) => apiFetch<Compra>(`/compras/${id}`),
  crear: (payload: CompraRequestDTO) =>
    apiFetch<Compra>("/compras", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  anular: (id: number) =>
    apiFetch<void>(`/compras/${id}/anular`, { method: "PUT" }),
};

export const proveedorApi = {
  listar: () => apiFetch<Proveedor[]>('/proveedores'),
  obtener: (id: number) => apiFetch<Proveedor>(`/proveedores/${id}`),
  crear: (data: ProveedorRequestDTO) =>
    apiFetch<Proveedor>('/proveedores', { method: 'POST', body: JSON.stringify(data) }),
  actualizar: (id: number, data: Partial<ProveedorRequestDTO>) =>
    apiFetch<Proveedor>(`/proveedores/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};
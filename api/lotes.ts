const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface ProductoStockResumen {
  idProducto: number;
  stockTotal: number;
  proximoVencimiento: string | null; // yyyy-MM-dd, null si ningún lote tiene fecha
}

export interface LoteProducto {
  id: number;
  lote: string | null;
  fechaVencimiento: string | null;
  stock: number;
  fechaIngreso: string;
}

export interface CrearLotePayload {
  idProducto: number;
  lote?: string;
  fechaVencimiento?: string;
  stock: number;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(msg || `Error ${res.status} en ${path}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : (undefined as T);
}

export const lotesApi = {
  resumenStock: () => request<ProductoStockResumen[]>('/lotes/resumen-stock'),
  resumenStockPorProducto: (idProducto: number) =>
    request<ProductoStockResumen>(`/lotes/resumen-stock/${idProducto}`),
  lotesDeProducto: (idProducto: number) =>
    request<LoteProducto[]>(`/lotes/producto/${idProducto}`),
  crearLote: (data: CrearLotePayload) =>
    request<LoteProducto>('/lotes', { method: 'POST', body: JSON.stringify(data) }),
  ajustarStock: (idLote: number, stock: number) =>
    request<LoteProducto>(`/lotes/${idLote}/stock`, { method: 'PUT', body: JSON.stringify({ stock }) }),
};

/**
 * Helper: junta una lista de productos (sin stock) con el resumen de stock
 * por lote, devolviendo productos con `.stock` y `.fecha_vencimiento` como
 * si aún vinieran del backend — así el resto del código que ya espera esos
 * campos no necesita cambiar.
 */
export function mergearStockEnProductos<T extends { id: number }>(
  productos: T[],
  resumen: ProductoStockResumen[]
): (T & { stock: number; fecha_vencimiento: string | null })[] {
  const mapa = new Map(resumen.map((r) => [r.idProducto, r]));
  return productos.map((p) => ({
    ...p,
    stock: mapa.get(p.id)?.stockTotal ?? 0,
    fecha_vencimiento: mapa.get(p.id)?.proximoVencimiento ?? null,
  }));
}
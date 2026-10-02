const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface Laboratorio {
  id: number;
  nombre: string;
}

export interface Categoria {
  id: number;
  nombre: string;
}

export interface PrincipioActivo {
  id: number;
  nombre: string;
}

export interface AccionTerapeutica {
  id: number;
  nombre: string;
}

export interface Producto {
  id: number;
  nombre: string;
  codigo_digemid?: string;
  precio_costo: number;
  precio_venta: number;
  stock?: number;
  fecha_vencimiento?: string | null;
  stock_minimo?: number;
  barras?: string;
  estado: boolean;
  requiere_receta: boolean;
  laboratorio: Laboratorio | null;
  categoria: Categoria;
  principioActivo?: PrincipioActivo | null;
  accionTerapeutica?: AccionTerapeutica | null;
  vende_por_presentaciones: boolean;
  blister_habilitado: boolean;
  unidades_blister: number | null;
  precio_blister: number | null;
  caja_habilitado: boolean;
  unidades_caja: number | null;
  precio_caja: number | null;
  factor?: number | null;
  registro_sanitario?: string | null;
}

export type ProductoPayload = Omit<Producto, 'id' | 'laboratorio' | 'categoria' | 'principioActivo' | 'accionTerapeutica' | 'stock' | 'fecha_vencimiento'> & {
  laboratorio: { id: number } | null;
  categoria: { id: number };
  principioActivo?: { id: number } | null;
  accionTerapeutica?: { id: number } | null;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const cuerpo = await res.text().catch(() => '');
    throw new Error(cuerpo || `Error ${res.status} en ${path}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : (undefined as T);
}

export const productosApi = {
  listar: () => request<Producto[]>('/productos'),
  listarActivos: () => request<Producto[]>('/productos/activos'),
  crear: (data: ProductoPayload) => request<Producto>('/productos', { method: 'POST', body: JSON.stringify(data) }),
  actualizar: (id: number, data: ProductoPayload) => request<Producto>(`/productos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  eliminar: (id: number) => request<void>(`/productos/${id}`, { method: 'DELETE' }),
};

export const laboratoriosApi = {
  listar: () => request<Laboratorio[]>('/laboratorios'),
  crear: (data: { nombre: string }) => request<Laboratorio>('/laboratorios', { method: 'POST', body: JSON.stringify(data) }),
  actualizar: (id: number, data: { nombre: string }) => request<Laboratorio>(`/laboratorios/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  eliminar: (id: number) => request<void>(`/laboratorios/${id}`, { method: 'DELETE' }),
};

export const categoriasApi = {
  listar: () => request<Categoria[]>('/categorias'),
  crear: (data: { nombre: string }) => request<Categoria>('/categorias', { method: 'POST', body: JSON.stringify(data) }),
  actualizar: (id: number, data: { nombre: string }) => request<Categoria>(`/categorias/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  eliminar: (id: number) => request<void>(`/categorias/${id}`, { method: 'DELETE' }),
};

export const principiosActivosApi = {
  listar: () => request<PrincipioActivo[]>('/principios-activos'),
  crear: (data: { nombre: string }) => request<PrincipioActivo>('/principios-activos', { method: 'POST', body: JSON.stringify(data) }),
  actualizar: (id: number, data: { nombre: string }) => request<PrincipioActivo>(`/principios-activos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  eliminar: (id: number) => request<void>(`/principios-activos/${id}`, { method: 'DELETE' }),
};

export const accionesTerapeuticasApi = {
  listar: () => request<AccionTerapeutica[]>('/acciones-terapeuticas'),
  crear: (data: { nombre: string }) => request<AccionTerapeutica>('/acciones-terapeuticas', { method: 'POST', body: JSON.stringify(data) }),
  actualizar: (id: number, data: { nombre: string }) => request<AccionTerapeutica>(`/acciones-terapeuticas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  eliminar: (id: number) => request<void>(`/acciones-terapeuticas/${id}`, { method: 'DELETE' }),
};
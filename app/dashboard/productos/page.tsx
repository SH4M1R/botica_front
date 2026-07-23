'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Boxes } from 'lucide-react';
import { productosApi } from "@/api/productos";
import type { Producto, ProductoPayload } from "@/api/productos";
import ProductoModal from "./components/ProductoModal";
import { ToggleSwitch } from "./components/ProductoModal";
import StockModal from "./components/StockModal";

const productoToPayload = (p: Producto): ProductoPayload => ({
  nombre: p.nombre,
  codigo_digemid: p.codigo_digemid ?? '',
  precio_costo: p.precio_costo,
  precio_venta: p.precio_venta,
  stock: p.stock,
  stock_minimo: p.stock_minimo ?? 0,
  barras: p.barras ?? '',
  estado: p.estado,
  requiere_receta: p.requiere_receta,
  fecha_vencimiento: p.fecha_vencimiento ?? '',
  lote: p.lote ?? '',
  laboratorio: { id: p.laboratorio.id },
  categoria: { id: p.categoria.id },
  principioActivo: p.principioActivo ? { id: p.principioActivo.id } : null,
  accionTerapeutica: p.accionTerapeutica ? { id: p.accionTerapeutica.id } : null,
  vende_por_presentaciones: p.vende_por_presentaciones,
  blister_habilitado: p.blister_habilitado,
  unidades_blister: p.unidades_blister,
  precio_blister: p.precio_blister,
  caja_habilitado: p.caja_habilitado,
  unidades_caja: p.unidades_caja,
  precio_caja: p.precio_caja,
  factor: p.factor ?? null,
  registro_sanitario: p.registro_sanitario ?? null,
});

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [productoActivo, setProductoActivo] = useState<Producto | null>(null);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [productoParaStock, setProductoParaStock] = useState<Producto | null>(null);

  // vista: productos activos o inactivos
  const [vista, setVista] = useState<'activos' | 'inactivos'>('activos');
  // filtro por categoria ('todas' = sin filtro)
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas');
  // paginacion
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const cargarProductos = async () => {
    setLoading(true);
    try {
      setProductos(await productosApi.listar());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarProductos(); }, []);

  // lista de categorias unicas presentes en los productos, para el select de filtro
  const categorias = useMemo(() => {
    const mapa = new Map<number, string>();
    productos.forEach((p) => {
      if (p.categoria) mapa.set(p.categoria.id, p.categoria.nombre);
    });
    return Array.from(mapa.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [productos]);

  const productosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return productos.filter((p) => {
      if (vista === 'activos' && !p.estado) return false;
      if (vista === 'inactivos' && p.estado) return false;
      if (categoriaFiltro !== 'todas' && String(p.categoria?.id) !== categoriaFiltro) return false;
      if (q && !p.nombre.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [productos, search, vista, categoriaFiltro]);

  // si cambia busqueda, vista, categoria o tamaño de pagina, volver a la pagina 1
  useEffect(() => {
    setCurrentPage(1);
  }, [search, vista, categoriaFiltro, pageSize]);

  const totalPaginas = Math.max(1, Math.ceil(productosFiltrados.length / pageSize));
  const paginaSegura = Math.min(currentPage, totalPaginas);

  const productosPagina = useMemo(() => {
    const inicio = (paginaSegura - 1) * pageSize;
    return productosFiltrados.slice(inicio, inicio + pageSize);
  }, [productosFiltrados, paginaSegura, pageSize]);

  const conteoActivos = useMemo(() => productos.filter((p) => p.estado).length, [productos]);
  const conteoInactivos = useMemo(() => productos.filter((p) => !p.estado).length, [productos]);

  const handleGuardar = async (data: ProductoPayload) => {
    if (productoActivo) await productosApi.actualizar(productoActivo.id, data);
    else await productosApi.crear(data);
    await cargarProductos();
  };

  const handleEliminar = async (producto: Producto) => {
    if (!confirm(`¿Eliminar "${producto.nombre}"?`)) return;
    await productosApi.eliminar(producto.id);
    await cargarProductos();
  };

  const handleToggleEstado = async (producto: Producto) => {
    const payload = { ...productoToPayload(producto), estado: !producto.estado };
    // actualización optimista para que el switch responda al instante
    setProductos((prev) => prev.map((p) => p.id === producto.id ? { ...p, estado: !p.estado } : p));
    try {
      await productosApi.actualizar(producto.id, payload);
    } catch {
      // si falla, revertimos
      setProductos((prev) => prev.map((p) => p.id === producto.id ? { ...p, estado: producto.estado } : p));
    }
  };

  const handleGuardarStock = async (id: number, nuevoStock: number) => {
    const producto = productos.find((p) => p.id === id);
    if (!producto) return;
    const payload = { ...productoToPayload(producto), stock: nuevoStock };
    await productosApi.actualizar(id, payload);
    await cargarProductos();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Productos</h1>
          <p className="text-sm text-zinc-500 mt-1">Gestiona el inventario de la botica.</p>
        </div>
        <button
          onClick={() => { setProductoActivo(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl shadow-xs hover:shadow-md transition-all"
        >
          <Plus size={18} /> Nuevo producto
        </button>
      </div>

      {/* Tabs: activos / inactivos */}
      <div className="flex items-center gap-1 border-b border-zinc-200">
        <button
          onClick={() => setVista('activos')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            vista === 'activos'
              ? 'border-primary text-primary'
              : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          Activos <span className="ml-1 text-xs font-normal text-zinc-400">({conteoActivos})</span>
        </button>
        <button
          onClick={() => setVista('inactivos')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            vista === 'inactivos'
              ? 'border-primary text-primary'
              : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          Inactivos <span className="ml-1 text-xs font-normal text-zinc-400">({conteoInactivos})</span>
        </button>
      </div>

      {/* Buscador + filtro de categoria */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm w-full sm:w-auto flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400"><Search size={16} /></span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </div>

        <select
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
          className="px-3 py-2.5 rounded-lg border border-zinc-300 bg-white text-sm text-zinc-700 focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        >
          <option value="todas">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={String(c.id)}>{c.nombre}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-zinc-400">Cargando productos...</div>
        ) : productosFiltrados.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-400">No se encontraron productos.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">
                <th className="px-5 py-3">Producto</th>
                <th className="px-5 py-3">Categoría</th>
                <th className="px-5 py-3 text-right">P. Venta</th>
                <th className="px-5 py-3 text-right">P. Compra</th>
                <th className="px-5 py-3 text-right">Stock</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {productosPagina.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50/60 transition-colors">
                  <td className="px-5 py-3 font-semibold text-zinc-800">{p.nombre}</td>
                  <td className="px-5 py-3 text-zinc-600">{p.categoria?.nombre}</td>
                  <td className="px-5 py-3 text-right font-medium text-zinc-800">S/ {p.precio_venta.toFixed(2)}</td>
                  <td className="px-5 py-3 text-right text-zinc-600">S/ {p.precio_costo.toFixed(2)}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={p.stock <= (p.stock_minimo ?? 10) ? 'text-red-500 font-semibold' : 'text-zinc-600'}>{p.stock}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <ToggleSwitch checked={p.estado} onChange={() => handleToggleEstado(p)} />
                      <span className={`text-xs font-semibold ${p.estado ? 'text-primary' : 'text-zinc-400'}`}>
                        {p.estado ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => { setProductoParaStock(p); setStockModalOpen(true); }}
                        title="Modificar stock"
                        className="p-2 text-zinc-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        <Boxes size={16} />
                      </button>
                      <button onClick={() => { setProductoActivo(p); setModalOpen(true); }} className="p-2 text-zinc-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleEliminar(p)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Paginacion */}
        {!loading && productosFiltrados.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-zinc-200 bg-zinc-50/50">
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <span>Mostrar</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1.5 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span>de {productosFiltrados.length} productos</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={paginaSegura <= 1}
                className="px-3 py-1.5 rounded-lg border border-zinc-300 text-sm text-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-100 transition-colors"
              >
                Anterior
              </button>
              <span className="text-sm text-zinc-500">
                Página {paginaSegura} de {totalPaginas}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaSegura >= totalPaginas}
                className="px-3 py-1.5 rounded-lg border border-zinc-300 text-sm text-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-100 transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      <ProductoModal
        open={modalOpen}
        producto={productoActivo}
        onClose={() => setModalOpen(false)}
        onSave={handleGuardar}
      />

      <StockModal
        open={stockModalOpen}
        producto={productoParaStock}
        onClose={() => setStockModalOpen(false)}
        onSave={handleGuardarStock}
      />
    </div>
  );
}
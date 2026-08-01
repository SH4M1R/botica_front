'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Boxes, Package, AlertTriangle, CalendarClock, Database } from 'lucide-react';
import { productosApi } from "@/api/productos";
import type { Producto, ProductoPayload } from "@/api/productos";
import ProductoModal from "./components/ProductoModal";
import { ToggleSwitch } from "./components/ProductoModal";
import StockModal from "./components/StockModal";
import Paginacion from "@/components/Paginacion";
import ModalEliminar from "@/components/ModalEliminar";
import { ModalAlertaStock } from "./components/ModalStockBajo";
import { ModalProductosPorVencer } from "./components/ModalProductoPorVencer";

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

const COL_WIDTHS = {
  producto: '38%',
  laboratorio: '10%',
  categoria: '10%',
  pVenta: '9%',
  pCompra: '9%',
  stock: '8%',
  estado: '6%',
  acciones: '10%',
};

function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  sublabel,
  onClick,
}: {
  icon: typeof Package;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  sublabel: string;
  onClick?: () => void;
}) {
  return (
    <div 
      onClick={onClick} 
      className={`bg-white rounded-2xl border border-zinc-200 shadow-xs p-5 flex items-center gap-4 ${
        onClick ? 'cursor-pointer hover:border-zinc-300 hover:shadow-md transition-all' : ''
      }`}
    >
      <div className={`p-3 rounded-xl ${iconBg} ${iconColor} shrink-0`}>
        <Icon size={35} />
      </div>
      <div>
        <p className="text-xs font-medium text-zinc-500">{label}</p>
        <p className="text-xl font-bold text-primary">{value}</p>
        <p className="text-xs text-zinc-500">{sublabel}</p>
      </div>
    </div>
  );
}

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [productoActivo, setProductoActivo] = useState<Producto | null>(null);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [productoParaStock, setProductoParaStock] = useState<Producto | null>(null);

  // Modales de Alertas
  const [modalStockBajoOpen, setModalStockBajoOpen] = useState(false);
  const [modalPorVencerOpen, setModalPorVencerOpen] = useState(false);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [search, vista, categoriaFiltro, pageSize]);

  const totalPaginas = Math.max(1, Math.ceil(productosFiltrados.length / pageSize));
  const paginaSegura = Math.min(currentPage, totalPaginas);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    mensaje: string;
    errorMensaje?: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    mensaje: '',
    onConfirm: async () => {},
  });

  const cerrarModal = () =>
    setModalConfig((prev) => ({ ...prev, isOpen: false }));

  const productosPagina = useMemo(() => {
    const inicio = (paginaSegura - 1) * pageSize;
    return productosFiltrados.slice(inicio, inicio + pageSize);
  }, [productosFiltrados, paginaSegura, pageSize]);

  const conteoActivos = useMemo(() => productos.filter((p) => p.estado).length, [productos]);
  const conteoInactivos = useMemo(() => productos.filter((p) => !p.estado).length, [productos]);

  // ---- Estadísticas y Contadores para Tarjetas ----
  const stats = useMemo(() => {
    const totalProductosActivos = productos.filter((p) => p.estado).length;
    const stockBajoCount = productos.filter((p) => p.stock <= (p.stock_minimo ?? 10)).length;

    const hoy = new Date();
    const en90Dias = new Date();
    en90Dias.setDate(hoy.getDate() + 90);
    
    const porVencerCount = productos.filter((p) => {
      if (!p.fecha_vencimiento) return false;
      const fechaVenc = new Date(p.fecha_vencimiento);
      return fechaVenc >= hoy && fechaVenc <= en90Dias;
    }).length;

    const valorTotalInventario = productos
      .filter((p) => p.estado)
      .reduce((sum, p) => sum + p.stock * p.precio_costo, 0);

    return {
      totalProductosActivos,
      stockBajo: stockBajoCount,
      porVencer: porVencerCount,
      valorTotalInventario,
    };
  }, [productos]);

  const handleGuardar = async (data: ProductoPayload) => {
    if (productoActivo) await productosApi.actualizar(productoActivo.id, data);
    else await productosApi.crear(data);
    await cargarProductos();
  };

  const handleEliminar = (producto: Producto) => {
    setModalConfig({
      isOpen: true,
      mensaje: `¿Deseas eliminar "${producto.nombre}"?`,
      errorMensaje: 'No se pudo eliminar el producto - Porque ya está registrado en una venta, pero si puede desactivarlo.',
      onConfirm: async () => {
        await productosApi.eliminar(producto.id);
        await cargarProductos();
      },
    });
  };

  const handleToggleEstado = async (producto: Producto) => {
    const payload = { ...productoToPayload(producto), estado: !producto.estado };
    setProductos((prev) => prev.map((p) => p.id === producto.id ? { ...p, estado: !p.estado } : p));
    try {
      await productosApi.actualizar(producto.id, payload);
    } catch {
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
          <p className="text-sm text-zinc-500 mt-1">Gestiona el inventario y los atributos de la botica.</p>
        </div>
        <button
          onClick={() => { setProductoActivo(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl shadow-xs hover:shadow-md transition-all"
        >
          <Plus size={18} /> Nuevo producto
        </button>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          iconBg="bg-primary/10"
          iconColor="text-primary"
          label="Total Productos"
          value={stats.totalProductosActivos.toLocaleString('es-PE')}
          sublabel="Activos"
        />
        <StatCard
          icon={AlertTriangle}
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
          label="Stock Bajo"
          value={stats.stockBajo.toLocaleString('es-PE')}
          sublabel="Productos"
          onClick={() => setModalStockBajoOpen(true)}
        />
        <StatCard
          icon={CalendarClock}
          iconBg="bg-red-50"
          iconColor="text-red-500"
          label="Por Vencer (90 días)"
          value={stats.porVencer.toLocaleString('es-PE')}
          sublabel="Productos"
          onClick={() => setModalPorVencerOpen(true)}
        />
        <StatCard
          icon={Database}
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
          label="Valor Total Inventario"
          value={`S/ ${stats.valorTotalInventario.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sublabel="Solo productos activos"
        />
      </div>

      {/* Tabs */}
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

      {/* Buscador + filtro de categoría */}
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
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col style={{ width: COL_WIDTHS.producto }} />
              <col style={{ width: COL_WIDTHS.laboratorio }} />
              <col style={{ width: COL_WIDTHS.categoria }} />
              <col style={{ width: COL_WIDTHS.pVenta }} />
              <col style={{ width: COL_WIDTHS.pCompra }} />
              <col style={{ width: COL_WIDTHS.stock }} />
              <col style={{ width: COL_WIDTHS.estado }} />
              <col style={{ width: COL_WIDTHS.acciones }} />
            </colgroup>
            <thead>
              <tr className="bg-primary/10 border-b border-zinc-200 text-left text-xs font-bold text-primary uppercase tracking-wider">
                <th className="px-5 py-3">Producto</th>
                <th className="px-5 py-3">Laboratorio</th>
                <th className="px-5 py-3">Categoría</th>
                <th className="px-5 py-3 text-right">P.Venta</th>
                <th className="px-5 py-3 text-right">P.Compra</th>
                <th className="px-5 py-3 text-right">Stock</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {productosPagina.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50/60 transition-colors">
                  <td className="px-5 py-3 text-zinc-800 break-words whitespace-normal" title={p.nombre}>{p.nombre}</td>
                  <td className="px-5 py-3 text-zinc-800 break-words whitespace-normal" title={p.laboratorio?.nombre}>{p.laboratorio?.nombre}</td>
                  <td className="px-5 py-3 text-primary font-semibold break-words whitespace-normal" title={p.categoria?.nombre}>{p.categoria?.nombre}</td>
                  <td className="px-5 py-3 text-right font-medium text-zinc-800">S/ {p.precio_venta.toFixed(2)}</td>
                  <td className="px-5 py-3 text-right text-zinc-600">S/ {p.precio_costo.toFixed(2)}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={p.stock <= (p.stock_minimo ?? 10) ? 'text-red-500 font-semibold' : 'text-zinc-600'}>{p.stock}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col items-center gap-1">
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
                        className="p-2 text-primary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors border-2"
                      >
                        <Boxes size={16} />
                      </button>
                      <button onClick={() => { setProductoActivo(p); setModalOpen(true); }} title="Editar Producto" className="p-2 text-green-500 hover:text-green-600 hover:bg-green-100 rounded-lg transition-colors border-2">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleEliminar(p)} title="Borrar Producto" className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border-2">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && productosFiltrados.length > 0 && (
          <Paginacion
            currentPage={paginaSegura}
            totalPages={totalPaginas}
            pageSize={pageSize}
            totalItems={productosFiltrados.length}
            itemLabel="productos"
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
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

      <ModalEliminar
        isOpen={modalConfig.isOpen}
        onClose={cerrarModal}
        mensaje={modalConfig.mensaje}
        errorMensajeDefault={modalConfig.errorMensaje}
        onConfirm={modalConfig.onConfirm}
      />

      <ModalAlertaStock
        isOpen={modalStockBajoOpen}
        onClose={() => setModalStockBajoOpen(false)}
        productos={productos}
      />

      <ModalProductosPorVencer
        isOpen={modalPorVencerOpen}
        onClose={() => setModalPorVencerOpen(false)}
        productos={productos}
      />
    </div>
  );
}
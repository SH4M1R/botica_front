"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X, Layers, PackagePlus } from "lucide-react";
import {
  AfectacionIgv,
  DetalleCompraItem,
  Producto,
  TipoPrecio,
} from "@/api/compra";
import {
  productosApi,
  Producto as ProductoAPI,
  ProductoPayload,
} from "@/api/productos";

interface ProductoModalProps {
  open: boolean;
  onClose: () => void;
  onAgregar: (item: DetalleCompraItem) => void;
}

// Extiende Producto con la bandera que indica si el producto se puede
// vender/comprar por caja (presentación) o solo por unidad, y guarda el
// producto original completo (tal cual viene de /productos) para poder
// reconstruir el payload de actualización sin perder ningún campo.
type ProductoExtendido = Producto & {
  ventaPorCajas: boolean;
  _original: ProductoAPI;
};

export default function ProductoModal({ open, onClose, onAgregar }: ProductoModalProps) {
  const [query, setQuery] = useState("");
  const [listaProductos, setListaProductos] = useState<any[]>([]);
  const [opciones, setOpciones] = useState<ProductoExtendido[]>([]);
  const [mostrarOpciones, setMostrarOpciones] = useState(false);
  const [producto, setProducto] = useState<ProductoExtendido | null>(null);

  const [tipoPrecio, setTipoPrecio] = useState<TipoPrecio>("MAYORISTA");
  const [cantidad, setCantidad] = useState<number | "">("");
  const [precioCompra, setPrecioCompra] = useState<number>(0);
  const [precioVenta, setPrecioVenta] = useState<number>(0);
  const [codigoLote, setCodigoLote] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");

  const [errorPrecio, setErrorPrecio] = useState<string | null>(null);

  // Cargar productos desde la base de datos al abrir el modal
  useEffect(() => {
    if (open) {
      productosApi
        .listar()
        .then((data) => setListaProductos(data))
        .catch(() => setListaProductos([]));
    }
  }, [open]);

  // Filtrar productos guardados en BD según la búsqueda
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q || producto) {
      setOpciones([]);
      return;
    }

    const filtrados: ProductoExtendido[] = listaProductos
      .filter((p) => {
        const nombreMatch = p.nombre?.toLowerCase().includes(q);
        const barraMatch = p.barras?.toLowerCase().includes(q) || p.codigoBarra?.toLowerCase().includes(q);
        return nombreMatch || barraMatch;
      })
      .slice(0, 8)
      .map((p) => ({
        id: p.id,
        nombre: p.nombre,
        codigoBarra: p.barras || p.codigoBarra || "",
        unidadMedida: p.vende_por_presentaciones ? "Caja/Unid" : "Unidad",
        gravada: p.gravada ?? true,
        precioUnitario: p.precio_venta ?? p.precioUnitario ?? 0,
        precioMayorista: p.precio_caja ?? p.precio_costo ?? p.precioMayorista ?? p.precio_venta ?? 0,
        costoUnitario: p.precio_costo ?? p.costoUnitario ?? 0,
        stockActual: p.stock ?? 0,
        unidadesPorPresentacion: p.unidades_caja ?? p.factor ?? 1,
        // Si el producto no maneja presentaciones (cajas), solo se puede vender por unidad
        ventaPorCajas: Boolean(p.vende_por_presentaciones),
        // Producto completo tal como viene de /productos, para poder actualizarlo después
        _original: p as ProductoAPI,
      }));

    setOpciones(filtrados);
  }, [query, listaProductos, producto]);

  // Al elegir producto, precargar precio de compra y precio de venta actuales
  useEffect(() => {
    if (!producto) return;

    // Si el producto no se vende por cajas, forzar tipo de ingreso "UNITARIO"
    if (!producto.ventaPorCajas && tipoPrecio === "MAYORISTA") {
      setTipoPrecio("UNITARIO");
    } else {
      setPrecioCompra(tipoPrecio === "MAYORISTA" ? producto.precioMayorista : producto.precioUnitario);
    }

    // El precio de venta es independiente: se precarga con el precio actual del catálogo
    setPrecioVenta(producto.precioUnitario);
    setErrorPrecio(null);
  }, [producto]); // eslint-disable-line react-hooks/exhaustive-deps

  // Si cambia el tipo de ingreso, recalcular el precio de compra mostrado
  useEffect(() => {
    if (!producto) return;
    setPrecioCompra(tipoPrecio === "MAYORISTA" ? producto.precioMayorista : producto.precioUnitario);
  }, [tipoPrecio, producto]);

  // Factor de conversión de unidades físicas:
  // - Por Caja -> se multiplica por las unidades que trae cada caja
  // - Por Unidad -> se suma 1 a 1 (no hay conversión)
  const factorConversion =
    tipoPrecio === "MAYORISTA" ? producto?.unidadesPorPresentacion ?? 1 : 1;

  // Unidades ingresadas SIEMPRE en unidades físicas reales
  const unidadesIngresadas = useMemo(() => {
    const cant = typeof cantidad === "number" ? cantidad : 0;
    return cant * factorConversion;
  }, [cantidad, factorConversion]);

  // Importe = cantidad ingresada (cajas o unidades) x precio de compra (de esa misma presentación)
  const importe = useMemo(() => {
    const cant = typeof cantidad === "number" ? cantidad : 0;
    return Number((cant * precioCompra).toFixed(2));
  }, [cantidad, precioCompra]);

  function limpiarFormulario() {
    setQuery("");
    setOpciones([]);
    setProducto(null);
    setTipoPrecio("MAYORISTA");
    setCantidad("");
    setPrecioCompra(0);
    setPrecioVenta(0);
    setCodigoLote("");
    setFechaVencimiento("");
    setMostrarOpciones(false);
    setErrorPrecio(null);
  }

  function handleCerrar() {
    limpiarFormulario();
    onClose();
  }

  async function handleAgregar(e: React.FormEvent) {
    e.preventDefault();
    if (!producto || !cantidad || cantidad <= 0) return;

    // El dato que se guarda en la orden de compra es el Precio de Compra,
    // convertido a costo por unidad física (importe / unidades ingresadas),
    // ya que la cantidad que viaja al backend también va en unidades físicas.
    const precioCompraUnitario =
      unidadesIngresadas > 0 ? Number((importe / unidadesIngresadas).toFixed(4)) : 0;
    const afectacionIgv: AfectacionIgv = producto.gravada ? "GRAVADO_ONEROSO" : "INAFECTO";

    // productosApi.actualizar hace un PUT completo, así que reconstruimos el
    // payload a partir del producto original y solo pisamos precio_venta
    // con el valor del campo "Precio de Venta" (independiente del de compra).
    const original = producto._original;
    const payload: ProductoPayload = {
      nombre: original.nombre,
      codigo_digemid: original.codigo_digemid,
      precio_costo: original.precio_costo,
      precio_venta: precioVenta,
      stock: original.stock,
      stock_minimo: original.stock_minimo,
      barras: original.barras,
      estado: original.estado,
      requiere_receta: original.requiere_receta,
      fecha_vencimiento: original.fecha_vencimiento,
      lote: original.lote,
      vende_por_presentaciones: original.vende_por_presentaciones,
      blister_habilitado: original.blister_habilitado,
      unidades_blister: original.unidades_blister,
      precio_blister: original.precio_blister,
      caja_habilitado: original.caja_habilitado,
      unidades_caja: original.unidades_caja,
      precio_caja: original.precio_caja,
      factor: original.factor,
      registro_sanitario: original.registro_sanitario,
      laboratorio: { id: original.laboratorio.id },
      categoria: { id: original.categoria.id },
      principioActivo: original.principioActivo ? { id: original.principioActivo.id } : null,
      accionTerapeutica: original.accionTerapeutica ? { id: original.accionTerapeutica.id } : null,
    };

    try {
      await productosApi.actualizar(producto.id, payload);
    } catch (err) {
      console.error("No se pudo actualizar el precio de venta del producto:", err);
      setErrorPrecio("No se pudo actualizar el precio de venta del producto, pero la compra continuará.");
    }

    onAgregar({
      key: crypto.randomUUID(),
      idProducto: producto.id,
      nombreProducto: producto.nombre,
      tipoPrecio,
      afectacionIgv,
      lote: codigoLote || undefined,
      fechaVencimiento: fechaVencimiento || undefined,
      unidadMedida: producto.unidadMedida,
      cantidad: unidadesIngresadas,
      precioUnitario: precioCompraUnitario,
      importe,
    });

    limpiarFormulario();
    onClose();
  }

  if (!open) return null;

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all";
  const labelClass = "text-xs font-semibold text-zinc-600";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 shrink-0">
          <div className="flex items-center gap-2">
            <PackagePlus size={18} className="text-primary transition-colors duration-300" />
            <h2 className="text-sm font-bold text-zinc-800">Agregar Producto a la Compra</h2>
          </div>
          <button
            type="button"
            onClick={handleCerrar}
            className="text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleAgregar} className="p-5 space-y-4 overflow-y-auto">
          {/* Fila 1 - Buscar Producto | Tipo de Ingreso */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative space-y-1">
              <label className={labelClass}>Buscar Producto *</label>
              <div className="relative">
                <input
                  autoFocus
                  value={producto ? producto.nombre : query}
                  onChange={(e) => {
                    setProducto(null);
                    setQuery(e.target.value);
                    setMostrarOpciones(true);
                  }}
                  onFocus={() => setMostrarOpciones(true)}
                  placeholder="Escribe el nombre o código de barras..."
                  className={`${inputClass} pl-9 pr-8 font-medium`}
                />
                <Search className="absolute left-3 top-2.5 text-zinc-400" size={16} />
                {producto && (
                  <button
                    type="button"
                    onClick={() => {
                      setProducto(null);
                      setQuery("");
                    }}
                    className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Desplegable de resultados */}
              {mostrarOpciones && opciones.length > 0 && !producto && (
                <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-zinc-200 bg-white shadow-lg divide-y divide-zinc-100">
                  {opciones.map((p) => (
                    <li
                      key={p.id}
                      onClick={() => {
                        setProducto(p);
                        setMostrarOpciones(false);
                      }}
                      className="cursor-pointer px-4 py-2.5 text-sm hover:bg-zinc-50 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-zinc-800">{p.nombre}</p>
                        {p.codigoBarra && (
                          <p className="text-xs text-zinc-400 font-mono">{p.codigoBarra}</p>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-md">
                        Stock: {p.stockActual}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-1">
              <label className={labelClass}>Tipo de Ingreso</label>
              <select
                value={tipoPrecio}
                onChange={(e) => setTipoPrecio(e.target.value as TipoPrecio)}
                className={inputClass}
              >
                {(!producto || producto.ventaPorCajas) && (
                  <option value="MAYORISTA">Por Caja / Presentación</option>
                )}
                <option value="UNITARIO">Por Unidad</option>
              </select>
              {producto && !producto.ventaPorCajas && (
                <p className="text-[11px] text-zinc-400">
                  Este producto solo se compra y vende por unidad.
                </p>
              )}
            </div>
          </div>

          {/* Fila 2 - Cantidad | Unidades Ingresadas | Precio de Compra | Importe */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
            <div className="space-y-1">
              <label className={labelClass}>Cantidad de Ingreso *</label>
              <div className="relative">
                <input
                  type="number"
                  min={0.01}
                  step="any"
                  value={cantidad}
                  onChange={(e) =>
                    setCantidad(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className={`${inputClass} pl-8`}
                  placeholder="0"
                />
                <Layers className="absolute left-2.5 top-2.5 text-primary" size={15} />
              </div>
            </div>

            <div className="space-y-1">
              <label className={labelClass}>Unidades Ingresadas</label>
              <input
                readOnly
                value={unidadesIngresadas}
                className={`${inputClass} bg-zinc-100 font-bold text-zinc-800`}
              />
            </div>

            <div className="space-y-1">
              <label className={labelClass}>Precio de Compra</label>
              <input
                type="number"
                step="any"
                value={precioCompra}
                onChange={(e) => setPrecioCompra(Number(e.target.value))}
                className={inputClass}
              />
            </div>

            <div className="space-y-1">
              <label className={labelClass}>Importe (S/)</label>
              <input
                readOnly
                value={importe.toFixed(2)}
                className={`${inputClass} bg-zinc-100 font-bold text-zinc-800`}
              />
            </div>
          </div>

          {/* Fila 3 - Precio de Venta | Lote | Fecha Vencimiento */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className={labelClass}>Precio de Venta (por unidad)</label>
              <input
                type="number"
                step="any"
                value={precioVenta}
                onChange={(e) => setPrecioVenta(Number(e.target.value))}
                className={`${inputClass} font-bold text-emerald-600`}
              />
            </div>

            <div className="space-y-1">
              <label className={labelClass}>Código de Lote</label>
              <input
                value={codigoLote}
                onChange={(e) => setCodigoLote(e.target.value)}
                placeholder="Ej. L-2024-001"
                className={inputClass}
              />
            </div>

            <div className="space-y-1">
              <label className={labelClass}>Fecha de Vencimiento</label>
              <input
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {errorPrecio && <p className="text-[11px] text-red-500">{errorPrecio}</p>}

          {/* Botones de acción */}
          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 shrink-0">
            <button
              type="button"
              onClick={handleCerrar}
              className="px-3 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!producto || !cantidad || cantidad <= 0}
              className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              Agregar Producto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
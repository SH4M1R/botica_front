'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Trash2, Save, Pencil, MousePointer2, XCircle } from 'lucide-react';
import type { Producto } from '@/api/productos';
import type { Cliente } from '@/api/ventas';
import { getNombreCompleto } from '@/api/ventas';
import type { CarritoItem, ProductoConCodigo, TipoVenta } from './page';
import { tiposDisponibles, unidadesBasePorTipo } from './page';

type CriterioBusqueda = 'principio' | 'nombre';

interface VentaNoMouseProps {
  empleadoNombre: string;
  fechaHoy: string;
  productos: Producto[];
  carrito: CarritoItem[];
  total: number;
  error: string;
  setError: (v: string) => void;

  nombreCliente: string;
  dniCliente: string;
  idClienteSeleccionado: number | null;
  clientes: Cliente[];
  onCambiarNombreCliente: (v: string) => void;
  onCambiarDniCliente: (v: string) => void;
  onSeleccionarCliente: (c: Cliente) => void;
  onLimpiarCliente: () => void;
  onAbrirNuevoCliente: () => void;

  agregarProductoConDetalle: (
    producto: Producto,
    tipoVenta: TipoVenta,
    cantidad: number,
    precioUnitarioManual?: number
  ) => void;
  quitarProducto: (idProducto: number, tipoVenta: TipoVenta) => void;

  onVaciarCarrito: () => void;
  onAbrirPago: () => void;
  onVolverModoNormal: () => void;
}

export default function VentaNoMouse({
  empleadoNombre,
  fechaHoy,
  productos,
  carrito,
  total,
  error,
  setError,
  nombreCliente,
  dniCliente,
  idClienteSeleccionado,
  clientes,
  onCambiarNombreCliente,
  onCambiarDniCliente,
  onSeleccionarCliente,
  onLimpiarCliente,
  onAbrirNuevoCliente,
  agregarProductoConDetalle,
  quitarProducto,
  onVaciarCarrito,
  onAbrirPago,
  onVolverModoNormal,
}: VentaNoMouseProps) {
  // ---------- Línea de ingreso (una sola línea) ----------
  const [criterio, setCriterio] = useState<CriterioBusqueda>('nombre');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoConCodigo | null>(null);
  const [tipoVentaEntrada, setTipoVentaEntrada] = useState<TipoVenta>('unidad');
  const [cantidad, setCantidad] = useState<number | ''>('');
  const [sugerenciaIndex, setSugerenciaIndex] = useState(0);
  const [filaSeleccionada, setFilaSeleccionada] = useState(0);

  const [precioUnidadValor, setPrecioUnidadValor] = useState(0);
  const [precioCajaValor, setPrecioCajaValor] = useState(0);
  const [precioBlisterValor, setPrecioBlisterValor] = useState(0);

  const [editandoKey, setEditandoKey] = useState<string | null>(null);

  const codigoBarrasRef = useRef<HTMLInputElement>(null);
  const nombreRef = useRef<HTMLInputElement>(null);
  const cantidadRef = useRef<HTMLInputElement>(null);
  const filaRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  useEffect(() => {
    codigoBarrasRef.current?.focus();
  }, []);

  useEffect(() => {
    if (filaSeleccionada >= carrito.length) {
      setFilaSeleccionada(Math.max(0, carrito.length - 1));
    }
  }, [carrito.length, filaSeleccionada]);

  useEffect(() => {
    filaRefs.current[filaSeleccionada]?.scrollIntoView({ block: 'nearest' });
  }, [filaSeleccionada]);

  // ---------- Sugerencias de producto (por nombre / principio activo) ----------
  // Ya NO se excluyen los productos sin stock: se muestran igual, pero
  // deshabilitados para seleccionar (ver render de la lista y handleNombreKeyDown).
  const sugerencias = useMemo(() => {
    const q = textoBusqueda.trim().toLowerCase();
    if (!q) return [];
    const filtradas = productos.filter((p) => {
      const producto = p as ProductoConCodigo;
      if (criterio === 'principio') {
        return producto.principioActivo?.nombre?.toLowerCase().includes(q);
      }
      return producto.nombre.toLowerCase().includes(q);
    });
    return filtradas.slice(0, 8);
  }, [textoBusqueda, productos, criterio]);

  useEffect(() => {
    setSugerenciaIndex(0);
  }, [sugerencias]);

  const opcionesTipo = productoSeleccionado ? tiposDisponibles(productoSeleccionado) : [];

  const unidCaja = productoSeleccionado?.unidades_caja ?? 0;
  const unidBlister = productoSeleccionado?.unidades_blister ?? 0;
  const stockDisponible = productoSeleccionado?.stock ?? 0;
  const tieneCaja = !!productoSeleccionado?.caja_habilitado && !!productoSeleccionado?.vende_por_presentaciones;
  const tieneBlister = !!productoSeleccionado?.blister_habilitado && !!productoSeleccionado?.vende_por_presentaciones;

  const precioActivo =
    tipoVentaEntrada === 'caja' ? precioCajaValor : tipoVentaEntrada === 'blister' ? precioBlisterValor : precioUnidadValor;
  const cantidadNum = typeof cantidad === 'number' ? cantidad : 0;
  const importeCalculado = productoSeleccionado ? precioActivo * cantidadNum : 0;

  // Máxima cantidad que se puede ingresar para la presentación elegida,
  // según el stock real del producto seleccionado.
  const maxCantidad = productoSeleccionado
    ? Math.floor(stockDisponible / unidadesBasePorTipo(productoSeleccionado, tipoVentaEntrada))
    : undefined;

  // Si el usuario cambia de presentación (unidad/blister/caja) y la
  // cantidad ya ingresada supera el nuevo máximo permitido, la recorta.
  useEffect(() => {
    if (!productoSeleccionado || typeof cantidad !== 'number') return;
    if (maxCantidad !== undefined && maxCantidad > 0 && cantidad > maxCantidad) {
      setCantidad(maxCantidad);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoVentaEntrada]);

  // ---------- Selección de producto (agregar uno nuevo) ----------
  const seleccionarProducto = (producto: ProductoConCodigo) => {
    if (producto.stock <= 0) {
      setError(`"${producto.nombre}" no tiene stock disponible.`);
      return;
    }
    setProductoSeleccionado(producto);
    setTextoBusqueda(producto.nombre);
    setCodigoBarras(producto.codigo_barras ?? '');
    setTipoVentaEntrada('unidad');
    setCantidad('');
    setPrecioUnidadValor(producto.precio_venta);
    setPrecioCajaValor(producto.precio_caja ?? 0);
    setPrecioBlisterValor(producto.precio_blister ?? 0);
    setEditandoKey(null);
    setError('');
    requestAnimationFrame(() => {
      cantidadRef.current?.focus();
      cantidadRef.current?.select();
    });
  };

  const limpiarLinea = () => {
    setCodigoBarras('');
    setTextoBusqueda('');
    setProductoSeleccionado(null);
    setTipoVentaEntrada('unidad');
    setCantidad('');
    setPrecioUnidadValor(0);
    setPrecioCajaValor(0);
    setPrecioBlisterValor(0);
    setEditandoKey(null);
  };

  // ---------- Editar una línea existente del detalle ----------
  const iniciarEdicion = () => {
    const item = carrito[filaSeleccionada];
    if (!item) return;
    const producto = item.producto as ProductoConCodigo;
    setProductoSeleccionado(producto);
    setTextoBusqueda(producto.nombre);
    setCodigoBarras(producto.codigo_barras ?? '');
    setTipoVentaEntrada(item.tipoVenta);
    setCantidad(item.cantidad);
    setPrecioUnidadValor(item.tipoVenta === 'unidad' ? item.precioUnitario : producto.precio_venta);
    setPrecioCajaValor(item.tipoVenta === 'caja' ? item.precioUnitario : producto.precio_caja ?? 0);
    setPrecioBlisterValor(item.tipoVenta === 'blister' ? item.precioUnitario : producto.precio_blister ?? 0);
    setEditandoKey(`${item.idProducto}|${item.tipoVenta}`);
    setError('');
    requestAnimationFrame(() => {
      cantidadRef.current?.focus();
      cantidadRef.current?.select();
    });
  };

  const cancelarEdicion = () => {
    limpiarLinea();
    codigoBarrasRef.current?.focus();
  };

  // ---------- Cantidad: se ajusta sola al máximo permitido por el stock ----------
  const handleCantidadChange = (valor: string) => {
    if (valor === '') {
      setCantidad('');
      return;
    }
    let nueva = Math.max(1, Number(valor));
    if (maxCantidad !== undefined && maxCantidad > 0 && nueva > maxCantidad) {
      nueva = maxCantidad;
      const etiqueta = tipoVentaEntrada === 'unidad' ? 'unidad(es)' : `${tipoVentaEntrada}(s)`;
      setError(`Solo hay stock para ${maxCantidad} ${etiqueta} de "${productoSeleccionado?.nombre}".`);
    }
    setCantidad(nueva);
  };

  // ---------- Grabar / Actualizar (agrega o reemplaza la línea actual) ----------
  const grabarLinea = () => {
    if (!productoSeleccionado) {
      setError('Escanea o busca un producto antes de grabar.');
      return;
    }
    if (cantidadNum <= 0) {
      setError('La cantidad debe ser mayor a 0.');
      return;
    }
    const unidadesBase = unidadesBasePorTipo(productoSeleccionado, tipoVentaEntrada);
    if (cantidadNum * unidadesBase > productoSeleccionado.stock) {
      const maxPosible = Math.floor(productoSeleccionado.stock / unidadesBase);
      setError(
        maxPosible > 0
          ? `Stock insuficiente para "${productoSeleccionado.nombre}". Máximo disponible: ${maxPosible}.`
          : `"${productoSeleccionado.nombre}" no tiene stock disponible.`
      );
      return;
    }

    if (editandoKey) {
      const [idStr, tipoOriginal] = editandoKey.split('|');
      quitarProducto(Number(idStr), tipoOriginal as TipoVenta);
    }

    agregarProductoConDetalle(productoSeleccionado, tipoVentaEntrada, cantidadNum, precioActivo);
    setError('');
    limpiarLinea();
    codigoBarrasRef.current?.focus();
  };

  // ---------- Código de barras: Enter agrega DIRECTO al detalle ----------
  const handleCodigoBarrasKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = codigoBarras.trim().toLowerCase();
      if (!q) return;
      const match = (productos as ProductoConCodigo[]).find(
        (p) => p.codigo_barras && p.codigo_barras.toLowerCase() === q
      );
      if (!match) {
        setError('No se encontró ningún producto con ese código de barras.');
        return;
      }
      if (match.stock <= 0) {
        setError(`"${match.nombre}" no tiene stock disponible.`);
        return;
      }
      // Escaneo = venta directa por unidad, cantidad 1, sin pasos intermedios.
      agregarProductoConDetalle(match, 'unidad', 1, match.precio_venta);
      setError('');
      limpiarLinea();
      codigoBarrasRef.current?.focus();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setCodigoBarras('');
    }
  };

  // ---------- Nombre comercial / principio activo: búsqueda con sugerencias ----------
  const handleNombreKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSugerenciaIndex((prev) => Math.min(prev + 1, sugerencias.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSugerenciaIndex((prev) => Math.max(prev - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const producto = sugerencias[sugerenciaIndex];
      if (!producto) return;
      if (producto.stock <= 0) {
        setError(`"${producto.nombre}" no tiene stock disponible.`);
        return;
      }
      seleccionarProducto(producto as ProductoConCodigo);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      limpiarLinea();
    }
  };

  // ---------- Cantidad: Enter graba/actualiza la línea directamente ----------
  const handleCantidadKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      grabarLinea();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (editandoKey) cancelarEdicion();
      else {
        limpiarLinea();
        codigoBarrasRef.current?.focus();
      }
    }
  };

  // ---------- Atajos globales del modo sin mouse ----------
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activo = document.activeElement;
      const enCampoDeTexto =
        activo instanceof HTMLInputElement || activo instanceof HTMLSelectElement || activo instanceof HTMLTextAreaElement;

      if (e.key === 'F2') {
        e.preventDefault();
        onAbrirPago();
        return;
      }
      if (e.key === 'F3') {
        e.preventDefault();
        codigoBarrasRef.current?.focus();
        codigoBarrasRef.current?.select();
        return;
      }
      if (e.key === 'F4') {
        e.preventDefault();
        onVolverModoNormal();
        return;
      }

      // Enter sin ningún campo enfocado -> va directo a código de barras.
      if (e.key === 'Enter' && !enCampoDeTexto) {
        e.preventDefault();
        codigoBarrasRef.current?.focus();
        codigoBarrasRef.current?.select();
        return;
      }

      // Ya en código de barras pero vacío + Enter -> pasa al buscador.
      if (e.key === 'Enter' && activo === codigoBarrasRef.current && codigoBarras.trim() === '') {
        e.preventDefault();
        nombreRef.current?.focus();
        nombreRef.current?.select();
        return;
      }

      // Navegación y borrado de filas del detalle: solo si el foco NO está
      // en un campo de texto (para no interferir con la línea de ingreso).
      if (!enCampoDeTexto && carrito.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setFilaSeleccionada((prev) => Math.min(prev + 1, carrito.length - 1));
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setFilaSeleccionada((prev) => Math.max(prev - 1, 0));
          return;
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          const item = carrito[filaSeleccionada];
          if (item) quitarProducto(item.idProducto, item.tipoVenta);
          return;
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [carrito, filaSeleccionada, onAbrirPago, onVolverModoNormal, quitarProducto, codigoBarras]);

  const inputBase =
    'w-full px-2 py-1.5 rounded border border-zinc-300 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:bg-zinc-50 disabled:text-zinc-400';

  return (
    <div className="h-full w-full flex flex-col gap-2 p-2 sm:p-3 box-border bg-zinc-100 overflow-hidden">
      {/* ENCABEZADO */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs p-3 shrink-0 flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className="text-xs font-semibold text-zinc-500">Atendido por</p>
            <p className="text-sm font-bold text-primary">{empleadoNombre}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-500">Fecha Operación</p>
            <p className="text-sm font-bold text-primary capitalize">{fechaHoy}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <h1 className="text-lg sm:text-xl font-bold text-primary tracking-tight">Generar Venta</h1>
          <button
            type="button"
            onClick={onVolverModoNormal}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold border border-zinc-200 transition-colors cursor-pointer"
            title="Volver a la pantalla con mouse (F4)"
          >
            <MousePointer2 size={13} />
            <span className="hidden sm:inline">Modo con Mouse</span>
            <span className="text-[10px] font-normal text-zinc-400">F4</span>
          </button>
        </div>
      </div>

      {/* CLIENTE */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs p-3 shrink-0 grid grid-cols-1 sm:grid-cols-12 gap-2">
        <div className="sm:col-span-3">
          <label className="text-xs font-semibold text-zinc-500">DNI / RUC CLIENTE</label>
          <input
            value={dniCliente}
            onChange={(e) => onCambiarDniCliente(e.target.value)}
            readOnly={!!idClienteSeleccionado}
            maxLength={11}
            className={`${inputBase} font-mono ${idClienteSeleccionado ? 'bg-zinc-100' : ''}`}
            placeholder="—"
          />
        </div>
        <div className="sm:col-span-8 relative">
          <label className="text-xs font-semibold text-zinc-500">CLIENTE</label>
          <input
            value={nombreCliente}
            onChange={(e) => onCambiarNombreCliente(e.target.value)}
            readOnly={!!idClienteSeleccionado}
            className={`${inputBase} ${idClienteSeleccionado ? 'bg-zinc-100 font-medium' : ''}`}
            placeholder="CLIENTES VARIOS"
          />
          {!idClienteSeleccionado && nombreCliente.trim() && (
            <div className="absolute left-0 right-0 z-30 mt-1 max-h-40 overflow-y-auto bg-white border border-zinc-200 rounded-lg shadow-lg divide-y divide-zinc-100">
              {clientes
                .filter(
                  (c) =>
                    getNombreCompleto(c).toLowerCase().includes(nombreCliente.trim().toLowerCase()) ||
                    c.dni?.includes(nombreCliente.trim())
                )
                .slice(0, 5)
                .map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={() => onSeleccionarCliente(c)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-left hover:bg-zinc-50"
                  >
                    <span className="font-medium text-zinc-800 truncate mr-2">{getNombreCompleto(c)}</span>
                    <span className="font-mono text-zinc-400 shrink-0">{c.dni ?? '—'}</span>
                  </button>
                ))}
            </div>
          )}
        </div>
        <div className="sm:col-span-1 flex items-end gap-2">
          {idClienteSeleccionado ? (
            <button
              type="button"
              onClick={onLimpiarCliente}
              className="flex-1 h-[34px] rounded-lg border border-zinc-300 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors"
            >
              Quitar
            </button>
          ) : (
            <button
              type="button"
              onClick={onAbrirNuevoCliente}
              className="flex-1 h-[34px] rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-colors"
            >
              + Nuevo
            </button>
          )}
        </div>
      </div>

      {/* LÍNEA DE INGRESO — con z-index para flotar sobre el detalle */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs p-3 shrink-0 space-y-2 relative z-20 overflow-visible">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs font-medium text-zinc-600">
            {(['principio', 'nombre'] as CriterioBusqueda[]).map((c) => (
              <label key={c} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="criterio"
                  checked={criterio === c}
                  onChange={() => setCriterio(c)}
                  className="accent-primary"
                />
                {c === 'principio' ? 'Principio Activo' : 'Nombre comercial'}
              </label>
            ))}
          </div>

          {editandoKey && (
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-600">
              <Pencil size={13} /> Editando línea existente
              <button
                type="button"
                onClick={cancelarEdicion}
                className="inline-flex items-center gap-1 text-zinc-400 hover:text-red-500 transition-colors"
              >
                <XCircle size={13} /> Cancelar
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-12 gap-2 items-end pb-1 overflow-visible">
          {/* Código de Barras (1 columna) */}
          <div className="col-span-1">
            <label className="text-[10px] font-semibold text-zinc-500 truncate block">Código</label>
            <input
              ref={codigoBarrasRef}
              value={codigoBarras}
              onChange={(e) => setCodigoBarras(e.target.value)}
              onKeyDown={handleCodigoBarrasKeyDown}
              disabled={!!editandoKey}
              className={`${inputBase} bg-primary/20 border-primary/30 focus:ring-primary/50 focus:border-primary/50 font-mono text-xs`}
              placeholder="Escanear..."
              autoComplete="off"
            />
            <p className="text-[9px] text-zinc-400 mt-0.5 truncate">[ Enter ]</p>
          </div>

          {/* Buscador (4 columnas - Ocupa la mayor parte) */}
          <div className="col-span-4 relative">
            <label className="text-[10px] font-semibold text-zinc-500 truncate block">
              {criterio === 'principio' ? 'Principio Activo' : 'Nombre Comercial'}
            </label>
            <input
              ref={nombreRef}
              value={textoBusqueda}
              onChange={(e) => {
                setTextoBusqueda(e.target.value);
                if (!editandoKey) setProductoSeleccionado(null);
              }}
              onKeyDown={handleNombreKeyDown}
              disabled={!!editandoKey}
              className={inputBase}
              placeholder="Buscar..."
              autoComplete="off"
            />
            <p className="text-[9px] text-zinc-400 mt-0.5 truncate">[ ↑ ↓ navega · Enter selecciona ]</p>

            {/* Sugerencias con ancho fijo de 600px */}
            {!editandoKey && sugerencias.length > 0 && (
              <div className="absolute left-0 w-[600px] z-50 mt-1 max-h-56 overflow-y-auto bg-white border border-zinc-200 rounded-lg shadow-xl divide-y divide-zinc-100">
                {sugerencias.map((p, idx) => {
                  const sinStock = p.stock <= 0;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={() => { if (!sinStock) seleccionarProducto(p as ProductoConCodigo); }}
                      disabled={sinStock}
                      title={sinStock ? 'Sin stock disponible' : undefined}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors ${
                        sinStock
                          ? 'opacity-50 cursor-not-allowed'
                          : idx === sugerenciaIndex
                          ? 'bg-primary/10'
                          : 'hover:bg-zinc-50'
                      }`}
                    >
                      <span className="font-medium text-zinc-800 truncate mr-2">
                        {p.nombre}
                        {p.laboratorio?.nombre && (
                          <span className="text-zinc-400 font-normal"> ({p.laboratorio.nombre})</span>
                        )}
                      </span>
                      <span className={`shrink-0 ${sinStock ? 'text-red-400 font-semibold' : 'text-zinc-400'}`}>
                        {sinStock ? 'Sin stock' : `S/ ${p.precio_venta.toFixed(2)} · Stock ${p.stock}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Presentación (1 columna) */}
          <div className="col-span-1">
            <label className="text-[10px] font-semibold text-zinc-500 truncate block">Presentación</label>
            <select
              value={tipoVentaEntrada}
              disabled={!productoSeleccionado}
              onChange={(e) => setTipoVentaEntrada(e.target.value as TipoVenta)}
              className={inputBase}
            >
              {productoSeleccionado ? (
                opcionesTipo.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))
              ) : (
                <option value="unidad">—</option>
              )}
            </select>
          </div>

          {/* Cantidad (1 columna) */}
          <div className="col-span-1">
            <label className="text-[10px] font-semibold text-zinc-500 truncate block">Cant.</label>
            <input
              ref={cantidadRef}
              type="number"
              min={1}
              max={maxCantidad && maxCantidad > 0 ? maxCantidad : undefined}
              value={cantidad}
              placeholder="1"
              onFocus={(e) => e.target.select()}
              onChange={(e) => handleCantidadChange(e.target.value)}
              onKeyDown={handleCantidadKeyDown}
              className={`${inputBase} text-center font-semibold`}
            />
          </div>

          {/* Precio Unidad (1 columna) */}
          <div className="col-span-1">
            <label className="text-[10px] font-semibold text-zinc-500 truncate block">P. Unid</label>
            <input
              type="number"
              step="0.10"
              min={0}
              value={precioUnidadValor}
              disabled={!productoSeleccionado || tipoVentaEntrada !== 'unidad'}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setPrecioUnidadValor(Math.max(0, Number(e.target.value)))}
              className={`${inputBase} text-right ${tipoVentaEntrada === 'unidad' ? 'font-semibold' : ''}`}
            />
          </div>

          {/* Precio Caja (1 columna) */}
          <div className="col-span-1">
            <label className="text-[10px] font-semibold text-zinc-500 truncate block">P. Caja</label>
            <input
              type="number"
              step="0.10"
              min={0}
              value={precioCajaValor}
              disabled={!productoSeleccionado || !tieneCaja || tipoVentaEntrada !== 'caja'}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setPrecioCajaValor(Math.max(0, Number(e.target.value)))}
              className={`${inputBase} text-right ${tipoVentaEntrada === 'caja' ? 'font-semibold' : ''}`}
            />
          </div>

          {/* Precio Blister (1 columna) */}
          <div className="col-span-1">
            <label className="text-[10px] font-semibold text-zinc-500 truncate block">P. Blister</label>
            <input
              type="number"
              step="0.10"
              min={0}
              value={precioBlisterValor}
              disabled={!productoSeleccionado || !tieneBlister || tipoVentaEntrada !== 'blister'}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setPrecioBlisterValor(Math.max(0, Number(e.target.value)))}
              className={`${inputBase} text-right ${tipoVentaEntrada === 'blister' ? 'font-semibold' : ''}`}
            />
          </div>

          {/* Stock (1 columna) */}
          <div className="col-span-1">
            <label className="text-[10px] font-semibold text-zinc-500 truncate block">Stock</label>
            <input readOnly value={stockDisponible} className={`${inputBase} bg-zinc-50 text-right font-mono`} />
          </div>

          {/* Botón Grabar (1 columna) */}
          <div className="col-span-1">
            <button
              type="button"
              onClick={grabarLinea}
              className={`w-full h-[34px] flex items-center justify-center gap-1 rounded-lg text-white text-xs font-bold transition-colors ${
                editandoKey ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary hover:bg-primary/80'
              }`}
            >
              <Save size={14} /> {editandoKey ? 'Act.' : 'Grabar'}
            </button>
          </div>
        </div>

        {productoSeleccionado && (
          <p className="text-[10px] text-zinc-400">
            Importe de la línea: <span className="font-semibold text-zinc-600">S/ {importeCalculado.toFixed(2)}</span>
          </p>
        )}
      </div>

      {/* TABLA DE DETALLE */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto min-h-0">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-primary z-10">
              <tr className="text-left text-xs font-bold text-white uppercase tracking-wider">
                <th className="px-4 py-2">Descripción</th>
                <th className="px-4 py-2 text-right">Cantidad</th>
                <th className="px-4 py-2 text-right">Precio Unit</th>
                <th className="px-4 py-2 text-right">Importe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {carrito.map((item, idx) => (
                <tr
                  key={`${item.idProducto}-${item.tipoVenta}`}
                  ref={(el) => { filaRefs.current[idx] = el; }}
                  onClick={() => setFilaSeleccionada(idx)}
                  className={`cursor-pointer transition-colors ${
                    idx === filaSeleccionada ? 'bg-primary/10' : 'hover:bg-zinc-50/60'
                  }`}
                >
                  <td className="px-4 py-1.5 text-zinc-700">{item.producto.nombre}</td>
                  <td className="px-4 py-1.5 text-right font-mono">{item.cantidad}</td>
                  <td className="px-4 py-1.5 text-right font-mono">S/ {item.precioUnitario.toFixed(2)}</td>
                  <td className="px-4 py-1.5 text-right font-mono font-semibold">
                    S/ {(item.precioUnitario * item.cantidad).toFixed(2)}
                  </td>
                </tr>
              ))}
              {carrito.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-400">
                    Aún no agregaste productos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="shrink-0 border-t border-zinc-200 px-3 py-2 flex flex-wrap items-center justify-between gap-2 bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={iniciarEdicion}
              disabled={carrito.length === 0}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-primary/30 text-primary hover:bg-primary/5 text-xs font-semibold transition-colors disabled:opacity-40"
              title="Editar cantidad, presentación o precio de la fila seleccionada"
            >
              <Pencil size={13} /> Editar
            </button>
            <button
              type="button"
              onClick={() => {
                const item = carrito[filaSeleccionada];
                if (item) quitarProducto(item.idProducto, item.tipoVenta);
              }}
              disabled={carrito.length === 0}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 text-xs font-semibold transition-colors disabled:opacity-40"
              title="Eliminar fila seleccionada (Supr)"
            >
              <Trash2 size={13} /> Eliminar
            </button>
            <button
              type="button"
              onClick={onVaciarCarrito}
              disabled={carrito.length === 0}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-100 text-xs font-semibold transition-colors disabled:opacity-40"
            >
              Vaciar todo
            </button>
          </div>

          <p className="text-[10px] text-zinc-400">
            ↑ ↓ selecciona fila &nbsp;•&nbsp; Supr elimina &nbsp;•&nbsp; F2 cobrar &nbsp;•&nbsp; F3 código de barras &nbsp;•&nbsp; F4 modo con mouse
          </p>
        </div>
      </div>

      {/* PIE: TOTALES */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs p-3 shrink-0 flex flex-wrap items-center justify-between gap-3">
        <span className="text-[10px] text-zinc-400">El medio de pago se confirma en el cobro (F2)</span>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] font-semibold text-zinc-400 uppercase">Importe Total</p>
            <p className="text-lg font-bold text-zinc-900">S/ {total.toFixed(2)}</p>
          </div>
          <button
            type="button"
            onClick={onAbrirPago}
            disabled={carrito.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-colors disabled:opacity-40"
          >
            Cobrar <span className="text-xs font-normal opacity-80">F2</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="shrink-0 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Plus, Trash2, Search, Barcode, Save, UserPlus 
} from 'lucide-react';
import { 
  proveedorApi, 
  comprasApi, 
  AFECTACION_IGV_OPTIONS, 
  IGV_RATE 
} from '@/api/compra';
import type { 
  Proveedor, 
  Producto, 
  DetalleCompraItem, 
  AfectacionIgv, 
  TipoPrecio 
} from '@/api/compra';
import { useSession } from '@/hooks/useSession';

// Lista de productos estática/referencial sincronizada con la API Mock
const PRODUCTOS_MOCK: Producto[] = [
  { id: 1, nombre: 'Paracetamol 500mg', codigoBarra: '7751271000019', unidadMedida: 'CAJA', gravada: true, precioUnitario: 2.5, precioMayorista: 2.1, costoUnitario: 1.2, stockActual: 320, unidadesPorPresentacion: 100 },
  { id: 2, nombre: 'Amoxicilina 500mg', codigoBarra: '7751271000026', unidadMedida: 'CAJA', gravada: true, precioUnitario: 6.0, precioMayorista: 5.2, costoUnitario: 4.5, stockActual: 18, unidadesPorPresentacion: 50 },
  { id: 3, nombre: 'Ibuprofeno 400mg', codigoBarra: '7751271000033', unidadMedida: 'CAJA', gravada: true, precioUnitario: 2.8, precioMayorista: 2.3, costoUnitario: 1.5, stockActual: 150, unidadesPorPresentacion: 100 },
];

export default function GenerarCompraPage() {
  const router = useRouter();
  const { empleado } = useSession();

  // Estados de Formulario Principal
  const [comprobante, setComprobante] = useState('FACTURA');
  const [serie, setSerie] = useState('F001');
  const [numero, setNumero] = useState('');
  const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().slice(0, 10));
  const [regularizar, setRegularizar] = useState(false);
  const [idProveedor, setIdProveedor] = useState<number | ''>('');
  const [precioIncluyeIgv, setPrecioIncluyeIgv] = useState(true);
  const [tipoPago, setTipoPago] = useState('CONTADO');
  const [medioPago, setMedioPago] = useState('EFECTIVO');
  const [percepcion, setPercepcion] = useState<number>(0);
  const [descripcion, setDescripcion] = useState('');

  // Estados de datos
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [detalles, setDetalles] = useState<DetalleCompraItem[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Estados para búsqueda/adición de productos
  const [codigoBarra, setCodigoBarra] = useState('');
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);

  // Campos del item a agregar
  const [itemLote, setItemLote] = useState('');
  const [itemVencimiento, setItemVencimiento] = useState('');
  const [itemCantidad, setItemCantidad] = useState<number>(1);
  const [itemPrecio, setItemPrecio] = useState<number>(0);
  const [itemTipoPrecio, setItemTipoPrecio] = useState<TipoPrecio>('UNITARIO');
  const [itemAfectacion, setItemAfectacion] = useState<AfectacionIgv>('GRAVADO_ONEROSO');

  useEffect(() => {
    const cargarProveedores = async () => {
      setCargando(true);
      try {
        const data = await proveedorApi.listar();
        setProveedores(data);
        if (data.length > 0) setIdProveedor(data[0].id);
      } catch (err) {
        setError('Error al cargar proveedores.');
      } finally {
        setCargando(false);
      }
    };
    cargarProveedores();
  }, []);

  // Búsqueda por código de barras
  const handleScanCodigoBarra = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !codigoBarra.trim()) return;
    e.preventDefault();

    const prod = PRODUCTOS_MOCK.find((p) => p.codigoBarra === codigoBarra.trim());
    if (prod) {
      seleccionarProducto(prod);
      setCodigoBarra('');
    } else {
      alert('Producto no encontrado con el código de barras ingresado.');
    }
  };

  const seleccionarProducto = (prod: Producto) => {
    setProductoSeleccionado(prod);
    setItemPrecio(prod.costoUnitario ?? prod.precioUnitario);
    setItemAfectacion(prod.gravada ? 'GRAVADO_ONEROSO' : 'EXONERADO');
  };

  const handleAgregarItem = () => {
    if (!productoSeleccionado) {
      alert('Seleccione un producto');
      return;
    }
    if (itemCantidad <= 0 || itemPrecio <= 0) {
      alert('Ingrese una cantidad y precio válidos.');
      return;
    }

    const nuevoItem: DetalleCompraItem = {
      key: `${productoSeleccionado.id}-${Date.now()}`,
      idProducto: productoSeleccionado.id,
      nombreProducto: productoSeleccionado.nombre,
      tipoPrecio: itemTipoPrecio,
      afectacionIgv: itemAfectacion,
      lote: itemLote || undefined,
      fechaVencimiento: itemVencimiento || undefined,
      unidadMedida: productoSeleccionado.unidadMedida,
      cantidad: itemCantidad,
      precioUnitario: itemPrecio,
      importe: itemCantidad * itemPrecio,
    };

    setDetalles((prev) => [...prev, nuevoItem]);

    // Limpiar campos del item
    setProductoSeleccionado(null);
    setBusquedaProducto('');
    setItemLote('');
    setItemVencimiento('');
    setItemCantidad(1);
    setItemPrecio(0);
  };

  const handleEliminarItem = (key: string) => {
    setDetalles((prev) => prev.filter((d) => d.key !== key));
  };

  // Cálculos de totales
  const subtotalBase = useMemo(() => {
    return detalles.reduce((sum, d) => sum + d.importe, 0);
  }, [detalles]);

  const igvCalculado = useMemo(() => {
    if (precioIncluyeIgv) {
      return subtotalBase - subtotalBase / (1 + IGV_RATE);
    }
    return subtotalBase * IGV_RATE;
  }, [subtotalBase, precioIncluyeIgv]);

  const totalCalculado = useMemo(() => {
    return precioIncluyeIgv ? subtotalBase : subtotalBase + igvCalculado;
  }, [subtotalBase, igvCalculado, precioIncluyeIgv]);

  const totalPagar = useMemo(() => {
    return totalCalculado + (Number(percepcion) || 0);
  }, [totalCalculado, percepcion]);

  const handleGuardarCompra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idProveedor) {
      setError('Seleccione un proveedor.');
      return;
    }
    if (!numero.trim()) {
      setError('Ingrese el número del comprobante.');
      return;
    }
    if (detalles.length === 0) {
      setError('Agregue al menos un producto a la compra.');
      return;
    }

    setGuardando(true);
    setError('');

    try {
      await comprasApi.crear({
        comprobante,
        serie,
        numero,
        fechaEmision,
        regularizar,
        idProveedor: Number(idProveedor),
        idEmpleado: empleado?.id ?? 1,
        precioIncluyeIgv,
        descripcion: descripcion || undefined,
        percepcion: Number(percepcion) || 0,
        tipoPago,
        medioPago,
        items: detalles.map((d) => ({
          idProducto: d.idProducto,
          lote: d.lote,
          fechaVencimiento: d.fechaVencimiento,
          unidadMedida: d.unidadMedida,
          cantidad: d.cantidad,
          precioUnitario: d.precioUnitario,
        })),
      });

      router.push('/dashboard/compras');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar la compra.');
    } finally {
      setGuardando(false);
    }
  };

  const productosFiltrados = useMemo(() => {
    if (!busquedaProducto.trim()) return [];
    const q = busquedaProducto.toLowerCase();
    return PRODUCTOS_MOCK.filter(
      (p) => p.nombre.toLowerCase().includes(q) || p.codigoBarra?.includes(q)
    );
  }, [busquedaProducto]);

  const inputClass = "w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all";

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/compras"
            className="p-2 rounded-xl text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-primary tracking-tight">Ingresar Compra</h1>
            <p className="text-sm text-zinc-500">Registre una nueva orden de compra o abastecimiento.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleGuardarCompra} className="space-y-6">
        {/* Cabecera de Compra */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide border-b border-zinc-100 pb-2">
            Datos del Comprobante
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Comprobante</label>
              <select value={comprobante} onChange={(e) => setComprobante(e.target.value)} className={inputClass}>
                <option value="FACTURA">Factura</option>
                <option value="BOLETA">Boleta</option>
                <option value="GUIA_REMISION">Guía de Remisión</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Serie</label>
              <input value={serie} onChange={(e) => setSerie(e.target.value)} className={inputClass} placeholder="F001" required />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Número</label>
              <input value={numero} onChange={(e) => setNumero(e.target.value)} className={inputClass} placeholder="0000123" required />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Fecha Emisión</label>
              <input type="date" value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)} className={inputClass} required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Proveedor</label>
              <select
                value={idProveedor}
                onChange={(e) => setIdProveedor(e.target.value ? Number(e.target.value) : '')}
                className={inputClass}
                disabled={cargando}
                required
              >
                <option value="">Seleccione Proveedor</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombres} ({p.numeroDocumento})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Tipo de Pago</label>
              <select value={tipoPago} onChange={(e) => setTipoPago(e.target.value)} className={inputClass}>
                <option value="CONTADO">Contado</option>
                <option value="CREDITO">Crédito</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Medio de Pago</label>
              <select value={medioPago} onChange={(e) => setMedioPago(e.target.value)} className={inputClass}>
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="TARJETA">Tarjeta</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
              <input
                type="checkbox"
                checked={precioIncluyeIgv}
                onChange={(e) => setPrecioIncluyeIgv(e.target.checked)}
                className="rounded border-zinc-300 text-primary focus:ring-primary"
              />
              Los precios incluyen IGV
            </label>

            <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
              <input
                type="checkbox"
                checked={regularizar}
                onChange={(e) => setRegularizar(e.target.checked)}
                className="rounded border-zinc-300 text-primary focus:ring-primary"
              />
              Regularizar Stock
            </label>
          </div>
        </div>

        {/* Sección de Selección de Productos */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide border-b border-zinc-100 pb-2">
            Agregar Productos
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Escanear Código de Barras</label>
              <div className="relative">
                <Barcode size={18} className="absolute left-3 top-2.5 text-zinc-400" />
                <input
                  value={codigoBarra}
                  onChange={(e) => setCodigoBarra(e.target.value)}
                  onKeyDown={handleScanCodigoBarra}
                  className={`${inputClass} pl-10`}
                  placeholder="Presione Enter tras escanear..."
                />
              </div>
            </div>

            <div className="relative">
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Buscar Producto por Nombre</label>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-2.5 text-zinc-400" />
                <input
                  value={busquedaProducto}
                  onChange={(e) => setBusquedaProducto(e.target.value)}
                  className={`${inputClass} pl-10`}
                  placeholder="Buscar producto..."
                />
              </div>
              {productosFiltrados.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {productosFiltrados.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => seleccionarProducto(p)}
                      className="w-full text-left px-4 py-2 hover:bg-zinc-50 text-sm border-b border-zinc-100 last:border-0"
                    >
                      <p className="font-semibold text-zinc-800">{p.nombre}</p>
                      <p className="text-xs text-zinc-500">Cód: {p.codigoBarra ?? '—'} | Unidad: {p.unidadMedida}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {productoSeleccionado && (
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-3">
              <p className="text-sm font-bold text-primary">Producto Seleccionado: {productoSeleccionado.nombre}</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1">Lote</label>
                  <input value={itemLote} onChange={(e) => setItemLote(e.target.value)} className={inputClass} placeholder="L-101" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1">Vencimiento</label>
                  <input type="date" value={itemVencimiento} onChange={(e) => setItemVencimiento(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1">Cantidad</label>
                  <input type="number" min="1" value={itemCantidad} onChange={(e) => setItemCantidad(Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1">Precio Unit.</label>
                  <input type="number" step="0.01" value={itemPrecio} onChange={(e) => setItemPrecio(Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1">Afectación IGV</label>
                  <select value={itemAfectacion} onChange={(e) => setItemAfectacion(e.target.value as AfectacionIgv)} className={inputClass}>
                    {AFECTACION_IGV_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleAgregarItem}
                    className="w-full py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus size={16} /> Agregar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tabla de Items */}
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs font-bold uppercase text-zinc-400 text-left">
                  <th className="py-2 px-3">Producto</th>
                  <th className="py-2 px-3">Lote</th>
                  <th className="py-2 px-3">Vencimiento</th>
                  <th className="py-2 px-3 text-right">Cant.</th>
                  <th className="py-2 px-3 text-right">P. Unit</th>
                  <th className="py-2 px-3 text-right">Importe</th>
                  <th className="py-2 px-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {detalles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-400">
                      No hay productos agregados a la compra.
                    </td>
                  </tr>
                ) : (
                  detalles.map((d) => (
                    <tr key={d.key} className="hover:bg-zinc-50">
                      <td className="py-2.5 px-3 font-medium text-zinc-800">{d.nombreProducto}</td>
                      <td className="py-2.5 px-3 text-zinc-600">{d.lote ?? '—'}</td>
                      <td className="py-2.5 px-3 text-zinc-600">{d.fechaVencimiento ?? '—'}</td>
                      <td className="py-2.5 px-3 text-right font-medium">{d.cantidad}</td>
                      <td className="py-2.5 px-3 text-right">S/ {d.precioUnitario.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-zinc-800">S/ {d.importe.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleEliminarItem(d.key)}
                          className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resumen y Guardado */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-3">
            <label className="block text-xs font-semibold text-zinc-600">Observaciones / Descripción</label>
            <textarea
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className={inputClass}
              placeholder="Notas opcionales sobre la compra..."
            />
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-3">
            <div className="flex justify-between text-sm text-zinc-600">
              <span>Subtotal:</span>
              <span className="font-semibold">S/ {(totalCalculado - igvCalculado).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-zinc-600">
              <span>IGV (18%):</span>
              <span className="font-semibold">S/ {igvCalculado.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-zinc-600">
              <span>Percepción:</span>
              <input
                type="number"
                step="0.01"
                value={percepcion}
                onChange={(e) => setPercepcion(Number(e.target.value))}
                className="w-24 px-2 py-1 border border-zinc-300 rounded text-right text-sm"
              />
            </div>
            <div className="border-t border-zinc-200 pt-2 flex justify-between text-base font-bold text-primary">
              <span>Total a Pagar:</span>
              <span>S/ {totalPagar.toFixed(2)}</span>
            </div>

            <button
              type="submit"
              disabled={guardando}
              className="w-full mt-4 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save size={18} />
              {guardando ? 'Guardando...' : 'Guardar Compra'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
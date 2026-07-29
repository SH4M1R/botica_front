'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Trash2, Wallet, ShoppingCart, UserPlus, Plus, X as XIcon, CalendarDays, AlertTriangle, ExternalLink } from 'lucide-react';
import { productosApi } from '@/api/productos';
import type { Producto } from '@/api/productos';
import { ventasApi, clientesApi } from '@/api/ventas';
import type { Venta, Cliente } from '@/api/ventas';
import { arqueoApi } from '@/api/arqueo';
import type { ArqueoCaja } from '@/api/arqueo';
import { useSession } from '@/hooks/useSession';
import MetodoPagoModal, { PagoParte } from '../components/MetodoPagoModal';
import ClienteModal from '@/app/dashboard/clientes/components/ClienteModal';
import { CajaCerradaModal } from '@/components/CajaCerradaModal';

type TipoVenta = 'unidad' | 'blister' | 'caja';

interface CarritoItem {
  idProducto: number;
  cantidad: number;
  tipoVenta: TipoVenta;
  precioUnitario: number;
  producto: Producto;
}

function tiposDisponibles(producto: Producto): { value: TipoVenta; label: string }[] {
  const tipos: { value: TipoVenta; label: string }[] = [{ value: 'unidad', label: 'Unidad' }];
  if (producto.vende_por_presentaciones && producto.blister_habilitado) {
    tipos.push({ value: 'blister', label: `Blister (${producto.unidades_blister ?? '?'} und)` });
  }
  if (producto.vende_por_presentaciones && producto.caja_habilitado) {
    tipos.push({ value: 'caja', label: `Caja (${producto.unidades_caja ?? '?'} und)` });
  }
  return tipos;
}

function precioPorTipo(producto: Producto, tipo: TipoVenta): number {
  if (tipo === 'blister') return producto.precio_blister ?? producto.precio_venta;
  if (tipo === 'caja') return producto.precio_caja ?? producto.precio_venta;
  return producto.precio_venta;
}

function unidadesBasePorTipo(producto: Producto, tipo: TipoVenta): number {
  if (tipo === 'blister') return producto.unidades_blister ?? 1;
  if (tipo === 'caja') return producto.unidades_caja ?? 1;
  return 1;
}

// Componente helper para evitar bugs al tippear decimales o borrar el input de precio/subtotal
function PrecioInput({
  value,
  onChange,
  className = '',
  step = '0.10',
}: {
  value: number;
  onChange: (val: number) => void;
  className?: string;
  step?: string;
}) {
  const [localVal, setLocalVal] = useState(value.toString());

  useEffect(() => {
    setLocalVal(Number.isNaN(value) ? '' : value.toFixed(2));
  }, [value]);

  const commitValue = () => {
    const parsed = parseFloat(localVal);
    if (isNaN(parsed) || parsed < 0) {
      setLocalVal(value.toFixed(2));
    } else {
      onChange(parsed);
      setLocalVal(parsed.toFixed(2));
    }
  };

  return (
    <input
      type="number"
      step={step}
      min={0}
      value={localVal}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={commitValue}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commitValue();
        }
      }}
      className={className}
    />
  );
}

export default function GenerarVentaPage() {
  const router = useRouter();
  const { empleado, cargando } = useSession();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState<CarritoItem[]>([]);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [nombreCliente, setNombreCliente] = useState('');
  const [dniCliente, setDniCliente] = useState('');
  const [idClienteSeleccionado, setIdClienteSeleccionado] = useState<number | null>(null);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [clienteModalAbierto, setClienteModalAbierto] = useState(false);

  const [modalPagoAbierto, setModalPagoAbierto] = useState(false);
  const [error, setError] = useState('');
  const [, setVentaConfirmada] = useState<Venta | null>(null);

  const [mostrarConfirmVaciar, setMostrarConfirmVaciar] = useState(false);

  // Verificación de caja abierta
  const [cajaAbierta, setCajaAbierta] = useState<ArqueoCaja | null | undefined>(undefined);

  const fechaHoy = useMemo(
    () => new Date().toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
    []
  );

  useEffect(() => {
    const esPopup = window.opener !== null || new URLSearchParams(window.location.search).get('popup') === 'true';
    if (esPopup) {
      document.body.classList.add('is-pos-popup');
    }
    return () => {
      document.body.classList.remove('is-pos-popup');
    };
  }, []);

  const cargarProductos = () => {
    productosApi.listarActivos().then(setProductos).catch(() => setProductos([]));
  };

  const cargarClientes = () => {
    clientesApi.listar().then(setClientes).catch(() => setClientes([]));
  };

  const verificarCaja = async () => {
    if (!empleado) return;
    try {
      const actual = await arqueoApi.cajaActual(empleado.id);
      setCajaAbierta(actual ?? null);
    } catch {
      setCajaAbierta(null);
    }
  };

  const abrirBoletaImprimible = (idVenta: number) => {
    window.open(`/dashboard/ventas/boleta?id=${idVenta}`, '_blank');
  };

  const abrirVentanaFlotante = () => {
    const width = 1280;
    const height = 800;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const popupUrl = `${window.location.origin}${window.location.pathname}?popup=true`;

    window.open(
      popupUrl,
      'GenerarVentaPOS',
      `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,status=no,toolbar=no,menubar=no,location=no`
    );
  };

  useEffect(() => {
    if (cargando) return;
    if (!empleado) {
      router.push('/');
      return;
    }
    cargarProductos();
    cargarClientes();
    verificarCaja();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empleado, cargando, router]);

  // FILTRO: Excluir productos con stock <= 0 e incluir búsqueda por laboratorio
  const productosVisibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    // Filtramos primero los que tienen stock > 0
    const conStock = productos.filter((p) => p.stock > 0);

    if (!q) return conStock.slice(0, 30);

    const base = conStock.filter((p) => {
      const nombreMatch = p.nombre.toLowerCase().includes(q);
      const principioMatch = p.principioActivo?.nombre?.toLowerCase().includes(q);
      const laboratorioMatch = p.laboratorio?.nombre?.toLowerCase().includes(q);

      return nombreMatch || principioMatch || laboratorioMatch;
    });

    return base.slice(0, 30);
  }, [busqueda, productos]);

  const sugerenciasCliente = useMemo(() => {
    if (idClienteSeleccionado) return [];
    const q = nombreCliente.trim().toLowerCase();
    if (!q) return [];
    return clientes
      .filter((c) => c.nombre.toLowerCase().includes(q) || c.dni?.includes(q))
      .slice(0, 5);
  }, [nombreCliente, clientes, idClienteSeleccionado]);

  const total = useMemo(
    () => carrito.reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0),
    [carrito]
  );

  const tieneCliente = !!(idClienteSeleccionado || nombreCliente.trim());

  const agregarProducto = (producto: Producto) => {
    const existente = carrito.find((c) => c.idProducto === producto.id && c.tipoVenta === 'unidad');
    if (existente) {
      cambiarCantidad(producto.id, 'unidad', existente.cantidad + 1);
      return;
    }
    setCarrito((prev) => [
      ...prev,
      { idProducto: producto.id, cantidad: 1, tipoVenta: 'unidad', precioUnitario: producto.precio_venta, producto },
    ]);
  };

  const cambiarCantidad = (idProducto: number, tipoVenta: TipoVenta, cantidad: number) => {
    setCarrito((prev) =>
      prev.map((item) =>
        item.idProducto === idProducto && item.tipoVenta === tipoVenta ? { ...item, cantidad: Math.max(1, cantidad) } : item
      )
    );
  };

  const cambiarPrecioUnitario = (idProducto: number, tipoVenta: TipoVenta, precio: number) => {
    setCarrito((prev) =>
      prev.map((item) =>
        item.idProducto === idProducto && item.tipoVenta === tipoVenta ? { ...item, precioUnitario: Math.max(0, precio) } : item
      )
    );
  };

  const cambiarSubtotal = (idProducto: number, tipoVenta: TipoVenta, subtotal: number) => {
    setCarrito((prev) =>
      prev.map((item) => {
        if (item.idProducto !== idProducto || item.tipoVenta !== tipoVenta) return item;
        const nuevoSubtotal = Math.max(0, subtotal);
        const nuevoPrecioUnitario = item.cantidad > 0 ? nuevoSubtotal / item.cantidad : 0;
        return { ...item, precioUnitario: nuevoPrecioUnitario };
      })
    );
  };

  const cambiarTipoVenta = (idProducto: number, tipoActual: TipoVenta, nuevoTipo: TipoVenta) => {
    if (tipoActual === nuevoTipo) return;
    setCarrito((prev) => {
      const actual = prev.find((i) => i.idProducto === idProducto && i.tipoVenta === tipoActual);
      if (!actual) return prev;
      const destino = prev.find((i) => i.idProducto === idProducto && i.tipoVenta === nuevoTipo);
      const nuevoPrecio = precioPorTipo(actual.producto, nuevoTipo);

      if (destino) {
        return prev
          .filter((i) => !(i.idProducto === idProducto && i.tipoVenta === tipoActual))
          .map((i) => (i.idProducto === idProducto && i.tipoVenta === nuevoTipo ? { ...i, cantidad: i.cantidad + actual.cantidad } : i));
      }
      return prev.map((i) =>
        i.idProducto === idProducto && i.tipoVenta === tipoActual ? { ...i, tipoVenta: nuevoTipo, precioUnitario: nuevoPrecio } : i
      );
    });
  };

  const quitarProducto = (idProducto: number, tipoVenta: TipoVenta) => {
    setCarrito((prev) => prev.filter((item) => !(item.idProducto === idProducto && item.tipoVenta === tipoVenta)));
  };

  const solicitarVaciarDetalle = () => {
    if (carrito.length === 0) return;
    setMostrarConfirmVaciar(true);
  };

  const confirmarVaciarDetalle = () => {
    setCarrito([]);
    setError('');
    setMostrarConfirmVaciar(false);
  };

  const seleccionarCliente = (cliente: Cliente) => {
    setIdClienteSeleccionado(cliente.id);
    setNombreCliente(cliente.nombre);
    setDniCliente(cliente.dni ?? '');
    setMostrarSugerencias(false);
  };

  const limpiarClienteSeleccionado = () => {
    setIdClienteSeleccionado(null);
    setNombreCliente('');
    setDniCliente('');
  };

  const handleGuardarClienteNuevo = async (data: { nombre: string; dni?: string; telefono?: string }) => {
    const nuevo = await clientesApi.crear(data);
    setClientes((prev) => [...prev, nuevo]);
    seleccionarCliente(nuevo);
  };

  const handleAbrirPago = () => {
    setError('');
    if (carrito.length === 0) return setError('Agrega al menos un producto.');

    const excedeStock = carrito.find(
      (item) => item.cantidad * unidadesBasePorTipo(item.producto, item.tipoVenta) > item.producto.stock
    );
    if (excedeStock) return setError(`Stock insuficiente para "${excedeStock.producto.nombre}".`);

    setModalPagoAbierto(true);
  };

  const handleConfirmarVenta = async (pagos: PagoParte[]) => {
    if (!empleado) throw new Error('Sesión expirada. Vuelve a iniciar sesión.');

    try {
      const pestanaBoleta = window.open('', '_blank');

      let idCliente: number | null = idClienteSeleccionado;
      if (!idCliente && nombreCliente.trim()) {
        const nuevoCliente = await clientesApi.crear({
          nombre: nombreCliente.trim(),
          dni: dniCliente.trim() || undefined,
        });
        idCliente = nuevoCliente.id;
      }

      const metodoPago = pagos
        .map((p) => `${p.metodo}: S/ ${p.monto.toFixed(2)} (${p.detalle})`)
        .join('  +  ');

      const venta = await ventasApi.crear({
        idEmpleado: empleado.id,
        idCliente,
        metodoPago,
        items: carrito.map(({ idProducto, cantidad, tipoVenta, precioUnitario }) => ({
          idProducto, cantidad, tipoVenta, precioUnitario,
        })),
      });

      if (pestanaBoleta) pestanaBoleta.location.href = `/dashboard/ventas/boleta?id=${venta.id}`;
      else abrirBoletaImprimible(venta.id);

      setModalPagoAbierto(false);
      setVentaConfirmada(venta);

      setCarrito([]);
      limpiarClienteSeleccionado();
      setBusqueda('');
      setError('');

      cargarProductos();
      cargarClientes();
    } catch (err) {
      console.error(err);
      setError('Ocurrió un error al procesar la venta. Inténtalo nuevamente.');
      throw err;
    }
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all";

  if (cargando || cajaAbierta === undefined) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-zinc-400">Verificando caja...</p>
      </div>
    );
  }

  if (cajaAbierta === null) {
    return (
      <>
        <div className="h-full flex items-center justify-center">
          <p className="text-sm text-zinc-400">Debes abrir tu caja para generar ventas.</p>
        </div>
        <CajaCerradaModal
          open
          onClose={() => router.push('/dashboard/ventas')}
          onIrAArqueo={() => router.push('/dashboard/caja')}
        />
      </>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col gap-4 p-4 box-border bg-zinc-100 overflow-hidden">
      {/* HEADER POS */}
      <header className="pos-header flex flex-col md:flex-row items-center justify-between shrink-0 gap-3 bg-white p-3 rounded-2xl border border-zinc-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-primary tracking-tight">
                Generar Venta
              </h1>
              
              <button
                type="button"
                onClick={abrirVentanaFlotante}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold border border-zinc-200 transition-colors cursor-pointer"
                title="Abrir en ventana emergente"
              >
                <ExternalLink size={13} />
                <span>Ventana flotante</span>
              </button>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-zinc-500">Atendido por:</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
                {empleado?.nombre}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200 shrink-0">
          <CalendarDays size={15} className="text-primary" />
          <span className="text-xs font-semibold text-zinc-700 capitalize">{fechaHoy}</span>
        </div>

        <div className="w-full md:w-[480px] space-y-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-medium text-zinc-700">
              <UserPlus size={14} className="text-primary" />
              <span>Cliente (opcional)</span>
            </div>

            {idClienteSeleccionado && (
              <button
                type="button"
                onClick={limpiarClienteSeleccionado}
                className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 transition-colors"
              >
                <XIcon size={12} /> Quitar
              </button>
            )}
          </div>

          <div className="grid grid-cols-12 gap-1.5">
            <div className="col-span-7 relative">
              <input
                value={nombreCliente}
                onChange={(e) => {
                  setNombreCliente(e.target.value);
                  setIdClienteSeleccionado(null);
                  setMostrarSugerencias(true);
                }}
                onFocus={() => setMostrarSugerencias(true)}
                onBlur={() => setTimeout(() => setMostrarSugerencias(false), 150)}
                placeholder="Nombre del cliente"
                readOnly={!!idClienteSeleccionado}
                className={`${inputClass} text-xs py-1.5 ${
                  idClienteSeleccionado ? 'bg-zinc-100 text-zinc-800 font-medium border-zinc-300' : ''
                }`}
              />

              {mostrarSugerencias && sugerenciasCliente.length > 0 && (
                <div className="absolute left-0 right-0 z-30 mt-1 max-h-48 overflow-y-auto bg-white border border-zinc-200 rounded-lg shadow-lg divide-y divide-zinc-100">
                  {sugerenciasCliente.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={() => seleccionarCliente(c)}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-zinc-50 transition-colors"
                    >
                      <span className="font-medium text-zinc-800 truncate mr-2">{c.nombre}</span>
                      <span className="font-mono text-zinc-400 shrink-0">{c.dni ?? '—'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="col-span-4">
              <input
                value={dniCliente}
                onChange={(e) => setDniCliente(e.target.value)}
                placeholder="DNI / RUC"
                maxLength={11}
                readOnly={!!idClienteSeleccionado}
                className={`${inputClass} text-xs py-1.5 font-mono ${
                  idClienteSeleccionado ? 'bg-zinc-100 text-zinc-800 font-medium border-zinc-300' : ''
                }`}
              />
            </div>

            <div className="col-span-1">
              <button
                type="button"
                onClick={() => setClienteModalAbierto(true)}
                className="w-full h-full flex items-center justify-center rounded-lg bg-primary hover:bg-primary/90 text-white transition-colors cursor-pointer"
                title="Registrar nuevo cliente"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ÁREA PRINCIPAL POS */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 flex-1 min-h-0 overflow-hidden">
        
        {/* CATALOGO PRODUCTOS */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-zinc-200 shadow-xs flex flex-col h-full overflow-hidden">
          <div className="p-3 border-b border-zinc-200 shrink-0">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400"><Search size={16} /></span>
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, principio activo o laboratorio..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-primary/30 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-primary z-10 shadow-xs">
                <tr className="border-b border-zinc-200 text-left text-xs font-bold text-white uppercase tracking-wider">
                  <th className="px-4 py-2.5">Producto</th>
                  <th className="px-4 py-2.5 text-right">Precio</th>
                  <th className="px-4 py-2.5 text-right">Stock</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {productosVisibles.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="px-4 py-2 text-zinc-700">
                      <div className="font-medium text-zinc-800">{p.nombre}</div>
                      
                      {/* Principio activo y Laboratorio en la misma línea */}
                      {(p.principioActivo?.nombre || p.laboratorio?.nombre) && (
                        <div className="text-xs text-zinc-400 font-normal italic flex items-center gap-1.5 flex-wrap">
                          {p.principioActivo?.nombre && <span>{p.principioActivo.nombre}</span>}
                          {p.principioActivo?.nombre && p.laboratorio?.nombre && <span>•</span>}
                          {p.laboratorio?.nombre && <span className="text-zinc-500 font-medium">{p.laboratorio.nombre}</span>}
                        </div>
                      )}

                      {p.vende_por_presentaciones && (p.blister_habilitado || p.caja_habilitado) && (
                        <div className="flex gap-1 mt-0.5">
                          {p.blister_habilitado && <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-primary/10 text-primary">Blister</span>}
                          {p.caja_habilitado && <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-primary/10 text-primary">Caja</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-700 font-semibold whitespace-nowrap">S/ {p.precio_venta.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right text-zinc-500 font-mono whitespace-nowrap">{p.stock}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button onClick={() => agregarProducto(p)} className="px-3 py-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors cursor-pointer">
                        Agregar
                      </button>
                    </td>
                  </tr>
                ))}
                {productosVisibles.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-10 text-center text-zinc-400">No se encontraron productos disponibles.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* DETALLE DE VENTA / CARRITO */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 shadow-xs flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-zinc-200 shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart size={16} className="text-primary transition-colors duration-300" />
              <span className="text-sm font-bold text-zinc-700">Detalle de venta</span>
            </div>
            {carrito.length > 0 && (
              <button
                type="button"
                onClick={solicitarVaciarDetalle}
                className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 transition-colors cursor-pointer"
              >
                <Trash2 size={13} /> Vaciar
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-zinc-100">
            {carrito.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-10">Aún no agregaste productos.</p>
            ) : (
              carrito.map((item) => {
                const opciones = tiposDisponibles(item.producto);
                const subtotal = item.precioUnitario * item.cantidad;
                return (
                  <div key={`${item.idProducto}-${item.tipoVenta}`} className="px-3 py-2.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-zinc-800 truncate flex-1">{item.producto.nombre}</p>
                      <button
                        onClick={() => quitarProducto(item.idProducto, item.tipoVenta)}
                        className="p-1 text-zinc-400 hover:text-red-500 transition-colors shrink-0 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      {opciones.length > 1 ? (
                        <select
                          value={item.tipoVenta}
                          onChange={(e) => cambiarTipoVenta(item.idProducto, item.tipoVenta, e.target.value as TipoVenta)}
                          className="text-xs px-1.5 py-1 rounded-lg border border-zinc-300 bg-zinc-50 focus:outline-hidden focus:ring-2 focus:ring-primary/50"
                        >
                          {opciones.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
                        </select>
                      ) : (
                        <span className="text-[11px] font-medium text-zinc-500 px-1.5 py-0.5 bg-zinc-50 rounded border border-zinc-200">Unidad</span>
                      )}

                      {/* CANTIDAD */}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-zinc-400 font-medium">Cant.</span>
                        <input
                          type="number"
                          min={1}
                          value={item.cantidad}
                          onChange={(e) => cambiarCantidad(item.idProducto, item.tipoVenta, Number(e.target.value))}
                          className="w-12 px-1 py-0.5 rounded-lg border border-zinc-300 text-xs text-center"
                        />
                      </div>

                      {/* PRECIO UNITARIO (PASOS DE 0.10) */}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-zinc-400 font-medium">P. Unit.</span>
                        <div className="flex items-center gap-0.5">
                          <span className="text-xs text-zinc-400">S/</span>
                          <PrecioInput
                            step="0.10"
                            value={item.precioUnitario}
                            onChange={(nuevoPrecio) => cambiarPrecioUnitario(item.idProducto, item.tipoVenta, nuevoPrecio)}
                            className="w-16 px-1 py-0.5 rounded-lg border border-zinc-300 text-xs text-right text-zinc-700"
                          />
                        </div>
                      </div>

                      {/* SUBTOTAL (PASOS DE 0.10) */}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-zinc-400 font-medium">Subtotal</span>
                        <div className="flex items-center gap-0.5">
                          <span className="text-xs text-zinc-400">S/</span>
                          <PrecioInput
                            step="0.10"
                            value={subtotal}
                            onChange={(nuevoSubtotal) => cambiarSubtotal(item.idProducto, item.tipoVenta, nuevoSubtotal)}
                            className="w-16 px-1 py-0.5 rounded-lg border border-zinc-300 text-xs text-right font-semibold text-zinc-800"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-zinc-200 p-4 space-y-3 shrink-0 bg-zinc-50/50">
            <button
              onClick={handleAbrirPago}
              disabled={carrito.length === 0}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-primary text-sm font-semibold text-primary hover:bg-primary/5 transition-all disabled:opacity-40 cursor-pointer"
            >
              <span className="flex items-center gap-2"><Wallet size={16} /> Realizar Venta</span>
              <span className="text-xs font-normal">Seleccionar</span>
            </button>

            <div className="flex justify-between items-center pt-1">
              <span className="text-sm font-medium text-zinc-500">Total</span>
              <span className="text-2xl font-bold text-zinc-900">S/ {total.toFixed(2)}</span>
            </div>

            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
          </div>
        </div>
      </div>

      <MetodoPagoModal
        open={modalPagoAbierto}
        total={total}
        tieneCliente={tieneCliente}
        onClose={() => setModalPagoAbierto(false)}
        onConfirmarVenta={handleConfirmarVenta}
      />

      <ClienteModal
        open={clienteModalAbierto}
        cliente={null}
        onClose={() => setClienteModalAbierto(false)}
        onSave={handleGuardarClienteNuevo}
      />

      {mostrarConfirmVaciar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
              <div className="flex items-center gap-2">
                <AlertTriangle size={20} className="text-amber-500" />
                <h2 className="text-lg font-bold text-zinc-800">Vaciar detalle</h2>
              </div>
              <button onClick={() => setMostrarConfirmVaciar(false)} className="text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer">
                <XIcon size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-zinc-600">
                ¿Seguro que quieres vaciar todo el detalle de venta? Se eliminarán los {carrito.length} producto(s) agregados.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setMostrarConfirmVaciar(false)}
                  className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarVaciarDetalle}
                  className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg shadow-xs hover:shadow-md transition-all cursor-pointer"
                >
                  Vaciar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Trash2, Wallet, ShoppingCart, UserPlus, Plus, X as XIcon, FileText, AlertTriangle, ExternalLink, Barcode, MousePointerClick, Info, FileImage } from 'lucide-react';
import { productosApi } from '@/api/productos';
import type { Producto } from '@/api/productos';
import { ventasApi, recetasApi, clientesApi, getNombreCompleto, splitNombreCompleto } from '@/api/ventas';
import type { Venta, Cliente, TipoComprobanteVenta } from '@/api/ventas';
import { arqueoApi } from '@/api/arqueo';
import type { ArqueoCaja } from '@/api/arqueo';
import { permisosApi } from '@/api/permisos';
import { cotizacionesApi } from '@/api/cotizaciones';
import { PERMISO_EDITAR_PRECIO_VENTA } from '@/constants/permisos';
import { useSession } from '@/hooks/useSession';
import MetodoPagoModal, { PagoParte } from '../components/MetodoPagoModal';
import ClienteModal from '@/app/dashboard/clientes/components/ClienteModal';
import { CajaCerradaModal } from '@/components/CajaCerradaModal';
import VentaNoMouse from './VentaNoMouse';
import {
  type TipoVenta,
  type CarritoItem,
  type ProductoConCodigo,
  tiposDisponibles,
  precioPorTipo,
  unidadesBasePorTipo,
  PrecioInput,
} from '@/components/ventaShared';

export type { TipoVenta, CarritoItem, ProductoConCodigo };
export { tiposDisponibles, precioPorTipo, unidadesBasePorTipo };

export type TipoComprobante = 'nota' | 'boleta' | 'factura';

const COMPROBANTE_OPTIONS: { value: TipoComprobante; label: string; disabled?: boolean }[] = [
  { value: 'nota', label: 'Nota de Venta' },
  { value: 'boleta', label: 'Boleta Electrónica (próximamente)', disabled: true },
  { value: 'factura', label: 'Factura Electrónica (próximamente)', disabled: true },
];

const TIPO_VENTA_BACKEND: Record<TipoComprobante, TipoComprobanteVenta> = {
  nota: 'nota_venta',
  boleta: 'boleta',
  factura: 'factura',
};

export default function GenerarVentaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { empleado, cargando } = useSession();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState<CarritoItem[]>([]);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

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
  const [modoSinMouse, setModoSinMouse] = useState(false);
  const [cajaAbierta, setCajaAbierta] = useState<ArqueoCaja | null | undefined>(undefined);
  const [puedeEditarPrecio, setPuedeEditarPrecio] = useState(false);
  const [tipoComprobante, setTipoComprobante] = useState<TipoComprobante>('nota');
  const [cotizacionOrigenId, setCotizacionOrigenId] = useState<number | null>(null);
  const cotizacionProcesadaRef = useRef(false);

  const [archivoRecetaPendiente, setArchivoRecetaPendiente] = useState<File | null>(null);
  const requiereRecetaEnCarrito = carrito.some((item) => item.producto.requiere_receta);

  const fechaHoy = useMemo(
    () => new Date().toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: 'long'}),
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

  const verificarPermisoEditarPrecio = async () => {
    if (!empleado) return;
    if (empleado.rol === 'Administrador') {
      setPuedeEditarPrecio(true);
      return;
    }
    try {
      const rutas = await permisosApi.obtener(empleado.id);
      setPuedeEditarPrecio(rutas.includes(PERMISO_EDITAR_PRECIO_VENTA));
    } catch {
      setPuedeEditarPrecio(false);
    }
  };

  const abrirBoletaImprimible = (idVenta: number, vuelto: number) => {
    window.open(`/dashboard/ventas/boleta?id=${idVenta}&vuelto=${vuelto.toFixed(2)}`, '_blank');
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
    verificarPermisoEditarPrecio();
  }, [empleado, cargando, router]);

  useEffect(() => {
    if (cajaAbierta && !modoSinMouse) {
      searchInputRef.current?.focus();
    }
  }, [cajaAbierta, modoSinMouse]);

  const productosVisibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    const filtrados = productos.filter((p) => {
      if (!q) return true;
      const producto = p as ProductoConCodigo & { barras?: string };
      const nombreMatch = producto.nombre.toLowerCase().includes(q);
      const principioMatch = producto.principioActivo?.nombre?.toLowerCase().includes(q);
      const codigoBarrasMatch = (producto.barras ?? producto.codigo_barras)?.toLowerCase().includes(q);

      return nombreMatch || principioMatch || codigoBarrasMatch;
    });

    const ordenados = [...filtrados].sort((a, b) => {
      const aSinStock = a.stock <= 0 ? 1 : 0;
      const bSinStock = b.stock <= 0 ? 1 : 0;
      return aSinStock - bSinStock;
    });

    return ordenados.slice(0, 30);
  }, [busqueda, productos]);

  useEffect(() => {
    if (cotizacionProcesadaRef.current) return;
    const idParam = searchParams.get('cotizacionId');
    if (!idParam || productos.length === 0) return;

    cotizacionProcesadaRef.current = true;
    const idCotizacion = Number(idParam);
    if (!idCotizacion) return;

    cotizacionesApi.obtener(idCotizacion)
      .then((cot) => {
        if (!cot.estado) {
          setError('Esa cotización está anulada y no se puede cargar.');
          return;
        }
        if (cot.convertida) {
          setError('Esa cotización ya fue convertida a venta anteriormente.');
          return;
        }

        const nuevoCarrito: CarritoItem[] = cot.detalles.map((d) => {
          const productoCompleto = productos.find((p) => p.id === d.producto.id);
          const productoBase = (productoCompleto ?? {
            id: d.producto.id,
            nombre: d.producto.nombre,
            precio_venta: d.precioUnitario,
            stock: 0,
            vende_por_presentaciones: false,
            blister_habilitado: false,
            caja_habilitado: false,
          }) as Producto;

          return {
            idProducto: d.producto.id,
            cantidad: d.cantidad,
            tipoVenta: d.tipoVenta,
            precioUnitario: d.precioUnitario,
            producto: productoBase,
          };
        });

        setCarrito(nuevoCarrito);
        if (cot.idCliente) setIdClienteSeleccionado(cot.idCliente);
        setNombreCliente(cot.clienteNombre ?? '');
        setDniCliente(cot.clienteDni ?? '');
        setCotizacionOrigenId(cot.id);
        setError('');
      })
      .catch(() => setError('No se pudo cargar la cotización seleccionada.'));
  }, [productos, searchParams]);

  useEffect(() => {
    rowRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const sugerenciasCliente = useMemo(() => {
    if (idClienteSeleccionado) return [];

    const qNombre = nombreCliente.trim().toLowerCase();
    const qDni = dniCliente.trim().toLowerCase();

    if (!qNombre && !qDni) return [];

    return clientes
      .filter((c) => {
        const nombreCompleto = getNombreCompleto(c).toLowerCase();
        const dni = c.dni?.toLowerCase() ?? '';

        const coincideConNombreInput = qNombre
          ? nombreCompleto.includes(qNombre) || dni.includes(qNombre)
          : true;

        const coincideConDniInput = qDni
          ? dni.includes(qDni) || nombreCompleto.includes(qDni)
          : true;

        return coincideConNombreInput && coincideConDniInput;
      })
      .slice(0, 5);
  }, [nombreCliente, dniCliente, clientes, idClienteSeleccionado]);

  const total = useMemo(
    () => carrito.reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0),
    [carrito]
  );

  const tieneCliente = !!(idClienteSeleccionado || nombreCliente.trim());
  const etiquetaTipo = (tipoVenta: TipoVenta) => (tipoVenta === 'unidad' ? 'unidad(es)' : `${tipoVenta}(s)`);

  const agregarProducto = (producto: Producto) => {
    if (producto.stock <= 0) {
      setError(`"${producto.nombre}" no tiene stock disponible.`);
      return;
    }
    const existente = carrito.find((c) => c.idProducto === producto.id && c.tipoVenta === 'unidad');
    const cantidadDeseada = (existente?.cantidad ?? 0) + 1;
    if (cantidadDeseada > producto.stock) {
      setError(`Solo hay ${producto.stock} unidad(es) disponibles de "${producto.nombre}".`);
      return;
    }
    if (existente) {
      cambiarCantidad(producto.id, 'unidad', cantidadDeseada);
      return;
    }
    setCarrito((prev) => [
      ...prev,
      { idProducto: producto.id, cantidad: 1, tipoVenta: 'unidad', precioUnitario: producto.precio_venta, producto },
    ]);
    setError('');
  };

  const agregarProductoConDetalle = (
    producto: Producto,
    tipoVenta: TipoVenta,
    cantidad: number,
    precioUnitarioManual?: number
  ) => {
    if (producto.stock <= 0) {
      setError(`"${producto.nombre}" no tiene stock disponible.`);
      return;
    }

    const unidadesBase = unidadesBasePorTipo(producto, tipoVenta);
    const maxCantidad = Math.floor(producto.stock / unidadesBase);
    const existente = carrito.find((c) => c.idProducto === producto.id && c.tipoVenta === tipoVenta);
    const cantidadDeseadaTotal = (existente?.cantidad ?? 0) + cantidad;

    let cantidadFinal = cantidadDeseadaTotal;
    if (maxCantidad > 0 && cantidadDeseadaTotal > maxCantidad) {
      cantidadFinal = maxCantidad;
      setError(`Solo hay stock para ${maxCantidad} ${etiquetaTipo(tipoVenta)} de "${producto.nombre}".`);
    } else {
      setError('');
    }

    setCarrito((prev) => {
      if (existente) {
        return prev.map((item) =>
          item.idProducto === producto.id && item.tipoVenta === tipoVenta
            ? { ...item, cantidad: cantidadFinal, precioUnitario: precioUnitarioManual ?? item.precioUnitario }
            : item
        );
      }
      return [
        ...prev,
        {
          idProducto: producto.id,
          cantidad: cantidadFinal,
          tipoVenta,
          precioUnitario: precioUnitarioManual ?? precioPorTipo(producto, tipoVenta),
          producto,
        },
      ];
    });
  };

  const cambiarCantidad = (idProducto: number, tipoVenta: TipoVenta, cantidad: number) => {
    const item = carrito.find((c) => c.idProducto === idProducto && c.tipoVenta === tipoVenta);
    if (!item) return;

    const maxCantidad = Math.floor(item.producto.stock / unidadesBasePorTipo(item.producto, tipoVenta));
    let cantidadFinal = Math.max(1, cantidad);

    if (maxCantidad > 0 && cantidadFinal > maxCantidad) {
      cantidadFinal = maxCantidad;
      setError(`Solo hay stock para ${maxCantidad} ${etiquetaTipo(tipoVenta)} de "${item.producto.nombre}".`);
    } else {
      setError('');
    }

    setCarrito((prev) =>
      prev.map((it) =>
        it.idProducto === idProducto && it.tipoVenta === tipoVenta ? { ...it, cantidad: cantidadFinal } : it
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
      const unidadesBaseNuevo = unidadesBasePorTipo(actual.producto, nuevoTipo);
      const maxCantidadNuevo = Math.floor(actual.producto.stock / unidadesBaseNuevo);

      if (destino) {
        const cantidadCombinada = destino.cantidad + actual.cantidad;
        const cantidadFinal = maxCantidadNuevo > 0 ? Math.min(cantidadCombinada, maxCantidadNuevo) : cantidadCombinada;
        return prev
          .filter((i) => !(i.idProducto === idProducto && i.tipoVenta === tipoActual))
          .map((i) => (i.idProducto === idProducto && i.tipoVenta === nuevoTipo ? { ...i, cantidad: cantidadFinal } : i));
      }
      const cantidadFinal = maxCantidadNuevo > 0 ? Math.min(actual.cantidad, maxCantidadNuevo) : actual.cantidad;
      return prev.map((i) =>
        i.idProducto === idProducto && i.tipoVenta === tipoActual
          ? { ...i, tipoVenta: nuevoTipo, precioUnitario: nuevoPrecio, cantidad: cantidadFinal }
          : i
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
    searchInputRef.current?.focus();
  };

  const seleccionarCliente = (cliente: Cliente) => {
    setIdClienteSeleccionado(cliente.id);
    setNombreCliente(getNombreCompleto(cliente));
    setDniCliente(cliente.dni ?? '');
    setMostrarSugerencias(false);
  };

  const limpiarClienteSeleccionado = () => {
    setIdClienteSeleccionado(null);
    setNombreCliente('');
    setDniCliente('');
  };

  const handleGuardarClienteNuevo = async (data: {
    nombres: string;
    apellidoPaterno?: string;
    apellidoMaterno?: string;
    dni?: string;
    telefono?: string;
  }) => {
    const nuevo = await clientesApi.crear(data);
    setClientes((prev) => [...prev, nuevo]);
    seleccionarCliente(nuevo);
  };

  const handleAbrirPago = () => {
    setError('');
    if (carrito.length === 0) return setError('Agrega al menos un producto.');

    if (tipoComprobante === 'boleta' || tipoComprobante === 'factura') {
      setError('Este tipo de comprobante todavía no está disponible.');
      return;
    }

    const excedeStock = carrito.find(
      (item) => item.cantidad * unidadesBasePorTipo(item.producto, item.tipoVenta) > item.producto.stock
    );
    if (excedeStock) return setError(`Stock insuficiente para "${excedeStock.producto.nombre}".`);

    setModalPagoAbierto(true);
  };

  const handleConfirmarVenta = async (pagos: PagoParte[], metodoPagoFormateado: string, vuelto: number) => {
    if (!empleado) throw new Error('Sesión expirada. Vuelve a iniciar sesión.');

    try {
      const pestanaBoleta = window.open('', '_blank');

      let idCliente: number | null = idClienteSeleccionado;
      if (!idCliente && nombreCliente.trim()) {
        const { nombres, apellidoPaterno, apellidoMaterno } = splitNombreCompleto(nombreCliente.trim());
        const nuevoCliente = await clientesApi.crear({
          nombres,
          apellidoPaterno: apellidoPaterno || undefined,
          apellidoMaterno: apellidoMaterno || undefined,
          dni: dniCliente.trim() || undefined,
        });
        idCliente = nuevoCliente.id;
      }

      const montoPagado = total + vuelto;
      const codigoIzipay = pagos.find((p) => p.metodo === 'Izipay')?.codigoIzipay;

      const venta = await ventasApi.crear({
        idEmpleado: empleado.id,
        idCliente,
        metodoPago: metodoPagoFormateado,
        tipoVenta: TIPO_VENTA_BACKEND[tipoComprobante],
        montoPagado,
        codigoIzipay,
        items: carrito.map(({ idProducto, cantidad, tipoVenta, precioUnitario }) => ({
          idProducto, cantidad, tipoVenta, precioUnitario,
        })),
      });

      // Subir la receta si el usuario adjuntó una foto antes de confirmar la venta
      if (archivoRecetaPendiente) {
        try {
          await recetasApi.subir(venta.id, archivoRecetaPendiente);
        } catch (err) {
          console.error('Error subiendo receta:', err);
          setError('La venta se registró, pero no se pudo subir la receta. Agrégala luego desde el listado de ventas.');
        }
      }

      if (pestanaBoleta) pestanaBoleta.location.href = `/dashboard/ventas/boleta?id=${venta.id}&vuelto=${vuelto.toFixed(2)}`;
      else abrirBoletaImprimible(venta.id, vuelto);

      if (cotizacionOrigenId) {
        cotizacionesApi.marcarConvertida(cotizacionOrigenId).catch(() => {});
        setCotizacionOrigenId(null);
      }

      setModalPagoAbierto(false);
      setVentaConfirmada(venta);

      setCarrito([]);
      limpiarClienteSeleccionado();
      setBusqueda('');
      setError('');
      setArchivoRecetaPendiente(null);
      
      cargarProductos();
      cargarClientes();
      searchInputRef.current?.focus();
    } catch (err) {
      console.error(err);
      setError('Ocurrió un error al procesar la venta. Inténtalo nuevamente.');
      throw err;
    }
  };

  // --- Búsqueda y Lectora de Código de Barras ---
  const intentarAgregarPorCodigoBarras = (valor: string): boolean => {
    const q = valor.trim().toLowerCase();
    if (!q) return false;

    // Busca coincidencia exacta considerando tanto 'barras' como 'codigo_barras'
    const match = (productos as (ProductoConCodigo & { barras?: string })[]).find((p) => {
      const codigo = p.barras ?? p.codigo_barras;
      return codigo && codigo.toLowerCase() === q;
    });

    if (match) {
      if (match.stock > 0) {
        agregarProducto(match);
        setBusqueda('');
        setError('');
      } else {
        setError(`"${match.nombre}" no tiene stock disponible.`);
        setBusqueda('');
      }
      return true;
    }
    return false;
  };

  const handleBusquedaKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, productosVisibles.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // 1. Prioriza la lectura por código de barras
      const agregadoPorCodigo = intentarAgregarPorCodigoBarras(busqueda);
      if (agregadoPorCodigo) return;

      // 2. Si no es un código de barras exacto, agrega el producto seleccionado en la tabla
      const seleccionado = productosVisibles[selectedIndex];
      if (seleccionado) {
        agregarProducto(seleccionado);
        setBusqueda('');
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setBusqueda('');
    }
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        if (!modalPagoAbierto) handleAbrirPago();
      } else if (e.key === 'F3') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'Escape' && mostrarConfirmVaciar) {
        setMostrarConfirmVaciar(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [carrito, modalPagoAbierto, mostrarConfirmVaciar, modoSinMouse, tipoComprobante]);

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

  if (modoSinMouse) {
    return (
      <>
        <VentaNoMouse
          empleadoNombre={empleado?.nombre ?? ''}
          fechaHoy={fechaHoy}
          productos={productos}
          carrito={carrito}
          total={total}
          error={error}
          setError={setError}
          nombreCliente={nombreCliente}
          dniCliente={dniCliente}
          idClienteSeleccionado={idClienteSeleccionado}
          clientes={clientes}
          onCambiarNombreCliente={(v) => {
            setNombreCliente(v);
            setIdClienteSeleccionado(null);
          }}
          onCambiarDniCliente={setDniCliente}
          onSeleccionarCliente={seleccionarCliente}
          onLimpiarCliente={limpiarClienteSeleccionado}
          onAbrirNuevoCliente={() => setClienteModalAbierto(true)}
          agregarProductoConDetalle={agregarProductoConDetalle}
          quitarProducto={quitarProducto}
          onVaciarCarrito={solicitarVaciarDetalle}
          onAbrirPago={handleAbrirPago}
          onVolverModoNormal={() => setModoSinMouse(false)}
        />

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
                    autoFocus
                    className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg shadow-xs hover:shadow-md transition-all cursor-pointer"
                  >
                    Vaciar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="h-full w-full flex flex-col gap-2 sm:gap-3 lg:gap-4 p-2 sm:p-3 lg:p-4 box-border bg-zinc-100 overflow-hidden">
      <header className="pos-header flex flex-wrap items-center justify-between shrink-0 gap-2 sm:gap-3 bg-white p-2.5 sm:p-3 rounded-2xl border border-zinc-200 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-primary tracking-tight whitespace-nowrap">
                Generar Venta
              </h1>

              <button
                type="button"
                onClick={abrirVentanaFlotante}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-primary text-primary hover:bg-primary/10 text-xs font-semibold transition-colors cursor-pointer"
                title="Abrir en ventana emergente"
              >
                <ExternalLink size={13} />
                <span className="hidden sm:inline">Ventana flotante</span>
              </button>

              <button
                type="button"
                onClick={() => setModoSinMouse(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary text-white hover:bg-primary/90 text-xs font-semibold transition-colors cursor-pointer"
                title="Cambiar a pantalla de venta operable solo con teclado"
              >
                <MousePointerClick size={13} />
                <span>Modo Sin Mouse</span>
              </button>
            </div>
          </div>
        </div>

        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200 shrink-0">
          <FileText size={15} className="text-primary shrink-0" />
          <select
            value={tipoComprobante}
            onChange={(e) => setTipoComprobante(e.target.value as TipoComprobante)}
            className="text-xs font-semibold text-zinc-700 bg-transparent outline-none cursor-pointer md:max-w-[120px]"
            title="Tipo de comprobante a emitir"
          >
            {COMPROBANTE_OPTIONS.map((op) => (
              <option key={op.value} value={op.value} disabled={op.disabled}>
                {op.label}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-auto md:min-w-[250px] md:max-w-[350px] md:flex-1 xl:flex-none space-y-1">
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
                onBlur={() => setTimeout(() => setMostrarSugerencias(false), 200)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setMostrarSugerencias(false);
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                placeholder="Nombre o DNI del cliente"
                readOnly={!!idClienteSeleccionado}
                className={`${inputClass} text-xs py-1.5 ${
                  idClienteSeleccionado ? 'bg-zinc-100 text-zinc-800 font-medium border-zinc-300' : ''
                }`}
              />

              {mostrarSugerencias && sugerenciasCliente.length > 0 && (
                <div className="absolute left-0 right-0 z-30 mt-1 max-h-48 w-[350px] overflow-y-auto bg-white border border-zinc-200 rounded-lg shadow-lg divide-y divide-zinc-100">
                  {sugerenciasCliente.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={() => seleccionarCliente(c)}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-zinc-50 transition-colors"
                    >
                      <span className="font-medium text-zinc-800 truncate mr-2">
                        {getNombreCompleto(c)}
                      </span>
                      <span className="font-mono text-zinc-400 shrink-0">
                        {c.dni ?? '—'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="col-span-4">
              <input
                value={dniCliente}
                onChange={(e) => {
                  setDniCliente(e.target.value);
                  setIdClienteSeleccionado(null);
                  setMostrarSugerencias(true);
                }}
                onFocus={() => setMostrarSugerencias(true)}
                onBlur={() => setTimeout(() => setMostrarSugerencias(false), 200)}
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

      {cotizacionOrigenId && (
        <div className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
          <Info size={14} className="shrink-0" />
          <span>
            Cargaste la cotización N° {String(cotizacionOrigenId).padStart(6, '0')}. Verifica precios y stock antes de cobrar, ya que pudieron cambiar desde que se generó.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 grid-rows-[1fr_1fr] lg:grid-rows-1 gap-2 sm:gap-3 lg:gap-4 flex-1 min-h-0 overflow-hidden">

        <div className="lg:col-span-3 bg-white rounded-2xl border border-zinc-200 shadow-xs flex flex-col h-full min-h-0 overflow-hidden">
          <div className="p-2.5 sm:p-3 border-b border-zinc-200 shrink-0 space-y-1">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400"><Search size={16} /></span>
              <input
                ref={searchInputRef}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={handleBusquedaKeyDown}
                placeholder="Buscar por nombre, principio activo o escanear código de barras..."
                className="w-full pl-9 pr-9 py-2 rounded-lg border border-primary/30 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-300" title="Compatible con lector de código de barras">
                <Barcode size={16} />
              </span>
            </div>
            <p className="hidden sm:block text-[10px] text-zinc-400 pl-1">
              ↑ ↓ para navegar &nbsp;•&nbsp; Enter para agregar &nbsp;•&nbsp; Esc para limpiar &nbsp;•&nbsp; F2 para cobrar &nbsp;•&nbsp; F3 para buscar
            </p>
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
                {productosVisibles.map((p, idx) => {
                  const sinStock = p.stock <= 0;
                  return (
                    <tr
                      key={p.id}
                      ref={(el) => { rowRefs.current[idx] = el; }}
                      onClick={() => setSelectedIndex(idx)}
                      className={`transition-colors ${sinStock ? 'opacity-50' : 'cursor-pointer'} ${
                        idx === selectedIndex ? 'bg-primary/10' : sinStock ? '' : 'hover:bg-zinc-50/60'
                      }`}
                    >
                      <td className="px-4 py-2 text-zinc-700">
                        <div className="font-medium text-zinc-800">{p.nombre}</div>

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
                      <td className={`px-4 py-2 text-right font-mono whitespace-nowrap ${sinStock ? 'text-red-400 font-semibold' : 'text-zinc-900'}`}>
                        {sinStock ? 'Sin stock' : p.stock}
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => { e.stopPropagation(); agregarProducto(p); }}
                          disabled={sinStock}
                          title={sinStock ? 'Sin stock disponible' : undefined}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                            sinStock
                              ? 'text-zinc-300 bg-zinc-100 cursor-not-allowed'
                              : 'text-primary bg-primary/10 hover:bg-primary/20 cursor-pointer'
                          }`}
                        >
                          {sinStock ? 'Sin stock' : 'Agregar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {productosVisibles.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-10 text-center text-zinc-400">No se encontraron productos disponibles.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 shadow-xs flex flex-col h-full min-h-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-4 py-2.5 sm:py-3 border-b border-zinc-200 shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart size={16} className="text-primary transition-colors duration-300" />
              <span className="text-sm font-bold text-zinc-700">Detalle de venta</span>
            </div>

            {requiereRecetaEnCarrito && (
              <label className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors">
                <FileImage size={14} />
                {archivoRecetaPendiente ? 'Receta lista ✓' : 'Subir receta'}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => setArchivoRecetaPendiente(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
            
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
                  <div key={`${item.idProducto}-${item.tipoVenta}`} className="px-3 py-2 sm:py-2.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-zinc-800 truncate flex-1">{item.producto.nombre}</p>
                      <button
                        onClick={() => quitarProducto(item.idProducto, item.tipoVenta)}
                        className="p-1 text-zinc-400 hover:text-red-500 transition-colors shrink-0 cursor-pointer"
                        title="Quitar producto"
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

                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-zinc-400 font-medium">P. Unit.</span>
                        <div className="flex items-center gap-0.5">
                          <span className="text-xs text-zinc-400">S/</span>
                          {puedeEditarPrecio ? (
                            <PrecioInput
                              step="0.10"
                              value={item.precioUnitario}
                              onChange={(nuevoPrecio) => cambiarPrecioUnitario(item.idProducto, item.tipoVenta, nuevoPrecio)}
                              className="w-16 px-1 py-0.5 rounded-lg border border-zinc-300 text-xs text-right text-zinc-700"
                            />
                          ) : (
                            <span
                              title="No tienes permiso para modificar el precio de venta"
                              className="w-16 px-1 py-0.5 text-xs text-right text-zinc-500"
                            >
                              {item.precioUnitario.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-zinc-400 font-medium">Subtotal</span>
                        <div className="flex items-center gap-0.5">
                          <span className="text-xs text-zinc-400">S/</span>
                          {puedeEditarPrecio ? (
                            <PrecioInput
                              step="0.10"
                              value={subtotal}
                              onChange={(nuevoSubtotal) => cambiarSubtotal(item.idProducto, item.tipoVenta, nuevoSubtotal)}
                              className="w-16 px-1 py-0.5 rounded-lg border border-zinc-300 text-xs text-right font-semibold text-zinc-800"
                            />
                          ) : (
                            <span
                              title="No tienes permiso para modificar el precio de venta"
                              className="w-16 px-1 py-0.5 text-xs text-right font-semibold text-zinc-800"
                            >
                              {subtotal.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-zinc-200 p-3 sm:p-4 space-y-2 sm:space-y-3 shrink-0 bg-zinc-50/50">
            <button
              onClick={handleAbrirPago}
              disabled={carrito.length === 0}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-primary text-sm font-semibold text-white hover:bg-primary/90 transition-all disabled:opacity-40 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Wallet size={16} />
                Realizar Venta
              </span>
              <span className="text-xs font-normal">F2</span>
            </button>

            <div className="flex justify-between items-center pt-1">
              <span className="text-sm font-medium text-zinc-500">Total</span>
              <span className="text-xl sm:text-2xl font-bold text-zinc-900">S/ {total.toFixed(2)}</span>
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
                  autoFocus
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
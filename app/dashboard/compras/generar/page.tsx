"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Plus, ShoppingCart, Barcode, Trash2, ArrowLeft, PackagePlus } from "lucide-react";

// Modales
import CompraProductoModal from "../components/CompraProductoModal";
import CrearProductoModal from "@/app/dashboard/productos/components/ProductoModal";
import ProveedorModal from "../../proveedores/components/ProveedorModal";

import { useSession } from "@/hooks/useSession";
import {
  comprasApi,
  proveedorApi,
  CompraRequestDTO,
  DetalleCompraItem,
  ItemCompraRequestDTO,
  IGV_RATE,
  Producto,
  Proveedor,
} from "@/api/compra";

const COMPROBANTES = [
  { value: "FACTURA", label: "Factura" },
  { value: "BOLETA", label: "Boleta" },
  { value: "GUIA", label: "Guía de Remisión" },
  { value: "OTROS", label: "Otros" },
];

// Productos referenciales para la simulación de escaneo local
const PRODUCTOS_MOCK: Producto[] = [
  { id: 1, nombre: 'Paracetamol 500mg', codigoBarra: '7751271000019', unidadMedida: 'CAJA', gravada: true, precioUnitario: 2.5, precioMayorista: 2.1, costoUnitario: 1.2, stockActual: 320, unidadesPorPresentacion: 100 },
  { id: 2, nombre: 'Amoxicilina 500mg', codigoBarra: '7751271000026', unidadMedida: 'CAJA', gravada: true, precioUnitario: 6.0, precioMayorista: 5.2, costoUnitario: 4.5, stockActual: 18, unidadesPorPresentacion: 50 },
  { id: 3, nombre: 'Ibuprofeno 400mg', codigoBarra: '7751271000033', unidadMedida: 'CAJA', gravada: true, precioUnitario: 2.8, precioMayorista: 2.3, costoUnitario: 1.5, stockActual: 150, unidadesPorPresentacion: 100 },
];

export default function GenerarCompraPage() {
  const router = useRouter();
  const { empleado, cargando: cargandoSesion } = useSession();

  // Cabecera
  const [comprobante, setComprobante] = useState("");
  const [serie, setSerie] = useState("");
  const [numero, setNumero] = useState("");
  const [fechaEmision, setFechaEmision] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  // Proveedores
  const [proveedoresDB, setProveedoresDB] = useState<Proveedor[]>([]);
  const [proveedorQuery, setProveedorQuery] = useState("");
  const [opcionesProveedor, setOpcionesProveedor] = useState<Proveedor[]>([]);
  const [mostrarOpcionesProveedor, setMostrarOpcionesProveedor] = useState(false);
  const [proveedor, setProveedor] = useState<Proveedor | null>(null);
  const [modalProveedorAbierto, setModalProveedorAbierto] = useState(false);

  const [precioIncluyeIgv, setPrecioIncluyeIgv] = useState(true);
  const [codigoBarra, setCodigoBarra] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const [detalles, setDetalles] = useState<DetalleCompraItem[]>([]);

  // Modales de productos
  const [modalCompraProductoAbierto, setModalCompraProductoAbierto] = useState(false);
  const [modalCrearProductoAbierto, setModalCrearProductoAbierto] = useState(false);

  const [tipoPago, setTipoPago] = useState("Contado");
  const [medioPago, setMedioPago] = useState("Efectivo");

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarProveedores = async () => {
    try {
      const data = await proveedorApi.listar();
      setProveedoresDB(data);
    } catch (e) {
      console.error("Error al cargar proveedores:", e);
    }
  };

  useEffect(() => {
    cargarProveedores();
  }, []);

  useEffect(() => {
    const q = proveedorQuery.trim().toLowerCase();
    if (q.length < 2 || proveedor) {
      setOpcionesProveedor([]);
      return;
    }

    const filtrados = proveedoresDB
      .filter((p) => {
        const nombreMatch = p.nombres?.toLowerCase().includes(q);
        const docMatch = p.numeroDocumento?.toLowerCase().includes(q);
        return nombreMatch || docMatch;
      })
      .slice(0, 8);

    setOpcionesProveedor(filtrados);
  }, [proveedorQuery, proveedoresDB, proveedor]);

  const { subtotal, igv, total } = useMemo(() => {
    let baseGravada = 0;
    let igvCalc = 0;
    let baseNoGravada = 0;

    for (const d of detalles) {
      if (d.afectacionIgv === "GRAVADO_ONEROSO") {
        if (precioIncluyeIgv) {
          const base = d.importe / (1 + IGV_RATE);
          baseGravada += base;
          igvCalc += d.importe - base;
        } else {
          baseGravada += d.importe;
          igvCalc += d.importe * IGV_RATE;
        }
      } else {
        baseNoGravada += d.importe;
      }
    }

    const subtotalCalc = baseGravada + baseNoGravada;
    const totalCalc = subtotalCalc + igvCalc;
    return {
      subtotal: Number(subtotalCalc.toFixed(2)),
      igv: Number(igvCalc.toFixed(2)),
      total: Number(totalCalc.toFixed(2)),
    };
  }, [detalles, precioIncluyeIgv]);

  const pagar = total;

  function eliminarDetalle(key: string) {
    setDetalles((prev) => prev.filter((d) => d.key !== key));
  }

  const handleBuscarPorCodigoBarra = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !codigoBarra.trim()) return;
    
    setError(null);
    const prod = PRODUCTOS_MOCK.find((p) => p.codigoBarra === codigoBarra.trim());

    if (prod) {
      setDetalles((prev) => [
        ...prev,
        {
          key: crypto.randomUUID(),
          idProducto: prod.id,
          nombreProducto: prod.nombre,
          tipoPrecio: "MAYORISTA",
          afectacionIgv: prod.gravada ? "GRAVADO_ONEROSO" : "INAFECTO",
          unidadMedida: prod.unidadMedida,
          cantidad: 1,
          precioUnitario: prod.costoUnitario ?? prod.precioMayorista,
          importe: prod.costoUnitario ?? prod.precioMayorista,
        },
      ]);
      setCodigoBarra("");
    } else {
      setError("No se encontró producto con ese código de barras.");
    }
  };

  async function handleGuardar() {
    setError(null);

    if (!comprobante || !serie || !numero || !fechaEmision) {
      setError("Completa comprobante, serie, número y fecha de emisión");
      return;
    }
    if (!proveedor) {
      setError("Selecciona un proveedor");
      return;
    }
    if (detalles.length === 0) {
      setError("Agrega al menos un producto");
      return;
    }

    const itemsDTO: ItemCompraRequestDTO[] = detalles.map((d) => ({
      idProducto: d.idProducto,
      lote: d.lote,
      fechaVencimiento: d.fechaVencimiento,
      unidadMedida: d.unidadMedida,
      cantidad: d.cantidad,
      precioUnitario: d.precioUnitario,
    }));

    const payload: CompraRequestDTO = {
      comprobante,
      serie,
      numero,
      fechaEmision,
      regularizar: false,
      idProveedor: proveedor.id,
      idEmpleado: empleado?.id ?? 1,
      precioIncluyeIgv,
      descripcion: descripcion || undefined,
      percepcion: 0,
      tipoPago,
      medioPago,
      items: itemsDTO,
    };

    setGuardando(true);
    try {
      await comprasApi.crear(payload);
      router.push("/dashboard/compras");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar la compra");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] gap-3 overflow-hidden">
      {/* Header Fijo superior */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/compras"
            className="p-1.5 rounded-xl text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-xl font-bold text-primary tracking-tight">Ingresar Compra</h1>
        </div>
      </div>

      {/* Contenedor Principal flexible */}
      <div className="flex-1 flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs overflow-hidden">
        <div className="space-y-3 overflow-y-auto pr-1">
          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 font-medium">
              {error}
            </p>
          )}

          {/* Fila 1 - Comprobante / Datos Básicos / Método de Pago */}
          <div className="grid grid-cols-12 items-end gap-3">
            <div className="col-span-12 sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-zinc-600">Comprobante*</label>
              <select
                value={comprobante}
                onChange={(e) => setComprobante(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 py-1.5 px-3 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">Selec.</option>
                {COMPROBANTES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-6 sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-zinc-600">Serie*</label>
              <input
                value={serie}
                onChange={(e) => setSerie(e.target.value)}
                placeholder="F001"
                className="w-full rounded-xl border border-zinc-200 py-1.5 px-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="col-span-6 sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-zinc-600">Número*</label>
              <input
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="00000001"
                className="w-full rounded-xl border border-zinc-200 py-1.5 px-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="col-span-8 sm:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-zinc-600">Fecha Emisión*</label>
              <input
                type="date"
                value={fechaEmision}
                onChange={(e) => setFechaEmision(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 py-1.5 px-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="col-span-4 sm:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-zinc-600">Método de Pago</label>
              <div className="flex gap-1.5">
                <select
                  value={tipoPago}
                  onChange={(e) => setTipoPago(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 py-1.5 px-3 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="Contado">Contado</option>
                  <option value="Credito">Crédito</option>
                </select>
                <select
                  value={medioPago}
                  onChange={(e) => setMedioPago(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 py-1.5 px-3 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Tarjeta">Tarjeta</option>
                </select>
              </div>
            </div>
          </div>

          {/* Fila 2 - Proveedor & Acciones de Producto */}
          <div className="grid grid-cols-12 items-end gap-3">
            <div className="relative col-span-12 lg:col-span-4">
              <label className="mb-1 block text-xs font-semibold text-zinc-600">Proveedor*</label>
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <input
                    value={proveedor ? proveedor.nombres : proveedorQuery}
                    onChange={(e) => {
                      setProveedor(null);
                      setProveedorQuery(e.target.value);
                      setMostrarOpcionesProveedor(true);
                    }}
                    onFocus={() => setMostrarOpcionesProveedor(true)}
                    placeholder="Buscar RUC o Razon Social..."
                    className="w-full rounded-xl border border-zinc-200 py-1.5 px-3 text-sm focus:border-primary focus:outline-none"
                  />
                  {mostrarOpcionesProveedor && opcionesProveedor.length > 0 && !proveedor && (
                    <ul className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-zinc-200 bg-white shadow-lg divide-y divide-zinc-100">
                      {opcionesProveedor.map((p) => (
                        <li
                          key={p.id}
                          onClick={() => {
                            setProveedor(p);
                            setMostrarOpcionesProveedor(false);
                          }}
                          className="cursor-pointer px-3 py-2 text-sm hover:bg-zinc-50 transition-colors"
                        >
                          <p className="font-semibold text-zinc-800">{p.nombres}</p>
                          <p className="text-xs text-zinc-400 font-mono">{p.numeroDocumento}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setModalProveedorAbierto(true)}
                  className="rounded-xl bg-primary px-2.5 py-1.5 text-white hover:bg-primary-dark transition-colors shrink-0 flex items-center justify-center cursor-pointer"
                  title="Nuevo proveedor"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <div className="col-span-6 lg:col-span-2 flex items-center gap-2 pb-1.5">
              <input
                type="checkbox"
                id="chk-igv"
                checked={precioIncluyeIgv}
                onChange={(e) => setPrecioIncluyeIgv(e.target.checked)}
                className="h-4 w-4 accent-primary rounded cursor-pointer"
              />
              <div>
                <label htmlFor="chk-igv" className="text-xs font-semibold text-zinc-600 cursor-pointer">
                  Incluye IGV
                </label>
              </div>
            </div>

            <div className="col-span-6 lg:col-span-2">
              <div className="relative">
                <input
                  value={codigoBarra}
                  onChange={(e) => setCodigoBarra(e.target.value)}
                  onKeyDown={handleBuscarPorCodigoBarra}
                  placeholder="Código Barra"
                  className="w-full rounded-xl border border-zinc-200 py-1.5 pl-8 pr-2 text-sm focus:border-primary focus:outline-none"
                />
                <Barcode className="absolute left-2 top-2 text-zinc-400" size={16} />
              </div>
            </div>

            {/* BOTONES DE AGREGAR Y CREAR PRODUCTO */}
            <div className="col-span-12 lg:col-span-4 flex gap-2">
              <button
                type="button"
                onClick={() => setModalCompraProductoAbierto(true)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary py-1.5 px-2 text-xs font-semibold text-white hover:bg-primary-dark transition-colors cursor-pointer"
              >
                <ShoppingCart size={15} /> AGREGAR PROD
              </button>
              <button
                type="button"
                onClick={() => setModalCrearProductoAbierto(true)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-primary text-primary hover:bg-primary/5 py-1.5 px-2 text-xs font-semibold transition-colors cursor-pointer"
              >
                <PackagePlus size={15} /> NUEVO PROD
              </button>
            </div>
          </div>

          {/* Fila 3 - Descripción */}
          <div>
            <input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Observación o detalle general de la compra..."
              className="w-full rounded-xl border border-zinc-200 py-1.5 px-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          {/* TABLA CON TAMAÑO FIJO Y SCROLL INTERNO */}
          <div className="rounded-xl border border-zinc-200 overflow-hidden">
            <div className="h-56 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-zinc-100 shadow-xs">
                  <tr className="border-b border-zinc-200 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    <th className="px-3 py-2">Descripción</th>
                    <th className="px-3 py-2">Lote</th>
                    <th className="px-3 py-2">F. Venc.</th>
                    <th className="px-3 py-2">U.M</th>
                    <th className="px-3 py-2">Cant</th>
                    <th className="px-3 py-2">P.U</th>
                    <th className="px-3 py-2">Importe</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-white">
                  {detalles.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-16 text-center text-zinc-400 text-xs">
                        Aún no has agregado productos a la compra
                      </td>
                    </tr>
                  ) : (
                    detalles.map((d) => (
                      <tr key={d.key} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-3 py-2 font-medium text-zinc-800 text-xs">{d.nombreProducto}</td>
                        <td className="px-3 py-2 text-zinc-600 text-xs">{d.lote ?? "-"}</td>
                        <td className="px-3 py-2 text-zinc-600 text-xs">{d.fechaVencimiento ?? "-"}</td>
                        <td className="px-3 py-2 text-zinc-600 text-xs">{d.unidadMedida}</td>
                        <td className="px-3 py-2 font-semibold text-zinc-800 text-xs">{d.cantidad}</td>
                        <td className="px-3 py-2 text-zinc-600 text-xs">S/ {d.precioUnitario.toFixed(2)}</td>
                        <td className="px-3 py-2 font-semibold text-zinc-800 text-xs">S/ {d.importe.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => eliminarDetalle(d.key)}
                            className="text-zinc-400 hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FOOTER: Totales y Botón Guardar */}
        <div className="pt-3 border-t border-zinc-100 shrink-0 space-y-3">
          <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-xl border border-zinc-200/80">
            <div className="flex items-center gap-8">
              <div>
                <p className="text-[11px] font-semibold text-zinc-400">SUBTOTAL</p>
                <p className="text-sm font-bold text-zinc-700">S/ {subtotal.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-zinc-400">IGV</p>
                <p className="text-sm font-bold text-zinc-700">S/ {igv.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-zinc-400">TOTAL</p>
                <p className="text-sm font-bold text-zinc-700">S/ {total.toFixed(2)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold text-primary">A PAGAR</p>
              <p className="text-base font-black text-primary">S/ {pagar.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handleGuardar}
              disabled={guardando || cargandoSesion}
              className="w-full sm:w-auto rounded-xl bg-primary px-8 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-dark transition-all disabled:opacity-50 cursor-pointer"
            >
              {guardando ? "GUARDANDO..." : "GUARDAR COMPRA"}
            </button>
          </div>
        </div>
      </div>

      {/* Modales */}
      <CompraProductoModal
        open={modalCompraProductoAbierto}
        onClose={() => setModalCompraProductoAbierto(false)}
        onAgregar={(item) => setDetalles((prev) => [...prev, item])}
      />

      <CrearProductoModal
        open={modalCrearProductoAbierto}
        producto={null}
        onClose={() => setModalCrearProductoAbierto(false)}
        onSave={async () => {
          setModalCrearProductoAbierto(false);
        }}
      />

      <ProveedorModal
        open={modalProveedorAbierto}
        proveedor={null}
        onClose={() => setModalProveedorAbierto(false)}
        onSave={async () => {
          await cargarProveedores();
          setModalProveedorAbierto(false);
        }}
      />
    </div>
  );
}
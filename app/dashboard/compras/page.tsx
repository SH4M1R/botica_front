"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Eye, Ban, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { comprasApi } from "@/api/compra";
import type { Compra } from "@/api/compra";
import { useSession } from "@/hooks/useSession";
import CompraDetalleModal from "./components/CompraDetalleModal"

function claveDia(fecha: string) {
  return fecha.slice(0, 10);
}

function formatFechaLarga(claveDiaStr: string) {
  const [anio, mes, dia] = claveDiaStr.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  const texto = fecha.toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatComprobante(c: Compra) {
  return `${c.comprobante} ${c.serie}-${c.numero}`;
}

export default function ComprasPage() {
  const { empleado, cargando: cargandoSesion } = useSession();
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [compraDetalle, setCompraDetalle] = useState<Compra | null>(null);

  const [paginaDia, setPaginaDia] = useState(0);

  const cargarCompras = async () => {
    setLoading(true);
    try {
      const data = await comprasApi.listar();
      setCompras(
        data.sort(
          (a, b) => new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime()
        )
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCompras();
  }, []);

  const handleAnular = async (compra: Compra) => {
    if (!confirm(`¿Anular la compra #${String(compra.id).padStart(6, "0")}? El stock se revertirá.`))
      return;
    await comprasApi.anular(compra.id);
    await cargarCompras();
  };

  const esAdministrador = empleado?.rol === "Administrador";

  const comprasVisibles = useMemo(() => {
    if (cargandoSesion || !empleado) return [];
    if (esAdministrador) return compras;
    return compras.filter((c) => c.empleado?.id === empleado.id);
  }, [compras, empleado, cargandoSesion, esAdministrador]);

  const gruposPorDia = useMemo(() => {
    const mapa = new Map<string, Compra[]>();
    for (const c of comprasVisibles) {
      const clave = claveDia(c.fechaRegistro);
      if (!mapa.has(clave)) mapa.set(clave, []);
      mapa.get(clave)!.push(c);
    }
    return Array.from(mapa.entries());
  }, [comprasVisibles]);

  const totalPaginas = gruposPorDia.length;
  const paginaValida = Math.min(Math.max(0, paginaDia), Math.max(0, totalPaginas - 1));
  const grupoActual = gruposPorDia[paginaValida];

  const handleSeleccionarFecha = (fechaInput: string) => {
    if (!fechaInput) return;
    const index = gruposPorDia.findIndex(([clave]) => clave === fechaInput);
    if (index !== -1) {
      setPaginaDia(index);
    } else {
      alert("No se encontraron compras registradas para la fecha seleccionada.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Compras</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {esAdministrador
              ? "Historial de compras registradas."
              : "Historial de tus compras registradas."}
          </p>
        </div>
        <Link
          href="/dashboard/compras/generar"
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl shadow-xs hover:shadow-md transition-all"
        >
          <Plus size={18} /> Ingresar Compra
        </Link>
      </div>

      {loading || cargandoSesion ? (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs py-16 text-center text-sm text-zinc-400">
          Cargando compras...
        </div>
      ) : comprasVisibles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs py-16 text-center text-sm text-zinc-400">
          {esAdministrador ? "Aún no hay compras registradas." : "Aún no has registrado compras."}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-zinc-200 shadow-xs">
            <button
              onClick={() => setPaginaDia((prev) => Math.min(totalPaginas - 1, prev + 1))}
              disabled={paginaValida >= totalPaginas - 1}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              title="Día anterior"
            >
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">Día anterior</span>
            </button>

            <div className="flex items-center gap-2 text-center">
              <div
                className="relative flex items-center justify-center p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer group"
                title="Seleccionar fecha"
              >
                <Calendar size={18} />
                <input
                  type="date"
                  value={grupoActual ? grupoActual[0] : ""}
                  onChange={(e) => handleSeleccionarFecha(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-800">
                  {grupoActual ? formatFechaLarga(grupoActual[0]) : ""}
                </p>
              </div>
            </div>

            <button
              onClick={() => setPaginaDia((prev) => Math.max(0, prev - 1))}
              disabled={paginaValida === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              title="Día siguiente / más reciente"
            >
              <span className="hidden sm:inline">Día siguiente</span>
              <ChevronRight size={16} />
            </button>
          </div>

          {grupoActual &&
            (() => {
              const [, comprasDelDia] = grupoActual;

              return (
                <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 bg-zinc-50 border-b border-zinc-200">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                      Resumen del día
                    </span>
                  </div>

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-100 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">
                        <th className="px-5 py-2.5">N° Compra</th>
                        <th className="px-5 py-2.5">Proveedor</th>
                        <th className="px-5 py-2.5">Comprobante</th>
                        {esAdministrador && <th className="px-5 py-2.5">Registrado por</th>}
                        <th className="px-5 py-2.5">Tipo Pago</th>
                        <th className="px-5 py-2.5 text-right">Pagar</th>
                        <th className="px-5 py-2.5">Estado</th>
                        <th className="px-5 py-2.5 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {comprasDelDia.map((c) => (
                        <tr key={c.id} className="hover:bg-zinc-50/60 transition-colors">
                          <td className="px-5 py-3 font-mono text-zinc-600">
                            #{String(c.id).padStart(6, "0")}
                          </td>
                          <td className="px-5 py-3 font-medium text-zinc-800">
                            {c.proveedor?.nombres ?? "No registrado"}
                          </td>
                          <td className="px-5 py-3 text-zinc-600">{formatComprobante(c)}</td>
                          {esAdministrador && (
                            <td className="px-5 py-3 text-zinc-600">
                              {c.empleado?.nombre ?? "—"}
                            </td>
                          )}
                          <td className="px-5 py-3 font-medium text-zinc-700">{c.tipoPago}</td>
                          <td className="px-5 py-3 text-right font-medium text-zinc-800">
                            S/ {c.pagar.toFixed(2)}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                c.estado ? "bg-primary/10 text-primary" : "bg-zinc-100 text-zinc-400"
                              }`}
                            >
                              {c.estado ? "Válida" : "Anulada"}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => setCompraDetalle(c)}
                                className="p-2 text-zinc-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                title="Ver detalle"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => handleAnular(c)}
                                disabled={!c.estado}
                                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400"
                                title="Anular compra"
                              >
                                <Ban size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
        </div>
      )}

      <CompraDetalleModal compra={compraDetalle} onClose={() => setCompraDetalle(null)} />
    </div>
  );
}
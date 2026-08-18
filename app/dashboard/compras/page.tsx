"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Eye, Ban } from "lucide-react";
import { comprasApi } from "@/api/compra";
import type { Compra } from "@/api/compra";
import { useSession } from "@/hooks/useSession";
import CompraDetalleModal from "./components/CompraDetalleModal";
import Paginacion from "@/components/Paginacion";
import AnularModal from "@/components/AnularModal";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

function formatComprobante(c: Compra) {
  return `${c.comprobante} ${c.serie}-${c.numero}`;
}

function formatFecha(fechaStr: string) {
  if (!fechaStr) return "—";
  const [anio, mes, dia] = fechaStr.slice(0, 10).split("-").map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  return fecha.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ComprasPage() {
  const { empleado, cargando: cargandoSesion } = useSession();
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [compraDetalle, setCompraDetalle] = useState<Compra | null>(null);
  const [compraAAnular, setCompraAAnular] = useState<Compra | null>(null);

  // Paginación estándar de la tabla
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);

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

  const handleAnular = (compra: Compra) => {
    setCompraAAnular(compra);
  };

  const confirmarAnulacion = async () => {
    if (!compraAAnular) return;
    await comprasApi.anular(compraAAnular.id);
    await cargarCompras();
  };

  const esAdministrador = empleado?.rol === "Administrador";

  const comprasVisibles = useMemo(() => {
    if (cargandoSesion || !empleado) return [];
    if (esAdministrador) return compras;
    return compras.filter((c) => c.empleado?.id === empleado.id);
  }, [compras, empleado, cargandoSesion, esAdministrador]);

  // Cálculos de paginación
  const totalItems = comprasVisibles.length;
  const totalPaginas = Math.ceil(totalItems / pageSize) || 1;
  const paginaSegura = Math.min(Math.max(currentPage, 1), totalPaginas);

  const itemsPaginados = useMemo(() => {
    return comprasVisibles.slice(
      (paginaSegura - 1) * pageSize,
      paginaSegura * pageSize
    );
  }, [comprasVisibles, paginaSegura, pageSize]);

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
          className="flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-semibold rounded-lg shadow-xs transition-all"
        >
          <Plus size={14} /> Ingresar Compra
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
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
          <table className="w-full text-sm">
            <colgroup>
              <col style={{ width: "10%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: esAdministrador ? "20%" : "30%" }} />
              <col style={{ width: "15%" }} />
              {esAdministrador && <col style={{ width: "10%" }} />}
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "10%" }} />
            </colgroup>
            <thead>
              <tr className="bg-primary/10 border-b border-zinc-200 text-left text-xs font-bold text-primary uppercase tracking-wider">
                <th className="px-5 py-3">N° COMPRA</th>
                <th className="px-5 py-3">FECHA</th>
                <th className="px-5 py-3">PROVEEDOR</th>
                <th className="px-5 py-3">COMPROBANTE</th>
                {esAdministrador && <th className="px-5 py-3">REGISTRADO POR</th>}
                <th className="px-5 py-3">TIPO PAGO</th>
                <th className="px-5 py-3 text-right">PAGAR</th>
                <th className="px-5 py-3">ESTADO</th>
                <th className="px-5 py-3 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {itemsPaginados.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50/60 transition-colors">
                  <td className="px-5 py-3 font-mono text-zinc-600">
                    #{String(c.id).padStart(6, "0")}
                  </td>
                  <td className="px-5 py-3 text-zinc-600">
                    {formatFecha(c.fechaEmision || c.fechaRegistro)}
                  </td>
                  <td className="px-5 py-3 font-medium text-zinc-800">
                    {c.proveedor?.nombres ?? "No registrado"}
                  </td>
                  <td className="px-5 py-3 text-primary font-bold">{formatComprobante(c)}</td>
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
                        className="p-2 text-green-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors border-2"
                        title="Ver detalle"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleAnular(c)}
                        disabled={!c.estado}
                        className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border-2 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400"
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

          {comprasVisibles.length > 0 && (
            <Paginacion
              currentPage={paginaSegura}
              totalPages={totalPaginas}
              pageSize={pageSize}
              totalItems={totalItems}
              itemLabel="compras"
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          )}
        </div>
      )}

      <CompraDetalleModal compra={compraDetalle} onClose={() => setCompraDetalle(null)} />

      <AnularModal
        isOpen={!!compraAAnular}
        onClose={() => setCompraAAnular(null)}
        onConfirm={confirmarAnulacion}
        titulo="Anular compra"
        mensaje={`¿Anular la compra #${String(compraAAnular?.id ?? '').padStart(6, '0')}? El stock se revertirá.`}
        errorMensajeDefault="Ocurrió un error al intentar anular esta compra."
      />
    </div>
  );
}
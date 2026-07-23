"use client";

import { X } from "lucide-react";
import type { Compra } from "@/api/compra";

interface CompraDetalleModalProps {
  compra: Compra | null;
  onClose: () => void;
}

export default function CompraDetalleModal({ compra, onClose }: CompraDetalleModalProps) {
  if (!compra) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between rounded-t-2xl bg-primary px-5 py-4">
          <h2 className="text-lg font-semibold text-white">
            Compra #{String(compra.id).padStart(6, "0")}
          </h2>
          <button onClick={onClose} className="text-white hover:text-white/80">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-zinc-400">Proveedor</p>
              <p className="font-medium text-zinc-800">{compra.proveedor?.nombres}</p>
            </div>
            <div>
              <p className="text-zinc-400">Comprobante</p>
              <p className="font-medium text-zinc-800">
                {compra.comprobante} {compra.serie}-{compra.numero}
              </p>
            </div>
            <div>
              <p className="text-zinc-400">Fecha Emisión</p>
              <p className="font-medium text-zinc-800">{compra.fechaEmision}</p>
            </div>
            <div>
              <p className="text-zinc-400">Registrado por</p>
              <p className="font-medium text-zinc-800">{compra.empleado?.nombre ?? "—"}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 text-left text-xs font-bold uppercase text-zinc-400">
                  <th className="px-3 py-2">Producto</th>
                  <th className="px-3 py-2">Lote</th>
                  <th className="px-3 py-2">Cant</th>
                  <th className="px-3 py-2">P.U</th>
                  <th className="px-3 py-2">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {compra.detalles.map((d) => (
                  <tr key={d.id}>
                    <td className="px-3 py-2">{d.producto?.nombre}</td>
                    <td className="px-3 py-2">{d.lote ?? "-"}</td>
                    <td className="px-3 py-2">{d.cantidad}</td>
                    <td className="px-3 py-2">{d.precioUnitario.toFixed(2)}</td>
                    <td className="px-3 py-2">{d.importe.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-zinc-400">Subtotal</p>
              <p className="font-bold text-zinc-800">S/ {compra.subtotal.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-zinc-400">IGV</p>
              <p className="font-bold text-zinc-800">S/ {compra.igv.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-zinc-400">Percepción</p>
              <p className="font-bold text-zinc-800">S/ {(compra.percepcion ?? 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-zinc-400">Pagar</p>
              <p className="font-bold text-primary">S/ {compra.pagar.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
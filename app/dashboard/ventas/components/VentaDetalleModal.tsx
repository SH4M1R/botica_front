'use client';

import { X } from 'lucide-react';
import type { Venta } from '@/api/ventas';
import { getNombreCompleto } from '@/api/ventas';

interface VentaDetalleModalProps {
  venta: Venta | null;
  onClose: () => void;
}

export default function VentaDetalleModal({ venta, onClose }: VentaDetalleModalProps) {
  if (!venta) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <h2 className="text-lg font-bold text-zinc-800">
            Venta #{String(venta.id).padStart(6, '0')}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-xs text-zinc-400 block">Cliente</span>
              <span className="font-medium text-zinc-800">{venta.cliente ? getNombreCompleto(venta.cliente) : 'No registrado'}</span>
            </div>
            <div>
              <span className="text-xs text-zinc-400 block">Fecha</span>
              <span className="font-medium text-zinc-800">{new Date(venta.fecha).toLocaleString('es-PE')}</span>
            </div>
            <div>
              <span className="text-xs text-zinc-400 block">Empleado</span>
              <span className="font-medium text-zinc-800">{venta.empleado?.nombre}</span>
            </div>
            <div>
              <span className="text-xs text-zinc-400 block">Método de pago</span>
              <span className="font-medium text-zinc-800">{venta.metodoPago}</span>
            </div>
          </div>

          <div className="border border-zinc-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 text-xs font-bold text-zinc-400 uppercase">
                  <th className="text-left px-3 py-2">Producto</th>
                  <th className="text-right px-3 py-2">Cant.</th>
                  <th className="text-right px-3 py-2">P. Unit.</th>
                  <th className="text-right px-3 py-2">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {venta.detalles.map((d) => (
                  <tr key={d.id}>
                    <td className="px-3 py-2 text-zinc-700">{d.producto.nombre}</td>
                    <td className="px-3 py-2 text-right text-zinc-600">{d.cantidad}</td>
                    <td className="px-3 py-2 text-right text-zinc-600">S/ {d.precioUnitario.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-medium text-zinc-800">S/ {d.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <span className="text-sm font-bold text-zinc-800">Total: S/ {venta.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
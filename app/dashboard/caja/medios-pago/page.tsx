'use client';

import { useEffect, useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { arqueoApi, type ArqueoCaja } from '@/api/arqueo';
import { ventasApi, type Venta, METODOS_PAGO } from '@/api/ventas';
import { productosApi, type Producto as ProductoCatalogo } from '@/api/productos';
import {
  generarReporteMetodoPagoPos80,
  generarReporteMetodoPagoA4,
  type FilaMetodoPago,
} from '@/utils/generarReporteMetodoPago';

type FormatoImpresion = 'pos80' | 'a4';

export default function MedioDePagoPage() {
  const { empleado, cargando: cargandoSesion } = useSession();

  const [cajaAbierta, setCajaAbierta] = useState<ArqueoCaja | null | undefined>(undefined);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [costosPorProductoId, setCostosPorProductoId] = useState<Map<number, number>>(new Map());
  const [cargando, setCargando] = useState(true);
  const [formato, setFormato] = useState<FormatoImpresion>('pos80');
  const [error, setError] = useState('');

  useEffect(() => {
    const cargar = async () => {
      if (cargandoSesion || !empleado?.id) return;
      setCargando(true);
      setError('');
      try {
        const [actual, productos] = await Promise.all([
          arqueoApi.cajaActual(empleado.id),
          productosApi.listar(),
        ]);

        const mapaCostos = new Map<number, number>();
        productos.forEach((p: ProductoCatalogo) => mapaCostos.set(p.id, p.precio_costo ?? 0));
        setCostosPorProductoId(mapaCostos);

        if (!actual) {
          setCajaAbierta(null);
          setVentas([]);
          return;
        }
        setCajaAbierta(actual);

        const todasVentas = await ventasApi.listar();
        const inicioCaja = new Date(actual.fechaInicio);

        const propias = todasVentas.filter(
          (v) => v.estado && v.empleado.id === empleado.id && new Date(v.fecha) >= inicioCaja
        );
        setVentas(propias);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar la información de la caja.');
        setCajaAbierta(null);
        setVentas([]);
      } finally {
        setCargando(false);
      }
    };

    cargar();
  }, [empleado?.id, cargandoSesion]);

  const { filas, totales } = useMemo(() => {
    const acumulado = new Map<string, FilaMetodoPago>();
    METODOS_PAGO.forEach((m) => acumulado.set(m, { metodo: m, cantidadVentas: 0, totalVendido: 0, ganancia: 0 }));

    ventas.forEach((v) => {
      const fila = acumulado.get(v.metodoPago) ?? { metodo: v.metodoPago, cantidadVentas: 0, totalVendido: 0, ganancia: 0 };

      const gananciaVenta = v.detalles.reduce((sum, d) => {
        const costoUnitario = costosPorProductoId.get(d.producto.id) ?? 0;
        return sum + (d.subtotal - costoUnitario * d.cantidad);
      }, 0);

      fila.cantidadVentas += 1;
      fila.totalVendido += v.total;
      fila.ganancia += gananciaVenta;

      acumulado.set(v.metodoPago, fila);
    });

    const filasFinal = Array.from(acumulado.values());
    const totalesFinal: FilaMetodoPago = filasFinal.reduce(
      (acc, f) => ({
        metodo: 'TOTAL',
        cantidadVentas: acc.cantidadVentas + f.cantidadVentas,
        totalVendido: acc.totalVendido + f.totalVendido,
        ganancia: acc.ganancia + f.ganancia,
      }),
      { metodo: 'TOTAL', cantidadVentas: 0, totalVendido: 0, ganancia: 0 }
    );

    return { filas: filasFinal, totales: totalesFinal };
  }, [ventas, costosPorProductoId]);

  const handleImprimir = () => {
    if (!cajaAbierta) return;
    const blob =
      formato === 'pos80'
        ? generarReporteMetodoPagoPos80(cajaAbierta, filas, totales)
        : generarReporteMetodoPagoA4(cajaAbierta, filas, totales);

    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Ganancias por Método de Pago</h1>
          {cajaAbierta && (
            <p className="text-sm text-zinc-500 mt-1">
              Caja actual: <span className="font-semibold text-primary">{cajaAbierta.numero}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={formato}
            onChange={(e) => setFormato(e.target.value as FormatoImpresion)}
            disabled={!cajaAbierta}
            className="px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm font-semibold text-zinc-600 outline-none focus:border-primary transition-all disabled:opacity-40"
          >
            <option value="pos80">Formato POS-80</option>
            <option value="a4">Formato A4</option>
          </select>

          <button
            onClick={handleImprimir}
            disabled={!cajaAbierta}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-xs hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Printer size={16} />
            Imprimir reporte
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-zinc-200 p-5 space-y-4">
        {cargando && <p className="text-center text-zinc-400 py-6">Cargando...</p>}

        {!cargando && error && <p className="text-sm text-red-500 font-medium">{error}</p>}

        {!cargando && !error && cajaAbierta === null && (
          <p className="text-center text-zinc-400 py-6">
            No tienes una caja abierta. Abre tu caja para ver el reporte de ganancias por método de pago.
          </p>
        )}

        {!cargando && !error && cajaAbierta && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-wide text-zinc-400 border-b border-zinc-200">
                  <th className="py-2 px-2">Método de Pago</th>
                  <th className="py-2 px-2 text-right">N° Ventas</th>
                  <th className="py-2 px-2 text-right">Total Vendido</th>
                  <th className="py-2 px-2 text-right">Ganancia</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => (
                  <tr key={fila.metodo} className="border-b border-zinc-100 hover:bg-zinc-50">
                    <td className="py-2 px-2 font-semibold text-zinc-700">{fila.metodo}</td>
                    <td className="py-2 px-2 text-right">{fila.cantidadVentas}</td>
                    <td className="py-2 px-2 text-right">S/ {fila.totalVendido.toFixed(2)}</td>
                    <td className="py-2 px-2 text-right font-semibold text-green-600">
                      S/ {fila.ganancia.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-zinc-200 font-bold text-zinc-800">
                  <td className="py-3 px-2">TOTAL</td>
                  <td className="py-3 px-2 text-right">{totales.cantidadVentas}</td>
                  <td className="py-3 px-2 text-right">S/ {totales.totalVendido.toFixed(2)}</td>
                  <td className="py-3 px-2 text-right text-green-700">S/ {totales.ganancia.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
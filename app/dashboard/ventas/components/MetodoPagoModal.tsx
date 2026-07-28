'use client';

import { useState } from 'react';
import { X, Banknote, CreditCard, Landmark, QrCode, HandCoins, Check, Trash2 } from 'lucide-react';

export interface PagoParte {
  metodo: string;
  monto: number;
  detalle: string;
}

interface MetodoPagoModalProps {
  open: boolean;
  total: number;
  tieneCliente: boolean;
  onClose: () => void;
  onConfirmarVenta: (pagos: PagoParte[]) => Promise<void>;
}

const METODOS = [
  { key: 'Efectivo', label: 'Efectivo', icon: Banknote },
  { key: 'Izipay', label: 'Izipay', icon: CreditCard },
  { key: 'Transferencia', label: 'Transferencia', icon: Landmark },
  { key: 'Yape/Plin', label: 'Yape / Plin', icon: QrCode },
  { key: 'Crédito', label: 'Sacar Crédito', icon: HandCoins },
];

const EPS = 0.009;

export default function MetodoPagoModal({ open, total, tieneCliente, onClose, onConfirmarVenta }: MetodoPagoModalProps) {
  const [pagosConfirmados, setPagosConfirmados] = useState<PagoParte[]>([]);
  const [metodoActivo, setMetodoActivo] = useState<string | null>(null);
  const [monto, setMonto] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState(false);

  if (!open) return null;

  const totalPagado = pagosConfirmados.reduce((sum, p) => sum + p.monto, 0);
  const restante = Math.max(0, total - totalPagado);
  const completado = total - totalPagado <= EPS;

  const resetLocal = () => {
    setPagosConfirmados([]);
    setMetodoActivo(null);
    setMonto('');
    setCodigo('');
    setError('');
  };

  const handleClose = () => {
    if (procesando) return;
    resetLocal();
    onClose();
  };

  const seleccionarMetodo = (key: string) => {
    if (completado || pagosConfirmados.some((p) => p.metodo === key)) return;
    setMetodoActivo(key);
    setMonto(restante > 0 ? restante.toFixed(2) : '');
    setCodigo('');
    setError('');
  };

  const cancelarSeleccion = () => {
    setMetodoActivo(null);
    setError('');
  };

  // Cálculos dinámicos en tiempo de ingreso
  const montoIngresado = Number(monto) || 0;
  const vueltoCalculado = Math.max(0, montoIngresado - restante);
  // El monto real cobrado nunca supera el restante actual
  const montoCobrado = Math.min(montoIngresado, restante);

  const agregarParte = () => {
    if (!metodoActivo) return;

    if (!montoIngresado || montoIngresado <= 0) return setError('Ingresa un monto válido.');
    if (metodoActivo === 'Izipay' && !codigo.trim()) return setError('Ingresa el código de boleta de Izipay.');
    if (metodoActivo === 'Crédito' && !tieneCliente) return setError('Debes registrar un cliente para pagar al crédito.');
    
    // Métodos digitales no deberían recibir más del restante
    if (metodoActivo !== 'Efectivo' && montoIngresado > restante + EPS) {
      return setError(`En ${metodoActivo} el monto no puede superar lo restante (S/ ${restante.toFixed(2)}).`);
    }

    let detalle = '';
    if (metodoActivo === 'Efectivo') {
      detalle = vueltoCalculado > 0 
        ? `Recibido S/ ${montoIngresado.toFixed(2)} · Vuelto S/ ${vueltoCalculado.toFixed(2)}`
        : `Pagó S/ ${montoCobrado.toFixed(2)}`;
    } else if (metodoActivo === 'Izipay') {
      detalle = `Código Izipay: ${codigo.trim()}`;
    } else if (metodoActivo === 'Transferencia') {
      detalle = 'Transferencia bancaria';
    } else if (metodoActivo === 'Crédito') {
      detalle = 'Monto agregado a la deuda del cliente';
    } else {
      detalle = '(Yape/Plin)';
    }

    setPagosConfirmados((prev) => [...prev, { metodo: metodoActivo, monto: montoCobrado, detalle }]);
    setMetodoActivo(null);
    setMonto('');
    setCodigo('');
    setError('');
  };

  const quitarParte = (index: number) => {
    setPagosConfirmados((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFinalizar = async () => {
    if (!completado) return setError(`Aún falta cubrir S/ ${restante.toFixed(2)}.`);
    setError('');
    setProcesando(true);
    try {
      await onConfirmarVenta(pagosConfirmados);
      resetLocal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar la venta.');
    } finally {
      setProcesando(false);
    }
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-zinc-800">Método de pago</h2>
          <button onClick={handleClose} disabled={procesando} className="text-zinc-400 hover:text-zinc-600 disabled:opacity-40">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3">
              <p className="text-xs text-zinc-500">Total a pagar</p>
              <p className="text-lg font-bold text-zinc-800">S/ {total.toFixed(2)}</p>
            </div>
            <div className={`rounded-xl px-4 py-3 border ${completado ? 'bg-primary/5 border-primary/20' : 'bg-amber-50 border-amber-200'}`}>
              <p className="text-xs text-zinc-500">{completado ? 'Cubierto' : 'Falta por pagar'}</p>
              <p className={`text-lg font-bold ${completado ? 'text-primary' : 'text-amber-600'}`}>S/ {restante.toFixed(2)}</p>
            </div>
          </div>

          {/* Tabla de pagos ya agregados */}
          {pagosConfirmados.length > 0 && (
            <div className="rounded-xl border border-zinc-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50">
                  <tr className="text-left text-xs font-bold text-zinc-400 uppercase tracking-wide">
                    <th className="px-3 py-2">Método</th>
                    <th className="px-3 py-2 text-right">Monto</th>
                    <th className="px-3 py-2">Detalle</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {pagosConfirmados.map((p, i) => (
                    <tr key={`${p.metodo}-${i}`}>
                      <td className="px-3 py-2 font-semibold text-zinc-700">{p.metodo}</td>
                      <td className="px-3 py-2 text-right text-zinc-800 font-medium">S/ {p.monto.toFixed(2)}</td>
                      <td className="px-3 py-2 text-zinc-500 text-xs">{p.detalle}</td>
                      <td className="px-3 py-2 text-right">
                        {!procesando && (
                          <button type="button" onClick={() => quitarParte(i)} className="text-zinc-400 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Selección de método */}
          {!completado && !metodoActivo && (
            <div>
              <p className="text-xs font-semibold text-zinc-600 mb-2">Selecciona un método de pago</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {METODOS.map(({ key, label, icon: Icon }) => {
                  const yaUsado = pagosConfirmados.some((p) => p.metodo === key);
                  const deshabilitado = (key === 'Crédito' && !tieneCliente) || yaUsado;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => seleccionarMetodo(key)}
                      disabled={deshabilitado}
                      title={
                        key === 'Crédito' && !tieneCliente
                          ? 'Registra un cliente para habilitar esta opción'
                          : yaUsado ? 'Ya utilizado' : undefined
                      }
                      className="flex flex-col items-center gap-2 py-4 rounded-xl border-2 border-zinc-200 text-zinc-500 hover:border-primary hover:text-primary transition-all disabled:opacity-30 disabled:hover:border-zinc-200 disabled:hover:text-zinc-500"
                    >
                      <Icon size={22} />
                      <span className="text-xs font-semibold text-center px-1">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Formulario del método activo */}
          {metodoActivo && (
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-zinc-800">{metodoActivo}</span>
                <button type="button" onClick={cancelarSeleccion} className="text-xs font-semibold text-zinc-400 hover:text-zinc-600">
                  Cambiar método
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600">
                  Monto ingresado / recibido
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  autoFocus
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder={restante.toFixed(2)}
                  className={inputClass}
                />
              </div>

              {/* Indicador visual dinamico de vuelto o pago incompleto */}
              {metodoActivo === 'Efectivo' && montoIngresado > 0 && (
                <div className="text-xs font-semibold pt-1">
                  {vueltoCalculado > 0 ? (
                    <p className="text-emerald-600">
                      Vuelto a entregar: S/ {vueltoCalculado.toFixed(2)} (Se abonará S/ {montoCobrado.toFixed(2)})
                    </p>
                  ) : montoIngresado < restante ? (
                    <p className="text-amber-600">
                      Pago parcial: Quedará un saldo pendiente de S/ {(restante - montoIngresado).toFixed(2)}
                    </p>
                  ) : (
                    <p className="text-primary">Pago exacto</p>
                  )}
                </div>
              )}

              {metodoActivo === 'Izipay' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-600">Código de boleta Izipay</label>
                  <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ej. 000123456" className={inputClass} />
                </div>
              )}

              {metodoActivo === 'Transferencia' && (
                <p className="text-xs text-zinc-500">Confirma cuando el cliente haya realizado la transferencia.</p>
              )}

              {metodoActivo === 'Yape/Plin' && (
                <p className="text-xs text-zinc-500">Confirma cuando el cliente haya completado el pago por QR.</p>
              )}

              {metodoActivo === 'Crédito' && (
                <p className="text-xs text-zinc-500">Este monto se agregará a la deuda del cliente registrado.</p>
              )}

              <button
                type="button"
                onClick={agregarParte}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-xs hover:shadow-md transition-all"
              >
                <Check size={16} /> Agregar pago
              </button>
            </div>
          )}

          {error && <p className="text-xs text-red-500 font-medium text-center">{error}</p>}

          <div className="flex justify-end gap-2 pt-1 border-t border-zinc-100">
            <button onClick={handleClose} disabled={procesando} className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button
              onClick={handleFinalizar}
              disabled={procesando || !completado}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-xs hover:shadow-md transition-all disabled:opacity-40"
            >
              <Check size={16} /> {procesando ? 'Procesando...' : 'Confirmar venta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
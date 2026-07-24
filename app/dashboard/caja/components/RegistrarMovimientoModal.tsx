'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { TipoMovimiento, CategoriaMovimiento } from '@/api/movimientoCaja';

interface RegistrarMovimientoModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: {
    tipo: TipoMovimiento;
    categoria: CategoriaMovimiento;
    descripcion: string;
    monto: number;
  }) => Promise<void>;
}

const CATEGORIAS_INGRESO: { value: CategoriaMovimiento; label: string }[] = [
  { value: 'APORTE_CAPITAL', label: 'Aporte de capital' },
  { value: 'DEVOLUCION', label: 'Devolución recibida' },
  { value: 'OTRO', label: 'Otro' },
];

const CATEGORIAS_EGRESO: { value: CategoriaMovimiento; label: string }[] = [
  { value: 'RETIRO_EFECTIVO', label: 'Retiro de efectivo' },
  { value: 'PAGO_PROVEEDOR', label: 'Pago a proveedor' },
  { value: 'PAGO_SERVICIOS', label: 'Pago de servicios' },
  { value: 'GASTO_VARIO', label: 'Gasto vario' },
  { value: 'DEVOLUCION', label: 'Devolución entregada' },
  { value: 'OTRO', label: 'Otro' },
];

export default function RegistrarMovimientoModal({
  open,
  onClose,
  onConfirm,
}: RegistrarMovimientoModalProps) {
  const [tipo, setTipo] = useState<TipoMovimiento>('EGRESO');
  const [categoria, setCategoria] = useState<CategoriaMovimiento>('RETIRO_EFECTIVO');
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  if (!open) return null;

  const categorias = tipo === 'INGRESO' ? CATEGORIAS_INGRESO : CATEGORIAS_EGRESO;

  const handleTipoChange = (nuevoTipo: TipoMovimiento) => {
    setTipo(nuevoTipo);
    const primera = nuevoTipo === 'INGRESO' ? CATEGORIAS_INGRESO[0] : CATEGORIAS_EGRESO[0];
    setCategoria(primera.value);
  };

  const resetForm = () => {
    setTipo('EGRESO');
    setCategoria('RETIRO_EFECTIVO');
    setDescripcion('');
    setMonto('');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    setError('');
    const montoNum = Number(monto);

    if (!descripcion.trim()) {
      setError('La descripción es obligatoria.');
      return;
    }
    if (!monto || isNaN(montoNum) || montoNum <= 0) {
      setError('Ingresa un monto válido mayor a cero.');
      return;
    }

    setGuardando(true);
    try {
      await onConfirm({ tipo, categoria, descripcion: descripcion.trim(), monto: montoNum });
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el movimiento.');
    } finally {
      setGuardando(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary">Registrar Movimiento</h2>
          <button onClick={handleClose} className="text-zinc-400 hover:text-zinc-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleTipoChange('INGRESO')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tipo === 'INGRESO' ? 'bg-green-500 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            Ingreso
          </button>
          <button
            onClick={() => handleTipoChange('EGRESO')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tipo === 'EGRESO' ? 'bg-red-500 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            Egreso
          </button>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-600">Categoría</label>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as CategoriaMovimiento)}
            className={inputClass}
          >
            {categorias.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-600">Descripción</label>
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej: Retiro para pago de proveedor de insumos"
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-600">Monto (S/)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="0.00"
            className={inputClass}
          />
        </div>

        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={handleClose}
            disabled={guardando}
            className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={guardando}
            className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-xs hover:shadow-md transition-all disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
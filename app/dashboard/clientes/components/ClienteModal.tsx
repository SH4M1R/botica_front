'use client';

import { useEffect, useState } from 'react';
import { X, UserPlus, Search, Loader2 } from 'lucide-react';
import type { Cliente } from '@/api/ventas';
import { clientesApi, getNombreCompleto, splitNombreCompleto } from '@/api/ventas';

interface ClienteModalProps {
  open: boolean;
  cliente: Cliente | null;
  onClose: () => void;
  onSave: (data: { nombres: string; apellidoPaterno?: string; apellidoMaterno?: string; dni?: string; telefono?: string }) => Promise<void>;
}

export default function ClienteModal({ open, cliente, onClose, onSave }: ClienteModalProps) {
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [dni, setDni] = useState('');
  const [telefono, setTelefono] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [buscandoDni, setBuscandoDni] = useState(false);
  const [dniError, setDniError] = useState('');

  useEffect(() => {
    // --- CAMBIO: reconstruye el nombre completo a partir de los 3 campos del backend ---
    setNombreCompleto(cliente ? getNombreCompleto(cliente) : '');
    setDni(cliente?.dni ?? '');
    setTelefono(cliente?.telefono ?? '');
    setError('');
    setDniError('');
  }, [cliente, open]);

  if (!open) return null;

  const handleClose = () => {
    setNombreCompleto(''); setDni(''); setTelefono(''); setError(''); setDniError('');
    onClose();
  };

  const handleBuscarDni = async () => {
    const dniLimpio = dni.trim();
    setDniError('');

    if (dniLimpio.length !== 8) {
      setDniError('El DNI debe tener 8 dígitos.');
      return;
    }

    setBuscandoDni(true);
    try {
      const datos = await clientesApi.consultarDni(dniLimpio);
      setNombreCompleto([datos.nombres, datos.apellidoPaterno, datos.apellidoMaterno].filter(Boolean).join(' '));
    } catch {
      setDniError('No se encontraron datos para ese DNI.');
    } finally {
      setBuscandoDni(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreCompleto.trim()) return setError('El nombre es obligatorio.');

    // --- CAMBIO CLAVE: divide el nombre completo antes de enviarlo al backend ---
    const { nombres, apellidoPaterno, apellidoMaterno } = splitNombreCompleto(nombreCompleto);

    setSaving(true);
    setError('');
    try {
      await onSave({
        nombres,
        apellidoPaterno: apellidoPaterno || undefined,
        apellidoMaterno: apellidoMaterno || undefined,
        dni: dni.trim() || undefined,
        telefono: telefono.trim() || undefined,
      });
      handleClose();
    } catch {
      setError('No se pudo guardar el cliente.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all";
  const labelClass = "text-xs font-semibold text-zinc-600";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
          <div className="flex items-center gap-2">
            <UserPlus size={16} className="text-primary transition-colors duration-300" />
            <h2 className="text-sm font-bold text-zinc-800">{cliente ? 'Editar cliente' : 'Nuevo cliente'}</h2>
          </div>
          <button onClick={handleClose} className="text-zinc-400 hover:text-zinc-600"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div className="space-y-1">
            <label className={labelClass}>DNI</label>
            <div className="flex gap-2">
              <input
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                maxLength={8}
                placeholder="8 dígitos"
                className={inputClass}
              />
              <button
                type="button"
                onClick={handleBuscarDni}
                disabled={buscandoDni || dni.trim().length !== 8}
                title="Buscar datos por DNI"
                className="shrink-0 px-3 py-2 rounded-lg border-2 border-primary/30 text-primary hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {buscandoDni ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              </button>
            </div>
            {dniError && <p className="text-xs text-red-500 font-medium">{dniError}</p>}
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Nombre completo</label>
            <input
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              placeholder="Nombres Apellido Paterno Apellido Materno"
              className={inputClass}
            />
            <p className="text-[11px] text-zinc-400">Se guardará separado en nombres y apellidos.</p>
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Teléfono</label>
            <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Ingreso manual" className={inputClass} />
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={handleClose} className="px-3 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-xs transition-all disabled:opacity-60">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
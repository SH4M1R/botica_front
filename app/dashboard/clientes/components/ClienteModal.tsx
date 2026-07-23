'use client';

import { useEffect, useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import type { Cliente } from '@/api/ventas';

interface ClienteModalProps {
  open: boolean;
  cliente: Cliente | null; // null = crear, objeto = editar
  onClose: () => void;
  onSave: (data: { nombre: string; dni?: string; telefono?: string }) => Promise<void>;
}

export default function ClienteModal({ open, cliente, onClose, onSave }: ClienteModalProps) {
  const [nombre, setNombre] = useState('');
  const [dni, setDni] = useState('');
  const [telefono, setTelefono] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setNombre(cliente?.nombre ?? '');
    setDni(cliente?.dni ?? '');
    setTelefono(cliente?.telefono ?? '');
    setError('');
  }, [cliente, open]);

  if (!open) return null;

  const handleClose = () => {
    setNombre(''); setDni(''); setTelefono(''); setError('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return setError('El nombre es obligatorio.');

    setSaving(true);
    setError('');
    try {
      await onSave({ nombre: nombre.trim(), dni: dni.trim() || undefined, telefono: telefono.trim() || undefined });
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
            <label className={labelClass}>Nombre</label>
            <input autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={labelClass}>DNI</label>
              <input value={dni} onChange={(e) => setDni(e.target.value)} maxLength={8} className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Teléfono</label>
              <input value={telefono} onChange={(e) => setTelefono(e.target.value)} className={inputClass} />
            </div>
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
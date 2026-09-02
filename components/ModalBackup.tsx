'use client';

import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export interface ModalBackupProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'success' | 'error';
  title: string;
  message: string;
}

export default function ModalBackup({
  isOpen,
  onClose,
  type,
  title,
  message,
}: ModalBackupProps) {
  if (!isOpen) return null;

  const isSuccess = type === 'success';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-xl border border-zinc-200 w-full max-w-md p-6 relative flex flex-col items-center text-center animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón de cierre */}
        <button
          onClick={onClose}
          className="absolute top-4 right-0.5 transform -translate-x-4 p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Ícono de Estado */}
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
            isSuccess
              ? 'bg-primary/10 text-primary/600'
              : 'bg-rose-100 text-rose-600'
          }`}
        >
          {isSuccess ? <CheckCircle2 size={30} /> : <AlertCircle size={30} />}
        </div>

        {/* Título y Mensaje */}
        <h3 className="text-lg font-bold text-zinc-900 tracking-tight">
          {title}
        </h3>
        <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
          {message}
        </p>

        {/* Botón de Confirmación */}
        <button
          onClick={onClose}
          className={`w-full mt-6 py-2.5 px-4 rounded-xl text-sm font-semibold text-white shadow-xs transition-all cursor-pointer ${
            isSuccess
              ? 'bg-primary hover:bg-primary/80'
              : 'bg-rose-600 hover:bg-rose-700'
          }`}
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}
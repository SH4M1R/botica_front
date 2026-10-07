'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { UserCircle, LogOut, AlertTriangle, ExternalLink, X, Menu, Clock, Power, Loader2 } from 'lucide-react';
import { useCompanyName } from '@/hooks/useCompanyName';
import { useSession } from '@/hooks/useSession';
import { useSfs } from '@/hooks/useSfs';
import { sfsApi } from '@/api/sfs';
import ModalAviso from '@/components/ModalAviso';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  const router = useRouter();
  const { companyName, companyIcon } = useCompanyName();
  const { empleado, cerrarSesion } = useSession();
  const [modalDigemidOpen, setModalDigemidOpen] = useState(false);
  const [modalLogoutOpen, setModalLogoutOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const sfs = useSfs();

  // Reloj del sistema
  const [horaActual, setHoraActual] = useState<Date | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setHoraActual(new Date());
    const intervalo = setInterval(() => setHoraActual(new Date()), 1000);
    return () => clearInterval(intervalo);
  }, []);

  const horaFormateada = horaActual?.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) ?? '';
  const fechaFormateada = horaActual?.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' }) ?? '';

  const handleConfirmLogout = () => {
    setModalLogoutOpen(false);
    cerrarSesion();
    router.push('/');
  };

  return (
    <>
      <header className="h-16 w-full bg-white border-b border-zinc-200 flex items-center justify-between px-4 sm:px-6 gap-2 sm:gap-4 shadow-xs transition-all">

        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 -ml-1 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 md:hidden cursor-pointer"
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>

          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {companyIcon && (
              <img
                src={companyIcon}
                alt="Logo Empresa"
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-contain shrink-0"
              />
            )}
            <span className="text-primary font-bold tracking-tight text-sm sm:text-lg truncate">
              {companyName}
            </span>
          </div>
        </div>

        {/* Reloj del sistema */}
        {mounted && horaActual && (
          <div
            className="hidden lg:flex items-center gap-2 mx-auto px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200 shrink-0"
            title={fechaFormateada}
          >
            <Clock size={15} className="text-primary" />
            <span className="font-mono tabular-nums text-sm font-semibold text-zinc-700">{horaFormateada}</span>
            <span className="text-xs text-zinc-400 capitalize border-l border-zinc-200 pl-2 ml-0.5">{fechaFormateada}</span>
          </div>
        )}

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* SFS: apagado -> enciende el facturador; encendido -> abre la bandeja de envío SUNAT */}
          <button
            type="button"
            disabled={sfs.encendiendo}
            onClick={() => (sfs.activo ? sfsApi.abrirBandeja(sfs.url) : sfs.encender())}
            title={
              sfs.encendiendo
                ? 'Encendiendo el SFS, puede tardar cerca de 1 minuto…'
                : sfs.activo
                  ? 'SFS encendido — clic para abrir la bandeja de envío SUNAT'
                  : 'SFS apagado — clic para encenderlo'
            }
            className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold border transition-colors cursor-pointer disabled:cursor-wait ${
              sfs.activo
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                : 'text-zinc-600 bg-zinc-50 border-zinc-200 hover:bg-zinc-100'
            }`}
          >
            {sfs.encendiendo ? (
              <Loader2 size={16} className="animate-spin" />
            ) : sfs.activo ? (
              <ExternalLink size={16} />
            ) : (
              <Power size={16} />
            )}
            <span className="hidden sm:inline">
              {sfs.encendiendo ? 'Encendiendo SFS…' : sfs.activo ? 'Bandeja SUNAT' : 'Encender SFS'}
            </span>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${sfs.activo ? 'bg-emerald-500' : 'bg-zinc-300'}`}
              aria-hidden="true"
            />
          </button>

          <div className="w-px h-6 sm:h-8 bg-zinc-200" />

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center transition-colors duration-300 shrink-0">
              <UserCircle size={20} />
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-zinc-800 leading-tight">{empleado?.nombre ?? 'Usuario'}</p>
              <p className="text-xs text-primary uppercase tracking-wide">{empleado?.rol ?? '—'}</p>
            </div>
          </div>

          <div className="w-px h-6 sm:h-8 bg-zinc-200" />

          <button
            onClick={() => setModalLogoutOpen(true)}
            title="Cerrar sesión"
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold text-zinc-500 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </header>

      <ModalAviso
        isOpen={!!sfs.error}
        titulo="Sistema Facturador SUNAT"
        mensaje={sfs.error}
        tipo="error"
        onClose={sfs.limpiarError}
      />

      {/* Modal DIGEMID */}
      {mounted && modalDigemidOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-2 sm:p-6 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden border border-zinc-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 text-white shrink-0">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-amber-400" size={20} />
                <h3 className="font-semibold text-sm sm:text-base">Alertas y Modificaciones - DIGEMID</h3>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Confirmar Cerrar Sesión */}
      {mounted && modalLogoutOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-zinc-200 animate-in zoom-in-95 duration-150">
            
            {/* Header / Ícono */}
            <div className="p-6 pb-2 text-center relative">
              <button
                onClick={() => setModalLogoutOpen(false)}
                className="absolute top-4 right-4 p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>

              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                <LogOut size={22} />
              </div>

              <h3 className="text-lg font-bold text-zinc-900">¿Cerrar sesión?</h3>
              <p className="text-sm text-zinc-500 mt-1">
                Tendrás que volver a ingresar tu usuario y contraseña para acceder al sistema.
              </p>
            </div>

            {/* Acciones */}
            <div className="p-6 pt-4 flex items-center justify-end gap-3 bg-zinc-50 border-t border-zinc-100 mt-4">
              <button
                type="button"
                onClick={() => setModalLogoutOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-xs cursor-pointer"
              >
                Sí, cerrar sesión
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}
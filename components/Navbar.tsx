'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { UserCircle, LogOut, AlertTriangle, ExternalLink, X, Menu, Clock, Power, Loader2, Inbox } from 'lucide-react';
import { useCompanyName } from '@/hooks/useCompanyName';
import { useSession } from '@/hooks/useSession';
import { useSfsEstado } from '@/hooks/useSfsEstado';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  const router = useRouter();
  const { companyName, companyIcon } = useCompanyName();
  const { empleado, cerrarSesion } = useSession();
  const [modalDigemidOpen, setModalDigemidOpen] = useState(false);
  const [mounted, setMounted] = useState(false);


  const {
    sfsDisponible,
    iniciando,
    mensajeIniciar,
    iniciarSfs,
    abriendoBandeja,
    mensajeBandeja,
    abrirBandeja,
  } = useSfsEstado();

  // Reloj del sistema: null en el server y en el primer render del cliente,
  // para que el HTML inicial coincida y evitar el hydration mismatch.
  const [horaActual, setHoraActual] = useState<Date | null>(null);

  const URL_DIGEMID = "https://www.digemid.minsa.gob.pe/webDigemid/publicaciones/alertas-modificaciones/alertas/";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setHoraActual(new Date()); // primer valor real, ya en cliente
    const intervalo = setInterval(() => setHoraActual(new Date()), 1000);
    return () => clearInterval(intervalo);
  }, []);

  const horaFormateada = horaActual?.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) ?? '';
  const fechaFormateada = horaActual?.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' }) ?? '';

  const handleLogout = () => {
    cerrarSesion();
    router.push('/');
  };

  // Mensaje visible: prioriza el de la acción más reciente que tenga texto.
  const mensajeSfs = mensajeBandeja || mensajeIniciar;

  return (
    <>
      <header className="h-16 w-full bg-white border-b border-zinc-200 flex items-center justify-between px-4 sm:px-6 gap-2 sm:gap-4 shadow-xs transition-all">

        {/* ... (esta parte no cambia) ... */}
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

          <button
            onClick={() => setModalDigemidOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-xs sm:text-sm font-semibold transition-colors shrink-0 cursor-pointer ml-1 sm:ml-2"
            title="Ver Alertas DIGEMID"
          >
            <AlertTriangle size={16} className="text-amber-600" />
            <span className="hidden md:inline">Alertas DIGEMID</span>
          </button>

          {/* Estado del SFS: si está activo, muestra un indicador + botón
              para abrir la Bandeja; si está apagado, muestra un botón
              para encenderlo (ejecuta EjecutarSFS.bat desde el backend). */}
          {mounted && (
            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
              {sfsDisponible ? (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs sm:text-sm font-semibold"
                  title="El SFS está activo: se pueden emitir Boletas Electrónicas"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="hidden md:inline">SFS Activo</span>
                </div>
              ) : (
                <button
                  onClick={iniciarSfs}
                  disabled={iniciando}
                  title={iniciando ? 'Encendiendo el SFS...' : 'El SFS está apagado: clic para encenderlo'}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                >
                  {iniciando ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} />}
                  <span className="hidden md:inline">{iniciando ? 'Encendiendo...' : 'Encender SFS'}</span>
                </button>
              )}

              {/* Ver Bandeja: para comprobar a simple vista que el SFS
                  está procesando/enviando los comprobantes. Solo tiene
                  sentido si el SFS ya está corriendo. */}
              <button
                onClick={abrirBandeja}
                disabled={!sfsDisponible || abriendoBandeja}
                title={
                  !sfsDisponible
                    ? 'Enciende primero el SFS para poder ver la Bandeja'
                    : abriendoBandeja
                    ? 'Abriendo la Bandeja...'
                    : 'Abrir la Bandeja del SFS para verificar los envíos'
                }
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {abriendoBandeja ? <Loader2 size={16} className="animate-spin" /> : <Inbox size={16} />}
                <span className="hidden md:inline">{abriendoBandeja ? 'Abriendo...' : 'Ver Boletas'}</span>
              </button>
            </div>
          )}

          {mounted && mensajeSfs && (
            <span className="hidden lg:inline text-xs text-zinc-500 italic truncate max-w-[220px]">
              {mensajeSfs}
            </span>
          )}
        </div>

        {/* Reloj del sistema: solo se renderiza una vez montado en cliente */}
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

        {/* ... (resto del componente no cambia) ... */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
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
            onClick={handleLogout}
            title="Cerrar sesión"
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold text-zinc-500 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {mounted && modalDigemidOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-2 sm:p-6 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden border border-zinc-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 text-white shrink-0">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-amber-400" size={20} />
                <h3 className="font-semibold text-sm sm:text-base">Alertas y Modificaciones - DIGEMID</h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={URL_DIGEMID}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-1 text-xs"
                  title="Abrir en nueva pestaña"
                >
                  <ExternalLink size={16} />
                  <span className="hidden sm:inline">Abrir web</span>
                </a>
                <button
                  onClick={() => setModalDigemidOpen(false)}
                  className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                  title="Cerrar"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 w-full h-full bg-zinc-100 relative">
              <iframe
                src={URL_DIGEMID}
                title="Alertas DIGEMID"
                className="w-full h-full border-none"
                loading="lazy"
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
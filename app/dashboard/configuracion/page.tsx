'use client';

import { useEffect, useState } from 'react';
import { useThemeColor, PALETTES, ThemeColor } from '@/hooks/useThemeColor';
import { useCompanyName } from '@/hooks/useCompanyName';
import { 
  Paintbrush, 
  Check, 
  Building2, 
  Save, 
  Upload, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  Image as ImageIcon,
  Database,
  Download,
  Send,
  Loader2 
} from 'lucide-react';
import { 
  obtenerEmpresa, 
  guardarEmpresa, 
  EmpresaForm, 
  descargarBackupManual, 
  enviarBackupCorreoManual 
} from '@/api/empresa';
import ModalBackup, { ModalBackupProps } from '@/components/ModalBackup';

export default function ConfiguracionPage() {
  const { activeTheme, changeTheme } = useThemeColor();
  const { setCompanyName, setCompanyLogo, setCompanyIcon } = useCompanyName();
  const [guardado, setGuardado] = useState(false);

  const [cargandoBackup, setCargandoBackup] = useState(false);
  const [cargandoCorreo, setCargandoCorreo] = useState(false);

  // Estado del Modal
  const [modalState, setModalState] = useState<ModalBackupProps>({
    isOpen: false,
    onClose: () => {},
    type: 'success',
    title: '',
    message: '',
  });

  const closeModal = () => setModalState((prev) => ({ ...prev, isOpen: false }));

  const mostrarModal = (type: 'success' | 'error', title: string, message: string) => {
    setModalState({
      isOpen: true,
      onClose: closeModal,
      type,
      title,
      message,
    });
  };

  const [form, setForm] = useState<EmpresaForm>({
    ruc: '',
    razonSocial: '',
    nombreComercial: '',
    telefono: '',
    email: '',
    direccion: '',
    departamento: '',
    ciudad: '',
    logo: '',
    icono: '',
    horaApertura: '',
    toleranciaMinutos: 10,
    horaCierre: '',
    backupAutomaticoActivo: true,
    frecuenciaBackup: 'DIARIO',
    ultimoBackupEnviado: '',
    rutaRecetas: '',
  });

  useEffect(() => {
    obtenerEmpresa()
      .then((data) => {
        if (data) {
          const datosLimpios = {
            ruc: data.ruc ?? '',
            razonSocial: data.razonSocial ?? '',
            nombreComercial: data.nombreComercial ?? '',
            telefono: data.telefono ?? '',
            email: data.email ?? '',
            direccion: data.direccion ?? '',
            departamento: data.departamento ?? '',
            ciudad: data.ciudad ?? '',
            logo: data.logo ?? '',
            icono: data.icono ?? '',
            horaApertura: data.horaApertura ?? '',
            horaCierre: data.horaCierre ?? '',
            toleranciaMinutos: data.toleranciaMinutos ?? 10,
            backupAutomaticoActivo: data.backupAutomaticoActivo ?? true,
            frecuenciaBackup: data.frecuenciaBackup ?? 'DIARIO',
            ultimoBackupEnviado: data.ultimoBackupEnviado ?? '',
            rutaRecetas: data.rutaRecetas ?? '',
          };
          setForm(datosLimpios);

          if (datosLimpios.nombreComercial) setCompanyName(datosLimpios.nombreComercial);
          if (datosLimpios.logo) setCompanyLogo(datosLimpios.logo);
          if (datosLimpios.icono) setCompanyIcon(datosLimpios.icono);
        }
      })
      .catch((err) => console.error("Error cargando datos de la empresa:", err));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setForm(prev => ({ ...prev, [name]: checked }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'logo' | 'icono') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(prev => ({ ...prev, [fieldName]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await guardarEmpresa(form);

      const datosLimpios = {
        ruc: data?.ruc ?? '',
        razonSocial: data?.razonSocial ?? '',
        nombreComercial: data?.nombreComercial ?? '',
        telefono: data?.telefono ?? '',
        email: data?.email ?? '',
        direccion: data?.direccion ?? '',
        departamento: data?.departamento ?? '',
        ciudad: data?.ciudad ?? '',
        logo: data?.logo ?? '',
        icono: data?.icono ?? '',
        horaApertura: data?.horaApertura ?? '',
        horaCierre: data?.horaCierre ?? '',
        toleranciaMinutos: data?.toleranciaMinutos ?? 10,
        backupAutomaticoActivo: data?.backupAutomaticoActivo ?? true,
        frecuenciaBackup: data?.frecuenciaBackup ?? 'DIARIO',
        ultimoBackupEnviado: data?.ultimoBackupEnviado ?? '',
        rutaRecetas: data?.rutaRecetas ?? '',
      };

      setForm(datosLimpios);

      if (datosLimpios.nombreComercial) setCompanyName(datosLimpios.nombreComercial);
      if (datosLimpios.logo) setCompanyLogo(datosLimpios.logo);
      if (datosLimpios.icono) setCompanyIcon(datosLimpios.icono);

      setGuardado(true);
      setTimeout(() => setGuardado(false), 1500);
    } catch (err) {
      console.error("Error al guardar:", err);
      mostrarModal('error', 'Error al Guardar', 'No se pudieron guardar las configuraciones.');
    }
  };

  const handleDescargaDescargaManual = async () => {
    setCargandoBackup(true);
    try {
      await descargarBackupManual();
      mostrarModal(
        'success',
        'Copia de Seguridad Descargada',
        'El archivo .sql de la base de datos se ha descargado correctamente en tu equipo.'
      );
    } catch (error) {
      mostrarModal(
        'error',
        'Error al Descargar',
        error instanceof Error ? error.message : 'Error al descargar la copia de seguridad.'
      );
    } finally {
      setCargandoBackup(false);
    }
  };

  const handleEnviarCorreoManual = async () => {
    if (!form.email) {
      mostrarModal(
        'error',
        'Correo Requerido',
        'Debes ingresar y guardar un correo electrónico en los datos de la empresa antes de enviar el backup.'
      );
      return;
    }
    setCargandoCorreo(true);
    try {
      const msg = await enviarBackupCorreoManual();
      mostrarModal('success', 'Envío Exitoso', msg);
    } catch (error) {
      mostrarModal(
        'error',
        'Error en el Envío',
        error instanceof Error ? error.message : 'Ocurrió un error al enviar el correo.'
      );
    } finally {
      setCargandoCorreo(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full mx-auto px-4 lg:px-6 pb-12">
      {/* Componente Modal */}
      <ModalBackup {...modalState} />

      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Configuración de la Botica / Farmacia</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Personaliza la apariencia visual, horario e información legal o comercial de tu botica.
          </p>
        </div>
        <button
          onClick={handleGuardar}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:brightness-95 text-white text-sm font-semibold rounded-xl shadow-xs hover:shadow-md transition-all shrink-0 self-start sm:self-center cursor-pointer"
        >
          <Save size={16} />
          {guardado ? '¡Cambios Guardados!' : 'Guardar Todo'}
        </button>
      </div>

      {/* Grid de Distribución */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* COLUMNA IZQUIERDA: Formularios */}
        <div className="lg:col-span-2 space-y-6">

          {/* Bloque 1: Datos de la Empresa */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
            <span className="flex items-center gap-2 text-sm font-bold text-zinc-800">
              <Building2 size={18} className="text-primary" />
              Información de la Empresa
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600">RUC</label>
                <input name="ruc" value={form.ruc} onChange={handleChange} placeholder="Ej. 20123456789" className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600">Razón Social</label>
                <input name="razonSocial" value={form.razonSocial} onChange={handleChange} placeholder="Ej. Botica Farma Vida S.A.C." className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-zinc-600">Nombre Comercial (Se muestra en el Panel)</label>
                <input name="nombreComercial" value={form.nombreComercial} onChange={handleChange} placeholder="Ej. FarmaVida" className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" />
              </div>
            </div>
          </div>

          {/* Bloque 2: Contacto y Ubicación */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
            <span className="flex items-center gap-2 text-sm font-bold text-zinc-800">
              <MapPin size={18} className="text-primary" />
              Contacto y Ubicación
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600 flex items-center gap-1"><Phone size={12}/> Teléfono</label>
                <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="Ej. 01 4445555" className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600 flex items-center gap-1"><Mail size={12}/> Correo Electrónico (Receptor de Backups)</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Ej. contacto@farmavida.com" className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-zinc-600">Dirección</label>
                <input name="direccion" value={form.direccion} onChange={handleChange} placeholder="Ej. Av. Larco 123" className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600">Departamento</label>
                <input name="departamento" value={form.departamento} onChange={handleChange} placeholder="Ej. Lima" className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600">Ciudad</label>
                <input name="ciudad" value={form.ciudad} onChange={handleChange} placeholder="Ej. Lima" className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" />
              </div>
            </div>
          </div>

          {/* Bloque 3: Horario de Atención */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
            <span className="flex items-center gap-2 text-sm font-bold text-zinc-800">
              <Clock size={18} className="text-primary" />
              Horario de Atención
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600">Hora de apertura</label>
                <input
                  type="time"
                  name="horaApertura"
                  value={form.horaApertura}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600">Hora de cierre</label>
                <input
                  type="time"
                  name="horaCierre"
                  value={form.horaCierre}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600">Tolerancia tardanza (min)</label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  name="toleranciaMinutos"
                  value={form.toleranciaMinutos}
                  onChange={(e) => setForm((prev) => ({ ...prev, toleranciaMinutos: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
            </div>
          </div>

          {/* Bloque 4: Copias de Seguridad */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-5">
            <span className="flex items-center gap-2 text-sm font-bold text-zinc-800">
              <Database size={18} className="text-primary" />
              Copias de Seguridad de la Base de Datos
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleDescargaDescargaManual}
                disabled={cargandoBackup}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {cargandoBackup ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                Descargar Backup (.sql)
              </button>

              <button
                type="button"
                onClick={handleEnviarCorreoManual}
                disabled={cargandoCorreo}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {cargandoCorreo ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                Enviar Backup al Correo
              </button>
            </div>

            <hr className="border-zinc-100" />

            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="backupAutomaticoActivo"
                  checked={form.backupAutomaticoActivo ?? true}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-zinc-300 text-primary focus:ring-primary/50 cursor-pointer"
                />
                <span className="text-xs font-semibold text-zinc-700">
                  Activar envío automático de copias de seguridad por correo
                </span>
              </label>

              {form.backupAutomaticoActivo && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-600">Frecuencia del envío</label>
                    <select
                      name="frecuenciaBackup"
                      value={form.frecuenciaBackup ?? 'DIARIO'}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all cursor-pointer"
                    >
                      <option value="DIARIO">Diario (Todos los días a las 12:00 PM)</option>
                      <option value="SEMANAL">Semanal (Todos los domingos a las 12:00 PM)</option>
                      <option value="QUINCENAL">Quincenal (Días 1 y 15 del mes a las 12:00 PM)</option>
                      <option value="MENSUAL">Mensual (Día 1 de cada mes a las 12:00 PM)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-600">Último envío registrado</label>
                    <input
                      type="text"
                      disabled
                      value={form.ultimoBackupEnviado || 'Sin envíos anteriores'}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-zinc-100 text-xs text-zinc-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* COLUMNA DERECHA: Logo, Ícono y Tema */}
        <div className="space-y-6">

          {/* Logo de la Empresa */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
            <span className="flex items-center gap-2 text-sm font-bold text-zinc-800">
              <Upload size={18} className="text-primary" />
              Logo Principal de la Boleta
            </span>

            <div className="w-full h-28 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 flex items-center justify-center p-2 overflow-hidden">
              {form.logo ? (
                <img src={form.logo} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
              ) : (
                <span className="text-xs text-zinc-400">Sin logo cargado</span>
              )}
            </div>

            <div className="space-y-1">
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} className="block w-full text-xs text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 file:cursor-pointer" />
              <p className="text-[10px] text-zinc-400 leading-tight">Muestra principal en la barra superior o reportes.</p>
            </div>
          </div>

          {/* Ícono / Favicon */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
            <span className="flex items-center gap-2 text-sm font-bold text-zinc-800">
              <ImageIcon size={18} className="text-primary" />
              Ícono del Sistema
            </span>

            <div className="w-full h-20 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 flex items-center justify-center p-2 overflow-hidden">
              {form.icono ? (
                <img src={form.icono} alt="Ícono Preview" className="w-10 h-10 object-contain" />
              ) : (
                <span className="text-xs text-zinc-400">Sin ícono cargado</span>
              )}
            </div>

            <div className="space-y-1">
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'icono')} className="block w-full text-xs text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 file:cursor-pointer" />
              <p className="text-[10px] text-zinc-400 leading-tight">Utilizado como favicon o logo minificado.</p>
            </div>
          </div>

          {/* Color del Tema */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
            <span className="flex items-center gap-2 text-sm font-bold text-zinc-800">
              <Paintbrush size={18} className="text-primary" />
              Color del Tema
            </span>
            <p className="text-xs text-zinc-500">Selecciona el color de acento para la interfaz de la botica.</p>

            <div className="grid grid-cols-4 gap-3 pt-1">
              {(Object.keys(PALETTES) as ThemeColor[]).map((key) => {
                const isActive = activeTheme === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => changeTheme(key)}
                    className="flex flex-col items-center gap-1.5 group cursor-pointer"
                  >
                    <div
                      className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                        isActive ? 'border-zinc-800 scale-105 shadow-sm' : 'border-transparent group-hover:scale-105'
                      }`}
                      style={{ backgroundColor: PALETTES[key].primary }}
                    >
                      {isActive && <Check size={16} className="text-white drop-shadow-xs" />}
                    </div>
                    <span className="text-[10px] font-medium text-zinc-600 capitalize">{key}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
            <div className="space-y-1">
              <span className="flex items-center gap-2 text-sm font-bold text-zinc-800">
                <Save className="text-primary" size={16} />Carpeta para guardar recetas</span>
              <input
                name="rutaRecetas"
                value={form.rutaRecetas}
                onChange={handleChange}
                placeholder="Ej. C:\Botica\Recetas o /var/botica/recetas"
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
              <p className="text-xs text-zinc-500">Ruta absoluta donde se guardan las fotos de recetas subidas.</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
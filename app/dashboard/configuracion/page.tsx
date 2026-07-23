'use client';

import { useEffect, useState } from 'react';
import { useThemeColor, PALETTES, ThemeColor } from '@/hooks/useThemeColor';
import { useCompanyName } from '@/hooks/useCompanyName';
import { Paintbrush, Check, Building2, Save, Upload, Phone, Mail, MapPin, QrCode, Image as ImageIcon } from 'lucide-react';
import { obtenerEmpresa, guardarEmpresa, EmpresaForm } from '@/api/empresa';

export default function ConfiguracionPage() {
  const { activeTheme, changeTheme } = useThemeColor();
  const { setCompanyName, setCompanyLogo, setCompanyIcon } = useCompanyName();
  const [guardado, setGuardado] = useState(false);

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
    yape: '',
    icono: ''
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
            yape: data.yape ?? '',
            icono: data.icono ?? ''
          };
          setForm(datosLimpios);
          
          if (datosLimpios.nombreComercial) {
            setCompanyName(datosLimpios.nombreComercial);
          }
          if (datosLimpios.logo) {
            setCompanyLogo(datosLimpios.logo);
          }
          if (datosLimpios.icono) {
            setCompanyIcon(datosLimpios.icono);
          }
        }
      })
      .catch((err) => console.error("Error cargando datos de la empresa:", err));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Carga genérica de imágenes a Base64 según la clave especificada ('logo', 'yape', 'icono')
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'logo' | 'yape' | 'icono') => {
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
        yape: data?.yape ?? '',
        icono: data?.icono ?? ''
      };

      setForm(datosLimpios);
      
      setCompanyName(datosLimpios.nombreComercial);
      setCompanyLogo(datosLimpios.logo);
      setCompanyIcon(datosLimpios.icono);

      setGuardado(true);
      setTimeout(() => setGuardado(false), 1500);
    } catch (err) {
      console.error("Error al guardar:", err);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto px-4 lg:px-6 pb-12">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Configuración General</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Personaliza la apariencia visual, pagos e información legal o comercial de tu botica.
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
        
        {/* COLUMNA IZQUIERDA: Formularios + Color del Tema */}
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
                <label className="text-xs font-semibold text-zinc-600 flex items-center gap-1"><Mail size={12}/> Correo Electrónico</label>
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

          {/* Bloque 3: Color del Tema (Ubicado debajo de Contacto y Ubicación) */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
            <span className="flex items-center gap-2 text-sm font-bold text-zinc-800">
              <Paintbrush size={18} className="text-primary" />
              Color del Tema
            </span>
            <p className="text-xs text-zinc-500">Selecciona el color de acento para la interfaz de la botica.</p>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 pt-1">
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

        </div>

        {/* COLUMNA DERECHA: Logo, Yape e Ícono */}
        <div className="space-y-6">
          
          {/* Bloque 4: Logo de la Empresa */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
            <span className="flex items-center gap-2 text-sm font-bold text-zinc-800">
              <Upload size={18} className="text-primary" />
              Logo Principal
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

          {/* Bloque 5: QR Yape / Plin */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
            <span className="flex items-center gap-2 text-sm font-bold text-zinc-800">
              <QrCode size={18} className="text-primary" />
              Código QR de Yape
            </span>

            <div className="w-full h-32 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 flex items-center justify-center p-2 overflow-hidden">
              {form.yape ? (
                <img src={form.yape} alt="QR Yape Preview" className="max-w-full max-h-full object-contain" />
              ) : (
                <span className="text-xs text-zinc-400">Sin QR cargado</span>
              )}
            </div>

            <div className="space-y-1">
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'yape')} className="block w-full text-xs text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 file:cursor-pointer" />
              <p className="text-[10px] text-zinc-400 leading-tight">Imagen del QR para cobros y pasarela de pago.</p>
            </div>
          </div>

          {/* Bloque 6: Ícono / Favicon */}
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

        </div>

      </div>
    </div>
  );
}
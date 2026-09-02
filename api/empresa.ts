const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface EmpresaForm {
  id?: number;
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  telefono: string;
  email: string;
  direccion: string;
  departamento: string;
  ciudad: string;
  logo: string;
  icono: string;
  horaApertura: string;
  horaCierre: string;
  toleranciaMinutos: number;
  backupAutomaticoActivo?: boolean;
  frecuenciaBackup?: string;
  ultimoBackupEnviado?: string;
}

export async function obtenerEmpresa(): Promise<EmpresaForm> {
  const estructuraVacia: EmpresaForm = {
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
    horaCierre: '',
    toleranciaMinutos: 10,
    backupAutomaticoActivo: true,
    frecuenciaBackup: 'DIARIO',
  };

  try {
    const urlFinal = API_URL?.endsWith('/api') ? `${API_URL}/empresa` : `${API_URL}/api/empresa`;
    const response = await fetch(urlFinal);
    
    if (response.status === 404) {
      return estructuraVacia;
    }

    if (!response.ok) {
      throw new Error('Error al obtener los datos de la empresa');
    }

    return await response.json();
  } catch {
    console.warn("Aviso: No se pudo conectar al servidor.");
    return estructuraVacia;
  }
}

export async function guardarEmpresa(data: EmpresaForm): Promise<EmpresaForm> {
  const urlFinal = API_URL?.endsWith('/api') ? `${API_URL}/empresa` : `${API_URL}/api/empresa`;

  const response = await fetch(urlFinal, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Error al guardar los datos de la empresa');
  }
  
  return response.json();
}

/* ============================================================
   FUNCIONES BACKUP
   ============================================================ */

export async function descargarBackupManual(): Promise<void> {
  const urlFinal = API_URL?.endsWith('/api') ? `${API_URL}/backup/manual` : `${API_URL}/api/backup/manual`;
  const response = await fetch(urlFinal);

  if (!response.ok) {
    throw new Error('No se pudo generar la copia de seguridad.');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  
  const fecha = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_botica_${fecha}.sql`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function enviarBackupCorreoManual(): Promise<string> {
  const urlFinal = API_URL?.endsWith('/api') ? `${API_URL}/backup/enviar-correo` : `${API_URL}/api/backup/enviar-correo`;
  const response = await fetch(urlFinal, { method: 'POST' });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'No se pudo enviar la copia de seguridad.');
  }

  return response.text();
}

export const empresaApi = {
  obtener: obtenerEmpresa,
  guardar: guardarEmpresa,
};
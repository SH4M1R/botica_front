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
  } catch (error) {
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
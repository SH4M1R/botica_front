import { delay } from './_mockUtils';

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
}

let empresa: EmpresaForm = {
  id: 1,
  ruc: '20123456789',
  razonSocial: 'JP Sistems',
  nombreComercial: 'JP Farma',
  telefono: '01 4445555',
  email: 'contacto@jpfarma.com',
  direccion: 'Av. Larco 123',
  departamento: 'Lima',
  ciudad: 'Lima',
  logo: '/JPSistems.png',
  icono: '/logojp.png',
  horaApertura: '08:00',
  horaCierre: '20:00',
  toleranciaMinutos: 10,
};

export async function obtenerEmpresa(): Promise<EmpresaForm> {
  await delay();
  return { ...empresa };
}

export async function guardarEmpresa(data: EmpresaForm): Promise<EmpresaForm> {
  await delay();
  // Simula la persistencia: actualiza el objeto en memoria y lo devuelve
  empresa = { ...empresa, ...data, id: empresa.id };
  return { ...empresa };
}

export const empresaApi = {
  obtener: obtenerEmpresa,
  guardar: guardarEmpresa,
};
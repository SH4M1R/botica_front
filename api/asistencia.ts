import { delay, nextId } from './_mockUtils';
import { _validarCredenciales } from './empleados';

export interface Asistencia {
  id: number;
  idEmpleado: number;
  nombreEmpleado: string;
  fecha: string;
  horaEntrada: string | null;
  horaSalida: string | null;
  tardanza: boolean;
  minutosTardanza: number;
}

export interface AsistenciaCredenciales { username: string; password: string; }

let asistencias: Asistencia[] = [
  { id: 1, idEmpleado: 2, nombreEmpleado: 'Ana Torres', fecha: new Date(Date.now() - 86400000).toISOString().slice(0, 10), horaEntrada: new Date(new Date(Date.now() - 86400000).setHours(8, 3, 0, 0)).toISOString(), horaSalida: new Date(new Date(Date.now() - 86400000).setHours(16, 5, 0, 0)).toISOString(), tardanza: false, minutosTardanza: 0 },
  { id: 2, idEmpleado: 3, nombreEmpleado: 'Juan Pérez', fecha: new Date(Date.now() - 86400000).toISOString().slice(0, 10), horaEntrada: new Date(new Date(Date.now() - 86400000).setHours(9, 22, 0, 0)).toISOString(), horaSalida: new Date(new Date(Date.now() - 86400000).setHours(17, 10, 0, 0)).toISOString(), tardanza: true, minutosTardanza: 22 },
];

const TOLERANCIA_MINUTOS = 10;

export const asistenciaApi = {
  listar: async () => { await delay(); return [...asistencias].sort((a, b) => (a.fecha < b.fecha ? 1 : -1)); },
  marcarEntrada: async (data: AsistenciaCredenciales) => {
    await delay();
    const empleado = _validarCredenciales(data.username, data.password);
    if (!empleado) throw new Error('Usuario o contraseña incorrectos.');

    const hoy = new Date().toISOString().slice(0, 10);
    if (asistencias.find((a) => a.idEmpleado === empleado.id && a.fecha === hoy)) {
      throw new Error('Ya se registró la entrada de hoy para este empleado.');
    }

    const ahora = new Date();
    let tardanza = false;
    let minutosTardanza = 0;

    if (empleado.horaEntrada) {
      const [hEsperada, mEsperada] = empleado.horaEntrada.split(':').map(Number);
      const limite = new Date(ahora);
      limite.setHours(hEsperada, mEsperada + TOLERANCIA_MINUTOS, 0, 0);
      if (ahora > limite) {
        tardanza = true;
        const esperada = new Date(ahora);
        esperada.setHours(hEsperada, mEsperada, 0, 0);
        minutosTardanza = Math.round((ahora.getTime() - esperada.getTime()) / 60000);
      }
    }

    const nuevo: Asistencia = { id: nextId(asistencias), idEmpleado: empleado.id, nombreEmpleado: empleado.nombre, fecha: hoy, horaEntrada: ahora.toISOString(), horaSalida: null, tardanza, minutosTardanza };
    asistencias.push(nuevo);
    return nuevo;
  },
  marcarSalida: async (data: AsistenciaCredenciales) => {
    await delay();
    const empleado = _validarCredenciales(data.username, data.password);
    if (!empleado) throw new Error('Usuario o contraseña incorrectos.');

    const hoy = new Date().toISOString().slice(0, 10);
    const registro = asistencias.find((a) => a.idEmpleado === empleado.id && a.fecha === hoy);
    if (!registro) throw new Error('Este empleado no ha marcado su entrada hoy.');
    if (registro.horaSalida) throw new Error('Ya se registró la salida de hoy para este empleado.');

    registro.horaSalida = new Date().toISOString();
    return registro;
  },
  reporte: async (fechaInicio: string, fechaFin: string) => {
    await delay();
    return asistencias.filter((a) => a.fecha >= fechaInicio && a.fecha <= fechaFin);
  },
};
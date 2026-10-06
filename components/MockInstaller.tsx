'use client';

import { instalarMock } from '@/mock/instalar';

// Se ejecuta al cargar el módulo en el navegador (antes de que las páginas hagan sus primeras peticiones)
if (typeof window !== 'undefined') instalarMock();

export default function MockInstaller() {
  return null;
}

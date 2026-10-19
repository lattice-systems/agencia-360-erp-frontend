// Datos de ejemplo para las pruebas del inventario.
import type { Recepcion, Refaccion, Vehiculo } from './api.ts'

export const SENTRA: Vehiculo = {
  id: 1,
  vin: '3N1AB8CV5PY123456',
  modelo: 'Sentra',
  version: 'Advance',
  anio: 2026,
  color: 'Blanco',
  precio: 489900,
  estatus: 'DISPONIBLE',
  creadoEn: '2026-10-12T13:00:00Z',
}

export const KICKS_VENDIDO: Vehiculo = {
  id: 3,
  vin: '3N1CP5CV6RL123458',
  modelo: 'Kicks',
  version: 'Exclusive',
  anio: 2026,
  color: 'Azul',
  precio: 529900,
  estatus: 'VENDIDO',
  creadoEn: '2026-10-13T14:00:00Z',
}

export const FRONTIER_NO_DISPONIBLE: Vehiculo = {
  id: 4,
  vin: '3N6AD33A2RK123459',
  modelo: 'Frontier',
  version: 'LE',
  anio: 2025,
  color: 'Gris',
  precio: 689900,
  estatus: 'NO_DISPONIBLE',
  creadoEn: '2026-10-13T15:00:00Z',
}

export const FILTRO_ACEITE: Refaccion = {
  id: 1,
  codigo: 'REF-001',
  descripcion: 'Filtro de aceite',
  costo: 85,
  precio: 149,
  existencia: 12,
  minimo: 5,
  bajoMinimo: false,
  creadoEn: '2026-10-12T13:00:00Z',
}

export const BALATAS_BAJO_MINIMO: Refaccion = {
  id: 2,
  codigo: 'REF-002',
  descripcion: 'Balatas delanteras',
  costo: 620,
  precio: 890,
  existencia: 3,
  minimo: 5,
  bajoMinimo: true,
  creadoEn: '2026-10-12T13:00:00Z',
}

export const FILTRO_AIRE_SIN_EXISTENCIA: Refaccion = {
  id: 4,
  codigo: 'REF-004',
  descripcion: 'Filtro de aire',
  costo: 120,
  precio: 199,
  existencia: 0,
  minimo: 4,
  bajoMinimo: true,
  creadoEn: '2026-10-12T13:00:00Z',
}

export const RECEPCION_TARDIA: Recepcion = {
  movimientoId: 9,
  cantidad: 3,
  proveedor: 'Refacciones del Bajío',
  notas: 'Una caja golpeada',
  fechaLlegada: '2026-10-10T15:30:00Z',
  fechaRegistro: '2026-10-12T16:00:00Z',
  responsableId: 4,
}

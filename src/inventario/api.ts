// Endpoints del módulo de inventario del backend (ERP-2.0). Los campos siguen
// las vistas del backend: VehiculoVista, RefaccionVista y RecepcionVista.
import { peticion } from '../api/cliente.ts'

// Ya no existe Apartada: la unidad pasa a Vendido cuando Facturación la elige
// (decisión del PO del 19 de octubre).
export const ESTATUS_VEHICULO = [
  'DISPONIBLE',
  'VENDIDO',
  'ENTREGADO',
  'NO_DISPONIBLE',
] as const

export type EstatusVehiculo = (typeof ESTATUS_VEHICULO)[number]

/** Estatus con los que Inventario da de alta o corrige una unidad (decisión del PO). */
export const ESTATUS_DE_ENTRADA = ['DISPONIBLE', 'NO_DISPONIBLE'] as const satisfies readonly EstatusVehiculo[]

export interface Vehiculo {
  id: number
  vin: string
  modelo: string
  version: string
  anio: number
  color: string
  precio: number
  estatus: EstatusVehiculo
  creadoEn: string
}

export interface DatosVehiculo {
  vin: string
  modelo: string
  version: string
  anio: number
  color: string
  precio: number
  /** Al editar, null conserva el estatus actual. */
  estatus: EstatusVehiculo | null
}

export interface Refaccion {
  id: number
  codigo: string
  descripcion: string
  costo: number
  precio: number
  existencia: number
  minimo: number
  /** La existencia llegó al mínimo o quedó por debajo. */
  bajoMinimo: boolean
  creadoEn: string
}

export interface DatosRefaccion {
  codigo: string
  descripcion: string
  costo: number
  precio: number
  minimo: number
}

export interface Recepcion {
  movimientoId: number
  cantidad: number
  proveedor: string
  notas: string | null
  fechaLlegada: string
  fechaRegistro: string
  responsableId: number
}

export interface NuevaRecepcion {
  cantidad: number
  proveedor: string
  notas: string | null
  /** ISO 8601; null si llegó al registrarla. */
  fechaLlegada: string | null
}

export interface RecepcionRegistrada extends Recepcion {
  refaccionId: number
  codigo: string
  /** Existencia de la refacción después de sumar la recepción. */
  existencia: number
}

const VEHICULOS = '/api/v1/vehiculos'
const REFACCIONES = '/api/v1/refacciones'

export function listarVehiculos(token: string) {
  return peticion<Vehiculo[]>(VEHICULOS, { token })
}

export function obtenerVehiculo(token: string, id: number) {
  return peticion<Vehiculo>(`${VEHICULOS}/${id}`, { token })
}

export function crearVehiculo(token: string, datos: DatosVehiculo) {
  return peticion<Vehiculo>(VEHICULOS, { metodo: 'POST', cuerpo: datos, token })
}

export function editarVehiculo(token: string, id: number, datos: DatosVehiculo) {
  return peticion<Vehiculo>(`${VEHICULOS}/${id}`, { metodo: 'PUT', cuerpo: datos, token })
}

export function listarRefacciones(token: string) {
  return peticion<Refaccion[]>(REFACCIONES, { token })
}

export function obtenerRefaccion(token: string, id: number) {
  return peticion<Refaccion>(`${REFACCIONES}/${id}`, { token })
}

export function crearRefaccion(token: string, datos: DatosRefaccion) {
  return peticion<Refaccion>(REFACCIONES, { metodo: 'POST', cuerpo: datos, token })
}

export function editarRefaccion(token: string, id: number, datos: DatosRefaccion) {
  return peticion<Refaccion>(`${REFACCIONES}/${id}`, { metodo: 'PUT', cuerpo: datos, token })
}

export function registrarRecepcion(token: string, refaccionId: number, datos: NuevaRecepcion) {
  return peticion<RecepcionRegistrada>(`${REFACCIONES}/${refaccionId}/recepciones`, {
    metodo: 'POST',
    cuerpo: datos,
    token,
  })
}

export function listarRecepciones(token: string, refaccionId: number) {
  return peticion<Recepcion[]>(`${REFACCIONES}/${refaccionId}/recepciones`, { token })
}

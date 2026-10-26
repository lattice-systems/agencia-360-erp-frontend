// Expediente del vehículo del cliente (ERP-3.0). Los campos siguen las vistas
// del backend (Expediente, ServicioDetalle). Como en el inventario y la
// factura, `modelo` es el Tipo (Sentra) y `anio` es el Modelo (2026).
import { peticion } from '../api/cliente.ts'

export interface VehiculoEncontrado {
  id: number
  vin: string
  marca: string | null
  modelo: string
  anio: number
  version: string | null
  placas: string | null
  /** Nombre del dueño. */
  cliente: string
}

export interface VehiculoDelExpediente {
  id: number
  vin: string
  /** Puede faltar en los vehículos registrados antes del Sprint 3. */
  marca: string | null
  modelo: string
  anio: number
  version: string | null
  placas: string | null
  kilometraje: number | null
}

export interface ClienteDelExpediente {
  id: number
  nombre: string
  correo: string | null
  telefono: string | null
}

export interface ServicioResumen {
  id: number
  /** AAAA-MM-DD */
  fecha: string
  kilometraje: number
  /** Nombre de quien lo atendió. */
  atendidoPor: string
  /** Con IVA incluido. */
  total: number
}

export interface Expediente {
  vehiculo: VehiculoDelExpediente
  cliente: ClienteDelExpediente
  /** Del más reciente al más antiguo. */
  servicios: ServicioResumen[]
}

export type TipoRenglon = 'MANO_DE_OBRA' | 'REFACCION'

export interface RenglonServicio {
  tipo: TipoRenglon
  concepto: string
  cantidad: number
  /** Con IVA incluido. */
  precioUnitario: number
  importe: number
}

export interface ServicioDetalle {
  id: number
  vehiculoId: number
  fecha: string
  kilometraje: number
  atendidoPor: string
  renglones: RenglonServicio[]
  subtotal: number
  iva: number
  total: number
}

/** Con menos de 5 caracteres el backend regresa una lista vacía. */
export const LARGO_MINIMO_BUSQUEDA = 5

export function buscarPorVin(token: string, vin: string) {
  return peticion<VehiculoEncontrado[]>(`/api/v1/expedientes?vin=${encodeURIComponent(vin)}`, { token })
}

export function obtenerExpediente(token: string, vehiculoId: number) {
  return peticion<Expediente>(`/api/v1/expedientes/${vehiculoId}`, { token })
}

export function obtenerServicio(token: string, vehiculoId: number, servicioId: number) {
  return peticion<ServicioDetalle>(`/api/v1/expedientes/${vehiculoId}/servicios/${servicioId}`, { token })
}

/** Solo Servicio. Un valor vacío lo deja sin capturar. */
export function corregirVehiculo(
  token: string,
  vehiculoId: number,
  cambios: { placas: string | null; kilometraje: number | null },
) {
  return peticion<VehiculoDelExpediente>(`/api/v1/expedientes/${vehiculoId}`, {
    metodo: 'PATCH',
    cuerpo: cambios,
    token,
  })
}

/** "Nissan Sentra Advance 2026", sin los datos que falten. */
export function nombreDelVehiculo(vehiculo: {
  marca: string | null
  modelo: string
  version: string | null
  anio: number
}): string {
  return [vehiculo.marca, vehiculo.modelo, vehiculo.version, vehiculo.anio].filter(Boolean).join(' ')
}

export const NOMBRE_TIPO_RENGLON: Record<TipoRenglon, string> = {
  MANO_DE_OBRA: 'Mano de obra',
  REFACCION: 'Refacción',
}

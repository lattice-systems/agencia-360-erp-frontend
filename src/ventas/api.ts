// Venta de unidades (ERP-1.0). Facturación elige la unidad de cada prospecto
// que llegó a Facturación y después lo pasa a Entrega. Los campos siguen las
// vistas del backend: ProspectoPorFacturar y VentaVista.
import { peticion } from '../api/cliente.ts'

export interface ProspectoPorFacturar {
  id: number
  nombre: string
  telefono: string | null
  correo: string | null
  vendedorId: number
  /** Nombre del vendedor a cargo. */
  vendedor: string | null
  /** Cuando Contabilidad validó los pagos. */
  enFacturacionDesde: string
}

export type EstatusVenta = 'POR_ENTREGAR' | 'REGISTRADA'

export interface Venta {
  id: number
  prospectoId: number
  /** Los datos de la unidad vienen vacíos si se finalizó sin unidad. */
  vehiculoId: number | null
  vin: string | null
  /** Tipo de la unidad (Sentra), como en la factura. */
  modelo: string | null
  version: string | null
  /** Modelo de la unidad (2026), como en la factura. */
  anio: number | null
  color: string | null
  precio: number | null
  estatus: EstatusVenta
  asignadaEn: string | null
  registradaEn: string | null
}

export function listarProspectosPorFacturar(token: string) {
  return peticion<ProspectoPorFacturar[]>('/api/v1/prospectos/por-facturar', { token })
}

export function listarVentas(token: string) {
  return peticion<Venta[]>('/api/v1/ventas', { token })
}

/** La unidad pasa a Vendido; si el prospecto ya tenía otra, esa regresa a Disponible. */
export function elegirUnidad(token: string, prospectoId: number, vehiculoId: number) {
  return peticion<Venta>(`/api/v1/ventas/${prospectoId}/unidad`, {
    metodo: 'PUT',
    cuerpo: { vehiculoId },
    token,
  })
}

/** Facturación emitió la factura: el prospecto pasa de Facturación a Entrega. */
export function pasarAEntrega(token: string, prospectoId: number) {
  return peticion<unknown>(`/api/v1/prospectos/${prospectoId}/etapa`, {
    metodo: 'PATCH',
    cuerpo: { etapa: 'ENTREGA' },
    token,
  })
}

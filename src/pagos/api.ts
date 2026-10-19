// Endpoints de ERP-1.1 en el backend (LiquidacionController): Caja registra y
// envía los pagos de un prospecto en Pago; Contabilidad los valida o los
// rechaza. Los campos siguen LiquidacionVista.
import type { Tono } from '../componentes/ChipEstado.tsx'
import { peticion } from '../api/cliente.ts'

export const ESTADOS_LIQUIDACION = ['ABIERTA', 'ENVIADA', 'RECHAZADA', 'VALIDADA'] as const

export type EstadoLiquidacion = (typeof ESTADOS_LIQUIDACION)[number]

export const NOMBRE_ESTADO: Record<EstadoLiquidacion, string> = {
  ABIERTA: 'Por enviar',
  ENVIADA: 'Por validar',
  RECHAZADA: 'Rechazado',
  VALIDADA: 'Validado',
}

/** Nombre de cada filtro de la lista (en plural). */
export const NOMBRE_FILTRO: Record<EstadoLiquidacion, string> = {
  ABIERTA: 'Por enviar',
  ENVIADA: 'Por validar',
  RECHAZADA: 'Rechazados',
  VALIDADA: 'Validados',
}

export const TONO_ESTADO: Record<EstadoLiquidacion, Tono> = {
  ABIERTA: 'neutro',
  ENVIADA: 'advertencia',
  RECHAZADA: 'peligro',
  VALIDADA: 'exito',
}

export interface PagoRegistrado {
  id: number
  monto: number
  /** AAAA-MM-DD: el día en que pagó el cliente. */
  fechaPago: string
  referencia: string | null
  registradoPorNombre: string | null
  registradoEn: string
  /** Caja lo anuló: sigue en el registro pero no cuenta en el total. */
  anulado: boolean
  anuladoPorNombre: string | null
}

export interface Liquidacion {
  prospectoId: number
  prospectoNombre: string
  vendedorNombre: string | null
  estado: EstadoLiquidacion
  total: number
  pagos: PagoRegistrado[]
  enviadaEn: string | null
  motivoRechazo: string | null
}

export interface NuevoPago {
  monto: number
  fechaPago: string
  referencia: string | null
}

const LIQUIDACIONES = '/api/v1/liquidaciones'

export function listarLiquidaciones(token: string) {
  return peticion<Liquidacion[]>(LIQUIDACIONES, { token })
}

export function registrarPago(token: string, prospectoId: number, datos: NuevoPago) {
  return peticion<Liquidacion>(`${LIQUIDACIONES}/${prospectoId}/pagos`, {
    metodo: 'POST',
    cuerpo: datos,
    token,
  })
}

/** El dinero no se borra: un pago mal capturado se anula y queda registrado. */
export function anularPago(token: string, prospectoId: number, pagoId: number) {
  return peticion<Liquidacion>(`${LIQUIDACIONES}/${prospectoId}/pagos/${pagoId}/anular`, {
    metodo: 'POST',
    token,
  })
}

export function enviarPagos(token: string, prospectoId: number) {
  return peticion<Liquidacion>(`${LIQUIDACIONES}/${prospectoId}/enviar`, { metodo: 'POST', token })
}

export function validarPagos(token: string, prospectoId: number) {
  return peticion<Liquidacion>(`${LIQUIDACIONES}/${prospectoId}/validar`, { metodo: 'POST', token })
}

export function rechazarPagos(token: string, prospectoId: number, motivo: string) {
  return peticion<Liquidacion>(`${LIQUIDACIONES}/${prospectoId}/rechazar`, {
    metodo: 'POST',
    cuerpo: { motivo },
    token,
  })
}

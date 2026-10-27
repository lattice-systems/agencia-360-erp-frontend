// Facturas de la venta de unidades (ERP-1.3). Facturación emite la factura de
// cada prospecto que ya pagó y, en ese momento, elige la unidad Disponible que
// se le vende. Los campos siguen las vistas del backend: ProspectoPorEmitir y
// FacturaVista.
import { descargar, peticion } from '../api/cliente.ts'
import type { DatosFiscales as DatosFiscalesCapturados, DomicilioFiscal } from './datosFiscales.ts'

/**
 * Datos fiscales del receptor como los da facturacion; los captura el vendedor
 * al pasar a Pago.
 */
export interface DatosFiscales {
  rfc: string
  nombreCompleto: string
  /** El domicilio en una línea, como lo imprime la factura. */
  domicilioFiscal: string
  /** Clave del catálogo del SAT, por ejemplo "612". */
  regimenFiscal: string
  /** El mismo domicilio separado, para corregirlo. */
  domicilio: DomicilioFiscal | null
  regimenFiscalDescripcion: string | null
}

export interface ProspectoPorEmitir {
  prospectoId: number
  nombre: string
  vendedorId: number
  /** Nombre del vendedor a cargo. */
  vendedor: string | null
  /** Precio total de la venta, con IVA incluido. */
  total: number | null
  /** Lo que falta por pagar; la factura se emite con el saldo en 0. */
  saldo: number | null
  enFacturacionDesde: string
  receptor: DatosFiscales | null
  /** Por qué todavía no se puede emitir; vacío si ya se puede. */
  bloqueo: string | null
}

export interface Factura {
  id: number
  folio: string
  prospectoId: number
  /** Nombre del receptor como quedó en la factura. */
  cliente: string
  rfc: string
  vehiculoId: number
  vin: string
  marca: string
  /** Tipo de la unidad (Sentra), como en la factura. */
  modelo: string
  version: string
  /** Modelo de la unidad (2026), como en la factura. */
  anio: number
  color: string
  subtotal: number
  iva: number
  total: number
  emitidaEn: string
}

export function listarPorEmitir(token: string) {
  return peticion<ProspectoPorEmitir[]>('/api/v1/facturas/por-emitir', { token })
}

export function listarFacturas(token: string) {
  return peticion<Factura[]>('/api/v1/facturas', { token })
}

/** La unidad pasa a Vendido y el prospecto pasa solo a Entrega. */
export function emitirFactura(token: string, prospectoId: number, vehiculoId: number) {
  return peticion<Factura>('/api/v1/facturas', {
    metodo: 'POST',
    cuerpo: { prospectoId, vehiculoId },
    token,
  })
}

/**
 * Facturación corrige los datos fiscales de un prospecto en Facturación antes
 * de emitir (endpoint de ventascrm).
 */
export function corregirDatosFiscales(token: string, prospectoId: number, datos: DatosFiscalesCapturados) {
  return peticion<unknown>(`/api/v1/prospectos/${prospectoId}/datos-fiscales`, {
    metodo: 'PUT',
    cuerpo: datos,
    token,
  })
}

/** Descarga el PDF tal como se emitió y lo guarda en el equipo. */
export async function descargarPdf(token: string, factura: Pick<Factura, 'id' | 'folio'>) {
  const pdf = await descargar(`/api/v1/facturas/${factura.id}/pdf`, token)
  const url = URL.createObjectURL(pdf)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `factura-${factura.folio}.pdf`
  enlace.click()
  URL.revokeObjectURL(url)
}

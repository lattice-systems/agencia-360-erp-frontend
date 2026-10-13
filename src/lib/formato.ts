// Formatos de la guía de estilos (sección 7): montos en MXN y fechas en es-MX.

const MONEDA = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const NUMERO = new Intl.NumberFormat('es-MX')
const FECHA_HORA = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

/** "$489,900.00" */
export function formatearMoneda(valor: number): string {
  return MONEDA.format(valor)
}

/** "1,250" */
export function formatearNumero(valor: number): string {
  return NUMERO.format(valor)
}

/** "12 oct 2026, 9:45 a.m." a partir de una fecha ISO 8601. */
export function formatearFechaHora(iso: string): string {
  return FECHA_HORA.format(new Date(iso))
}

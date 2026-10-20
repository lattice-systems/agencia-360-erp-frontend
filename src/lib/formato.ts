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

const FECHA = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })

/**
 * "16 oct 2026" a partir de una fecha sin hora (AAAA-MM-DD). Se lee como
 * mediodía local para que la zona horaria no la recorra al día anterior.
 */
export function formatearFecha(fecha: string): string {
  return FECHA.format(new Date(`${fecha}T12:00:00`))
}

/** Hoy como AAAA-MM-DD, en la hora del dispositivo. */
export function hoyIso(): string {
  const hoy = new Date()
  const dos = (n: number) => String(n).padStart(2, '0')
  return `${hoy.getFullYear()}-${dos(hoy.getMonth() + 1)}-${dos(hoy.getDate())}`
}

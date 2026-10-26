// Saludo y fecha del encabezado de Inicio, en la hora del dispositivo.

const FECHA_LARGA = new Intl.DateTimeFormat('es-MX', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

/** "Buenos días" hasta mediodía, "Buenas tardes" hasta las 7 p.m. */
export function saludoPorHora(fecha: Date): string {
  const hora = fecha.getHours()
  if (hora < 12) {
    return 'Buenos días'
  }
  return hora < 19 ? 'Buenas tardes' : 'Buenas noches'
}

/** "lunes 26 de octubre" */
export function fechaLarga(fecha: Date): string {
  return FECHA_LARGA.format(fecha).replace(',', '')
}

/** Primer nombre para el saludo ("Ana Admin" → "Ana"). */
export function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] || nombre
}

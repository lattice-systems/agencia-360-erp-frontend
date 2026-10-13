// Montos capturados en un campo de texto: acepta "$489,900.00", "489900" o
// "489900.5". Devuelve NaN si no es un monto con hasta 10 enteros y 2
// decimales (lo que admite la columna numeric(12,2) del backend), para que zod
// lo marque como inválido.
const MONTO = /^\d{1,10}(\.\d{1,2})?$/

export function textoAPrecio(texto: string): number {
  const limpio = texto.replace(/[\s$,]/g, '').replace(/MXN$/i, '')
  return MONTO.test(limpio) ? Number(limpio) : Number.NaN
}

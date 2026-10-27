// Servidor de MSW para las pruebas: intercepta las peticiones a la API y
// responde con datos de prueba. Cada prueba define sus respuestas con
// servidor.use(...).
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { API_URL } from '../api/cliente.ts'

/**
 * Conexión de Server-Sent Events que queda abierta y nunca avisa de cambios.
 * Es la respuesta por omisión para que las pantallas en tiempo real (ERP-2.1)
 * no hagan fallar las pruebas que no las revisan.
 */
export function conexionAbierta(alAbrir?: (controlador: ReadableStreamDefaultController<Uint8Array>) => void) {
  return new HttpResponse(
    new ReadableStream<Uint8Array>({
      start(controlador) {
        controlador.enqueue(new TextEncoder().encode(': conectado\n\n'))
        alAbrir?.(controlador)
      },
    }),
    { headers: { 'Content-Type': 'text/event-stream' } },
  )
}

export const servidor = setupServer(
  http.get(`${API_URL}/api/v1/vehiculos/eventos`, () => conexionAbierta()),
  // Listas vacías por omisión para el resumen de Inicio, que piden casi todas
  // las pruebas al entrar a "/". Las pruebas de cada pantalla las reemplazan.
  ...['vehiculos', 'refacciones', 'liquidaciones', 'facturas/por-emitir', 'facturas', 'usuarios'].map((ruta) =>
    http.get(`${API_URL}/api/v1/${ruta}`, () => HttpResponse.json([])),
  ),
)

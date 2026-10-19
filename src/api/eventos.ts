// Server-Sent Events con el token de la sesión (ERP-2.1). EventSource no deja
// mandar el header Authorization, así que la conexión se abre con fetch y el
// flujo se lee a mano.
import { API_URL, ErrorApi } from './cliente.ts'

type AlRecibir = (evento: string, datos: string) => void

/**
 * Devuelve una función que recibe el texto del flujo en trozos (pueden cortar
 * un evento a la mitad) y entrega cada evento completo. Los comentarios del
 * servidor (líneas que empiezan con ":") se ignoran.
 */
export function crearLectorDeEventos(alRecibir: AlRecibir) {
  let pendiente = ''
  return (trozo: string) => {
    pendiente += trozo.replace(/\r\n?/g, '\n')
    const bloques = pendiente.split('\n\n')
    pendiente = bloques.pop() ?? ''
    for (const bloque of bloques) {
      let nombre = 'message'
      const datos: string[] = []
      for (const linea of bloque.split('\n')) {
        const separador = linea.indexOf(':')
        if (separador === 0) {
          continue
        }
        const campo = separador < 0 ? linea : linea.slice(0, separador)
        const valor = separador < 0 ? '' : linea.slice(separador + 1).replace(/^ /, '')
        if (campo === 'event') {
          nombre = valor
        } else if (campo === 'data') {
          datos.push(valor)
        }
      }
      if (datos.length > 0) {
        alRecibir(nombre, datos.join('\n'))
      }
    }
  }
}

interface Manejadores {
  /** La conexión quedó abierta. */
  alAbrir: () => void
  alRecibir: AlRecibir
}

/**
 * Escucha la ruta hasta que el servidor cierra la conexión o se cancela con
 * `senal`. Lanza ErrorApi si no se pudo abrir o si se cortó.
 */
export async function escucharEventos(
  ruta: string,
  token: string,
  { alAbrir, alRecibir }: Manejadores,
  senal: AbortSignal,
): Promise<void> {
  let respuesta: Response
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      // JSON también, para que un error (401 o 403) llegue con su cuerpo.
      headers: { Accept: 'text/event-stream, application/json', Authorization: `Bearer ${token}` },
      signal: senal,
    })
  } catch {
    if (senal.aborted) {
      return
    }
    throw new ErrorApi(0, 'No se pudo conectar con el servidor.')
  }
  if (!respuesta.ok || !respuesta.body) {
    throw new ErrorApi(respuesta.status, 'No se pudo abrir la conexión en tiempo real.')
  }

  alAbrir()
  const lector = respuesta.body.getReader()
  const decodificador = new TextDecoder()
  const leer = crearLectorDeEventos(alRecibir)
  try {
    for (;;) {
      const { value, done } = await lector.read()
      if (done) {
        return
      }
      leer(decodificador.decode(value, { stream: true }))
    }
  } catch {
    if (senal.aborted) {
      return
    }
    throw new ErrorApi(0, 'Se perdió la conexión en tiempo real.')
  }
}

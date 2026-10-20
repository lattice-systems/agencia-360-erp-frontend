// Cliente HTTP mínimo para la API de Agencia360. Los errores de la API llegan
// con el formato ApiError del backend: { timestamp, status, error, message, path }.

export const API_URL: string =
  import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

export class ErrorApi extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ErrorApi'
    this.status = status
  }
}

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH'

interface OpcionesPeticion {
  metodo?: Metodo
  cuerpo?: unknown
  token?: string
}

const MENSAJE_GENERICO = 'Ocurrió un error inesperado. Intenta de nuevo.'
const MENSAJE_SIN_CONEXION = 'No se pudo conectar con el servidor.'

export async function peticion<T>(
  ruta: string,
  { metodo = 'GET', cuerpo, token }: OpcionesPeticion = {},
): Promise<T> {
  const encabezados: Record<string, string> = { Accept: 'application/json' }
  if (cuerpo !== undefined) {
    encabezados['Content-Type'] = 'application/json'
  }
  if (token) {
    encabezados.Authorization = `Bearer ${token}`
  }

  let respuesta: Response
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method: metodo,
      headers: encabezados,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    })
  } catch {
    throw new ErrorApi(0, MENSAJE_SIN_CONEXION)
  }

  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, await leerMensaje(respuesta))
  }
  return (await respuesta.json()) as T
}

async function leerMensaje(respuesta: Response): Promise<string> {
  try {
    const cuerpo = (await respuesta.json()) as { message?: unknown }
    if (typeof cuerpo.message === 'string' && cuerpo.message.length > 0) {
      return cuerpo.message
    }
  } catch {
    // La respuesta no trae un cuerpo JSON: se usa el mensaje genérico.
  }
  return MENSAJE_GENERICO
}

export function mensajeDeError(error: unknown): string {
  return error instanceof ErrorApi ? error.message : MENSAJE_GENERICO
}

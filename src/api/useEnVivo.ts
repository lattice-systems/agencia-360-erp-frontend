import { useEffect, useRef, useState } from 'react'
import { useSesion } from '../sesion/useSesion.ts'
import { ErrorApi } from './cliente.ts'
import { escucharEventos } from './eventos.ts'

export type EstadoEnVivo = 'conectando' | 'conectado' | 'reconectando'

/** Espera antes de reconectar; crece con cada intento fallido, hasta 30 s. */
const REINTENTO_MS = 5_000
const REINTENTO_MAXIMO_MS = 30_000

/**
 * Mantiene abierta la conexión de Server-Sent Events de una pantalla y llama a
 * `alCambiar` cuando llega `evento`. Si la conexión se cae, se reconecta sola
 * y, al volver, también llama a `alCambiar` para recuperar lo que no vio. Si el
 * token ya no es válido, cierra la sesión.
 */
export function useEnVivo(ruta: string, evento: string, alCambiar: () => void): EstadoEnVivo {
  const { sesion, cerrar } = useSesion()
  const token = sesion?.token ?? ''
  const [estado, setEstado] = useState<EstadoEnVivo>('conectando')
  const alCambiarActual = useRef(alCambiar)

  useEffect(() => {
    alCambiarActual.current = alCambiar
  }, [alCambiar])

  useEffect(() => {
    const control = new AbortController()
    let fallidos = 0
    // Tras una reconexión se vuelve a consultar: pudo haber cambios mientras
    // tanto.
    let recuperar = false
    let temporizador: ReturnType<typeof setTimeout> | undefined

    async function conectar() {
      let fallo = false
      try {
        await escucharEventos(
          ruta,
          token,
          {
            alAbrir: () => {
              if (recuperar) {
                alCambiarActual.current()
              }
              recuperar = true
              fallidos = 0
              setEstado('conectado')
            },
            alRecibir: (nombre) => {
              if (nombre === evento) {
                alCambiarActual.current()
              }
            },
          },
          control.signal,
        )
      } catch (e) {
        if (e instanceof ErrorApi && e.status === 401) {
          cerrar('expirada')
          return
        }
        fallo = true
      }
      if (control.signal.aborted) {
        return
      }
      if (!fallo) {
        // El servidor cierra la conexión cada 30 min a propósito: se reconecta
        // enseguida, sin avisar de una falla.
        temporizador = setTimeout(conectar, 1_000)
        return
      }
      fallidos += 1
      recuperar = true
      setEstado('reconectando')
      temporizador = setTimeout(conectar, Math.min(REINTENTO_MS * fallidos, REINTENTO_MAXIMO_MS))
    }

    void conectar()
    return () => {
      control.abort()
      clearTimeout(temporizador)
    }
  }, [ruta, evento, token, cerrar])

  return estado
}

import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { servidor } from '../test/servidor.ts'
import { API, conEventos, conSesion, renderApp } from '../test/utilidades.ts'
import { FRONTIER_NO_DISPONIBLE, SENTRA } from './datosDePrueba.ts'

const EVENTOS = '/api/v1/vehiculos/eventos'

/** La primera consulta regresa Sentra; las siguientes, también la Frontier. */
function conListaQueCambia() {
  let consultas = 0
  servidor.use(
    http.get(`${API}/api/v1/vehiculos`, () => {
      consultas += 1
      return HttpResponse.json(consultas === 1 ? [SENTRA] : [SENTRA, FRONTIER_NO_DISPONIBLE])
    }),
  )
  return () => consultas
}

afterEach(() => {
  vi.useRealTimers()
})

describe('Inventario de vehículos en tiempo real (ERP-2.1)', () => {
  it('actualiza la lista sola cuando otra persona cambia una unidad', async () => {
    conSesion('ADMINISTRADOR')
    conListaQueCambia()
    const eventos = conEventos(EVENTOS)
    renderApp('/vehiculos')

    expect(await screen.findByText('3N1AB8CV5PY123456')).toBeInTheDocument()
    expect(await screen.findByText('En vivo')).toBeInTheDocument()
    expect(screen.queryByText('3N6AD33A2RK123459')).not.toBeInTheDocument()

    eventos.emitir('vehiculos')

    expect(await screen.findByText('3N6AD33A2RK123459')).toBeInTheDocument()
    // Se actualiza sin volver a mostrar el esqueleto de carga.
    expect(screen.getByText('3N1AB8CV5PY123456')).toBeInTheDocument()
  })

  it('se conecta con el token de la sesión', async () => {
    const token = conSesion('INVENTARIO')
    conListaQueCambia()
    let autorizacion: string | null = null
    servidor.use(
      http.get(`${API}${EVENTOS}`, ({ request }) => {
        autorizacion = request.headers.get('Authorization')
        return new HttpResponse(null, { status: 503 })
      }),
    )
    renderApp('/vehiculos')

    await screen.findByText('3N1AB8CV5PY123456')
    await vi.waitFor(() => expect(autorizacion).toBe(`Bearer ${token}`))
  })

  it('avisa si se pierde la conexión y, al volver, recupera los cambios que no vio', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    conSesion('INVENTARIO')
    const consultas = conListaQueCambia()
    let intentos = 0
    servidor.use(
      http.get(`${API}${EVENTOS}`, () => {
        intentos += 1
        return intentos === 1
          ? new HttpResponse(null, { status: 503 })
          : new HttpResponse(new ReadableStream({ start: () => {} }), {
              headers: { 'Content-Type': 'text/event-stream' },
            })
      }),
    )
    renderApp('/vehiculos')

    expect(await screen.findByText('Sin conexión en vivo. Reintentando…')).toBeInTheDocument()
    expect(screen.getByText('3N1AB8CV5PY123456')).toBeInTheDocument()

    await vi.advanceTimersByTimeAsync(5_000)

    expect(await screen.findByText('En vivo')).toBeInTheDocument()
    expect(await screen.findByText('3N6AD33A2RK123459')).toBeInTheDocument()
    expect(consultas()).toBe(2)
  })

  it('si el token ya no es válido, cierra la sesión', async () => {
    conSesion('INVENTARIO')
    conListaQueCambia()
    servidor.use(http.get(`${API}${EVENTOS}`, () => new HttpResponse(null, { status: 401 })))
    renderApp('/vehiculos')

    expect(await screen.findByText('Tu sesión expiró. Inicia sesión de nuevo.')).toBeInTheDocument()
  })

  it('el estado de la conexión se anuncia a los lectores de pantalla', async () => {
    conSesion('INVENTARIO')
    conListaQueCambia()
    conEventos(EVENTOS)
    renderApp('/vehiculos')

    expect(await screen.findByRole('status')).toHaveTextContent('En vivo')
  })
})

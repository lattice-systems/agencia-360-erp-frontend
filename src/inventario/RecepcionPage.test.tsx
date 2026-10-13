import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { servidor } from '../test/servidor.ts'
import { API, conSesion, renderApp } from '../test/utilidades.ts'
import type { NuevaRecepcion, RecepcionRegistrada } from './api.ts'
import { BALATAS_BAJO_MINIMO, FILTRO_ACEITE } from './datosDePrueba.ts'

const REGISTRADA: RecepcionRegistrada = {
  movimientoId: 20,
  cantidad: 10,
  proveedor: 'Refacciones del Bajío',
  notas: 'Una caja golpeada',
  fechaLlegada: '2026-10-12T15:30:00Z',
  fechaRegistro: '2026-10-13T16:00:00Z',
  responsableId: 4,
  refaccionId: 2,
  codigo: 'REF-002',
  existencia: 13,
}

describe('Registro de recepción', () => {
  beforeEach(() => {
    servidor.use(
      http.get(`${API}/api/v1/refacciones`, () =>
        HttpResponse.json([FILTRO_ACEITE, BALATAS_BAJO_MINIMO]),
      ),
    )
  })

  it('preselecciona la refacción y calcula la nueva existencia', async () => {
    conSesion('INVENTARIO')
    renderApp('/recepciones?refaccion=2')

    expect(await screen.findByRole('combobox', { name: 'Refacción' })).toHaveTextContent('REF-002')
    expect(screen.getByText('Balatas delanteras')).toBeInTheDocument()

    await userEvent.setup({ delay: null }).type(screen.getByLabelText('Cantidad recibida'), '10')

    expect(screen.getByText('Nueva existencia').nextElementSibling).toHaveTextContent('13')
    expect(screen.getByText('Disponible')).toBeInTheDocument()
  })

  it('el responsable sale de la sesión y no se puede cambiar', async () => {
    conSesion('INVENTARIO')
    renderApp('/recepciones')

    const responsable = await screen.findByLabelText('Responsable')
    expect(responsable).toHaveValue('Persona de Prueba')
    expect(responsable).toHaveAttribute('readonly')
  })

  it('registra la entrega con proveedor, notas y fecha de llegada', async () => {
    conSesion('INVENTARIO')
    let recibido: NuevaRecepcion | null = null
    servidor.use(
      http.post(`${API}/api/v1/refacciones/2/recepciones`, async ({ request }) => {
        recibido = (await request.json()) as NuevaRecepcion
        return HttpResponse.json(REGISTRADA, { status: 201 })
      }),
    )
    renderApp('/recepciones?refaccion=2')
    const usuario = userEvent.setup({ delay: null })

    await usuario.type(await screen.findByLabelText('Cantidad recibida'), '10')
    fireEvent.change(screen.getByLabelText('Fecha de llegada'), { target: { value: '2026-10-12T09:30' } })
    await usuario.type(screen.getByLabelText('Proveedor'), '  Refacciones del Bajío ')
    await usuario.type(screen.getByLabelText('Notas (opcional)'), 'Una caja golpeada')
    await usuario.click(screen.getByRole('button', { name: 'Registrar recepción' }))

    expect(await screen.findByText('Recepción registrada')).toBeInTheDocument()
    expect(recibido).toEqual({
      cantidad: 10,
      proveedor: 'Refacciones del Bajío',
      notas: 'Una caja golpeada',
      fechaLlegada: new Date('2026-10-12T09:30').toISOString(),
    })
    // El resumen toma la existencia que confirmó el servidor y el formulario se limpia.
    expect(screen.getByText('Existencia actual').nextElementSibling).toHaveTextContent('13')
    expect(screen.getByLabelText('Proveedor')).toHaveValue('')
    expect(screen.getByRole('combobox', { name: 'Refacción' })).toHaveTextContent('REF-002')
  })

  it('sin fecha de llegada y sin notas manda null', async () => {
    conSesion('INVENTARIO')
    let recibido: NuevaRecepcion | null = null
    servidor.use(
      http.post(`${API}/api/v1/refacciones/1/recepciones`, async ({ request }) => {
        recibido = (await request.json()) as NuevaRecepcion
        return HttpResponse.json({ ...REGISTRADA, refaccionId: 1, codigo: 'REF-001' }, { status: 201 })
      }),
    )
    renderApp('/recepciones?refaccion=1')
    const usuario = userEvent.setup({ delay: null })

    await usuario.type(await screen.findByLabelText('Cantidad recibida'), '4')
    await usuario.type(screen.getByLabelText('Proveedor'), 'Distribuidora León')
    await usuario.click(screen.getByRole('button', { name: 'Registrar recepción' }))

    await screen.findByText('Recepción registrada')
    expect(recibido).toEqual({ cantidad: 4, proveedor: 'Distribuidora León', notas: null, fechaLlegada: null })
  })

  it('valida la refacción, la cantidad, el proveedor y que la llegada no sea futura', async () => {
    conSesion('INVENTARIO')
    renderApp('/recepciones')
    const usuario = userEvent.setup({ delay: null })

    await usuario.type(await screen.findByLabelText('Cantidad recibida'), '0')
    fireEvent.change(screen.getByLabelText('Fecha de llegada'), { target: { value: '2099-01-01T10:00' } })
    await usuario.click(screen.getByRole('button', { name: 'Registrar recepción' }))

    expect(await screen.findByText('Elige la refacción que llegó.')).toBeInTheDocument()
    expect(screen.getByText('La cantidad debe ser mayor a cero.')).toBeInTheDocument()
    expect(screen.getByText('Escribe el proveedor.')).toBeInTheDocument()
    expect(screen.getByText('La fecha de llegada no puede ser futura.')).toBeInTheDocument()
  })

  it('muestra el error del backend y conserva lo capturado', async () => {
    conSesion('INVENTARIO')
    servidor.use(
      http.post(`${API}/api/v1/refacciones/2/recepciones`, () =>
        HttpResponse.json({ message: 'La fecha de llegada no puede ser posterior al registro' }, { status: 400 }),
      ),
    )
    renderApp('/recepciones?refaccion=2')
    const usuario = userEvent.setup({ delay: null })

    await usuario.type(await screen.findByLabelText('Cantidad recibida'), '3')
    await usuario.type(screen.getByLabelText('Proveedor'), 'Bajío')
    await usuario.click(screen.getByRole('button', { name: 'Registrar recepción' }))

    expect(
      await screen.findByText('La fecha de llegada no puede ser posterior al registro'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Proveedor')).toHaveValue('Bajío')
  })

  it('solo Inventario registra recepciones', () => {
    conSesion('REFACCIONES')
    renderApp('/recepciones')

    expect(screen.getByRole('heading', { name: 'Sin permiso' })).toBeInTheDocument()
  })

  it('sin refacciones, invita a darlas de alta primero', async () => {
    conSesion('INVENTARIO')
    servidor.use(http.get(`${API}/api/v1/refacciones`, () => HttpResponse.json([])))
    renderApp('/recepciones')

    expect(await screen.findByText('Aún no hay refacciones')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Agregar refacción' })).toHaveAttribute('href', '/refacciones/nueva')
  })

})

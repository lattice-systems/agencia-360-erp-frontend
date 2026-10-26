import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { servidor } from '../test/servidor.ts'
import { API, conSesion, renderApp } from '../test/utilidades.ts'
import type { Expediente, ServicioDetalle, VehiculoEncontrado } from './api.ts'

const SENTRA: VehiculoEncontrado = {
  id: 3,
  vin: '3N1AB8CV5RY000001',
  marca: 'Nissan',
  modelo: 'Sentra',
  anio: 2026,
  version: 'Advance',
  placas: 'ABC-123-D',
  cliente: 'Ana López',
}

const EXPEDIENTE: Expediente = {
  vehiculo: {
    id: 3,
    vin: '3N1AB8CV5RY000001',
    marca: 'Nissan',
    modelo: 'Sentra',
    anio: 2026,
    version: 'Advance',
    placas: 'ABC-123-D',
    kilometraje: 15000,
  },
  cliente: { id: 9, nombre: 'Ana López', correo: 'ana@correo.com', telefono: '4775550101' },
  servicios: [
    { id: 21, fecha: '2026-10-20', kilometraje: 15000, atendidoPor: 'Luis Técnico', total: 801 },
    { id: 20, fecha: '2026-05-02', kilometraje: 5000, atendidoPor: 'Luis Técnico', total: 1200 },
  ],
}

const DETALLE: ServicioDetalle = {
  id: 21,
  vehiculoId: 3,
  fecha: '2026-10-20',
  kilometraje: 15000,
  atendidoPor: 'Luis Técnico',
  renglones: [
    { tipo: 'MANO_DE_OBRA', concepto: 'Cambio de aceite', cantidad: 1, precioUnitario: 450, importe: 450 },
    { tipo: 'REFACCION', concepto: 'Filtro de aceite', cantidad: 2, precioUnitario: 175.5, importe: 351 },
  ],
  subtotal: 690.52,
  iva: 110.48,
  total: 801,
}

function conExpediente(expediente: Expediente = EXPEDIENTE) {
  servidor.use(
    http.get(`${API}/api/v1/expedientes/3`, () => HttpResponse.json(expediente)),
    http.get(`${API}/api/v1/expedientes/3/servicios/21`, () => HttpResponse.json(DETALLE)),
  )
}

describe('Expediente del vehículo (ERP-3.0)', () => {
  it('busca por parte del VIN y abre el expediente', async () => {
    conSesion('SERVICIO')
    let buscado: string | null = null
    servidor.use(
      http.get(`${API}/api/v1/expedientes`, ({ request }) => {
        buscado = new URL(request.url).searchParams.get('vin')
        return HttpResponse.json([SENTRA])
      }),
    )
    conExpediente()
    renderApp('/expediente')

    const usuario = userEvent.setup({ delay: null })
    await usuario.type(screen.getByLabelText('Número de serie (VIN)'), 'ry000001')
    await usuario.click(screen.getByRole('button', { name: 'Buscar' }))

    const fila = (await screen.findByText('3N1AB8CV5RY000001')).closest('tr')!
    expect(buscado).toBe('RY000001')
    expect(within(fila).getByText('Nissan Sentra Advance 2026')).toBeInTheDocument()
    expect(within(fila).getByText('Ana López')).toBeInTheDocument()

    await usuario.click(within(fila).getByRole('link', { name: 'Abrir el expediente de 3N1AB8CV5RY000001' }))
    expect(await screen.findByRole('heading', { name: 'Nissan Sentra Advance 2026' })).toBeInTheDocument()
  })

  it('pide al menos 5 caracteres antes de buscar', async () => {
    conSesion('SERVICIO')
    renderApp('/expediente')

    const usuario = userEvent.setup({ delay: null })
    await usuario.type(screen.getByLabelText('Número de serie (VIN)'), 'RY0')
    await usuario.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(await screen.findByText('Escribe al menos 5 letras o números del VIN.')).toBeInTheDocument()
  })

  it('avisa que el cliente se registra en el CRM si no encuentra el vehículo', async () => {
    conSesion('SERVICIO')
    servidor.use(http.get(`${API}/api/v1/expedientes`, () => HttpResponse.json([])))
    renderApp('/expediente')

    const usuario = userEvent.setup({ delay: null })
    await usuario.type(screen.getByLabelText('Número de serie (VIN)'), 'ZZZZZ')
    await usuario.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(await screen.findByText('No hay vehículos con ese VIN')).toBeInTheDocument()
    expect(screen.getByText(/pídele al Gerente de marketing que lo registre en el CRM/)).toBeInTheDocument()
  })

  it('muestra el vehículo, su dueño y sus servicios por fecha', async () => {
    conSesion('ADMINISTRADOR')
    conExpediente()
    renderApp('/expediente/3')

    expect(await screen.findByRole('heading', { name: 'Nissan Sentra Advance 2026' })).toBeInTheDocument()
    expect(screen.getByText('Advance')).toBeInTheDocument()
    expect(screen.getByText('Kilometraje', { selector: 'dt' }).nextElementSibling).toHaveTextContent('15,000 km')
    expect(screen.getByText('ana@correo.com')).toBeInTheDocument()

    const filas = screen.getAllByRole('row').slice(1)
    expect(filas).toHaveLength(2)
    expect(within(filas[0]).getByText('20 oct 2026')).toBeInTheDocument()
    expect(within(filas[0]).getByText('$801.00')).toBeInTheDocument()
    expect(within(filas[1]).getByText('2 may 2026')).toBeInTheDocument()

    // El Administrador solo consulta.
    expect(screen.queryByRole('button', { name: 'Corregir placas y kilometraje' })).not.toBeInTheDocument()
  })

  it('muestra los detalles de un servicio como un ticket', async () => {
    conSesion('SERVICIO')
    conExpediente()
    renderApp('/expediente/3')

    const usuario = userEvent.setup({ delay: null })
    await usuario.click(await screen.findByRole('button', { name: 'Ver detalles del servicio del 20 oct 2026' }))

    const dialogo = await screen.findByRole('dialog', { name: 'Servicio del 20 oct 2026' })
    const filtro = (await within(dialogo).findByText('Filtro de aceite')).closest('tr')!
    expect(within(filtro).getByText('Refacción')).toBeInTheDocument()
    expect(within(filtro).getByText('$175.50')).toBeInTheDocument()
    expect(within(filtro).getByText('$351.00')).toBeInTheDocument()
    expect(within(dialogo).getByText('$690.52')).toBeInTheDocument()
    expect(within(dialogo).getByText('$110.48')).toBeInTheDocument()
    expect(within(dialogo).getByText('Total').closest('tr')).toHaveTextContent('$801.00')
  })

  it('Servicio corrige las placas y el kilometraje', async () => {
    conSesion('SERVICIO')
    conExpediente()
    let enviado: unknown = null
    servidor.use(
      http.patch(`${API}/api/v1/expedientes/3`, async ({ request }) => {
        enviado = await request.json()
        return HttpResponse.json({ ...EXPEDIENTE.vehiculo, placas: 'XYZ-987-A', kilometraje: 16500 })
      }),
    )
    renderApp('/expediente/3')

    const usuario = userEvent.setup({ delay: null })
    await usuario.click(await screen.findByRole('button', { name: 'Corregir placas y kilometraje' }))
    const dialogo = await screen.findByRole('dialog')
    await usuario.clear(within(dialogo).getByLabelText('Placas'))
    await usuario.type(within(dialogo).getByLabelText('Placas'), 'xyz-987-a')
    await usuario.clear(within(dialogo).getByLabelText('Kilometraje'))
    await usuario.type(within(dialogo).getByLabelText('Kilometraje'), '16500')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Placas y kilometraje actualizados.')).toBeInTheDocument()
    expect(enviado).toEqual({ placas: 'XYZ-987-A', kilometraje: 16500 })
    expect(screen.getByText('XYZ-987-A')).toBeInTheDocument()
    expect(screen.getByText('16,500 km')).toBeInTheDocument()
  })

  it('no deja guardar un kilometraje con comas', async () => {
    conSesion('SERVICIO')
    conExpediente()
    renderApp('/expediente/3')

    const usuario = userEvent.setup({ delay: null })
    await usuario.click(await screen.findByRole('button', { name: 'Corregir placas y kilometraje' }))
    const dialogo = await screen.findByRole('dialog')
    await usuario.clear(within(dialogo).getByLabelText('Kilometraje'))
    await usuario.type(within(dialogo).getByLabelText('Kilometraje'), '16,500')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar' }))

    expect(await within(dialogo).findByText('Escribe el kilometraje sin puntos ni comas.')).toBeInTheDocument()
  })

  it('muestra un aviso cuando el vehículo aún no tiene servicios', async () => {
    conSesion('SERVICIO')
    conExpediente({ ...EXPEDIENTE, servicios: [] })
    renderApp('/expediente/3')

    expect(await screen.findByText('Aún no hay servicios')).toBeInTheDocument()
  })

  it('no deja entrar a otros roles', () => {
    conSesion('FACTURACION')
    renderApp('/expediente')

    expect(screen.getByRole('heading', { name: 'Sin permiso' })).toBeInTheDocument()
  })
})

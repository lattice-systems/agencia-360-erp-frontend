import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { servidor } from '../test/servidor.ts'
import { API, conSesion, renderApp } from '../test/utilidades.ts'
import {
  BALATAS_BAJO_MINIMO,
  FILTRO_ACEITE,
  FILTRO_AIRE_SIN_EXISTENCIA,
  RECEPCION_TARDIA,
} from './datosDePrueba.ts'

function conRefacciones(refacciones = [BALATAS_BAJO_MINIMO, FILTRO_ACEITE, FILTRO_AIRE_SIN_EXISTENCIA]) {
  servidor.use(http.get(`${API}/api/v1/refacciones`, () => HttpResponse.json(refacciones)))
}

function fila(codigo: string) {
  return screen.getByText(codigo).closest('tr')!
}

describe('Inventario de refacciones', () => {
  it('muestra costo, precio, existencia, mínimo y el estado de cada refacción', async () => {
    conSesion('INVENTARIO')
    conRefacciones()
    renderApp('/refacciones')

    await screen.findByText('REF-001')
    const aceite = fila('REF-001')
    expect(within(aceite).getByText('Filtro de aceite')).toBeInTheDocument()
    expect(within(aceite).getByText('$85.00')).toBeInTheDocument()
    expect(within(aceite).getByText('$149.00')).toBeInTheDocument()
    expect(within(aceite).getByText('Disponible')).toBeInTheDocument()
    expect(within(fila('REF-002')).getByText('Bajo mínimo')).toBeInTheDocument()
    expect(within(fila('REF-004')).getByText('Sin existencia')).toBeInTheDocument()
  })

  it('avisa a Refacciones cuáles llegaron a su mínimo y permite verlas', async () => {
    conSesion('REFACCIONES')
    conRefacciones()
    renderApp('/refacciones')

    expect(
      await screen.findByText('2 refacciones llegaron a su existencia mínima'),
    ).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ver por resurtir' }))

    expect(screen.getByText('REF-002')).toBeInTheDocument()
    expect(screen.getByText('REF-004')).toBeInTheDocument()
    expect(screen.queryByText('REF-001')).not.toBeInTheDocument()
  })

  it('no muestra el aviso cuando todo está surtido', async () => {
    conSesion('ADMINISTRADOR')
    conRefacciones([FILTRO_ACEITE])
    renderApp('/refacciones')

    await screen.findByText('REF-001')
    expect(screen.queryByText(/llegó a su existencia mínima|llegaron a su existencia mínima/)).not.toBeInTheDocument()
  })

  it('Refacciones y el Administrador solo consultan', async () => {
    conSesion('REFACCIONES')
    conRefacciones()
    renderApp('/refacciones')
    const usuario = userEvent.setup()

    await usuario.click(await screen.findByRole('button', { name: 'Acciones de REF-001' }))

    expect(screen.getByRole('menuitem', { name: 'Ver recepciones' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Registrar recepción' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Agregar refacción' })).not.toBeInTheDocument()
  })

  it('muestra el historial de recepciones con las dos fechas', async () => {
    conSesion('ADMINISTRADOR')
    conRefacciones()
    servidor.use(
      http.get(`${API}/api/v1/refacciones/2/recepciones`, () => HttpResponse.json([RECEPCION_TARDIA])),
    )
    renderApp('/refacciones')
    const usuario = userEvent.setup()

    await usuario.click(await screen.findByRole('button', { name: 'Acciones de REF-002' }))
    await usuario.click(screen.getByRole('menuitem', { name: 'Ver recepciones' }))

    const dialogo = await screen.findByRole('dialog', { name: 'Recepciones' })
    expect(await within(dialogo).findByText('Refacciones del Bajío')).toBeInTheDocument()
    expect(within(dialogo).getByText('Una caja golpeada')).toBeInTheDocument()
    expect(within(dialogo).getByText('Registrada después')).toBeInTheDocument()
    expect(within(dialogo).getByText(/10 oct 2026/)).toBeInTheDocument()
    expect(within(dialogo).getByText(/12 oct 2026/)).toBeInTheDocument()
  })

  it('el rol Caja no entra a refacciones', () => {
    conSesion('CAJA')
    renderApp('/refacciones')

    expect(screen.getByRole('heading', { name: 'Sin permiso' })).toBeInTheDocument()
  })
})

describe('Alta y edición de refacciones', () => {
  it('da de alta la refacción sin existencia: entra en cero', async () => {
    conSesion('INVENTARIO')
    let recibido: unknown = null
    servidor.use(
      http.post(`${API}/api/v1/refacciones`, async ({ request }) => {
        recibido = await request.json()
        return HttpResponse.json({ ...FILTRO_ACEITE, existencia: 0, bajoMinimo: true }, { status: 201 })
      }),
      http.get(`${API}/api/v1/refacciones`, () => HttpResponse.json([])),
    )
    renderApp('/refacciones/nueva')
    const usuario = userEvent.setup()

    expect(screen.queryByLabelText(/Existencia inicial/)).not.toBeInTheDocument()
    await usuario.type(screen.getByLabelText('Código'), 'ref-001')
    await usuario.type(screen.getByLabelText('Descripción'), 'Filtro de aceite')
    await usuario.type(screen.getByLabelText('Costo (MXN)'), '85')
    await usuario.type(screen.getByLabelText('Precio (MXN)'), '149.00')
    await usuario.type(screen.getByLabelText('Existencia mínima'), '5')
    await usuario.click(screen.getByRole('button', { name: 'Guardar refacción' }))

    expect(await screen.findByText('Refacción REF-001 agregada.')).toBeInTheDocument()
    expect(recibido).toEqual({
      codigo: 'REF-001',
      descripcion: 'Filtro de aceite',
      costo: 85,
      precio: 149,
      minimo: 5,
    })
  })

  it('valida montos y mínimo antes de enviar', async () => {
    conSesion('INVENTARIO')
    renderApp('/refacciones/nueva')
    const usuario = userEvent.setup()

    await usuario.type(screen.getByLabelText('Código'), 'REF-009')
    await usuario.type(screen.getByLabelText('Descripción'), 'Tapón')
    await usuario.type(screen.getByLabelText('Precio (MXN)'), '0')
    await usuario.type(screen.getByLabelText('Existencia mínima'), '-1')
    await usuario.click(screen.getByRole('button', { name: 'Guardar refacción' }))

    expect(await screen.findByText('Escribe el costo.')).toBeInTheDocument()
    expect(screen.getByText('El precio debe ser mayor a cero.')).toBeInTheDocument()
    expect(screen.getByText('Escribe una cantidad entera de 0 o más.')).toBeInTheDocument()
  })

  it('marca el código cuando ya existe', async () => {
    conSesion('INVENTARIO')
    servidor.use(
      http.post(`${API}/api/v1/refacciones`, () =>
        HttpResponse.json({ message: 'Ya existe una refacción con el código REF-001' }, { status: 409 }),
      ),
    )
    renderApp('/refacciones/nueva')
    const usuario = userEvent.setup()

    await usuario.type(screen.getByLabelText('Código'), 'REF-001')
    await usuario.type(screen.getByLabelText('Descripción'), 'Filtro de aceite')
    await usuario.type(screen.getByLabelText('Costo (MXN)'), '85')
    await usuario.type(screen.getByLabelText('Precio (MXN)'), '149')
    await usuario.type(screen.getByLabelText('Existencia mínima'), '5')
    await usuario.click(screen.getByRole('button', { name: 'Guardar refacción' }))

    expect(await screen.findByText('Ya existe una refacción con el código REF-001')).toBeInTheDocument()
    expect(screen.getByLabelText('Código')).toHaveAttribute('aria-invalid', 'true')
  })

  it('edita la refacción mostrando su existencia actual sin enviarla', async () => {
    conSesion('INVENTARIO')
    let recibido: unknown = null
    servidor.use(
      http.get(`${API}/api/v1/refacciones/2`, () => HttpResponse.json(BALATAS_BAJO_MINIMO)),
      http.put(`${API}/api/v1/refacciones/2`, async ({ request }) => {
        recibido = await request.json()
        return HttpResponse.json({ ...BALATAS_BAJO_MINIMO, minimo: 2, bajoMinimo: false })
      }),
      http.get(`${API}/api/v1/refacciones`, () => HttpResponse.json([BALATAS_BAJO_MINIMO])),
    )
    renderApp('/refacciones/2/editar')

    expect(await screen.findByDisplayValue('REF-002')).toBeInTheDocument()
    expect(screen.getByText('Existencia actual:')).toHaveTextContent('Existencia actual: 3')
    const usuario = userEvent.setup()
    await usuario.clear(screen.getByLabelText('Existencia mínima'))
    await usuario.type(screen.getByLabelText('Existencia mínima'), '2')
    await usuario.click(screen.getByRole('button', { name: 'Guardar refacción' }))

    expect(await screen.findByText('Refacción actualizada.')).toBeInTheDocument()
    expect(recibido).toEqual({
      codigo: 'REF-002',
      descripcion: 'Balatas delanteras',
      costo: 620,
      precio: 890,
      minimo: 2,
    })
  })
})

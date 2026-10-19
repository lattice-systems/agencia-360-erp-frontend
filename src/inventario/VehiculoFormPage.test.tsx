import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { servidor } from '../test/servidor.ts'
import { API, conSesion, renderApp } from '../test/utilidades.ts'
import type { DatosVehiculo } from './api.ts'
import { KICKS_VENDIDO, SENTRA } from './datosDePrueba.ts'

async function llenarFormulario(datos: Partial<Record<string, string>> = {}) {
  const usuario = userEvent.setup({ delay: null })
  const valores = {
    'Número de serie (VIN)': ' 3n1ab8cv5py123456 ',
    Tipo: 'Sentra',
    Versión: 'Advance',
    Modelo: '2026',
    Color: 'Blanco',
    'Precio (MXN)': '$489,900.00',
    ...datos,
  }
  for (const [etiqueta, valor] of Object.entries(valores)) {
    const campo = screen.getByLabelText(etiqueta)
    await usuario.clear(campo)
    if (valor) {
      await usuario.type(campo, valor)
    }
  }
  return usuario
}

describe('Alta y edición de vehículos', () => {
  it('nombra los campos como la factura: el tipo es la línea y el modelo es el año (ERP-2.2)', () => {
    conSesion('INVENTARIO')
    renderApp('/vehiculos/nuevo')

    const etiquetas = [...document.querySelectorAll('form label')].map((label) => label.textContent)
    expect(etiquetas).toEqual([
      'Número de serie (VIN)',
      'Tipo',
      'Versión',
      'Modelo',
      'Color',
      'Precio (MXN)',
      'Estatus',
    ])
    expect(screen.getByLabelText('Tipo')).toHaveAccessibleDescription('Por ejemplo, Sentra.')
    expect(screen.getByLabelText('Modelo')).toHaveAccessibleDescription('Año del modelo, por ejemplo 2026.')
  })

  it('da de alta la unidad con los datos limpios y regresa al listado', async () => {
    const token = conSesion('INVENTARIO')
    let recibido: DatosVehiculo | null = null
    let autorizacion: string | null = null
    servidor.use(
      http.post(`${API}/api/v1/vehiculos`, async ({ request }) => {
        recibido = (await request.json()) as DatosVehiculo
        autorizacion = request.headers.get('Authorization')
        return HttpResponse.json(SENTRA, { status: 201 })
      }),
      http.get(`${API}/api/v1/vehiculos`, () => HttpResponse.json([SENTRA])),
    )
    renderApp('/vehiculos/nuevo')

    const usuario = await llenarFormulario()
    await usuario.click(screen.getByRole('button', { name: 'Guardar vehículo' }))

    expect(await screen.findByText('Vehículo 3N1AB8CV5PY123456 agregado.')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Vehículos' })).toBeInTheDocument()
    expect(autorizacion).toBe(`Bearer ${token}`)
    expect(recibido).toEqual({
      vin: '3N1AB8CV5PY123456',
      modelo: 'Sentra',
      version: 'Advance',
      anio: 2026,
      color: 'Blanco',
      precio: 489900,
      estatus: 'DISPONIBLE',
    })
  })

  it('permite dar de alta una unidad No disponible', async () => {
    conSesion('INVENTARIO')
    let recibido: DatosVehiculo | null = null
    servidor.use(
      http.post(`${API}/api/v1/vehiculos`, async ({ request }) => {
        recibido = (await request.json()) as DatosVehiculo
        return HttpResponse.json({ ...SENTRA, estatus: 'NO_DISPONIBLE' }, { status: 201 })
      }),
      http.get(`${API}/api/v1/vehiculos`, () => HttpResponse.json([])),
    )
    renderApp('/vehiculos/nuevo')

    const usuario = await llenarFormulario()
    await usuario.click(screen.getByRole('combobox', { name: 'Estatus' }))
    expect(screen.queryByRole('option', { name: 'Vendido' })).not.toBeInTheDocument()
    await usuario.click(await screen.findByRole('option', { name: 'No disponible' }))
    await usuario.click(screen.getByRole('button', { name: 'Guardar vehículo' }))

    await screen.findByRole('heading', { name: 'Vehículos' })
    expect(recibido).toMatchObject({ estatus: 'NO_DISPONIBLE' })
  })

  it('valida los datos antes de enviarlos', async () => {
    conSesion('INVENTARIO')
    let llamadas = 0
    servidor.use(
      http.post(`${API}/api/v1/vehiculos`, () => {
        llamadas += 1
        return HttpResponse.json(SENTRA, { status: 201 })
      }),
    )
    renderApp('/vehiculos/nuevo')

    const usuario = await llenarFormulario({
      'Número de serie (VIN)': '3N1AB8CV5PY12345O',
      Tipo: '',
      Modelo: '1899',
      'Precio (MXN)': '100.555',
      Color: '',
    })
    await usuario.click(screen.getByRole('button', { name: 'Guardar vehículo' }))

    expect(
      await screen.findByText('Escribe un VIN de 17 caracteres, sin las letras I, O ni Q.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Escribe el tipo.')).toBeInTheDocument()
    expect(screen.getByText('El modelo no es válido.')).toBeInTheDocument()
    expect(screen.getByText('Escribe el precio con hasta 2 decimales.')).toBeInTheDocument()
    expect(screen.getByText('Escribe el color.')).toBeInTheDocument()
    expect(screen.getByLabelText('Número de serie (VIN)')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Número de serie (VIN)')).toHaveFocus()
    expect(llamadas).toBe(0)
  })

  it('marca el VIN cuando ya existe otra unidad con él', async () => {
    conSesion('INVENTARIO')
    servidor.use(
      http.post(`${API}/api/v1/vehiculos`, () =>
        HttpResponse.json(
          { message: 'Ya existe un vehículo con el VIN 3N1AB8CV5PY123456' },
          { status: 409 },
        ),
      ),
    )
    renderApp('/vehiculos/nuevo')

    const usuario = await llenarFormulario()
    await usuario.click(screen.getByRole('button', { name: 'Guardar vehículo' }))

    expect(
      await screen.findByText('Ya existe un vehículo con el VIN 3N1AB8CV5PY123456'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Número de serie (VIN)')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Tipo')).toHaveValue('Sentra')
  })

  it('muestra tal cual el mensaje de error del backend', async () => {
    conSesion('INVENTARIO')
    servidor.use(
      http.post(`${API}/api/v1/vehiculos`, () =>
        HttpResponse.json({ message: 'El año no es válido' }, { status: 400 }),
      ),
    )
    renderApp('/vehiculos/nuevo')

    const usuario = await llenarFormulario()
    await usuario.click(screen.getByRole('button', { name: 'Guardar vehículo' }))

    expect(await screen.findByText('No se pudo guardar')).toBeInTheDocument()
    expect(screen.getByText('El año no es válido')).toBeInTheDocument()
  })

  it('edita una unidad vendida sin tocar su estatus', async () => {
    conSesion('INVENTARIO')
    let recibido: DatosVehiculo | null = null
    servidor.use(
      http.get(`${API}/api/v1/vehiculos/3`, () => HttpResponse.json(KICKS_VENDIDO)),
      http.put(`${API}/api/v1/vehiculos/3`, async ({ request }) => {
        recibido = (await request.json()) as DatosVehiculo
        return HttpResponse.json({ ...KICKS_VENDIDO, color: 'Rojo' })
      }),
      http.get(`${API}/api/v1/vehiculos`, () => HttpResponse.json([KICKS_VENDIDO])),
    )
    renderApp('/vehiculos/3/editar')

    expect(await screen.findByDisplayValue('3N1CP5CV6RL123458')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Estatus' })).toBeDisabled()
    expect(screen.getByText('Este estatus lo cambia Facturación.')).toBeInTheDocument()
    expect(screen.getByLabelText('Precio (MXN)')).toHaveValue('529900.00')

    const usuario = userEvent.setup({ delay: null })
    await usuario.clear(screen.getByLabelText('Color'))
    await usuario.type(screen.getByLabelText('Color'), 'Rojo')
    await usuario.click(screen.getByRole('button', { name: 'Guardar vehículo' }))

    expect(await screen.findByText('Vehículo actualizado.')).toBeInTheDocument()
    expect(recibido).toMatchObject({ color: 'Rojo', precio: 529900, estatus: null })
  })

  it('solo Inventario entra al alta', () => {
    conSesion('ADMINISTRADOR')
    renderApp('/vehiculos/nuevo')

    expect(screen.getByRole('heading', { name: 'Sin permiso' })).toBeInTheDocument()
  })

  it('si el token vence al guardar, regresa al login con el aviso', async () => {
    conSesion('INVENTARIO')
    servidor.use(http.post(`${API}/api/v1/vehiculos`, () => new HttpResponse(null, { status: 401 })))
    renderApp('/vehiculos/nuevo')

    const usuario = await llenarFormulario()
    await usuario.click(screen.getByRole('button', { name: 'Guardar vehículo' }))

    expect(await screen.findByText('Tu sesión expiró. Inicia sesión de nuevo.')).toBeInTheDocument()
    expect(sessionStorage.length).toBe(0)
  })

})

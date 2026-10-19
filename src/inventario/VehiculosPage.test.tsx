import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { servidor } from '../test/servidor.ts'
import { API, conSesion, renderApp } from '../test/utilidades.ts'
import { FRONTIER_NO_DISPONIBLE, KICKS_VENDIDO, SENTRA } from './datosDePrueba.ts'

function conVehiculos(vehiculos = [SENTRA, KICKS_VENDIDO, FRONTIER_NO_DISPONIBLE]) {
  servidor.use(http.get(`${API}/api/v1/vehiculos`, () => HttpResponse.json(vehiculos)))
}

describe('Inventario de vehículos', () => {
  it('muestra a Inventario las unidades con VIN, precio en MXN y estatus', async () => {
    conSesion('INVENTARIO')
    conVehiculos()
    renderApp('/vehiculos')

    const fila = (await screen.findByText('3N1AB8CV5PY123456')).closest('tr')!
    expect(within(fila).getByText('Sentra')).toBeInTheDocument()
    expect(within(fila).getByText('Advance')).toBeInTheDocument()
    expect(within(fila).getByText('2026')).toBeInTheDocument()
    expect(within(fila).getByText('$489,900.00')).toBeInTheDocument()
    expect(within(fila).getByText('Disponible')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Agregar vehículo' })).toHaveAttribute('href', '/vehiculos/nuevo')
  })

  it('nombra las columnas como la factura: el tipo es la línea y el modelo es el año (ERP-2.2)', async () => {
    conSesion('INVENTARIO')
    conVehiculos()
    renderApp('/vehiculos')
    await screen.findByText('3N1AB8CV5PY123456')

    const columnas = screen.getAllByRole('columnheader').map((th) => th.textContent)
    expect(columnas).toEqual([
      'Número de serie (VIN)',
      'Tipo',
      'Versión',
      'Modelo',
      'Color',
      'Precio (MXN)',
      'Estatus',
      'Acciones',
    ])
  })

  it('cuenta las unidades por estatus', async () => {
    conSesion('INVENTARIO')
    conVehiculos()
    renderApp('/vehiculos')

    expect(await screen.findByText('Unidades registradas')).toBeInTheDocument()
    const tarjeta = (etiqueta: string) => screen.getByText(etiqueta).closest('[data-slot=card]')!
    expect(tarjeta('Unidades registradas')).toHaveTextContent('3')
    expect(tarjeta('Disponibles')).toHaveTextContent('1')
    expect(tarjeta('Vendidas')).toHaveTextContent('1')
    expect(tarjeta('No disponibles')).toHaveTextContent('1')
    // El PO quitó el apartado: la unidad pasa de Disponible a Vendida al facturar.
    expect(screen.queryByText('Apartadas')).not.toBeInTheDocument()
  })

  it('el Administrador solo consulta: no ve Agregar ni las acciones de fila', async () => {
    conSesion('ADMINISTRADOR')
    conVehiculos()
    renderApp('/vehiculos')

    expect(await screen.findByText('3N1AB8CV5PY123456')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Agregar vehículo' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Acciones de/ })).not.toBeInTheDocument()
  })

  it('busca por número de serie, tipo o versión', async () => {
    conSesion('INVENTARIO')
    conVehiculos()
    renderApp('/vehiculos')
    await screen.findByText('3N1AB8CV5PY123456')

    expect(screen.getByLabelText('Buscar vehículo')).toHaveAttribute(
      'placeholder',
      'Número de serie, tipo o versión',
    )
    await userEvent.setup({ delay: null }).type(screen.getByLabelText('Buscar vehículo'), 'kicks')

    expect(screen.getByText('3N1CP5CV6RL123458')).toBeInTheDocument()
    expect(screen.queryByText('3N1AB8CV5PY123456')).not.toBeInTheDocument()
    expect(screen.getByText('Mostrando 1 a 1 de 1 vehículos')).toBeInTheDocument()
  })

  it('filtra por estatus', async () => {
    conSesion('INVENTARIO')
    conVehiculos()
    renderApp('/vehiculos')
    await screen.findByText('3N1AB8CV5PY123456')
    const usuario = userEvent.setup({ delay: null })

    await usuario.click(screen.getByRole('combobox', { name: 'Estatus' }))
    expect(screen.queryByRole('option', { name: 'Apartada' })).not.toBeInTheDocument()
    await usuario.click(await screen.findByRole('option', { name: 'No disponible' }))

    expect(screen.getByText('3N6AD33A2RK123459')).toBeInTheDocument()
    expect(screen.queryByText('3N1AB8CV5PY123456')).not.toBeInTheDocument()
  })

  it('avisa cuando ninguna unidad coincide con la búsqueda', async () => {
    conSesion('INVENTARIO')
    conVehiculos()
    renderApp('/vehiculos')
    await screen.findByText('3N1AB8CV5PY123456')

    await userEvent.setup({ delay: null }).type(screen.getByLabelText('Buscar vehículo'), 'tsuru')

    expect(screen.getByText('Ningún vehículo coincide')).toBeInTheDocument()
  })

  it('muestra el estado vacío con la acción para empezar', async () => {
    conSesion('INVENTARIO')
    conVehiculos([])
    renderApp('/vehiculos')

    expect(await screen.findByText('Aún no hay vehículos')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Agregar vehículo' }).length).toBeGreaterThan(0)
  })

  it('muestra el error de la API y permite reintentar', async () => {
    conSesion('INVENTARIO')
    let intentos = 0
    servidor.use(
      http.get(`${API}/api/v1/vehiculos`, () => {
        intentos += 1
        return intentos === 1
          ? HttpResponse.json({ message: 'Servicio no disponible' }, { status: 503 })
          : HttpResponse.json([SENTRA])
      }),
    )
    renderApp('/vehiculos')

    expect(await screen.findByText('Servicio no disponible')).toBeInTheDocument()
    await userEvent.setup({ delay: null }).click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('3N1AB8CV5PY123456')).toBeInTheDocument()
  })

  it('lleva a la edición desde el menú de la fila', async () => {
    conSesion('INVENTARIO')
    conVehiculos()
    servidor.use(http.get(`${API}/api/v1/vehiculos/1`, () => HttpResponse.json(SENTRA)))
    renderApp('/vehiculos')
    const usuario = userEvent.setup({ delay: null })

    await usuario.click(await screen.findByRole('button', { name: 'Acciones de 3N1AB8CV5PY123456' }))
    await usuario.click(await screen.findByRole('menuitem', { name: 'Editar' }))

    expect(await screen.findByRole('heading', { name: 'Editar vehículo' })).toBeInTheDocument()
  })

  it('cierra la sesión si el token ya no es válido', async () => {
    conSesion('INVENTARIO')
    servidor.use(http.get(`${API}/api/v1/vehiculos`, () => new HttpResponse(null, { status: 401 })))
    renderApp('/vehiculos')

    expect(await screen.findByText('Tu sesión expiró. Inicia sesión de nuevo.')).toBeInTheDocument()
  })

  it('pagina de 10 en 10', async () => {
    conSesion('INVENTARIO')
    const doce = Array.from({ length: 12 }, (_, i) => ({
      ...SENTRA,
      id: i + 1,
      vin: `3N1AB8CV5PY1234${String(i).padStart(2, '0')}`,
    }))
    conVehiculos(doce)
    renderApp('/vehiculos')
    const usuario = userEvent.setup({ delay: null })

    expect(await screen.findByText('Mostrando 1 a 10 de 12 vehículos')).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(11)
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()

    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByText('Mostrando 11 a 12 de 12 vehículos')).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()

    await usuario.click(screen.getByRole('button', { name: 'Anterior' }))
    expect(screen.getByText('Mostrando 1 a 10 de 12 vehículos')).toBeInTheDocument()
  })

  it('al buscar regresa a la primera página', async () => {
    conSesion('INVENTARIO')
    conVehiculos(
      Array.from({ length: 12 }, (_, i) => ({
        ...SENTRA,
        id: i + 1,
        vin: `3N1AB8CV5PY1234${String(i).padStart(2, '0')}`,
      })),
    )
    renderApp('/vehiculos')
    const usuario = userEvent.setup({ delay: null })

    await usuario.click(await screen.findByRole('button', { name: 'Siguiente' }))
    await usuario.type(screen.getByLabelText('Buscar vehículo'), '123411')

    expect(screen.getByText('Mostrando 1 a 1 de 1 vehículos')).toBeInTheDocument()
  })

})

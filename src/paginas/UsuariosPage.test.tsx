import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import type { RolApi, UsuarioApi } from '../api/acceso.ts'
import { servidor } from '../test/servidor.ts'
import { API, conSesion, renderApp } from '../test/utilidades.ts'

const ROLES: RolApi[] = [
  { nombre: 'CAJA', descripcion: 'Registro de cobros', accesoErp: true, accesoCrm: false },
  { nombre: 'INVENTARIO', descripcion: 'Inventario', accesoErp: true, accesoCrm: false },
]

const CAJERO: UsuarioApi = {
  id: 1,
  usuario: 'caja1',
  nombre: 'Carla Cajera',
  rol: 'CAJA',
  activo: true,
}

describe('Administración de usuarios', () => {
  let token: string

  beforeEach(() => {
    token = conSesion('ADMINISTRADOR')
    servidor.use(
      http.get(`${API}/api/v1/usuarios`, ({ request }) =>
        request.headers.get('Authorization') === `Bearer ${token}`
          ? HttpResponse.json([CAJERO])
          : new HttpResponse(null, { status: 401 }),
      ),
      http.get(`${API}/api/v1/roles`, () => HttpResponse.json(ROLES)),
    )
  })

  it('lista los usuarios del ERP enviando el token', async () => {
    renderApp('/usuarios')

    const fila = (await screen.findByText('Carla Cajera')).closest('tr')!
    expect(within(fila).getByText('caja1')).toBeInTheDocument()
    expect(within(fila).getByRole('combobox', { name: 'Rol de caja1' })).toHaveValue('CAJA')
  })

  it('crea un usuario y lo agrega a la lista', async () => {
    let cuerpoEnviado: unknown
    servidor.use(
      http.post(`${API}/api/v1/usuarios`, async ({ request }) => {
        cuerpoEnviado = await request.json()
        return HttpResponse.json(
          { id: 2, usuario: 'inv1', nombre: 'Iván Inventario', rol: 'INVENTARIO', activo: true },
          { status: 201 },
        )
      }),
    )
    renderApp('/usuarios')
    await screen.findByText('Carla Cajera')
    const usuarioEvento = userEvent.setup()

    await usuarioEvento.type(screen.getByLabelText('Usuario'), 'inv1')
    await usuarioEvento.type(screen.getByLabelText('Nombre'), 'Iván Inventario')
    await usuarioEvento.type(screen.getByLabelText('Contraseña'), 'Otra12345')
    await usuarioEvento.selectOptions(screen.getByLabelText('Rol'), 'INVENTARIO')
    await usuarioEvento.click(screen.getByRole('button', { name: 'Crear usuario' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Usuario inv1 creado.')
    expect(screen.getByText('Iván Inventario')).toBeInTheDocument()
    expect(cuerpoEnviado).toEqual({
      usuario: 'inv1',
      nombre: 'Iván Inventario',
      contrasena: 'Otra12345',
      rol: 'INVENTARIO',
    })
  })

  it('muestra el error del backend si el usuario ya existe', async () => {
    servidor.use(
      http.post(`${API}/api/v1/usuarios`, () =>
        HttpResponse.json(
          { status: 409, error: 'Conflict', message: 'Ya existe un usuario con el nombre de usuario caja1' },
          { status: 409 },
        ),
      ),
    )
    renderApp('/usuarios')
    await screen.findByText('Carla Cajera')
    const usuarioEvento = userEvent.setup()

    await usuarioEvento.type(screen.getByLabelText('Usuario'), 'caja1')
    await usuarioEvento.type(screen.getByLabelText('Nombre'), 'Otra persona')
    await usuarioEvento.type(screen.getByLabelText('Contraseña'), 'Otra12345')
    await usuarioEvento.selectOptions(screen.getByLabelText('Rol'), 'CAJA')
    await usuarioEvento.click(screen.getByRole('button', { name: 'Crear usuario' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ya existe un usuario con el nombre de usuario caja1',
    )
  })

  it('pide todos los campos antes de crear', async () => {
    renderApp('/usuarios')
    await screen.findByText('Carla Cajera')

    await userEvent.setup().click(screen.getByRole('button', { name: 'Crear usuario' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Completa usuario, nombre, contraseña y rol.')
  })

  it('cambia el rol de un usuario', async () => {
    let cuerpoEnviado: unknown
    servidor.use(
      http.put(`${API}/api/v1/usuarios/1/rol`, async ({ request }) => {
        cuerpoEnviado = await request.json()
        return HttpResponse.json({ ...CAJERO, rol: 'INVENTARIO' })
      }),
    )
    renderApp('/usuarios')
    const selector = await screen.findByRole('combobox', { name: 'Rol de caja1' })

    await userEvent.setup().selectOptions(selector, 'INVENTARIO')

    expect(await screen.findByRole('status')).toHaveTextContent(
      'El rol de caja1 ahora es Inventario.',
    )
    expect(cuerpoEnviado).toEqual({ rol: 'INVENTARIO' })
    expect(selector).toHaveValue('INVENTARIO')
  })

  it('no permite que el administrador cambie su propio rol', async () => {
    servidor.use(
      http.get(`${API}/api/v1/usuarios`, () =>
        HttpResponse.json([
          { id: 9, usuario: 'usuario.prueba', nombre: 'Persona de Prueba', rol: 'ADMINISTRADOR', activo: true },
          CAJERO,
        ]),
      ),
    )
    renderApp('/usuarios')

    expect(await screen.findByRole('combobox', { name: 'Rol de usuario.prueba' })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Rol de caja1' })).toBeEnabled()
  })

  it('cierra la sesión si el backend responde que el token ya no es válido', async () => {
    servidor.use(
      http.get(`${API}/api/v1/usuarios`, () => new HttpResponse(null, { status: 401 })),
    )
    renderApp('/usuarios')

    expect(
      await screen.findByText('Tu sesión expiró. Inicia sesión de nuevo.'),
    ).toBeInTheDocument()
    expect(sessionStorage.length).toBe(0)
  })
})

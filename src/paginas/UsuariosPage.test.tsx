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

const CAJERO: UsuarioApi = { id: 1, usuario: 'caja1', nombre: 'Carla Cajera', rol: 'CAJA', activo: true }
const PROPIO: UsuarioApi = {
  id: 9,
  usuario: 'usuario.prueba',
  nombre: 'Persona de Prueba',
  rol: 'ADMINISTRADOR',
  activo: true,
}

async function abrirCrearUsuario() {
  const usuarioEvento = userEvent.setup()
  await screen.findByText('Carla Cajera')
  await usuarioEvento.click(screen.getByRole('button', { name: 'Crear usuario' }))
  return { usuarioEvento, dialogo: await screen.findByRole('dialog', { name: 'Crear usuario' }) }
}

async function elegirRol(usuarioEvento: ReturnType<typeof userEvent.setup>, combo: HTMLElement, rol: string) {
  await usuarioEvento.click(combo)
  await usuarioEvento.click(await screen.findByRole('option', { name: rol }))
}

describe('Administración de usuarios', () => {
  let token: string

  beforeEach(() => {
    token = conSesion('ADMINISTRADOR')
    servidor.use(
      http.get(`${API}/api/v1/usuarios`, ({ request }) =>
        request.headers.get('Authorization') === `Bearer ${token}`
          ? HttpResponse.json([CAJERO, PROPIO])
          : new HttpResponse(null, { status: 401 }),
      ),
      http.get(`${API}/api/v1/roles`, () => HttpResponse.json(ROLES)),
    )
  })

  it('lista los usuarios del ERP enviando el token', async () => {
    renderApp('/usuarios')

    expect(await screen.findByRole('heading', { level: 1, name: 'Usuarios y roles' })).toBeInTheDocument()
    const fila = (await screen.findByText('Carla Cajera')).closest('tr')!
    expect(within(fila).getByText('caja1')).toBeInTheDocument()
    expect(within(fila).getByText('Caja')).toBeInTheDocument()
    expect(within(fila).getByText('Activo')).toBeInTheDocument()
  })

  it('busca por nombre o usuario', async () => {
    renderApp('/usuarios')
    await screen.findByText('Carla Cajera')

    await userEvent.setup().type(screen.getByLabelText('Buscar usuario'), 'prueba')

    expect(screen.queryByText('Carla Cajera')).not.toBeInTheDocument()
    expect(screen.getByText('usuario.prueba')).toBeInTheDocument()
  })

  it('filtra por rol', async () => {
    renderApp('/usuarios')
    await screen.findByText('Carla Cajera')
    const usuarioEvento = userEvent.setup()

    await elegirRol(usuarioEvento, screen.getByRole('combobox', { name: 'Rol' }), 'Inventario')

    expect(screen.getByText('Ningún usuario coincide')).toBeInTheDocument()
  })

  it('crea un usuario desde el diálogo y lo agrega a la lista', async () => {
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
    const { usuarioEvento, dialogo } = await abrirCrearUsuario()

    await usuarioEvento.type(within(dialogo).getByLabelText('Nombre completo'), 'Iván Inventario')
    await usuarioEvento.type(within(dialogo).getByLabelText('Usuario'), 'inv1')
    await elegirRol(usuarioEvento, within(dialogo).getByRole('combobox', { name: 'Rol' }), 'Inventario')
    await usuarioEvento.type(within(dialogo).getByLabelText('Contraseña inicial'), 'Otra12345')
    await usuarioEvento.click(within(dialogo).getByRole('button', { name: 'Crear usuario' }))

    expect(await screen.findByText('Usuario inv1 creado.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Iván Inventario')).toBeInTheDocument()
    expect(cuerpoEnviado).toEqual({
      nombre: 'Iván Inventario',
      usuario: 'inv1',
      contrasena: 'Otra12345',
      rol: 'INVENTARIO',
    })
  })

  it('marca el usuario repetido con el mensaje del backend y conserva lo capturado', async () => {
    servidor.use(
      http.post(`${API}/api/v1/usuarios`, () =>
        HttpResponse.json(
          { status: 409, error: 'Conflict', message: 'Ya existe un usuario con el nombre de usuario caja1' },
          { status: 409 },
        ),
      ),
    )
    renderApp('/usuarios')
    const { usuarioEvento, dialogo } = await abrirCrearUsuario()

    await usuarioEvento.type(within(dialogo).getByLabelText('Nombre completo'), 'Otra persona')
    await usuarioEvento.type(within(dialogo).getByLabelText('Usuario'), 'caja1')
    await elegirRol(usuarioEvento, within(dialogo).getByRole('combobox', { name: 'Rol' }), 'Caja')
    await usuarioEvento.type(within(dialogo).getByLabelText('Contraseña inicial'), 'Otra12345')
    await usuarioEvento.click(within(dialogo).getByRole('button', { name: 'Crear usuario' }))

    expect(
      await within(dialogo).findByText('Ya existe un usuario con el nombre de usuario caja1'),
    ).toBeInTheDocument()
    expect(within(dialogo).getByLabelText('Usuario')).toHaveAttribute('aria-invalid', 'true')
    expect(within(dialogo).getByLabelText('Nombre completo')).toHaveValue('Otra persona')
  })

  it('pide todos los campos antes de crear', async () => {
    renderApp('/usuarios')
    const { usuarioEvento, dialogo } = await abrirCrearUsuario()

    await usuarioEvento.click(within(dialogo).getByRole('button', { name: 'Crear usuario' }))

    expect(await within(dialogo).findByText('Escribe el nombre completo.')).toBeInTheDocument()
    expect(within(dialogo).getByText('Escribe el usuario.')).toBeInTheDocument()
    expect(within(dialogo).getByText('Elige un rol.')).toBeInTheDocument()
    expect(within(dialogo).getByText('Escribe la contraseña inicial.')).toBeInTheDocument()
  })

  it('cambia el rol desde el menú de la fila', async () => {
    let cuerpoEnviado: unknown
    servidor.use(
      http.put(`${API}/api/v1/usuarios/1/rol`, async ({ request }) => {
        cuerpoEnviado = await request.json()
        return HttpResponse.json({ ...CAJERO, rol: 'INVENTARIO' })
      }),
    )
    renderApp('/usuarios')
    await screen.findByText('Carla Cajera')
    const usuarioEvento = userEvent.setup()

    await usuarioEvento.click(screen.getByRole('button', { name: 'Acciones de caja1' }))
    await usuarioEvento.click(await screen.findByRole('menuitem', { name: 'Cambiar rol' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Cambiar rol' })
    await elegirRol(usuarioEvento, within(dialogo).getByRole('combobox', { name: 'Nuevo rol' }), 'Inventario')
    await usuarioEvento.click(within(dialogo).getByRole('button', { name: 'Guardar rol' }))

    expect(await screen.findByText('El rol de caja1 ahora es Inventario.')).toBeInTheDocument()
    expect(cuerpoEnviado).toEqual({ rol: 'INVENTARIO' })
    const fila = screen.getByText('Carla Cajera').closest('tr')!
    expect(within(fila).getByText('Inventario')).toBeInTheDocument()
  })

  it('no permite que el administrador cambie su propio rol', async () => {
    renderApp('/usuarios')
    await screen.findByText('usuario.prueba')

    await userEvent.setup().click(screen.getByRole('button', { name: 'Acciones de usuario.prueba' }))

    expect(
      await screen.findByRole('menuitem', { name: 'No puedes cambiar tu propio rol' }),
    ).toHaveAttribute('aria-disabled', 'true')
  })

  it('cierra la sesión si el backend responde que el token ya no es válido', async () => {
    servidor.use(http.get(`${API}/api/v1/usuarios`, () => new HttpResponse(null, { status: 401 })))
    renderApp('/usuarios')

    expect(await screen.findByText('Tu sesión expiró. Inicia sesión de nuevo.')).toBeInTheDocument()
    expect(sessionStorage.length).toBe(0)
  })
})

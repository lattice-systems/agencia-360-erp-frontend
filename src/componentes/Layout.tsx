import { NavLink, Outlet } from 'react-router'
import { seccionesPara } from '../navegacion/secciones.ts'
import { NOMBRE_ROL } from '../sesion/roles.ts'
import { useSesion } from '../sesion/useSesion.ts'

export function Layout() {
  const { sesion, cerrar } = useSesion()
  if (!sesion) {
    return null
  }

  return (
    <div className="layout">
      <header className="encabezado">
        <span className="marca">Agencia360 ERP</span>
        <nav aria-label="Principal" className="menu">
          <NavLink to="/" end>
            Inicio
          </NavLink>
          {seccionesPara(sesion.rol).map((seccion) => (
            <NavLink key={seccion.ruta} to={seccion.ruta}>
              {seccion.titulo}
            </NavLink>
          ))}
        </nav>
        <div className="usuario-actual">
          <span>
            {sesion.nombre} · {NOMBRE_ROL[sesion.rol]}
          </span>
          <button type="button" className="secundario" onClick={() => cerrar()}>
            Cerrar sesión
          </button>
        </div>
      </header>
      <main className="contenido">
        <Outlet />
      </main>
    </div>
  )
}

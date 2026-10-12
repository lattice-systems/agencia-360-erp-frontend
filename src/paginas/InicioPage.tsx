import { Link } from 'react-router'
import { seccionesPara } from '../navegacion/secciones.ts'
import { NOMBRE_ROL } from '../sesion/roles.ts'
import { useSesion } from '../sesion/useSesion.ts'

export function InicioPage() {
  const { sesion } = useSesion()
  if (!sesion) {
    return null
  }
  const secciones = seccionesPara(sesion.rol)

  return (
    <section className="pagina">
      <h1>Hola, {sesion.nombre}</h1>
      <p>Rol: {NOMBRE_ROL[sesion.rol]}</p>
      {secciones.length > 0 ? (
        <ul className="accesos">
          {secciones.map((seccion) => (
            <li key={seccion.ruta}>
              <Link to={seccion.ruta}>{seccion.titulo}</Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ayuda">Todavía no hay módulos disponibles para tu rol.</p>
      )}
    </section>
  )
}

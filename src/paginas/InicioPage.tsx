import { Link } from 'react-router'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Hola, {sesion.nombre}</h1>
        <p className="text-sm text-muted-foreground">Rol: {NOMBRE_ROL[sesion.rol]}</p>
      </div>
      {secciones.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {secciones.map((seccion) => {
            const Icono = seccion.icono
            return (
              <li key={seccion.ruta}>
                <Link to={seccion.ruta} className="block rounded-lg">
                  <Card className="transition-colors hover:bg-accent">
                    <CardHeader>
                      <Icono aria-hidden="true" className="size-5 text-marca-acento-claro" />
                      <CardTitle className="text-lg">{seccion.titulo}</CardTitle>
                      <CardDescription>{seccion.grupo}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="py-12 text-center text-muted-foreground">
          Todavía no hay módulos disponibles para tu rol.
        </p>
      )}
    </section>
  )
}

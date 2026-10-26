import { FolderSearch, LayoutGrid } from 'lucide-react'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from '@/components/ui/empty'
import type { Rol } from '../api/acceso.ts'
import { Pendiente } from '../inicio/Pendiente.tsx'
import { ResumenAdministrador } from '../inicio/ResumenAdministrador.tsx'
import { ResumenFacturacion } from '../inicio/ResumenFacturacion.tsx'
import { ResumenInventario } from '../inicio/ResumenInventario.tsx'
import { ResumenPagos } from '../inicio/ResumenPagos.tsx'
import { fechaLarga, primerNombre, saludoPorHora } from '../inicio/saludo.ts'
import { seccionesPara } from '../navegacion/secciones.ts'
import { useSesion } from '../sesion/useSesion.ts'

/** Lo que cada rol tiene que hacer hoy, primero; después sus números. */
function ResumenDelRol({ rol }: { rol: Rol }) {
  switch (rol) {
    case 'INVENTARIO':
    case 'REFACCIONES':
      return <ResumenInventario rol={rol} />
    case 'ADMINISTRADOR':
      return <ResumenAdministrador />
    case 'CAJA':
    case 'CONTABILIDAD':
      return <ResumenPagos rol={rol} />
    case 'FACTURACION':
      return <ResumenFacturacion />
    case 'SERVICIO':
      return (
        <Pendiente
          icono={FolderSearch}
          titulo="Busca el expediente de un vehículo"
          descripcion="Con el número de serie (VIN) ves su historial de servicio y corriges placas o kilometraje."
          accion={{ texto: 'Buscar expediente', ruta: '/expediente' }}
        />
      )
    default:
      return null
  }
}

export function InicioPage() {
  const { sesion } = useSesion()
  if (!sesion) {
    return null
  }
  const ahora = new Date()
  const conModulos = seccionesPara(sesion.rol).length > 0

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">
          {saludoPorHora(ahora)}, {primerNombre(sesion.nombre)}
        </h1>
        <p className="text-sm text-muted-foreground">
          Hoy es {fechaLarga(ahora)}. {conModulos && 'Esto es lo que te toca.'}
        </p>
      </div>
      {conModulos ? (
        <ResumenDelRol rol={sesion.rol} />
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LayoutGrid />
            </EmptyMedia>
            <EmptyDescription>Todavía no hay módulos disponibles para tu rol.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </section>
  )
}

import { UserCog } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { listarUsuarios } from '../api/acceso.ts'
import { useConsulta } from '../api/useConsulta.ts'
import { listarRefacciones, listarVehiculos, type EstatusVehiculo } from '../inventario/api.ts'
import { NOMBRE_ROL } from '../sesion/roles.ts'
import { ResumenCargando, ResumenConError } from './EstadosResumen.tsx'
import { Indicadores } from './Indicadores.tsx'
import { Pendiente } from './Pendiente.tsx'

async function cargar(token: string) {
  const [usuarios, vehiculos, refacciones] = await Promise.all([
    listarUsuarios(token),
    listarVehiculos(token),
    listarRefacciones(token),
  ])
  return { usuarios, vehiculos, refacciones }
}

/**
 * Inicio del Administrador: su trabajo es el personal; el inventario lo
 * consulta, así que va en números de solo lectura.
 */
export function ResumenAdministrador() {
  const { datos, cargando, error, recargar } = useConsulta(cargar)

  if (error) {
    return <ResumenConError que="el resumen" recargar={recargar} />
  }
  if (cargando || !datos) {
    return <ResumenCargando />
  }

  const { usuarios, vehiculos, refacciones } = datos
  const activos = usuarios.filter((u) => u.activo).length
  const inactivos = usuarios.filter((u) => !u.activo)
  const cuenta = (estatus: EstatusVehiculo) => vehiculos.filter((v) => v.estatus === estatus).length

  return (
    <div className="flex flex-col gap-8">
      <Pendiente
        icono={UserCog}
        titulo={`Tu equipo: ${activos} ${activos === 1 ? 'persona' : 'personas'} con acceso`}
        descripcion={
          inactivos.length > 0
            ? `${inactivos.length} ${inactivos.length === 1 ? 'cuenta está desactivada' : 'cuentas están desactivadas'}. Da de alta personal o cambia su rol cuando cambie de puesto.`
            : 'Da de alta personal o cambia su rol cuando cambie de puesto.'
        }
        accion={{ texto: 'Administrar usuarios', ruta: '/usuarios' }}
        filas={inactivos.map((u) => ({
          id: u.id,
          ruta: '/usuarios',
          titulo: u.nombre,
          detalle: `${u.usuario} · ${NOMBRE_ROL[u.rol]}`,
          persona: true,
          extra: <Badge variant="secondary">Inactivo</Badge>,
        }))}
      />

      <Indicadores
        titulo="Inventario"
        indicadores={[
          { etiqueta: 'Unidades disponibles', valor: cuenta('DISPONIBLE'), ruta: '/vehiculos?estatus=DISPONIBLE' },
          { etiqueta: 'No disponibles', valor: cuenta('NO_DISPONIBLE'), ruta: '/vehiculos?estatus=NO_DISPONIBLE' },
          { etiqueta: 'Vendidas', valor: cuenta('VENDIDO'), ruta: '/vehiculos?estatus=VENDIDO' },
          {
            etiqueta: 'Refacciones bajo mínimo',
            valor: refacciones.filter((r) => r.bajoMinimo).length,
            ruta: '/refacciones?filtro=BAJO_MINIMO',
          },
        ]}
      />
    </div>
  )
}

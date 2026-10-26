import { Package } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Rol } from '../api/acceso.ts'
import { useConsulta } from '../api/useConsulta.ts'
import {
  listarRefacciones,
  listarVehiculos,
  type EstatusVehiculo,
  type Refaccion,
  type Vehiculo,
} from '../inventario/api.ts'
import { estadoExistencia, NOMBRE_EXISTENCIA, VARIANTE_EXISTENCIA } from '../inventario/estados.ts'
import { ResumenCargando, ResumenConError } from './EstadosResumen.tsx'
import { Indicadores } from './Indicadores.tsx'
import { Pendiente, type FilaPendiente } from './Pendiente.tsx'

interface Inventario {
  vehiculos: Vehiculo[] | null
  refacciones: Refaccion[]
}

async function cargarTodo(token: string): Promise<Inventario> {
  const [vehiculos, refacciones] = await Promise.all([listarVehiculos(token), listarRefacciones(token)])
  return { vehiculos, refacciones }
}

async function cargarRefacciones(token: string): Promise<Inventario> {
  return { vehiculos: null, refacciones: await listarRefacciones(token) }
}

/** Las que llegaron a su mínimo, de la más urgente (agotada) a la menos. */
function porResurtir(refacciones: Refaccion[]) {
  return refacciones
    .filter((r) => r.bajoMinimo)
    .sort((a, b) => a.existencia / Math.max(a.minimo, 1) - b.existencia / Math.max(b.minimo, 1))
}

function plural(n: number, uno: string, varios: string) {
  return n === 1 ? uno : varios
}

/**
 * Inicio de Inventario y del Administrador (resurtido y unidades) y del rol
 * Refacciones (solo resurtido). Solo Inventario registra recepciones.
 */
export function ResumenInventario({ rol }: { rol: Rol }) {
  const conVehiculos = rol !== 'REFACCIONES'
  const { datos, cargando, error, recargar } = useConsulta(conVehiculos ? cargarTodo : cargarRefacciones)

  if (error) {
    return <ResumenConError que="el resumen del inventario" recargar={recargar} />
  }
  if (cargando || !datos) {
    return <ResumenCargando />
  }

  const { vehiculos, refacciones } = datos
  const pendientes = porResurtir(refacciones)
  const agotadas = refacciones.filter((r) => r.existencia === 0).length
  const recibe = rol === 'INVENTARIO'

  const filas: FilaPendiente[] = pendientes.map((r) => {
    const estado = estadoExistencia(r)
    return {
      id: r.id,
      ruta: recibe ? `/recepciones?refaccion=${r.id}` : '/refacciones?filtro=BAJO_MINIMO',
      titulo: r.descripcion,
      detalle: `${r.codigo} · quedan ${r.existencia}, mínimo ${r.minimo}`,
      extra: <Badge variant={VARIANTE_EXISTENCIA[estado]}>{NOMBRE_EXISTENCIA[estado]}</Badge>,
    }
  })

  const cuenta = (estatus: EstatusVehiculo) => vehiculos?.filter((v) => v.estatus === estatus).length ?? 0

  return (
    <div className="flex flex-col gap-8">
      {pendientes.length > 0 ? (
        <Pendiente
          icono={Package}
          titulo={`${pendientes.length} ${plural(pendientes.length, 'refacción llegó', 'refacciones llegaron')} a su mínimo`}
          descripcion={
            agotadas > 0
              ? `${agotadas} ya ${plural(agotadas, 'está agotada', 'están agotadas')}. ${recibe ? 'Registra su recepción cuando llegue el pedido.' : 'Avisa a Inventario para resurtir.'}`
              : recibe
                ? 'Registra su recepción cuando llegue el pedido.'
                : 'Avisa a Inventario para resurtir.'
          }
          accion={
            recibe
              ? { texto: 'Registrar recepción', ruta: '/recepciones' }
              : { texto: 'Ver refacciones', ruta: '/refacciones?filtro=BAJO_MINIMO' }
          }
          rutaLista="/refacciones?filtro=BAJO_MINIMO"
          filas={filas}
        />
      ) : (
        <Pendiente
          alDia
          icono={Package}
          titulo="Todas las refacciones están arriba de su mínimo"
          descripcion="Cuando alguna llegue a su mínimo, aparecerá aquí."
          accion={{ texto: 'Ver refacciones', ruta: '/refacciones' }}
        />
      )}

      {vehiculos ? (
        <Indicadores
          titulo="Unidades en inventario"
          indicadores={[
            { etiqueta: 'Disponibles', valor: cuenta('DISPONIBLE'), ruta: '/vehiculos?estatus=DISPONIBLE' },
            { etiqueta: 'No disponibles', valor: cuenta('NO_DISPONIBLE'), ruta: '/vehiculos?estatus=NO_DISPONIBLE' },
            { etiqueta: 'Vendidas', valor: cuenta('VENDIDO'), ruta: '/vehiculos?estatus=VENDIDO' },
            { etiqueta: 'Entregadas', valor: cuenta('ENTREGADO'), ruta: '/vehiculos?estatus=ENTREGADO' },
          ]}
        />
      ) : (
        <Indicadores
          titulo="Existencias"
          indicadores={[
            // Mismas cuentas que los filtros de la lista: "Bajo mínimo" incluye las agotadas.
            { etiqueta: 'Bajo mínimo', valor: pendientes.length, ruta: '/refacciones?filtro=BAJO_MINIMO' },
            { etiqueta: 'Sin existencia', valor: agotadas, ruta: '/refacciones?filtro=SIN_EXISTENCIA' },
            { etiqueta: 'Registradas', valor: refacciones.length, ruta: '/refacciones' },
          ]}
        />
      )}
    </div>
  )
}

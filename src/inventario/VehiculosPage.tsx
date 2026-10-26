import { Ban, Car, CircleCheck, Ellipsis, Plus, Radio, ReceiptText, Search, WifiOff } from 'lucide-react'
import { useMemo, useState, type ComponentProps } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useIsMobile } from '@/hooks/use-mobile'
import { formatearMoneda } from '@/lib/formato'
import { deLaPagina } from '@/lib/paginacion'
import { useConsulta } from '../api/useConsulta.ts'
import { useEnVivo, type EstadoEnVivo } from '../api/useEnVivo.ts'
import { Badge } from '@/components/ui/badge'
import { EncabezadoPagina } from '../componentes/EncabezadoPagina.tsx'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Paginacion } from '../componentes/Paginacion.tsx'
import { TablaCargando } from '../componentes/TablaCargando.tsx'
import { TarjetaDato } from '../componentes/TarjetaDato.tsx'
import { useSesion } from '../sesion/useSesion.ts'
import { ESTATUS_VEHICULO, listarVehiculos, type EstatusVehiculo, type Vehiculo } from './api.ts'
import { NOMBRE_ESTATUS, VARIANTE_ESTATUS } from './estados.ts'

const POR_PAGINA = 10
const TODOS = 'TODOS'

/**
 * Inventario de vehículos (ERP-2.0): consulta para Inventario y Administrador.
 * Se actualiza solo cuando cambia una unidad (ERP-2.1).
 */
export function VehiculosPage() {
  const { sesion } = useSesion()
  const puedeOperar = sesion?.rol === 'INVENTARIO'
  const { datos, cargando, error, recargar, refrescar } = useConsulta(listarVehiculos)
  const enVivo = useEnVivo('/api/v1/vehiculos/eventos', 'vehiculos', refrescar)
  const [busqueda, setBusqueda] = useState('')
  // Inicio enlaza a la lista ya filtrada (?estatus=DISPONIBLE).
  const [parametros] = useSearchParams()
  const [estatus, setEstatus] = useState<EstatusVehiculo | typeof TODOS>(() => {
    const inicial = parametros.get('estatus')
    return ESTATUS_VEHICULO.find((valor) => valor === inicial) ?? TODOS
  })
  const [pagina, setPagina] = useState(1)

  const vehiculos = useMemo(() => datos ?? [], [datos])
  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return vehiculos.filter(
      (v) =>
        (estatus === TODOS || v.estatus === estatus) &&
        (!texto ||
          v.vin.toLowerCase().includes(texto) ||
          v.modelo.toLowerCase().includes(texto) ||
          v.version.toLowerCase().includes(texto)),
    )
  }, [vehiculos, busqueda, estatus])

  const cuenta = (...lista: EstatusVehiculo[]) =>
    vehiculos.filter((v) => lista.includes(v.estatus)).length

  const agregar = puedeOperar ? (
    <Button asChild>
      <Link to="/vehiculos/nuevo">
        <Plus aria-hidden="true" />
        Agregar vehículo
      </Link>
    </Button>
  ) : undefined

  return (
    <section className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Vehículos"
        descripcion={puedeOperar
        ? 'Consulta el inventario y registra nuevas unidades.'
        : 'Consulta las unidades del inventario.'}
        accion={
          <div className="flex flex-wrap items-center gap-3">
            <IndicadorEnVivo estado={enVivo} />
            {agregar}
          </div>
        }
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudieron cargar los vehículos</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            {error}
            <Button variant="outline" onClick={recargar}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : cargando ? (
        <TablaCargando />
      ) : vehiculos.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Car /></EmptyMedia>
            <EmptyTitle>Aún no hay vehículos</EmptyTitle>
            <EmptyDescription>
              {puedeOperar
                ? 'Registra la primera unidad para empezar.'
                : 'Cuando Inventario registre unidades, aparecerán aquí.'}
            </EmptyDescription>
          </EmptyHeader>
          {agregar && <EmptyContent>{agregar}</EmptyContent>}
        </Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 @3xl/main:grid-cols-4">
            <TarjetaDato etiqueta="Unidades registradas" valor={vehiculos.length} icono={Car} />
            <TarjetaDato etiqueta="Disponibles" valor={cuenta('DISPONIBLE')} icono={CircleCheck} />
            <TarjetaDato etiqueta="Vendidas" valor={cuenta('VENDIDO')} icono={ReceiptText} />
            <TarjetaDato etiqueta="No disponibles" valor={cuenta('NO_DISPONIBLE')} icono={Ban} />
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_16rem]">
            <div className="flex flex-col gap-2">
              <Label htmlFor="buscar-vehiculo">Buscar vehículo</Label>
              <InputGroup>
                <InputGroupAddon>
                  <Search aria-hidden="true" />
                </InputGroupAddon>
                <InputGroupInput
                  id="buscar-vehiculo"
                  type="search"
                  placeholder="Número de serie, tipo o versión"
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(e.target.value)
                    setPagina(1)
                  }}
                />
              </InputGroup>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="filtro-estatus">Estatus</Label>
              <Select
                value={estatus}
                onValueChange={(valor) => {
                  setEstatus(valor as EstatusVehiculo | typeof TODOS)
                  setPagina(1)
                }}
              >
                <SelectTrigger id="filtro-estatus" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS}>Todos los estatus</SelectItem>
                  {ESTATUS_VEHICULO.map((valor) => (
                    <SelectItem key={valor} value={valor}>
                      {NOMBRE_ESTATUS[valor]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {filtrados.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon"><Search /></EmptyMedia>
                <EmptyTitle>Ningún vehículo coincide</EmptyTitle>
                <EmptyDescription>
                  Prueba con otro número de serie, tipo o estatus.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <ListaVehiculos
                vehiculos={deLaPagina(filtrados, pagina, POR_PAGINA)}
                puedeOperar={puedeOperar}
              />
              <Paginacion
                pagina={pagina}
                porPagina={POR_PAGINA}
                total={filtrados.length}
                nombre="vehículos"
                onCambiar={setPagina}
              />
            </>
          )}
        </>
      )}
    </section>
  )
}

type Variante = ComponentProps<typeof Badge>['variant']

const ESTADO_EN_VIVO: Record<
  EstadoEnVivo,
  { texto: string; variante: Variante; icono: typeof Radio }
> = {
  conectando: { texto: 'Conectando…', variante: 'secondary', icono: Radio },
  conectado: { texto: 'En vivo', variante: 'success', icono: Radio },
  reconectando: {
    texto: 'Sin conexión en vivo. Reintentando…',
    variante: 'warning',
    icono: WifiOff,
  },
}

/** Dice si la lista se está actualizando sola; los lectores de pantalla lo anuncian. */
function IndicadorEnVivo({ estado }: { estado: EstadoEnVivo }) {
  const { texto, variante, icono: Icono } = ESTADO_EN_VIVO[estado]
  return (
    <span role="status">
      <Badge variant={variante}>
        <Icono aria-hidden="true" data-icon="inline-start" />
        {texto}
      </Badge>
    </span>
  )
}

function ListaVehiculos({ vehiculos, puedeOperar }: { vehiculos: Vehiculo[]; puedeOperar: boolean }) {
  // Menos de 1024 px: una tarjeta por elemento, como el menú lateral.
  const movil = useIsMobile()
  if (!movil) {
    return (
      // Escritorio: tabla
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              {/* Nombres de la factura (ERP-2.2): Tipo = `modelo` y Modelo = `anio`. */}
              <TableHead>Número de serie (VIN)</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Versión</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead>Color</TableHead>
              <TableHead className="text-right">Precio (MXN)</TableHead>
              <TableHead>Estatus</TableHead>
              {puedeOperar && (
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehiculos.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-mono text-sm">{v.vin}</TableCell>
                <TableCell className="font-medium">{v.modelo}</TableCell>
                <TableCell>{v.version}</TableCell>
                <TableCell className="tabular-nums">{v.anio}</TableCell>
                <TableCell>{v.color}</TableCell>
                <TableCell className="text-right tabular-nums">{formatearMoneda(v.precio)}</TableCell>
                <TableCell>
                  <Badge variant={VARIANTE_ESTATUS[v.estatus]}>{NOMBRE_ESTATUS[v.estatus]}</Badge>
                </TableCell>
                {puedeOperar && (
                  <TableCell className="w-12 text-right">
                    <AccionesVehiculo vehiculo={v} />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    // Celular: una tarjeta por unidad
    <ul className="flex flex-col gap-3">
      {vehiculos.map((v) => (
        <li key={v.id}>
          <Card className="gap-2 py-4">
            <div className="flex items-start justify-between gap-2 px-4">
              <div>
                <p className="font-semibold">
                  {v.modelo} {v.version}
                </p>
                <p className="font-mono text-xs text-muted-foreground">{v.vin}</p>
              </div>
              {puedeOperar && <AccionesVehiculo vehiculo={v} />}
            </div>
            <p className="px-4 text-lg font-semibold tabular-nums">
              {formatearMoneda(v.precio)} MXN
            </p>
            <div className="flex items-center gap-2 px-4 text-sm text-muted-foreground">
              <Badge variant={VARIANTE_ESTATUS[v.estatus]}>{NOMBRE_ESTATUS[v.estatus]}</Badge>
              {v.color} · Modelo {v.anio}
            </div>
          </Card>
        </li>
      ))}
    </ul>
  )
}

function AccionesVehiculo({ vehiculo }: { vehiculo: Vehiculo }) {
  const navegar = useNavigate()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Acciones de ${vehiculo.vin}`}>
          <Ellipsis aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => navegar(`/vehiculos/${vehiculo.id}/editar`)}>
          Editar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

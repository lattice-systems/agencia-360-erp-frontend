import { CircleAlert, Ellipsis, Package, Plus, Search, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
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
import { formatearMoneda, formatearNumero } from '@/lib/formato'
import { deLaPagina } from '@/lib/paginacion'
import { useConsulta } from '../api/useConsulta.ts'
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
import { listarRefacciones, type Refaccion } from './api.ts'
import { estadoExistencia, NOMBRE_EXISTENCIA, VARIANTE_EXISTENCIA } from './estados.ts'
import { HistorialRecepciones } from './HistorialRecepciones.tsx'

const POR_PAGINA = 10
type Filtro = 'TODAS' | 'BAJO_MINIMO' | 'SIN_EXISTENCIA'

/**
 * Refacciones (ERP-2.0): Inventario las opera; Refacciones y el Administrador
 * consultan el stock y reciben el aviso de las que llegaron al mínimo
 * (decisión del PO del 13 de octubre).
 */
export function RefaccionesPage() {
  const { sesion } = useSesion()
  const puedeOperar = sesion?.rol === 'INVENTARIO'
  const { datos, cargando, error, recargar } = useConsulta(listarRefacciones)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('TODAS')
  const [pagina, setPagina] = useState(1)
  const [historialDe, setHistorialDe] = useState<Refaccion | null>(null)

  const refacciones = useMemo(() => datos ?? [], [datos])
  const porResurtir = refacciones.filter((r) => r.bajoMinimo).length
  const sinExistencia = refacciones.filter((r) => r.existencia === 0).length

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return refacciones.filter(
      (r) =>
        (filtro === 'TODAS' ||
          (filtro === 'BAJO_MINIMO' && r.bajoMinimo) ||
          (filtro === 'SIN_EXISTENCIA' && r.existencia === 0)) &&
        (!texto ||
          r.codigo.toLowerCase().includes(texto) ||
          r.descripcion.toLowerCase().includes(texto)),
    )
  }, [refacciones, busqueda, filtro])

  function cambiarFiltro(valor: Filtro) {
    setFiltro(valor)
    setPagina(1)
  }

  const agregar = puedeOperar ? (
    <Button asChild>
      <Link to="/refacciones/nueva">
        <Plus aria-hidden="true" />
        Agregar refacción
      </Link>
    </Button>
  ) : undefined

  return (
    <section className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Refacciones"
        descripcion="Consulta existencias, costos y precios."
        accion={agregar}
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudieron cargar las refacciones</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            {error}
            <Button variant="outline" onClick={recargar}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : cargando ? (
        <TablaCargando />
      ) : refacciones.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Package /></EmptyMedia>
            <EmptyTitle>Aún no hay refacciones</EmptyTitle>
            <EmptyDescription>
              {puedeOperar
                ? 'Agrega la primera refacción; después registra sus entradas en Recepciones.'
                : 'Cuando Inventario registre refacciones, aparecerán aquí.'}
            </EmptyDescription>
          </EmptyHeader>
          {agregar && <EmptyContent>{agregar}</EmptyContent>}
        </Empty>
      ) : (
        <>
          {porResurtir > 0 && (
            <Alert variant="warning">
              <TriangleAlert aria-hidden="true" />
              <AlertTitle>
                {porResurtir === 1
                  ? '1 refacción llegó a su existencia mínima'
                  : `${porResurtir} refacciones llegaron a su existencia mínima`}
              </AlertTitle>
              <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                Revisa cuáles hay que resurtir.
                {filtro !== 'BAJO_MINIMO' && (
                  <Button variant="outline" onClick={() => cambiarFiltro('BAJO_MINIMO')}>
                    Ver por resurtir
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <TarjetaDato etiqueta="Refacciones registradas" valor={refacciones.length} icono={Package} />
            <TarjetaDato etiqueta="Bajo mínimo" valor={porResurtir} icono={TriangleAlert} />
            <TarjetaDato etiqueta="Sin existencia" valor={sinExistencia} icono={CircleAlert} />
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_16rem]">
            <div className="flex flex-col gap-2">
              <Label htmlFor="buscar-refaccion">Buscar refacción</Label>
              <InputGroup>
                <InputGroupAddon>
                  <Search aria-hidden="true" />
                </InputGroupAddon>
                <InputGroupInput
                  id="buscar-refaccion"
                  type="search"
                  placeholder="Código o descripción"
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(e.target.value)
                    setPagina(1)
                  }}
                />
              </InputGroup>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="filtro-existencia">Existencia</Label>
              <Select value={filtro} onValueChange={(valor) => cambiarFiltro(valor as Filtro)}>
                <SelectTrigger id="filtro-existencia" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas las existencias</SelectItem>
                  <SelectItem value="BAJO_MINIMO">Bajo mínimo</SelectItem>
                  <SelectItem value="SIN_EXISTENCIA">Sin existencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filtradas.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon"><Search /></EmptyMedia>
                <EmptyTitle>Ninguna refacción coincide</EmptyTitle>
                <EmptyDescription>
                  Prueba con otro código, descripción o existencia.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <ListaRefacciones
                refacciones={deLaPagina(filtradas, pagina, POR_PAGINA)}
                puedeOperar={puedeOperar}
                onVerRecepciones={setHistorialDe}
              />
              <Paginacion
                pagina={pagina}
                porPagina={POR_PAGINA}
                total={filtradas.length}
                nombre="refacciones"
                onCambiar={setPagina}
              />
            </>
          )}
        </>
      )}

      <HistorialRecepciones refaccion={historialDe} onCerrar={() => setHistorialDe(null)} />
    </section>
  )
}

interface PropsLista {
  refacciones: Refaccion[]
  puedeOperar: boolean
  onVerRecepciones: (refaccion: Refaccion) => void
}

function ListaRefacciones({ refacciones, puedeOperar, onVerRecepciones }: PropsLista) {
  // Menos de 1024 px: una tarjeta por elemento, como el menú lateral.
  const movil = useIsMobile()
  if (!movil) {
    return (
      // Escritorio: tabla con importes a la derecha
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Costo</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">Existencia</TableHead>
              <TableHead className="text-right">Mínimo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {refacciones.map((r) => {
              const estado = estadoExistencia(r)
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{r.codigo}</TableCell>
                  <TableCell className="whitespace-normal">{r.descripcion}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatearMoneda(r.costo)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatearMoneda(r.precio)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatearNumero(r.existencia)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatearNumero(r.minimo)}</TableCell>
                  <TableCell>
                    <Badge variant={VARIANTE_EXISTENCIA[estado]}>{NOMBRE_EXISTENCIA[estado]}</Badge>
                  </TableCell>
                  <TableCell className="w-12 text-right">
                    <AccionesRefaccion
                      refaccion={r}
                      puedeOperar={puedeOperar}
                      onVerRecepciones={onVerRecepciones}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    // Celular: una tarjeta por refacción
    <ul className="flex flex-col gap-3">
      {refacciones.map((r) => {
        const estado = estadoExistencia(r)
        return (
          <li key={r.id}>
            <Card className="gap-2 py-4">
              <div className="flex items-start justify-between gap-2 px-4">
                <div>
                  <p className="font-semibold">{r.descripcion}</p>
                  <p className="font-mono text-xs text-muted-foreground">{r.codigo}</p>
                </div>
                <AccionesRefaccion
                  refaccion={r}
                  puedeOperar={puedeOperar}
                  onVerRecepciones={onVerRecepciones}
                />
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 px-4 text-sm">
                <dt className="text-muted-foreground">Existencia</dt>
                <dd className="text-right tabular-nums">
                  {formatearNumero(r.existencia)} (mín. {formatearNumero(r.minimo)})
                </dd>
                <dt className="text-muted-foreground">Precio</dt>
                <dd className="text-right tabular-nums">{formatearMoneda(r.precio)}</dd>
              </dl>
              <div className="px-4">
                <Badge variant={VARIANTE_EXISTENCIA[estado]}>{NOMBRE_EXISTENCIA[estado]}</Badge>
              </div>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}

function AccionesRefaccion({
  refaccion,
  puedeOperar,
  onVerRecepciones,
}: {
  refaccion: Refaccion
  puedeOperar: boolean
  onVerRecepciones: (refaccion: Refaccion) => void
}) {
  const navegar = useNavigate()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Acciones de ${refaccion.codigo}`}>
          <Ellipsis aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onVerRecepciones(refaccion)}>Ver recepciones</DropdownMenuItem>
        {puedeOperar && (
          <>
            <DropdownMenuItem onSelect={() => navegar(`/recepciones?refaccion=${refaccion.id}`)}>
              Registrar recepción
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navegar(`/refacciones/${refaccion.id}/editar`)}>
              Editar
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

import { Ban, Banknote, Search } from 'lucide-react'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Toggle } from '@/components/ui/toggle'
import { useIsMobile } from '@/hooks/use-mobile'
import { formatearFecha, formatearMoneda, hoyIso } from '@/lib/formato'
import { cn } from '@/lib/utils'
import { useConsulta, useMensajeDeError } from '../api/useConsulta.ts'
import { Badge } from '@/components/ui/badge'
import { EncabezadoPagina } from '../componentes/EncabezadoPagina.tsx'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { TablaCargando } from '../componentes/TablaCargando.tsx'
import { textoAPrecio } from '../inventario/precio.ts'
import { useSesion } from '../sesion/useSesion.ts'
import {
  enviarPagos,
  listarLiquidaciones,
  NOMBRE_ESTADO,
  NOMBRE_FILTRO,
  anularPago,
  rechazarPagos,
  registrarPago,
  VARIANTE_ESTADO,
  validarPagos,
  type EstadoLiquidacion,
  type Liquidacion,
  type PagoRegistrado,
} from './api.ts'

const TODOS = 'TODOS'
/** Estados que aparecen en esta pantalla: un validado ya pasó a Facturación. */
const FILTROS: EstadoLiquidacion[] = ['ABIERTA', 'ENVIADA', 'RECHAZADA']

/**
 * Pagos de la venta (ERP-1.1, decisión del PO del Sprint 2): Caja registra los
 * pagos de cada prospecto en Pago y los envía; Contabilidad revisa que
 * correspondan y cubran la venta, y al validarlos el prospecto pasa a
 * Facturación.
 */
export function PagosPage() {
  const { sesion } = useSesion()
  const esCaja = sesion?.rol === 'CAJA'
  const { datos, cargando, error, recargar, actualizar } = useConsulta(listarLiquidaciones)
  // Contabilidad empieza en lo que tiene pendiente. Inicio puede pedir otro
  // filtro (?filtro=RECHAZADA) o abrir una venta (?venta=12).
  const [parametros, setParametros] = useSearchParams()
  const [filtro, setFiltro] = useState<EstadoLiquidacion | typeof TODOS>(
    () => FILTROS.find((estado) => estado === parametros.get('filtro')) ?? (esCaja ? TODOS : 'ENVIADA'),
  )
  const [busqueda, setBusqueda] = useState('')
  const [abiertaId, setAbiertaId] = useState<number | null>(() => Number(parametros.get('venta')) || null)

  const liquidaciones = useMemo(() => datos ?? [], [datos])
  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return liquidaciones.filter(
      (l) =>
        (filtro === TODOS || l.estado === filtro) &&
        (!texto || l.prospectoNombre.toLowerCase().includes(texto)),
    )
  }, [liquidaciones, filtro, busqueda])
  const abierta = liquidaciones.find((l) => l.prospectoId === abiertaId) ?? null

  function reemplazar(actualizada: Liquidacion) {
    actualizar((actuales) =>
      (actuales ?? []).map((l) => (l.prospectoId === actualizada.prospectoId ? actualizada : l)),
    )
  }

  /** Al cerrar se quita ?venta= para que recargar no la vuelva a abrir. */
  function cerrarVenta() {
    setAbiertaId(null)
    if (parametros.has('venta')) {
      setParametros(
        (actuales) => {
          actuales.delete('venta')
          return actuales
        },
        { replace: true },
      )
    }
  }

  function quitarDeLaLista(prospectoId: number) {
    cerrarVenta()
    actualizar((actuales) => (actuales ?? []).filter((l) => l.prospectoId !== prospectoId))
  }

  return (
    <section className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Pagos de ventas"
        descripcion={
          esCaja
            ? 'Registra los pagos de cada venta y envíalos a Contabilidad.'
            : 'Revisa los pagos que envía Caja. Al validarlos, el prospecto pasa a Facturación.'
        }
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudieron cargar los pagos</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            {error}
            <Button variant="outline" onClick={recargar}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : cargando ? (
        <TablaCargando />
      ) : liquidaciones.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Banknote /></EmptyMedia>
            <EmptyTitle>No hay ventas en Pago</EmptyTitle>
            <EmptyDescription>
              Aparecen aquí cuando el vendedor pasa un prospecto a la etapa Pago.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="buscar-pago">Buscar prospecto</Label>
              <InputGroup>
                <InputGroupAddon>
                  <Search aria-hidden="true" />
                </InputGroupAddon>
                <InputGroupInput
                  id="buscar-pago"
                  type="search"
                  placeholder="Nombre del cliente"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </InputGroup>
            </div>
            <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
              <ChipFiltro activo={filtro === TODOS} onClick={() => setFiltro(TODOS)}>
                Todos <span className="tabular-nums">{liquidaciones.length}</span>
              </ChipFiltro>
              {FILTROS.map((estado) => (
                <ChipFiltro key={estado} activo={filtro === estado} onClick={() => setFiltro(estado)}>
                  {NOMBRE_FILTRO[estado]}{' '}
                  <span className="tabular-nums">
                    {liquidaciones.filter((l) => l.estado === estado).length}
                  </span>
                </ChipFiltro>
              ))}
            </div>
          </div>

          {filtradas.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon"><Search /></EmptyMedia>
                <EmptyTitle>Ninguna venta coincide</EmptyTitle>
                <EmptyDescription>Prueba con otro nombre o estado.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ListaLiquidaciones
              liquidaciones={filtradas}
              esCaja={esCaja}
              onAbrir={(l) => setAbiertaId(l.prospectoId)}
            />
          )}
        </>
      )}

      <DialogoPagos
        key={abierta?.prospectoId ?? 'cerrado'}
        liquidacion={abierta}
        esCaja={esCaja}
        onCerrar={cerrarVenta}
        onCambio={reemplazar}
        onValidada={(l) => {
          quitarDeLaLista(l.prospectoId)
          toast.success(`Se validaron los pagos de ${l.prospectoNombre}. Pasó a Facturación.`)
        }}
      />
    </section>
  )
}

function ChipFiltro({
  activo,
  onClick,
  children,
}: {
  activo: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Toggle variant="outline" size="sm" pressed={activo} onPressedChange={onClick}>
      {children}
    </Toggle>
  )
}

function textoAccion(l: Liquidacion, esCaja: boolean) {
  if (esCaja) {
    return l.estado === 'ENVIADA' ? 'Ver pagos' : 'Registrar pagos'
  }
  return l.estado === 'ENVIADA' ? 'Revisar pagos' : 'Ver pagos'
}

function ListaLiquidaciones({
  liquidaciones,
  esCaja,
  onAbrir,
}: {
  liquidaciones: Liquidacion[]
  esCaja: boolean
  onAbrir: (l: Liquidacion) => void
}) {
  const movil = useIsMobile()
  if (!movil) {
    return (
      <div className="overflow-hidden rounded-lg border">
        <Table aria-label="Ventas en Pago">
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>Prospecto</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead className="text-right">Pagos</TableHead>
              <TableHead className="text-right">Total pagado (MXN)</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {liquidaciones.map((l) => (
              <TableRow key={l.prospectoId}>
                <TableCell className="font-medium">{l.prospectoNombre}</TableCell>
                <TableCell>{l.vendedorNombre ?? 'Vendedor sin acceso'}</TableCell>
                <TableCell className="text-right tabular-nums">{l.pagos.length}</TableCell>
                <TableCell className="text-right tabular-nums">{formatearMoneda(l.total)}</TableCell>
                <TableCell>
                  <Badge variant={VARIANTE_ESTADO[l.estado]}>{NOMBRE_ESTADO[l.estado]}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAbrir(l)}
                    aria-label={`${textoAccion(l, esCaja)} de ${l.prospectoNombre}`}
                  >
                    {textoAccion(l, esCaja)}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <ul aria-label="Ventas en Pago" className="flex flex-col gap-3">
      {liquidaciones.map((l) => (
        <li key={l.prospectoId}>
          <Card className="gap-2 py-4">
            <div className="flex items-start justify-between gap-2 px-4">
              <div>
                <p className="font-semibold">{l.prospectoNombre}</p>
                <p className="text-sm text-muted-foreground">
                  {l.vendedorNombre ?? 'Vendedor sin acceso'}
                </p>
              </div>
              <Badge variant={VARIANTE_ESTADO[l.estado]}>{NOMBRE_ESTADO[l.estado]}</Badge>
            </div>
            <p className="px-4 text-lg font-semibold tabular-nums">
              {formatearMoneda(l.total)} MXN
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {l.pagos.length} {l.pagos.length === 1 ? 'pago' : 'pagos'}
              </span>
            </p>
            <div className="px-4">
              <Button
                variant="outline"
                className="min-h-11 w-full"
                onClick={() => onAbrir(l)}
                aria-label={`${textoAccion(l, esCaja)} de ${l.prospectoNombre}`}
              >
                {textoAccion(l, esCaja)}
              </Button>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  )
}

interface PropsDialogo {
  liquidacion: Liquidacion | null
  esCaja: boolean
  onCerrar: () => void
  onCambio: (l: Liquidacion) => void
  onValidada: (l: Liquidacion) => void
}

function DialogoPagos({ liquidacion, esCaja, onCerrar, onCambio, onValidada }: PropsDialogo) {
  const { sesion } = useSesion()
  const token = sesion?.token ?? ''
  const mensajeDeError = useMensajeDeError()
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [rechazando, setRechazando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null)
  // Contabilidad revisa el precio contra los catálogos y lo puede corregir
  // (decisión del PO del 19 de octubre).
  const [precioTexto, setPrecioTexto] = useState(
    liquidacion?.precioTotal == null ? '' : liquidacion.precioTotal.toFixed(2),
  )
  const [errorPrecio, setErrorPrecio] = useState<string | null>(null)

  const editable = esCaja && (liquidacion?.estado === 'ABIERTA' || liquidacion?.estado === 'RECHAZADA')
  const porRevisar = !esCaja && liquidacion?.estado === 'ENVIADA'

  function cerrar() {
    setError(null)
    setRechazando(false)
    setMotivo('')
    setErrorMotivo(null)
    onCerrar()
  }

  /** @returns si la acción salió bien */
  async function ejecutar(
    accion: () => Promise<Liquidacion>,
    despues: (l: Liquidacion) => void,
  ): Promise<boolean> {
    setOcupado(true)
    setError(null)
    try {
      despues(await accion())
      return true
    } catch (e) {
      const mensaje = mensajeDeError(e)
      if (mensaje !== null) setError(mensaje)
      return false
    } finally {
      setOcupado(false)
    }
  }

  if (!liquidacion) {
    return <Dialog open={false} />
  }
  const id = liquidacion.prospectoId

  return (
    <Dialog open onOpenChange={(abrir) => !abrir && cerrar()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pagos de la venta</DialogTitle>
          <DialogDescription>
            <span className="block font-medium text-foreground">
              {liquidacion.prospectoNombre}
            </span>
            Vendedor: {liquidacion.vendedorNombre ?? 'sin acceso'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            Estado
            <Badge variant={VARIANTE_ESTADO[liquidacion.estado]}>
              {NOMBRE_ESTADO[liquidacion.estado]}
            </Badge>
          </div>

          {liquidacion.estado === 'RECHAZADA' && liquidacion.motivoRechazo && (
            <Alert variant="destructive">
              <AlertTitle>Contabilidad regresó los pagos</AlertTitle>
              <AlertDescription>{liquidacion.motivoRechazo}</AlertDescription>
            </Alert>
          )}

          <PrecioYSaldo liquidacion={liquidacion} />

          <TablaPagos
            liquidacion={liquidacion}
            editable={editable}
            ocupado={ocupado}
            onAnular={(pagoId) =>
              ejecutar(() => anularPago(token, id, pagoId), (l) => {
                onCambio(l)
                toast.success('Se anuló el pago. Queda en el registro, pero ya no cuenta en el total.')
              })
            }
          />

          {editable && (
            <FormularioPago
              ocupado={ocupado}
              onRegistrar={(datos) =>
                ejecutar(() => registrarPago(token, id, datos), (l) => {
                  onCambio(l)
                  toast.success(`Se registró el pago de ${formatearMoneda(datos.monto)}.`)
                })
              }
            />
          )}

          {porRevisar && rechazando && (
            <Field data-invalid={!!errorMotivo}>
              <FieldLabel htmlFor="motivo-rechazo">¿Por qué se rechazan?</FieldLabel>
              <Textarea
                id="motivo-rechazo"
                rows={3}
                maxLength={200}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                aria-invalid={!!errorMotivo || undefined}
                aria-describedby={errorMotivo ? 'motivo-rechazo-error' : undefined}
              />
              <FieldError
                id="motivo-rechazo-error"
                errors={errorMotivo ? [{ message: errorMotivo }] : []}
              />
            </Field>
          )}

          {porRevisar && !rechazando && (
            <Field data-invalid={!!errorPrecio}>
              <FieldLabel htmlFor="precio-validar">Precio total según el catálogo (MXN)</FieldLabel>
              <Input
                id="precio-validar"
                inputMode="decimal"
                value={precioTexto}
                onChange={(e) => setPrecioTexto(e.target.value)}
                aria-invalid={!!errorPrecio || undefined}
                aria-describedby={
                  errorPrecio ? 'precio-validar-ayuda precio-validar-error' : 'precio-validar-ayuda'
                }
              />
              <p id="precio-validar-ayuda" className="text-sm text-muted-foreground">
                Lo capturó el vendedor; corrígelo si no coincide. Los pagos tienen que cubrirlo y, al
                validarlos, el prospecto pasa a Facturación.
              </p>
              <FieldError
                id="precio-validar-error"
                errors={errorPrecio ? [{ message: errorPrecio }] : []}
              />
            </Field>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={cerrar}>
            Cerrar
          </Button>
          {editable && (
            <Button
              disabled={ocupado || liquidacion.pagos.length === 0}
              onClick={() =>
                ejecutar(() => enviarPagos(token, id), (l) => {
                  onCambio(l)
                  toast.success(`Se enviaron los pagos de ${l.prospectoNombre} a Contabilidad.`)
                })
              }
            >
              Enviar a Contabilidad
            </Button>
          )}
          {porRevisar &&
            (rechazando ? (
              <Button
                variant="destructive"
                disabled={ocupado}
                onClick={() => {
                  if (!motivo.trim()) {
                    setErrorMotivo('Escribe por qué se rechazan los pagos.')
                    return
                  }
                  setErrorMotivo(null)
                  ejecutar(() => rechazarPagos(token, id, motivo.trim()), (l) => {
                    onCambio(l)
                    setRechazando(false)
                    setMotivo('')
                    toast.success(`Se regresaron los pagos de ${l.prospectoNombre} a Caja.`)
                  })
                }}
              >
                Confirmar rechazo
              </Button>
            ) : (
              <>
                <Button variant="outline" disabled={ocupado} onClick={() => setRechazando(true)}>
                  Rechazar
                </Button>
                <Button
                  disabled={ocupado}
                  onClick={() => {
                    const precio = textoAPrecio(precioTexto)
                    if (Number.isNaN(precio) || precio <= 0) {
                      setErrorPrecio('Escribe el precio total de la venta.')
                      return
                    }
                    setErrorPrecio(null)
                    // Solo se manda si Contabilidad lo corrigió o no había.
                    const corregido = precio === liquidacion.precioTotal ? undefined : precio
                    ejecutar(() => validarPagos(token, id, corregido), onValidada)
                  }}
                >
                  Validar pagos
                </Button>
              </>
            ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Precio total de la venta y cuánto falta por pagar (ERP-1.1). */
function PrecioYSaldo({ liquidacion }: { liquidacion: Liquidacion }) {
  if (liquidacion.precioTotal == null) {
    return (
      <Alert role="note">
        <AlertDescription>
          Sin precio total: Contabilidad lo captura al validar los pagos.
        </AlertDescription>
      </Alert>
    )
  }
  const falta = liquidacion.precioTotal - liquidacion.total
  return (
    <Card size="sm">
      <CardContent>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Precio total</dt>
            <dd className="font-semibold tabular-nums">{formatearMoneda(liquidacion.precioTotal)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Pagado</dt>
            <dd className="font-semibold tabular-nums">{formatearMoneda(liquidacion.total)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{falta > 0 ? 'Falta' : 'Saldo'}</dt>
            <dd className="font-semibold tabular-nums">
              {falta > 0 ? (
                formatearMoneda(falta)
              ) : (
                <Badge variant="success">Cubre el precio</Badge>
              )}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}

function TablaPagos({
  liquidacion,
  editable,
  ocupado,
  onAnular,
}: {
  liquidacion: Liquidacion
  editable: boolean
  ocupado: boolean
  onAnular: (pagoId: number) => void
}) {
  const [porAnular, setPorAnular] = useState<PagoRegistrado | null>(null)
  if (liquidacion.pagos.length === 0) {
    return (
      <Empty className="border p-6">
        <EmptyHeader>
          <EmptyDescription>Aún no hay pagos registrados.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table aria-label="Pagos registrados">
        <TableHeader className="bg-muted">
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Referencia</TableHead>
            <TableHead>Registró</TableHead>
            <TableHead className="text-right">Monto (MXN)</TableHead>
            {editable && (
              <TableHead>
                <span className="sr-only">Anular</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {liquidacion.pagos.map((p) => (
            <TableRow key={p.id} className={cn(p.anulado && 'text-muted-foreground')}>
              <TableCell className="whitespace-nowrap">{formatearFecha(p.fechaPago)}</TableCell>
              <TableCell>
                <span className="flex flex-wrap items-center gap-2">
                  {p.referencia ?? '—'}
                  {p.anulado && (
                    <Badge variant="secondary">
                      Anulado{p.anuladoPorNombre ? ` por ${p.anuladoPorNombre}` : ''}
                    </Badge>
                  )}
                </span>
              </TableCell>
              <TableCell>{p.registradoPorNombre ?? '—'}</TableCell>
              <TableCell className={cn('text-right tabular-nums', p.anulado && 'line-through')}>
                {formatearMoneda(p.monto)}
              </TableCell>
              {editable && (
                <TableCell className="w-12 text-right">
                  {!p.anulado && (
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={ocupado}
                      aria-label={`Anular el pago de ${formatearMoneda(p.monto)}`}
                      onClick={() => setPorAnular(p)}
                    >
                      <Ban aria-hidden="true" />
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3} className="font-semibold">
              Total pagado
            </TableCell>
            <TableCell className="text-right font-semibold tabular-nums">
              {formatearMoneda(liquidacion.total)}
            </TableCell>
            {editable && <TableCell />}
          </TableRow>
        </TableFooter>
        <AlertDialog open={porAnular !== null} onOpenChange={(abrir) => !abrir && setPorAnular(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Anular este pago?</AlertDialogTitle>
              <AlertDialogDescription>
                El pago de {porAnular ? formatearMoneda(porAnular.monto) : ''} queda en el registro como
                anulado y deja de contar en el total. No se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (porAnular) onAnular(porAnular.id)
                  setPorAnular(null)
                }}
              >
                Anular pago
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Table>
    </div>
  )
}

function FormularioPago({
  ocupado,
  onRegistrar,
}: {
  ocupado: boolean
  /** @returns si se registró; si falló, se conserva lo capturado */
  onRegistrar: (datos: {
    monto: number
    fechaPago: string
    referencia: string | null
  }) => Promise<boolean>
}) {
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(hoyIso())
  const [referencia, setReferencia] = useState('')
  const [errores, setErrores] = useState<{ monto?: string; fecha?: string }>({})

  async function registrar(evento: FormEvent) {
    evento.preventDefault()
    const valor = textoAPrecio(monto)
    const nuevos = {
      monto: Number.isNaN(valor) || valor <= 0 ? 'Escribe un monto mayor a cero.' : undefined,
      fecha: !fecha
        ? 'Elige la fecha del pago.'
        : fecha > hoyIso()
          ? 'La fecha del pago no puede ser futura.'
          : undefined,
    }
    setErrores(nuevos)
    if (nuevos.monto || nuevos.fecha) return
    if (await onRegistrar({ monto: valor, fechaPago: fecha, referencia: referencia.trim() || null })) {
      setMonto('')
      setReferencia('')
    }
  }

  return (
    <form
      onSubmit={registrar}
      aria-label="Registrar un pago"
      noValidate
    >
      <Card size="sm">
        <CardHeader>
          <CardTitle>Registrar un pago</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field data-invalid={!!errores.monto}>
              <FieldLabel htmlFor="monto-pago">Monto (MXN)</FieldLabel>
              <Input
                id="monto-pago"
                inputMode="decimal"
                placeholder="150,000.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                aria-invalid={!!errores.monto || undefined}
                aria-describedby={errores.monto ? 'monto-pago-error' : undefined}
              />
              <FieldError id="monto-pago-error" errors={errores.monto ? [{ message: errores.monto }] : []} />
            </Field>
            <Field data-invalid={!!errores.fecha}>
              <FieldLabel htmlFor="fecha-pago">Fecha del pago</FieldLabel>
              <Input
                id="fecha-pago"
                type="date"
                max={hoyIso()}
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                aria-invalid={!!errores.fecha || undefined}
                aria-describedby={errores.fecha ? 'fecha-pago-error' : undefined}
              />
              <FieldError id="fecha-pago-error" errors={errores.fecha ? [{ message: errores.fecha }] : []} />
            </Field>
            <Field>
              <FieldLabel htmlFor="referencia-pago">Referencia (opcional)</FieldLabel>
              <Input
                id="referencia-pago"
                maxLength={60}
                placeholder="Folio o recibo"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
              />
            </Field>
          </div>
          <Button type="submit" variant="secondary" className="self-start" disabled={ocupado}>
            Agregar pago
          </Button>
        </CardContent>
      </Card>
    </form>
  )
}

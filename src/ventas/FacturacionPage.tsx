import { CarFront, Ellipsis, ReceiptText } from 'lucide-react'
import { useMemo, useState } from 'react'
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
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useIsMobile } from '@/hooks/use-mobile'
import { formatearFechaHora, formatearMoneda } from '@/lib/formato'
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
import { TarjetaDato } from '../componentes/TarjetaDato.tsx'
import { useSesion } from '../sesion/useSesion.ts'
import {
  listarProspectosPorFacturar,
  listarVentas,
  pasarAEntrega,
  type ProspectoPorFacturar,
  type Venta,
} from './api.ts'
import { DialogoElegirUnidad } from './DialogoElegirUnidad.tsx'

interface Fila {
  prospecto: ProspectoPorFacturar
  venta: Venta | undefined
}

/**
 * Lista de trabajo de Facturación (ERP-1.0): los prospectos que ya pasaron
 * Pago. Ya no existe el apartado, así que aquí se elige la unidad que se
 * vendió (pasa a Vendido) y, al emitir la factura, el prospecto pasa a Entrega.
 */
export function FacturacionPage() {
  const prospectos = useConsulta(listarProspectosPorFacturar)
  const ventas = useConsulta(listarVentas)
  const [eligiendo, setEligiendo] = useState<Fila | null>(null)
  const [confirmando, setConfirmando] = useState<ProspectoPorFacturar | null>(null)

  const filas = useMemo<Fila[]>(() => {
    const porProspecto = new Map((ventas.datos ?? []).map((venta) => [venta.prospectoId, venta]))
    return (prospectos.datos ?? []).map((prospecto) => ({
      prospecto,
      venta: porProspecto.get(prospecto.id),
    }))
  }, [prospectos.datos, ventas.datos])

  const error = prospectos.error ?? ventas.error
  const cargando = prospectos.cargando || ventas.cargando
  const conUnidad = filas.filter((fila) => fila.venta?.vin).length

  function reintentar() {
    prospectos.recargar()
    ventas.recargar()
  }

  return (
    <section className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Facturación"
        descripcion="Elige la unidad que se vendió y, al emitir la factura, pasa el prospecto a Entrega."
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudieron cargar los prospectos</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            {error}
            <Button variant="outline" onClick={reintentar}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : cargando ? (
        <TablaCargando />
      ) : filas.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><ReceiptText /></EmptyMedia>
            <EmptyTitle>No hay prospectos por facturar</EmptyTitle>
            <EmptyDescription>Aparecen aquí cuando Contabilidad valida sus pagos.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 @3xl/main:grid-cols-4">
            <TarjetaDato etiqueta="Por facturar" valor={filas.length} icono={ReceiptText} />
            <TarjetaDato etiqueta="Sin unidad" valor={filas.length - conUnidad} icono={CarFront} />
          </div>
          <ListaPorFacturar filas={filas} onElegir={setEligiendo} onPasarAEntrega={setConfirmando} />
        </>
      )}

      {eligiendo && (
        <DialogoElegirUnidad
          prospecto={eligiendo.prospecto}
          venta={eligiendo.venta}
          onCerrar={() => setEligiendo(null)}
          onElegida={(venta) => {
            toast.success(`La unidad ${venta.vin} quedó vendida a ${eligiendo.prospecto.nombre}.`)
            ventas.actualizar((actuales) => [
              venta,
              ...(actuales ?? []).filter((otra) => otra.prospectoId !== venta.prospectoId),
            ])
            setEligiendo(null)
          }}
        />
      )}

      {confirmando && (
        <ConfirmarEntrega
          prospecto={confirmando}
          onCerrar={() => setConfirmando(null)}
          onListo={() => {
            toast.success(`${confirmando.nombre} pasó a Entrega.`)
            setConfirmando(null)
            prospectos.refrescar()
          }}
        />
      )}
    </section>
  )
}

interface PropsLista {
  filas: Fila[]
  onElegir: (fila: Fila) => void
  onPasarAEntrega: (prospecto: ProspectoPorFacturar) => void
}

function ListaPorFacturar({ filas, onElegir, onPasarAEntrega }: PropsLista) {
  const movil = useIsMobile()
  if (!movil) {
    return (
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>Prospecto</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>En Facturación desde</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead className="text-right">Precio (MXN)</TableHead>
              <TableHead>
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((fila) => (
              <TableRow key={fila.prospecto.id}>
                <TableCell>
                  <span className="block font-medium">{fila.prospecto.nombre}</span>
                  <span className="text-xs text-muted-foreground">
                    {fila.prospecto.telefono ?? fila.prospecto.correo}
                  </span>
                </TableCell>
                <TableCell>{fila.prospecto.vendedor ?? '—'}</TableCell>
                <TableCell className="text-sm">{formatearFechaHora(fila.prospecto.enFacturacionDesde)}</TableCell>
                <TableCell>
                  <Unidad venta={fila.venta} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fila.venta?.precio != null ? formatearMoneda(fila.venta.precio) : '—'}
                </TableCell>
                <TableCell className="w-12 text-right">
                  <Acciones fila={fila} onElegir={onElegir} onPasarAEntrega={onPasarAEntrega} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {filas.map((fila) => (
        <li key={fila.prospecto.id}>
          <Card className="gap-2 py-4">
            <div className="flex items-start justify-between gap-2 px-4">
              <div>
                <p className="font-semibold">{fila.prospecto.nombre}</p>
                <p className="text-xs text-muted-foreground">Vendedor: {fila.prospecto.vendedor ?? '—'}</p>
              </div>
              <Acciones fila={fila} onElegir={onElegir} onPasarAEntrega={onPasarAEntrega} />
            </div>
            <div className="px-4">
              <Unidad venta={fila.venta} />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  )
}

function Unidad({ venta }: { venta: Venta | undefined }) {
  if (!venta?.vin) {
    return <Badge variant="warning">Sin unidad</Badge>
  }
  return (
    <div>
      <span className="block font-medium">
        {venta.modelo} {venta.version} {venta.anio}
      </span>
      <span className="font-mono text-xs text-muted-foreground">{venta.vin}</span>
    </div>
  )
}

interface PropsAcciones {
  fila: Fila
  onElegir: (fila: Fila) => void
  onPasarAEntrega: (prospecto: ProspectoPorFacturar) => void
}

function Acciones({ fila, onElegir, onPasarAEntrega }: PropsAcciones) {
  const tieneUnidad = Boolean(fila.venta?.vin)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Acciones de ${fila.prospecto.nombre}`}>
          <Ellipsis aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onElegir(fila)}>
          {tieneUnidad ? 'Cambiar unidad' : 'Elegir unidad'}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!tieneUnidad} onSelect={() => onPasarAEntrega(fila.prospecto)}>
          Pasar a Entrega
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface PropsConfirmar {
  prospecto: ProspectoPorFacturar
  onCerrar: () => void
  onListo: () => void
}

function ConfirmarEntrega({ prospecto, onCerrar, onListo }: PropsConfirmar) {
  const { sesion } = useSesion()
  const mensajeDeError = useMensajeDeError()
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function confirmar() {
    setGuardando(true)
    setError(null)
    try {
      await pasarAEntrega(sesion?.token ?? '', prospecto.id)
      onListo()
    } catch (e) {
      setError(mensajeDeError(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <AlertDialog open onOpenChange={(abierto) => !abierto && onCerrar()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Pasar a {prospecto.nombre} a Entrega?</AlertDialogTitle>
          <AlertDialogDescription>
            Hazlo cuando emitas su factura. El vendedor lo verá en Entrega para entregarle la unidad.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertTitle>No se pudo pasar a Entrega</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={guardando}
            onClick={(evento) => {
              // Se cierra hasta que el backend confirme.
              evento.preventDefault()
              void confirmar()
            }}
          >
            {guardando ? 'Guardando…' : 'Pasar a Entrega'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

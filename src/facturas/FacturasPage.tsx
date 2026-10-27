import { CircleAlert, CircleCheck, Ellipsis, FilePen, FileText, ReceiptText } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import type { LucideIcon } from 'lucide-react'
import { EncabezadoPagina } from '../componentes/EncabezadoPagina.tsx'
import { TablaCargando } from '../componentes/TablaCargando.tsx'
import { TarjetaDato } from '../componentes/TarjetaDato.tsx'
import { useSesion } from '../sesion/useSesion.ts'
import {
  descargarPdf,
  listarFacturas,
  listarPorEmitir,
  type Factura,
  type ProspectoPorEmitir,
} from './api.ts'
import { DialogoDatosFiscales } from './DialogoDatosFiscales.tsx'
import { DialogoEmitirFactura } from './DialogoEmitirFactura.tsx'
import { nombreDeUnidad } from './formato.ts'

/**
 * Facturas (ERP-1.3): los prospectos que ya pagaron esperan su factura. Al
 * emitirla, Facturación elige la unidad Disponible que se vende, la unidad pasa
 * a Vendido y el prospecto pasa solo a Entrega. Las facturas emitidas se
 * descargan en PDF.
 */
export function FacturasPage() {
  const porEmitir = useConsulta(listarPorEmitir)
  const facturas = useConsulta(listarFacturas)
  const { sesion } = useSesion()
  const mensajeDeError = useMensajeDeError()
  const [emitiendo, setEmitiendo] = useState<ProspectoPorEmitir | null>(null)
  const [corrigiendo, setCorrigiendo] = useState<ProspectoPorEmitir | null>(null)

  async function descargar(factura: Factura) {
    try {
      await descargarPdf(sesion?.token ?? '', factura)
    } catch (e) {
      const mensaje = mensajeDeError(e)
      if (mensaje) {
        toast.error(`No se pudo descargar la factura ${factura.folio}. ${mensaje}`)
      }
    }
  }

  const listos = (porEmitir.datos ?? []).filter((prospecto) => !prospecto.bloqueo).length

  return (
    <section className="flex flex-col gap-8">
      <EncabezadoPagina
        titulo="Facturas"
        descripcion="Emite la factura de cada venta pagada y descarga su PDF."
      />

      {porEmitir.datos && facturas.datos && (
        <div className="grid grid-cols-2 gap-4 @3xl/main:grid-cols-4">
          <TarjetaDato etiqueta="Por facturar" valor={porEmitir.datos.length} icono={ReceiptText} />
          <TarjetaDato etiqueta="Listos para emitir" valor={listos} icono={CircleCheck} />
          <TarjetaDato etiqueta="Emitidas" valor={facturas.datos.length} icono={FileText} />
        </div>
      )}

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Por facturar</h2>
        {porEmitir.error ? (
          <ErrorAlCargar titulo="No se pudieron cargar los prospectos" error={porEmitir.error} onReintentar={porEmitir.recargar} />
        ) : porEmitir.cargando || !porEmitir.datos ? (
          <TablaCargando />
        ) : porEmitir.datos.length === 0 ? (
          <SinDatos
            icono={ReceiptText}
            titulo="No hay prospectos por facturar"
            descripcion="Aparecen aquí cuando Contabilidad valida sus pagos."
          />
        ) : (
          <ListaPorEmitir prospectos={porEmitir.datos} onEmitir={setEmitiendo} onCorregir={setCorrigiendo} />
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Emitidas</h2>
        {facturas.error ? (
          <ErrorAlCargar titulo="No se pudieron cargar las facturas" error={facturas.error} onReintentar={facturas.recargar} />
        ) : facturas.cargando || !facturas.datos ? (
          <TablaCargando />
        ) : facturas.datos.length === 0 ? (
          <SinDatos
            icono={FileText}
            titulo="Aún no hay facturas emitidas"
            descripcion="Emite la primera desde la lista de prospectos por facturar."
          />
        ) : (
          <ListaEmitidas facturas={facturas.datos} onDescargar={descargar} />
        )}
      </div>

      {emitiendo && (
        <DialogoEmitirFactura
          prospecto={emitiendo}
          onCerrar={() => setEmitiendo(null)}
          onEmitida={(factura) => {
            toast.success(`Se emitió la factura ${factura.folio} de ${emitiendo.nombre}.`, {
              action: { label: 'Descargar PDF', onClick: () => void descargar(factura) },
            })
            setEmitiendo(null)
            facturas.actualizar((actuales) => [factura, ...(actuales ?? [])])
            porEmitir.actualizar((actuales) =>
              (actuales ?? []).filter((otro) => otro.prospectoId !== factura.prospectoId),
            )
          }}
        />
      )}

      {corrigiendo && (
        <DialogoDatosFiscales
          prospecto={corrigiendo}
          onCerrar={() => setCorrigiendo(null)}
          onGuardado={() => {
            toast.success(`Se guardaron los datos fiscales de ${corrigiendo.nombre}.`)
            setCorrigiendo(null)
            porEmitir.refrescar()
          }}
        />
      )}
    </section>
  )
}

function SinDatos({ icono: Icono, titulo, descripcion }: { icono: LucideIcon; titulo: string; descripcion: string }) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icono />
        </EmptyMedia>
        <EmptyTitle>{titulo}</EmptyTitle>
        <EmptyDescription>{descripcion}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

interface PropsError {
  titulo: string
  error: string
  onReintentar: () => void
}

function ErrorAlCargar({ titulo, error, onReintentar }: PropsError) {
  return (
    <Alert variant="destructive">
      <AlertTitle>{titulo}</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        {error}
        <Button variant="outline" onClick={onReintentar}>
          Reintentar
        </Button>
      </AlertDescription>
    </Alert>
  )
}

function Estado({ prospecto }: { prospecto: ProspectoPorEmitir }) {
  if (!prospecto.bloqueo) {
    return (
      <Badge variant="success">
        <CircleCheck aria-hidden="true" />
        Listo para facturar
      </Badge>
    )
  }
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Badge variant="warning">
        <CircleAlert aria-hidden="true" />
        Falta un requisito
      </Badge>
      <span className="text-xs text-muted-foreground">{prospecto.bloqueo}</span>
    </div>
  )
}

interface PropsPorEmitir {
  prospectos: ProspectoPorEmitir[]
  onEmitir: (prospecto: ProspectoPorEmitir) => void
  onCorregir: (prospecto: ProspectoPorEmitir) => void
}

function ListaPorEmitir({ prospectos, onEmitir, onCorregir }: PropsPorEmitir) {
  const movil = useIsMobile()
  if (!movil) {
    return (
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>Prospecto</TableHead>
              <TableHead>RFC</TableHead>
              <TableHead className="text-right">Total (MXN)</TableHead>
              <TableHead className="text-right">Saldo (MXN)</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prospectos.map((prospecto) => (
              <TableRow key={prospecto.prospectoId}>
                <TableCell>
                  <span className="block font-medium">{prospecto.nombre}</span>
                  <span className="text-xs text-muted-foreground">
                    Vendedor: {prospecto.vendedor ?? '—'}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-sm">{prospecto.receptor?.rfc ?? '—'}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {prospecto.total != null ? formatearMoneda(prospecto.total) : '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {prospecto.saldo != null ? formatearMoneda(prospecto.saldo) : '—'}
                </TableCell>
                <TableCell className="max-w-72 whitespace-normal">
                  <Estado prospecto={prospecto} />
                </TableCell>
                <TableCell className="w-12 text-right">
                  <AccionesPorEmitir prospecto={prospecto} onEmitir={onEmitir} onCorregir={onCorregir} />
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
      {prospectos.map((prospecto) => (
        <li key={prospecto.prospectoId}>
          <Card className="gap-2 py-4">
            <div className="flex items-start justify-between gap-2 px-4">
              <div className="min-w-0">
                <p className="font-semibold">{prospecto.nombre}</p>
                <p className="text-xs text-muted-foreground">Vendedor: {prospecto.vendedor ?? '—'}</p>
              </div>
              <AccionesPorEmitir prospecto={prospecto} onEmitir={onEmitir} onCorregir={onCorregir} />
            </div>
            <div className="flex flex-col gap-2 px-4 text-sm">
              <span className="tabular-nums">
                Total: {prospecto.total != null ? formatearMoneda(prospecto.total) : '—'}
              </span>
              <Estado prospecto={prospecto} />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  )
}

function AccionesPorEmitir({
  prospecto,
  onEmitir,
  onCorregir,
}: { prospecto: ProspectoPorEmitir } & Pick<PropsPorEmitir, 'onEmitir' | 'onCorregir'>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Acciones de ${prospecto.nombre}`}>
          <Ellipsis aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={Boolean(prospecto.bloqueo)} onSelect={() => onEmitir(prospecto)}>
          <ReceiptText aria-hidden="true" />
          Emitir factura
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onCorregir(prospecto)}>
          <FilePen aria-hidden="true" />
          {prospecto.receptor ? 'Corregir datos fiscales' : 'Capturar datos fiscales'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface PropsEmitidas {
  facturas: Factura[]
  onDescargar: (factura: Factura) => void
}

function ListaEmitidas({ facturas, onDescargar }: PropsEmitidas) {
  const movil = useIsMobile()
  if (!movil) {
    return (
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>Folio</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead className="text-right">Total (MXN)</TableHead>
              <TableHead>Emitida</TableHead>
              <TableHead>
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {facturas.map((factura) => (
              <TableRow key={factura.id}>
                <TableCell className="font-mono font-medium">{factura.folio}</TableCell>
                <TableCell>
                  <span className="block">{factura.cliente}</span>
                  <span className="font-mono text-xs text-muted-foreground">{factura.rfc}</span>
                </TableCell>
                <TableCell>
                  <span className="block">{nombreDeUnidad(factura)}</span>
                  <span className="font-mono text-xs text-muted-foreground">{factura.vin}</span>
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatearMoneda(factura.total)}</TableCell>
                <TableCell className="text-sm">{formatearFechaHora(factura.emitidaEn)}</TableCell>
                <TableCell className="w-12 text-right">
                  <AccionesEmitida factura={factura} onDescargar={onDescargar} />
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
      {facturas.map((factura) => (
        <li key={factura.id}>
          <Card className="gap-2 py-4">
            <div className="flex items-start justify-between gap-2 px-4">
              <div className="min-w-0">
                <p className="font-mono font-semibold">{factura.folio}</p>
                <p className="text-sm">{factura.cliente}</p>
              </div>
              <AccionesEmitida factura={factura} onDescargar={onDescargar} />
            </div>
            <div className="flex flex-col gap-1 px-4 text-sm">
              <span>{nombreDeUnidad(factura)}</span>
              <span className="tabular-nums">{formatearMoneda(factura.total)}</span>
              <span className="text-xs text-muted-foreground">{formatearFechaHora(factura.emitidaEn)}</span>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  )
}

function AccionesEmitida({ factura, onDescargar }: { factura: Factura } & Pick<PropsEmitidas, 'onDescargar'>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Acciones de la factura ${factura.folio}`}>
          <Ellipsis aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onDescargar(factura)}>
          <FileText aria-hidden="true" />
          Descargar PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

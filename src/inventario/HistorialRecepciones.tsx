import { ClipboardList } from 'lucide-react'
import { useCallback } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatearFechaHora, formatearNumero } from '@/lib/formato'
import { useConsulta } from '../api/useConsulta.ts'
import { Badge } from '@/components/ui/badge'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { TablaCargando } from '../componentes/TablaCargando.tsx'
import { listarRecepciones, type Recepcion, type Refaccion } from './api.ts'

interface Props {
  /** Refacción cuyo historial se muestra; null cierra el diálogo. */
  refaccion: Refaccion | null
  onCerrar: () => void
}

/**
 * Historial de recepciones de una refacción. Muestra la fecha de llegada y la
 * de registro; si no coinciden, al Administrador le interesa saberlo
 * (decisión del PO del 13 de octubre).
 */
export function HistorialRecepciones({ refaccion, onCerrar }: Props) {
  return (
    <Dialog open={refaccion !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Recepciones</DialogTitle>
          <DialogDescription>
            {refaccion && (
              <>
                <span className="font-mono">{refaccion.codigo}</span> · {refaccion.descripcion}
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        {refaccion && <ListaRecepciones refaccionId={refaccion.id} />}
      </DialogContent>
    </Dialog>
  )
}

function ListaRecepciones({ refaccionId }: { refaccionId: number }) {
  const consulta = useCallback((token: string) => listarRecepciones(token, refaccionId), [refaccionId])
  const { datos, cargando, error } = useConsulta(consulta)

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }
  if (cargando || !datos) {
    return <TablaCargando filas={3} />
  }
  if (datos.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><ClipboardList /></EmptyMedia>
          <EmptyTitle>Sin recepciones</EmptyTitle>
          <EmptyDescription>Esta refacción todavía no tiene entradas registradas.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }
  return (
    <div className="max-h-[60vh] overflow-auto rounded-lg border">
      <Table>
        <TableHeader className="bg-muted">
          <TableRow>
            <TableHead>Llegada</TableHead>
            <TableHead>Registro</TableHead>
            <TableHead className="text-right">Cantidad</TableHead>
            <TableHead>Proveedor</TableHead>
            <TableHead>Notas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {datos.map((recepcion) => (
            <TableRow key={recepcion.movimientoId}>
              <TableCell>{formatearFechaHora(recepcion.fechaLlegada)}</TableCell>
              <TableCell>
                <span className="block">{formatearFechaHora(recepcion.fechaRegistro)}</span>
                {seRegistroDespues(recepcion) && (
                  <Badge variant="warning">Registrada después</Badge>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatearNumero(recepcion.cantidad)}</TableCell>
              <TableCell>{recepcion.proveedor}</TableCell>
              <TableCell className="whitespace-normal text-muted-foreground">
                {recepcion.notas ?? '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/** La entrega se registró en el sistema más de una hora después de llegar. */
function seRegistroDespues(recepcion: Recepcion): boolean {
  const diferencia = Date.parse(recepcion.fechaRegistro) - Date.parse(recepcion.fechaLlegada)
  return diferencia > 60 * 60 * 1000
}

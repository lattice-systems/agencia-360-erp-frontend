import { useCallback } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatearFecha, formatearMoneda, formatearNumero } from '@/lib/formato'
import { useConsulta } from '../api/useConsulta.ts'
import { NOMBRE_TIPO_RENGLON, obtenerServicio, type ServicioResumen } from './api.ts'

interface Props {
  vehiculoId: number
  servicio: ServicioResumen
  onCerrar: () => void
}

/**
 * "Ver detalles" de un servicio (ERP-3.0): sus renglones como el ticket de una
 * tienda, con el precio de cada uno y el total. Los precios traen el IVA
 * incluido; el subtotal y el IVA se desglosan del total.
 */
export function DialogoDetalleServicio({ vehiculoId, servicio, onCerrar }: Props) {
  const consulta = useCallback(
    (token: string) => obtenerServicio(token, vehiculoId, servicio.id),
    [vehiculoId, servicio.id],
  )
  const { datos, error, cargando } = useConsulta(consulta)

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Servicio del {formatearFecha(servicio.fecha)}</DialogTitle>
          <DialogDescription>
            {formatearNumero(servicio.kilometraje)} km · Atendió {servicio.atendidoPor}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>No se pudo cargar el servicio</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : cargando || !datos ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Cant.</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {datos.renglones.map((renglon, indice) => (
                  <TableRow key={indice}>
                    <TableCell className="whitespace-normal">
                      <span className="block">{renglon.concepto}</span>
                      <span className="text-xs text-muted-foreground">{NOMBRE_TIPO_RENGLON[renglon.tipo]}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{renglon.cantidad}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatearMoneda(renglon.precioUnitario)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatearMoneda(renglon.importe)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="text-right text-muted-foreground">
                    Subtotal
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatearMoneda(datos.subtotal)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={3} className="text-right text-muted-foreground">
                    IVA (16 %)
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatearMoneda(datos.iva)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-semibold">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatearMoneda(datos.total)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCerrar}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

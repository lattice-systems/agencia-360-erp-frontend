import { FolderSearch, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useIsMobile } from '@/hooks/use-mobile'
import { useMensajeDeError } from '../api/useConsulta.ts'
import { EncabezadoPagina } from '../componentes/EncabezadoPagina.tsx'
import { EstadoVacio } from '../componentes/EstadoVacio.tsx'
import { TablaCargando } from '../componentes/TablaCargando.tsx'
import { useSesion } from '../sesion/useSesion.ts'
import { buscarPorVin, LARGO_MINIMO_BUSQUEDA, nombreDelVehiculo, type VehiculoEncontrado } from './api.ts'

const TEXTO_DE_VIN = /^[A-Z0-9]+$/

/**
 * Búsqueda del expediente por VIN (ERP-3.0). Servicio y el Administrador
 * escriben el número de serie completo o una parte y abren el expediente del
 * vehículo. Servicio no registra clientes: vienen del CRM.
 */
export function ExpedientePage() {
  const { sesion } = useSesion()
  const mensajeDeError = useMensajeDeError()
  const [vin, setVin] = useState('')
  const [falta, setFalta] = useState<string | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultados, setResultados] = useState<VehiculoEncontrado[] | null>(null)

  async function buscar(evento: FormEvent) {
    evento.preventDefault()
    const texto = vin.trim().toUpperCase()
    if (texto.length < LARGO_MINIMO_BUSQUEDA || !TEXTO_DE_VIN.test(texto)) {
      setFalta(`Escribe al menos ${LARGO_MINIMO_BUSQUEDA} letras o números del VIN.`)
      return
    }
    setFalta(null)
    setError(null)
    setBuscando(true)
    try {
      setResultados(await buscarPorVin(sesion?.token ?? '', texto))
    } catch (e) {
      setResultados(null)
      setError(mensajeDeError(e))
    } finally {
      setBuscando(false)
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Expediente"
        descripcion="Busca el vehículo por su número de serie para ver sus datos y sus servicios."
      />

      <Card className="px-4 py-4 md:px-6">
        <form noValidate onSubmit={buscar} className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <Field data-invalid={falta !== null} className="sm:max-w-md">
            <FieldLabel htmlFor="vin">Número de serie (VIN)</FieldLabel>
            <Input
              id="vin"
              value={vin}
              onChange={(evento) => setVin(evento.target.value)}
              autoComplete="off"
              className="font-mono uppercase"
              aria-invalid={falta !== null}
              aria-describedby={falta ? 'vin-error' : 'vin-ayuda'}
            />
            {falta ? (
              <FieldError id="vin-error" errors={[{ message: falta }]} />
            ) : (
              <FieldDescription id="vin-ayuda">Completo o una parte, por ejemplo los últimos 6.</FieldDescription>
            )}
          </Field>
          <Button type="submit" disabled={buscando} className="sm:mt-[1.625rem]">
            <Search aria-hidden="true" />
            {buscando ? 'Buscando…' : 'Buscar'}
          </Button>
        </form>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudo buscar el vehículo</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : buscando ? (
        <TablaCargando />
      ) : resultados === null ? null : resultados.length === 0 ? (
        <Card>
          <EstadoVacio
            icono={FolderSearch}
            titulo="No hay vehículos con ese VIN"
            descripcion="Si el cliente es nuevo, pídele al Gerente de marketing que lo registre en el CRM."
          />
        </Card>
      ) : (
        <Resultados vehiculos={resultados} />
      )}
    </section>
  )
}

function Resultados({ vehiculos }: { vehiculos: VehiculoEncontrado[] }) {
  const movil = useIsMobile()
  if (!movil) {
    return (
      <Card className="py-0 md:py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número de serie</TableHead>
              <TableHead>Vehículo</TableHead>
              <TableHead>Placas</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehiculos.map((vehiculo) => (
              <TableRow key={vehiculo.id}>
                <TableCell className="font-mono text-sm">{vehiculo.vin}</TableCell>
                <TableCell>{nombreDelVehiculo(vehiculo)}</TableCell>
                <TableCell>{vehiculo.placas ?? '—'}</TableCell>
                <TableCell>{vehiculo.cliente}</TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/expediente/${vehiculo.id}`} aria-label={`Abrir el expediente de ${vehiculo.vin}`}>
                      Abrir expediente
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {vehiculos.map((vehiculo) => (
        <li key={vehiculo.id}>
          <Card className="gap-2 px-4 py-4">
            <p className="font-semibold">{nombreDelVehiculo(vehiculo)}</p>
            <p className="font-mono text-xs text-muted-foreground">{vehiculo.vin}</p>
            <p className="text-sm">{vehiculo.cliente}</p>
            <Button asChild variant="outline" size="sm" className="w-fit">
              <Link to={`/expediente/${vehiculo.id}`} aria-label={`Abrir el expediente de ${vehiculo.vin}`}>
                Abrir expediente
              </Link>
            </Button>
          </Card>
        </li>
      ))}
    </ul>
  )
}

import { useState } from 'react'
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
import { useMensajeDeError } from '../api/useConsulta.ts'
import { useSesion } from '../sesion/useSesion.ts'
import { corregirDatosFiscales, type ProspectoPorEmitir } from './api.ts'
import { CamposDatosFiscales } from './CamposDatosFiscales.tsx'
import {
  DATOS_FISCALES_VACIOS,
  validarDatosFiscales,
  type DatosFiscales,
  type ErroresDatosFiscales,
} from './datosFiscales.ts'

interface Props {
  prospecto: ProspectoPorEmitir
  onCerrar: () => void
  onGuardado: () => void
}

/** Lo que ya capturó el vendedor, o el nombre del prospecto si no hay nada. */
function iniciales(prospecto: ProspectoPorEmitir): DatosFiscales {
  const receptor = prospecto.receptor
  if (!receptor) {
    return { ...DATOS_FISCALES_VACIOS, nombre: prospecto.nombre }
  }
  return {
    rfc: receptor.rfc,
    nombre: receptor.nombreCompleto,
    domicilio: receptor.domicilio ?? DATOS_FISCALES_VACIOS.domicilio,
    regimenFiscal: receptor.regimenFiscal,
  }
}

/**
 * Facturación corrige los datos fiscales del cliente antes de emitir (ERP-1.3),
 * por ejemplo si el RFC no coincide con su constancia. Usa las mismas reglas
 * que el CRM.
 */
export function DialogoDatosFiscales({ prospecto, onCerrar, onGuardado }: Props) {
  const { sesion } = useSesion()
  const mensajeDeError = useMensajeDeError()
  const [valores, setValores] = useState<DatosFiscales>(() => iniciales(prospecto))
  const [errores, setErrores] = useState<ErroresDatosFiscales>({})
  const [errorApi, setErrorApi] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    const validacion = validarDatosFiscales(valores)
    if (validacion.errores) {
      setErrores(validacion.errores)
      return
    }
    setGuardando(true)
    setErrorApi(null)
    try {
      await corregirDatosFiscales(sesion?.token ?? '', prospecto.prospectoId, validacion.datos)
      onGuardado()
    } catch (e) {
      const mensaje = mensajeDeError(e)
      if (mensaje !== null) {
        setErrorApi(mensaje)
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Datos fiscales de {prospecto.nombre}</DialogTitle>
          <DialogDescription>
            Corrígelos antes de emitir: la factura se emite con estos datos.
          </DialogDescription>
        </DialogHeader>

        <CamposDatosFiscales
          valores={valores}
          errores={errores}
          onCambiar={(nuevos) => {
            setValores(nuevos)
            setErrores({})
          }}
        />

        {errorApi && (
          <Alert variant="destructive">
            <AlertTitle>No se pudieron guardar los datos fiscales</AlertTitle>
            <AlertDescription>{errorApi}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="button" onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar datos fiscales'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

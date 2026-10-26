# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Personal de los departamentos de una agencia automotriz Nissan, trabajando en PC de escritorio en la oficina durante toda la jornada. El celular es uso ocasional (por ejemplo, Inventario revisando una unidad en el piso de venta).

Cada usuario tiene exactamente un rol, y el rol decide qué módulos ve:

- **Inventario**: da de alta y edita vehículos y refacciones, registra recepciones.
- **Refacciones**: consulta existencias y lo que llegó a su mínimo.
- **Caja**: registra los pagos de cada venta y los envía a Contabilidad.
- **Contabilidad**: valida o rechaza los pagos enviados.
- **Facturación**: elige la unidad vendida y pasa la venta a entrega.
- **Servicio**: consulta y corrige el expediente del vehículo del cliente.
- **Administrador**: administra usuarios y consulta el inventario (solo lectura).

## Product Purpose

Centralizar la operación de la agencia (ventas y facturación, inventario, taller y refacciones, caja y contabilidad) en un solo sistema conectado con el CRM de vendedores y la app CareCar de clientes, en lugar de hojas de cálculo y papel.

El éxito se ve así:
- Las tareas diarias (registrar un pago, una recepción, una unidad) se terminan en pocos pasos y sin errores.
- Al entrar, cada persona sabe qué tiene pendiente en su rol.

Es también un proyecto que se presenta en demos (profesores/cliente), así que importa la impresión que deja en la demostración, sin sacrificar lo anterior.

## Positioning

Una sola API y un solo flujo para toda la agencia: el pago total que valida Contabilidad habilita la facturación, y la factura mueve la etapa del prospecto en el CRM. Los departamentos no se pasan datos a mano; cada uno ve el estado real que dejó el anterior.

## Operating Context

- Flujo de venta entre departamentos: CRM (vendedor) → Caja (pagos) → Contabilidad (valida) → Facturación (unidad y factura) → Entrega.
- Inventario en tiempo real (eventos del servidor) para vehículos.
- Las reglas de negocio y los cálculos oficiales (existencias, saldos, bajo mínimo) vienen del backend; el ERP los muestra.
- Sesión con JWT que expira; los permisos los aplica el backend, el frontend solo oculta lo que el rol no usa.

## Capabilities and Constraints

- React 19 + Vite + shadcn/ui (Radix) + Tailwind 4. Componentes shadcn primero; los propios en `src/componentes/` son composiciones de shadcn.
- Todo en español de México: textos, identificadores, moneda MXN y fechas es-MX.
- Los estados siempre llevan texto, no solo color.
- Sin datos de ventas ni facturas emitidas en los datos de ejemplo todavía (la emisión de factura llega con ERP-1.3).
- Pendiente: el frontend de Facturación usa `/api/v1/prospectos/por-facturar`, que el backend en `main` ya no expone.

## Brand Commitments

- Nombre **Agencia360** y sus logos en `public/` (`agencia360-logo.svg`, `agencia360-logo-blanco.svg`, `agencia360-icono.svg`).
- **Azul Agencia `#1D3557`** como color principal (`--primary`).
- shadcn/ui con el preset `b1au7YYRG` como base del sistema visual, sin sistema de diseño propio paralelo.
- Login con foto de showroom de fondo (`public/fondo-login.jpg`).

## Evidence on Hand

- Datos de ejemplo por rol en `agencia-360-backend/docs/datos-de-ejemplo.md` (8 vehículos, refacciones con recepciones, prospectos en todas las etapas, un usuario por rol).
- No hay testimonios, métricas de uso ni clientes reales; no inventarlos.

## Product Principles

1. Lo pendiente primero: cada pantalla responde "¿qué tengo que hacer?" antes que "¿qué hay?".
2. Pocos pasos, cero ambigüedad: una acción principal por pantalla, estados con texto claro.
3. El backend manda: el ERP muestra los datos y reglas oficiales, no los recalcula.
4. Un rol, una vista: cada persona ve solo lo que su trabajo necesita.

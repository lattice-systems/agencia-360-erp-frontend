# Agencia360 · ERP Frontend

Aplicación web del **ERP de Agencia360**, el sistema que centraliza la operación de la agencia automotriz: Ventas y Facturación, Inventario, Taller y Refacciones, y Caja y Contabilidad.

> **Estado:** estructura inicial del proyecto. Todavía no hay funcionalidad implementada.

---

## Contenido

- [Agencia360 · ERP Frontend](#agencia360--erp-frontend)
  - [Contenido](#contenido)
  - [Contexto del proyecto](#contexto-del-proyecto)
  - [Stack tecnológico](#stack-tecnológico)
  - [Requisitos](#requisitos)
  - [Cómo empezar](#cómo-empezar)
  - [Scripts disponibles](#scripts-disponibles)
  - [Estructura del proyecto](#estructura-del-proyecto)
  - [Arquitectura](#arquitectura)
  - [Alcance del ERP](#alcance-del-erp)
  - [Pruebas](#pruebas)
  - [Forma de trabajo](#forma-de-trabajo)
  - [Pendientes por definir](#pendientes-por-definir)
  - [Documentación relacionada](#documentación-relacionada)

---

## Contexto del proyecto

**Agencia360** se compone de:

| Aplicación        | Usuarios                                         | Repositorio                                                                     |
| ----------------- | ------------------------------------------------ | ------------------------------------------------------------------------------- |
| **ERP**           | Personal de los departamentos de la agencia      | Este repositorio                                                                |
| **CRM web**       | Vendedores, gerente de marketing y administrador | Por definir                                                                     |
| **API (backend)** | Atiende al ERP, al CRM y a la app CareCar        | [`agencia-360-backend`](https://github.com/lattice-systems/agencia-360-backend) |

La app móvil de clientes (**CareCar**) es un proyecto aparte que consume los servicios de Agencia360.

---

## Stack tecnológico

| Tecnología         | Uso                              |
| ------------------ | -------------------------------- |
| React + TypeScript | Librería de UI y tipado estático |
| Vite               | Servidor de desarrollo y build   |
| ESLint             | Análisis estático del código     |
| Vitest + React Testing Library | Pruebas unitarias y de componentes |

Las librerías complementarias (navegación, formularios, consumo de API y componentes de UI) aún no están definidas. Ver [Pendientes por definir](#pendientes-por-definir).

---

## Requisitos

| Herramienta | Versión                              |
| ----------- | ------------------------------------ |
| Node.js     | 20.19 o superior, o 22.12 o superior |
| npm         | Incluido con Node.js                 |
| Git         | Cualquier versión reciente           |

Verificar con:

```bash
node -v
npm -v
```

---

## Cómo empezar

```bash
# 1. Clonar el repositorio
git clone https://github.com/lattice-systems/agencia-360-erp-frontend.git
cd agencia-360-erp-frontend

# 2. Instalar dependencias
npm install

# 3. Levantar el servidor de desarrollo
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`.

---

## Scripts disponibles

| Comando           | Descripción                                                               |
| ----------------- | ------------------------------------------------------------------------- |
| `npm run dev`     | Inicia el servidor de desarrollo con recarga automática                   |
| `npm run build`   | Revisa los tipos de TypeScript y genera el build de producción en `dist/` |
| `npm run preview` | Sirve localmente el build de producción para revisarlo                    |
| `npm run lint`    | Ejecuta ESLint sobre el proyecto                                          |
| `npm test`        | Corre todas las pruebas con Vitest una vez                                |
| `npm run test:watch` | Corre las pruebas en modo observador mientras desarrollas              |

---

## Estructura del proyecto

Estructura actual, generada con la plantilla `react-ts` de Vite:

```
agencia-360-erp-frontend/
├── public/              # Archivos estáticos servidos tal cual
├── docs/                # Convenciones de ramas, commits y PR
├── src/
│   ├── test/setup.ts    # Configuración común de las pruebas
│   ├── App.tsx          # Componente raíz
│   ├── App.test.tsx     # Prueba del componente raíz
│   ├── main.tsx         # Punto de entrada de la aplicación
│   └── index.css        # Estilos globales
├── index.html           # HTML base
├── eslint.config.js     # Configuración de ESLint
├── tsconfig*.json       # Configuración de TypeScript
├── vite.config.ts       # Configuración de Vite y Vitest
└── package.json
```

La organización de carpetas dentro de `src/` se definirá conforme avance el desarrollo.

---

## Arquitectura

El ERP y el CRM son aplicaciones web que consumen una **única API REST** construida con Spring Boot. El backend es un **monolito modular** cuyos módulos se comunican por eventos de dominio.

```
  ERP web (este repo)      CRM web           App CareCar
          │                   │                   │
          └───────────────────┼───────────────────┘
                              ▼
            API REST · Spring Boot + Spring Modulith
                              │
          PostgreSQL · Redis · Almacenamiento · PAC (CFDI)
```

Lineamientos que afectan al frontend:

- La API se documenta con OpenAPI; el cliente TypeScript del frontend se generará a partir de ese contrato.
- Las reglas de negocio y los cálculos oficiales (saldos, existencias) los resuelve el backend.
- El acceso se controla por roles: un rol por departamento, más supervisor y administrador.

---

## Alcance del ERP

Historias del **Product Backlog V2** que corresponden al ERP.

> El backlog V2 es una **propuesta pendiente de aprobación del PO**. Los sprints son tentativos y la capacidad real se define al estimar.

| ID      | Épica                | Historia                                             | Sprint tentativo                  |
| ------- | -------------------- | ---------------------------------------------------- | --------------------------------- |
| ERP-0.1 | Acceso               | Login y roles del ERP                                | S1                                |
| ERP-2.0 | Inventario           | Alta de artículos y recepción de inventario          | S1                                |
| ERP-1.0 | Ventas y facturación | Registro de venta o apartado de unidad               | S2                                |
| ERP-1.1 | Ventas y facturación | Verificación de liquidación de ventas                | S2                                |
| ERP-2.1 | Inventario           | Inventario de vehículos y refacciones en tiempo real | S2 (vehículos) y S4 (refacciones) |
| ERP-4.1 | Caja y contabilidad  | Recepción y registro de pagos                        | S2                                |
| ERP-1.2 | Ventas y facturación | Autorización de entrega por facturación              | S3                                |
| ERP-1.3 | Ventas y facturación | Emisión de factura                                   | S3                                |
| ERP-3.0 | Taller y refacciones | Expediente del vehículo del cliente                  | S3                                |
| ERP-3.1 | Taller y refacciones | Registro de órdenes de servicio y tickets            | S4                                |
| ERP-3.3 | Taller y refacciones | Agenda del taller                                    | S4                                |
| ERP-3.2 | Taller y refacciones | Registro de ventas directas de refacciones           | Fuera del MVP                     |
| ERP-4.2 | Caja y contabilidad  | Balance general de ingresos y egresos                | Fuera del MVP                     |

---

## Pruebas

| Tipo                       | Herramienta                    | Estado        |
| -------------------------- | ------------------------------ | ------------- |
| Unitarias y de componentes | Vitest + React Testing Library | Configurado   |
| Simulación de la API       | MSW (Mock Service Worker)      | Por configurar |
| End-to-end                 | Playwright                     | Por configurar |

Las pruebas corren en un DOM simulado con `jsdom` y usan los matchers de `@testing-library/jest-dom` (`toBeInTheDocument`, `toHaveTextContent`, etc.). Cada prueba vive junto al componente que prueba, con el sufijo `.test.tsx`:

```bash
npm test             # corre todas las pruebas una vez
npm run test:watch   # vuelve a correrlas al guardar
```

---

## Forma de trabajo

- Metodología **Scrumban + XP**, en parejas de desarrollador + Claude.
- Límite WIP: 1 historia activa por desarrollador.
- Tablero, iteraciones y wiki en **Azure DevOps**; código en **GitHub**; CI/CD con **GitHub Actions**.
- Todo cambio se revisa antes de integrarse a la rama principal.

**Propuesta del backlog V2 (pendiente de aprobación):**

- **Definition of Ready:** la historia tiene formato _Como / quiero / para_, criterios comprobables, dependencias resueltas o simuladas, y cabe en un sprint.
- **Definition of Done:** criterios validados por el PO, pruebas unitarias (TDD) y CI en verde, revisión de la otra pareja, integración a la rama principal y requisitos no funcionales generales cumplidos (contraseñas con hash y HTTPS, bitácora de acciones sensibles y datos personales tratados según el aviso de privacidad).

---

## Pendientes por definir

| Tema                 | Qué falta                                                                       |
| -------------------- | ------------------------------------------------------------------------------- |
| CI                   | Workflow de GitHub Actions con build y pruebas en cada push (TEC-2)             |
| Librerías            | Navegación, formularios, consumo de API y componentes de UI                     |
| Estructura de `src/` | Organización de carpetas y convenciones de código                               |
| Pruebas              | Instalación y configuración de MSW y Playwright                                 |
| Despliegue           | Servicio de Azure y ambientes                                                   |
| Repositorio del CRM  | Si el CRM web vive en este repositorio o en uno propio                          |

---

## Documentación relacionada

- **Wiki del proyecto (Azure DevOps):** [Agente360 Wiki](https://dev.azure.com/latticesystems/Agente360/_wiki/wikis/Agente360.wiki), sección _Arquitectura y Tecnologías_.
- **Convenciones de ramas, commits y PR:** [`docs/convenciones-commits.md`](docs/convenciones-commits.md)
- **Backend:** [`agencia-360-backend`](https://github.com/lattice-systems/agencia-360-backend)

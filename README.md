<div align="center">

# Agencia360 · ERP Frontend

**Aplicación web del ERP de Agencia360:** centraliza la operación de la agencia automotriz en Ventas y Facturación, Inventario, Taller y Refacciones, y Caja y Contabilidad.

<p>
  <a href="https://github.com/lattice-systems/agencia-360-erp-frontend/actions/workflows/ci.yml"><img src="https://github.com/lattice-systems/agencia-360-erp-frontend/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI" /></a>
  <a href="https://github.com/lattice-systems/agencia-360-erp-frontend/actions/workflows/codeql.yml"><img src="https://github.com/lattice-systems/agencia-360-erp-frontend/actions/workflows/codeql.yml/badge.svg?branch=main" alt="CodeQL" /></a>
</p>

<p>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-6-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript 6" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/Node.js-22-5FA04E?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js 22" />
</p>
<p>
  <img src="https://img.shields.io/badge/Vitest-5-6E9F18?style=for-the-badge&logo=vitest&logoColor=white" alt="Vitest 5" />
  <img src="https://img.shields.io/badge/Testing%20Library-E33332?style=for-the-badge&logo=testinglibrary&logoColor=white" alt="React Testing Library" />
  <img src="https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white" alt="ESLint" />
  <img src="https://img.shields.io/badge/GitHub%20Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white" alt="GitHub Actions" />
</p>

[Cómo empezar](#-cómo-empezar) · [Scripts](#-scripts-disponibles) · [Pruebas](#-pruebas) · [CI y checks](#-ci-y-checks-del-pr) · [Convenciones](docs/convenciones-commits.md)

</div>

> [!NOTE]
> **Estado:** inicio de sesión, menú por rol y administración de usuarios (ERP-0.1); alta, consulta y edición de vehículos y refacciones, y registro de recepciones (ERP-2.0).

---

## 📑 Contenido

- [Contexto del proyecto](#-contexto-del-proyecto)
- [Alcance del ERP](#-alcance-del-erp)
- [Stack tecnológico](#-stack-tecnológico)
- [Cómo empezar](#-cómo-empezar)
- [Scripts disponibles](#-scripts-disponibles)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Arquitectura](#-arquitectura)
- [Pruebas](#-pruebas)
- [CI y checks del PR](#-ci-y-checks-del-pr)
- [Forma de trabajo](#-forma-de-trabajo)
- [Pendientes por definir](#-pendientes-por-definir)
- [Documentación relacionada](#-documentación-relacionada)

---

## 🧭 Contexto del proyecto

**Agencia360** se compone de tres aplicaciones que comparten una misma API:

| Aplicación        | Usuarios                                         | Repositorio                                                                               |
| ----------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| **ERP web**       | Personal de los departamentos de la agencia      | Este repositorio                                                                          |
| **CRM web**       | Vendedores, gerente de marketing y administrador | [`agencia-360-crm-frontend`](https://github.com/lattice-systems/agencia-360-crm-frontend) |
| **API (backend)** | Atiende al ERP, al CRM y a la app CareCar        | [`agencia-360-backend`](https://github.com/lattice-systems/agencia-360-backend)           |

La app móvil de clientes (**CareCar**, Flutter) es un proyecto aparte que consume la misma API.

---

## 🎯 Alcance del ERP

Historias del **Product Backlog V2** que corresponden al ERP.

> [!IMPORTANT]
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

## 🧰 Stack tecnológico

| Tecnología                     | Uso                                |
| ------------------------------ | ---------------------------------- |
| React + TypeScript             | Librería de UI y tipado estático   |
| Vite                           | Servidor de desarrollo y build     |
| ESLint                         | Análisis estático del código       |
| React Router                   | Navegación y rutas protegidas por rol |
| `fetch` (cliente propio)       | Consumo de la API (`src/api/`)     |
| shadcn/ui (Radix) + Tailwind CSS 4 | Componentes y estilos, con los tokens de la guía de estilos |
| Lucide (`lucide-react`)        | Íconos                             |
| react-hook-form + zod          | Formularios y validación           |
| Inter y JetBrains Mono         | Fuentes locales (`@fontsource-variable`), sin Google Fonts |
| Vitest + React Testing Library | Pruebas unitarias y de componentes |
| MSW                            | Simulación de la API en las pruebas |
| GitHub Actions                 | CI, CodeQL y Dependency Review     |

La interfaz sigue la **guía de estilos de Agencia360** (`estilos.pdf`): Azul Agencia `#1D3557` como color principal, turquesa solo como acento, menú lateral izquierdo y componentes de shadcn/ui. Los tokens de color, tipografía y radios están en `src/index.css`. Los componentes se agregan con `npx shadcn@latest add <componente>`; la CLI no es dependencia de la app.

Todas las pantallas usan shadcn/ui, incluidos el login y la administración de usuarios (alta y cambio de rol en diálogos). Los logos van como SVG en `public/` (`agencia360-logo.svg`, `agencia360-logo-blanco.svg` y `agencia360-icono.svg`, que también es el favicon); los PNG se conservan para quien no acepte SVG.

La sesión se guarda en `sessionStorage`: se conserva al recargar la página y se borra al cerrar la pestaña o cuando vence el token.

---

## 🚀 Cómo empezar

**Requisitos**

| Herramienta | Versión                              |
| ----------- | ------------------------------------ |
| Node.js     | 20.19 o superior, o 22.12 o superior |
| npm         | Incluido con Node.js                 |
| Git         | Cualquier versión reciente           |

**Instalación**

```bash
# 1. Clonar el repositorio
git clone https://github.com/lattice-systems/agencia-360-erp-frontend.git
cd agencia-360-erp-frontend

# 2. Instalar dependencias
npm install

# 3. (Opcional) Configurar la URL de la API
cp .env.example .env.local

# 4. Levantar el servidor de desarrollo
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`.

**Para iniciar sesión** necesitas el [backend](https://github.com/lattice-systems/agencia-360-backend) corriendo en `http://localhost:8080` (o en la URL de `VITE_API_URL`) y un usuario.

### 👥 Datos de ejemplo

El backend trae un juego de datos de ejemplo (TEC-3): un usuario por rol, 8 vehículos, 8 refacciones con sus recepciones y 12 prospectos. Desde la carpeta del backend:

```bash
# 1. Levantar la base y la API con el Administrador y el Gerente de marketing iniciales
docker compose up -d
ADMIN_INICIAL_USUARIO=admin ADMIN_INICIAL_CONTRASENA=Admin12345 \
GERENTE_INICIAL_USUARIO=gerente GERENTE_INICIAL_CONTRASENA=Gerente12345 \
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

# 2. En otra terminal, cargar los datos (se puede correr varias veces sin duplicar)
./scripts/cargar-datos-de-ejemplo.sh

# Para empezar de cero: ./scripts/limpiar-datos.sh y reiniciar la API
```

> [!WARNING]
> **Solo para desarrollo local.** Estas contraseñas son públicas: nunca las uses en un ambiente real.

Usuarios que entran al ERP y lo que ve cada uno con los datos cargados:

| Usuario | Contraseña | Rol | Qué debe ver |
| --- | --- | --- | --- |
| `inventario1` | `Inventario123` | Inventario | **Vehículos** (8: 6 disponibles y 2 no disponibles), **Refacciones** y **Recepciones**, con alta, edición y registro de entradas |
| `refacciones1` | `Refacciones123` | Refacciones | **Refacciones**: el aviso "4 refacciones llegaron a su existencia mínima" y el historial de recepciones. `REF-002` aparece como "Registrada después" |
| `admin` | `Admin12345` | Administrador | **Usuarios**; **Vehículos** y **Refacciones** solo para consultar |
| `facturacion1` | `Facturacion123` | Facturación | Inicio sin módulos (sus historias llegan después) |
| `servicio1` | `Servicio123` | Servicio | Inicio sin módulos |
| `caja1` | `Caja12345` | Caja | Inicio sin módulos |
| `contabilidad1` | `Contabilidad123` | Contabilidad | Inicio sin módulos |

`gerente`, `vendedor1` y `vendedor2` son del CRM: su rol no entra al ERP, así que el login responde «Tu rol no tiene acceso al ERP».

Qué contiene cada dato y qué demuestra está en `docs/datos-de-ejemplo.md` del backend; cómo cargar, verificar y limpiar, en su README (sección 5.6).

Para probar el inventario de punta a punta:
1. Entra con `inventario1` y registra una recepción de `REF-004` (Filtro de aire), que está sin existencia.
2. Entra con `refacciones1` y revisa cómo cambió su estado y su historial.

> [!TIP]
> Si también tienes el CRM corriendo, Vite usa el siguiente puerto libre (`5174`) y lo indica en la terminal. Con el perfil `dev`, el backend ya permite `5173` y `5174`. Si el frontend queda en otro puerto, agrégalo con `CORS_ALLOWED_ORIGINS`; si no, el login funciona pero las demás pantallas dicen "No se pudo conectar con el servidor".

---

## 📜 Scripts disponibles

| Comando              | Descripción                                                               |
| -------------------- | ------------------------------------------------------------------------- |
| `npm run dev`        | Inicia el servidor de desarrollo con recarga automática                   |
| `npm run build`      | Revisa los tipos de TypeScript y genera el build de producción en `dist/` |
| `npm run preview`    | Sirve localmente el build de producción para revisarlo                    |
| `npm run lint`       | Ejecuta ESLint sobre el proyecto                                          |
| `npm test`           | Corre todas las pruebas con Vitest una vez                                |
| `npm run test:watch` | Corre las pruebas en modo observador mientras desarrollas                 |

---

## 📁 Estructura del proyecto

```
agencia-360-erp-frontend/
├── .github/workflows/   # CI (lint, build, pruebas), CodeQL y Dependency Review
├── docs/                # Convenciones de ramas, commits y PR
├── public/              # Logos de Agencia360 y favicon
├── src/
│   ├── api/             # Cliente HTTP, endpoints de acceso y useConsulta
│   ├── components/ui/   # Componentes de shadcn/ui (generados con la CLI)
│   ├── componentes/     # Componentes propios (layout con menú lateral)
│   ├── hooks/           # Hooks compartidos
│   ├── inventario/      # ERP-2.0: vehículos, refacciones y recepciones
│   ├── lib/             # Utilidades (cn)
│   ├── navegacion/      # Secciones del ERP por rol y rutas protegidas
│   ├── paginas/         # Pantallas: login, inicio, usuarios
│   ├── sesion/          # Sesión del usuario (contexto, almacenamiento, roles)
│   ├── test/            # Configuración de pruebas, servidor MSW y utilidades
│   ├── App.tsx          # Rutas de la aplicación
│   ├── main.tsx         # Punto de entrada de la aplicación
│   └── index.css        # Tema: tokens de la guía de estilos y Tailwind
├── components.json      # Configuración de shadcn/ui
├── index.html           # HTML base
├── eslint.config.js     # Configuración de ESLint
├── tsconfig*.json       # Configuración de TypeScript
├── vite.config.ts       # Configuración de Vite y Vitest
└── package.json
```

Cada módulo nuevo del ERP agrega su sección en `src/navegacion/secciones.ts` con los roles que pueden entrar, según la matriz de roles. Con eso aparece en el menú lateral, en su grupo y con su ícono de Lucide, y su ruta queda protegida.

---

## 🧱 Arquitectura

El ERP y el CRM son aplicaciones web que consumen una **única API REST** construida con Spring Boot. El backend es un **monolito modular** cuyos módulos se comunican por eventos de dominio.

```
  ERP web (este repo)        CRM web              App CareCar
          │                     │                      │
          └─────────────────────┼──────────────────────┘
                                ▼
              API REST · Spring Boot + Spring Modulith
                                │
            PostgreSQL · Redis · Almacenamiento · PAC (CFDI)
```

Lineamientos que afectan al frontend:

- La API se documenta con OpenAPI; el cliente TypeScript del frontend se generará a partir de ese contrato.
- Las reglas de negocio y los cálculos oficiales (saldos, existencias) los resuelve el backend.
- Cada usuario tiene un solo rol. Al ERP entran Administrador, Facturación, Inventario, Servicio, Refacciones, Caja y Contabilidad.
- Inventario (ERP-2.0), según las decisiones del PO del 13 de octubre:

  | Sección | Inventario | Administrador | Refacciones |
  | --- | --- | --- | --- |
  | Vehículos | Alta, consulta y edición | Solo consulta | — |
  | Refacciones | Alta, consulta y edición | Solo consulta | Solo consulta |
  | Recepciones | Registro | Historial (desde Refacciones) | Historial (desde Refacciones) |

  Las unidades y refacciones se editan pero no se eliminan. Una refacción nueva entra con existencia en cero y crece con las recepciones, que guardan la fecha de llegada, la de registro, el proveedor, notas y el responsable. Cuando una refacción llega a su existencia mínima, la pantalla de Refacciones muestra el aviso para resurtir.

---

## 🧪 Pruebas

| Tipo                       | Herramienta                    | Estado            |
| -------------------------- | ------------------------------ | ----------------- |
| Unitarias y de componentes | Vitest + React Testing Library | ✅ Configurado    |
| Simulación de la API       | MSW (Mock Service Worker)      | ✅ Configurado    |
| End-to-end                 | Playwright                     | ⏳ Por configurar |

Las pruebas corren en un DOM simulado con `jsdom` y usan los matchers de `@testing-library/jest-dom` (`toBeInTheDocument`, `toHaveTextContent`, etc.). Para simular lo que hace el usuario (clics, escribir en un campo) está disponible `@testing-library/user-event`.

Cada prueba vive junto al componente que prueba, con el sufijo `.test.tsx`:

```bash
npm test             # corre todas las pruebas una vez
npm run test:watch   # vuelve a correrlas al guardar
```

Cómo están escritas:
- Buscan por rol y por texto, como lo haría una persona (`getByRole('button', { name: 'Guardar vehículo' })`), nunca por clases.
- Cada una define las respuestas de la API con MSW (`servidor.use(...)` en `src/test/servidor.ts`). Si una prueba llama a una ruta sin respuesta, falla.
- `conSesion('INVENTARIO')` deja una sesión guardada y `renderApp('/ruta')` renderiza la aplicación completa (`src/test/utilidades.ts`).
- Usan `userEvent.setup({ delay: null })`, y el límite por prueba es de 15 s, para que los formularios no fallen por tiempo cuando la suite corre en paralelo en el CI.
- La vista de celular se prueba simulando `matchMedia` (`src/inventario/Celular.test.tsx`).

Las pruebas no pasan por el backend real, así que no detectan problemas de red como CORS. Antes de dar una pantalla por terminada, pruébala también contra el backend con los usuarios de ejemplo.

Para ver la cobertura sin agregar dependencias al proyecto:

```bash
npm install --no-save @vitest/coverage-v8@5.0.3
npx vitest run --coverage --coverage.provider=v8 --coverage.include='src/inventario/**'
```

---

## ✅ CI y checks del PR

Todo vive en `.github/workflows/` y corre en GitHub Actions. La rama `main` está protegida: solo se integra por PR, con una aprobación y **todos estos checks en verde**:

| Check                                       | Workflow          | Cuándo corre                          |
| ------------------------------------------- | ----------------- | ------------------------------------- |
| `Lint (ESLint)`                             | CI                | Cada push a cualquier rama y cada PR  |
| `Build (TypeScript + Vite)`                 | CI                | Cada push a cualquier rama y cada PR  |
| `Pruebas (Vitest + React Testing Library)`  | CI                | Cada push a cualquier rama y cada PR  |
| `Análisis de CodeQL (TypeScript)`           | CodeQL            | PR y push a `main`, y todos los lunes |
| `Revisión de dependencias nuevas/cambiadas` | Dependency Review | Solo en PR                            |

Antes de hacer push, corre lo mismo en local para no enterarte del error hasta abrir el PR:

```bash
npm run lint && npm run build && npm test
```

El detalle de cada check está en [`docs/convenciones-commits.md`](docs/convenciones-commits.md).

---

## 🤝 Forma de trabajo

- Metodología **Scrumban + XP**, en parejas de desarrollador + Claude.
- Límite WIP: 1 historia activa por desarrollador.
- Tablero, iteraciones y wiki en **Azure DevOps**; código en **GitHub**; CI/CD con **GitHub Actions**.
- Ramas, commits y PR siguen [`docs/convenciones-commits.md`](docs/convenciones-commits.md): rama corta por tarea, commits `tipo(alcance): verbo + cambio`, PR con una aprobación y se integra con **merge commit**.

<details>
<summary><strong>Definition of Ready y Definition of Done</strong> (propuesta del backlog V2, pendiente de aprobación)</summary>

- **Definition of Ready:** la historia tiene formato _Como / quiero / para_, criterios comprobables, dependencias resueltas o simuladas, y cabe en un sprint.
- **Definition of Done:** criterios validados por el PO, pruebas unitarias (TDD) y CI en verde, revisión de la otra pareja, integración a la rama principal y requisitos no funcionales generales cumplidos (contraseñas con hash y HTTPS, bitácora de acciones sensibles y datos personales tratados según el aviso de privacidad).

</details>

---

## 📌 Pendientes por definir

| Tema                 | Qué falta                                                   |
| -------------------- | ----------------------------------------------------------- |
| Cliente de API       | Generarlo desde el contrato OpenAPI del backend             |
| Pruebas              | Instalación y configuración de Playwright                   |
| Despliegue           | Servicio de Azure y ambientes                               |

---

## 📚 Documentación relacionada

- **Wiki del proyecto (Azure DevOps):** [Agente360 Wiki](https://dev.azure.com/latticesystems/Agente360/_wiki/wikis/Agente360.wiki), sección _Arquitectura y Tecnologías_.
- **Convenciones de ramas, commits y PR:** [`docs/convenciones-commits.md`](docs/convenciones-commits.md)
- **CRM frontend:** [`agencia-360-crm-frontend`](https://github.com/lattice-systems/agencia-360-crm-frontend)
- **Backend:** [`agencia-360-backend`](https://github.com/lattice-systems/agencia-360-backend)

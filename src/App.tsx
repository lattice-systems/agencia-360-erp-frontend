import { Navigate, Route, Routes } from 'react-router'
import { Layout } from './componentes/Layout.tsx'
import { RecepcionPage } from './inventario/RecepcionPage.tsx'
import { RefaccionesPage } from './inventario/RefaccionesPage.tsx'
import { RefaccionFormPage } from './inventario/RefaccionFormPage.tsx'
import { VehiculoFormPage } from './inventario/VehiculoFormPage.tsx'
import { VehiculosPage } from './inventario/VehiculosPage.tsx'
import { RutaProtegida } from './navegacion/RutaProtegida.tsx'
import { rolesDe, ROLES_OPERACION_INVENTARIO } from './navegacion/secciones.ts'
import { InicioPage } from './paginas/InicioPage.tsx'
import { LoginPage } from './paginas/LoginPage.tsx'
import { UsuariosPage } from './paginas/UsuariosPage.tsx'
import { SesionProvider } from './sesion/SesionProvider.tsx'
import { FacturacionPage } from './ventas/FacturacionPage.tsx'

function App() {
  return (
    <SesionProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <RutaProtegida>
              <Layout />
            </RutaProtegida>
          }
        >
          <Route index element={<InicioPage />} />
          <Route
            path="vehiculos"
            element={
              <RutaProtegida roles={rolesDe('/vehiculos')}>
                <VehiculosPage />
              </RutaProtegida>
            }
          />
          {['vehiculos/nuevo', 'vehiculos/:id/editar'].map((ruta) => (
            <Route
              key={ruta}
              path={ruta}
              element={
                <RutaProtegida roles={ROLES_OPERACION_INVENTARIO}>
                  <VehiculoFormPage />
                </RutaProtegida>
              }
            />
          ))}
          <Route
            path="refacciones"
            element={
              <RutaProtegida roles={rolesDe('/refacciones')}>
                <RefaccionesPage />
              </RutaProtegida>
            }
          />
          {['refacciones/nueva', 'refacciones/:id/editar'].map((ruta) => (
            <Route
              key={ruta}
              path={ruta}
              element={
                <RutaProtegida roles={ROLES_OPERACION_INVENTARIO}>
                  <RefaccionFormPage />
                </RutaProtegida>
              }
            />
          ))}
          <Route
            path="recepciones"
            element={
              <RutaProtegida roles={rolesDe('/recepciones')}>
                <RecepcionPage />
              </RutaProtegida>
            }
          />
          <Route
            path="facturacion"
            element={
              <RutaProtegida roles={rolesDe('/facturacion')}>
                <FacturacionPage />
              </RutaProtegida>
            }
          />
          <Route
            path="usuarios"
            element={
              <RutaProtegida roles={rolesDe('/usuarios')}>
                <UsuariosPage />
              </RutaProtegida>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SesionProvider>
  )
}

export default App

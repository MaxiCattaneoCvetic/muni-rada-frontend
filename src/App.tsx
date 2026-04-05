import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/auth.store';
import { AppLayout } from './components/layout/AppLayout';
import { demoLoginPath, isDemoMode } from './lib/demo';
import LoginPage from './pages/auth/LoginPage';
import DemoEntryPage from './pages/auth/DemoEntryPage';
import ChangePasswordPage from './pages/auth/ChangePasswordPage';
import { MiPerfilPage } from './pages/auth/MiPerfilPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import { NuevoPedidoPage } from './pages/pedidos/NuevoPedidoPage';
import { PedidoDetallePage } from './pages/pedidos/PedidoDetallePage';
import { PresupuestosPage } from './pages/presupuestos/PresupuestosPage';
import {
  TesoreriaPage, HistorialPage, AdminConfigPage, AdminPedidosPage,
} from './pages/admin/AdminPages';
import { AdminUsuariosPage } from './pages/admin/AdminUsuariosPage';
import { ProveedoresListPage } from './pages/proveedores/ProveedoresListPage';
import { ProveedorDetallePage } from './pages/proveedores/ProveedorDetallePage';
import { ProveedorAltaWizardPage } from './pages/proveedores/ProveedorAltaWizardPage';
import { FinanzasPage } from './pages/finanzas/FinanzasPage';
import { AdminReportesPage } from './pages/admin/AdminReportesPage';
import { MisReportesPage } from './pages/reportes/MisReportesPage';

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 10000 } },
});

function Guard({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to={demoLoginPath()} replace />;
  if (roles && user && !roles.includes(user.rol)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppInner() {
  return (
    <Routes>
      <Route path="/dashboard" element={<DashboardPage mode="dashboard" />} />
      <Route path="/mi-perfil" element={<MiPerfilPage />} />
      <Route path="/nuevo-pedido" element={<NuevoPedidoPage />} />
      <Route path="/pedidos/:id" element={<PedidoDetallePage />} />
      <Route path="/presupuestos" element={
        <Guard roles={['compras', 'admin']}><PresupuestosPage /></Guard>
      } />
      <Route path="/presupuestos/:pedidoId" element={<PresupuestosPage />} />
      <Route path="/proveedores" element={
        <Guard roles={['compras', 'secretaria', 'admin']}><ProveedoresListPage /></Guard>
      } />
      <Route path="/proveedores/nuevo" element={
        <Guard roles={['compras', 'secretaria', 'admin']}><ProveedorAltaWizardPage /></Guard>
      } />
      <Route path="/proveedores/:id" element={
        <Guard roles={['compras', 'secretaria', 'admin']}><ProveedorDetallePage /></Guard>
      } />
      <Route path="/historial" element={<HistorialPage />} />
      <Route path="/aprobar" element={<DashboardPage mode="aprobar" />} />
      <Route path="/firmar" element={<DashboardPage mode="firmar" />} />
      <Route path="/pagos" element={
        <Guard roles={['tesoreria', 'admin']}><TesoreriaPage /></Guard>
      } />
      <Route path="/facturas" element={<Navigate to="/pagos" replace />} />
      <Route path="/finanzas" element={
        <Guard roles={['tesoreria', 'admin']}><FinanzasPage /></Guard>
      } />
      <Route path="/admin/pedidos" element={
        <Guard roles={['admin']}><AdminPedidosPage /></Guard>
      } />
      <Route path="/admin/usuarios" element={
        <Guard roles={['admin']}><AdminUsuariosPage /></Guard>
      } />
      <Route path="/admin/config" element={
        <Guard roles={['admin']}><AdminConfigPage /></Guard>
      } />
      <Route path="/admin/reportes" element={
        <Guard roles={['admin']}><AdminReportesPage /></Guard>
      } />
      <Route path="/mis-reportes" element={<MisReportesPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  const demo = isDemoMode();
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={demo ? <Navigate to="/demo" replace /> : <LoginPage />}
          />
          <Route path="/demo" element={<DemoEntryPage />} />
          <Route path="/demo/:rol" element={<DemoEntryPage />} />
          <Route path="/cambiar-password" element={
            <Guard><ChangePasswordPage /></Guard>
          } />
          <Route path="/*" element={
            <Guard>
              <AppLayout>
                <AppInner />
              </AppLayout>
            </Guard>
          } />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/auth.store';
import { AppLayout } from './components/layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';
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

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 10000 } },
});

function Guard({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.rol)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppInner() {
  return (
    <Routes>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/mi-perfil" element={<MiPerfilPage />} />
      <Route path="/nuevo-pedido" element={<NuevoPedidoPage />} />
      <Route path="/pedidos/:id" element={<PedidoDetallePage />} />
      <Route path="/presupuestos/:pedidoId" element={<PresupuestosPage />} />
      <Route path="/historial" element={<HistorialPage />} />
      <Route path="/aprobar" element={<DashboardPage />} />
      <Route path="/firmar" element={<DashboardPage />} />
      <Route path="/pagos" element={
        <Guard roles={['tesoreria', 'admin']}><TesoreriaPage /></Guard>
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
        <Guard roles={['admin']}><AdminPedidosPage /></Guard>
      } />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
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

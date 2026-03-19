import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { cn, rolLabel, rolBadgeClass, getInitials } from '../../lib/utils';
import {
  Home, CheckSquare, FileText, CreditCard, Package,
  Users, Settings, BarChart2, LogOut, Menu, X, FileSignature, ChevronRight,
} from 'lucide-react';

const NAV_BY_ROLE: Record<string, { icon: any; label: string; to: string; badge?: number }[]> = {
  secretaria: [
    { icon: Home, label: 'Inicio', to: '/dashboard' },
    { icon: CheckSquare, label: 'Aprobar pedidos', to: '/aprobar' },
    { icon: FileSignature, label: 'Firmar presupuesto', to: '/firmar' },
    { icon: FileText, label: 'Historial', to: '/historial' },
  ],
  compras: [
    { icon: Home, label: 'Inicio', to: '/dashboard' },
    { icon: FileText, label: 'Mis presupuestos', to: '/presupuestos' },
  ],
  tesoreria: [
    { icon: Home, label: 'Inicio', to: '/dashboard' },
    { icon: CreditCard, label: 'Pagos y sellados', to: '/pagos' },
  ],
  admin: [
    { icon: Home, label: 'Inicio', to: '/dashboard' },
    { icon: Package, label: 'Todos los pedidos', to: '/admin/pedidos' },
    { icon: Users, label: 'Usuarios', to: '/admin/usuarios' },
    { icon: BarChart2, label: 'Reportes', to: '/admin/reportes' },
    { icon: Settings, label: 'Configuración', to: '/admin/config' },
  ],
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const nav = NAV_BY_ROLE[user?.rol || ''] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#eef1f6]">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed lg:relative inset-y-0 left-0 z-50 w-60 flex-shrink-0 flex flex-col',
        'bg-gradient-to-b from-slate-900 to-slate-800 h-screen overflow-y-auto',
        'shadow-xl transition-transform duration-300 lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        {/* Brand */}
        <div className="px-5 pt-6 pb-4 border-b border-white/10">
          <div className="text-white font-bold text-base tracking-tight">Suministros</div>
          <div className="text-white/40 text-xs uppercase tracking-wider mt-0.5">Municipalidad de Rada Tilly</div>
        </div>

        {/* User chip */}
        <div className="mx-3 my-3 p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
          <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0', rolBadgeClass(user?.rol || '').replace('badge-', 'bg-').replace('-100', '-900/50'), 'text-white/80 border border-white/20')}>
            {getInitials(user?.nombre || 'U', user?.apellido)}
          </div>
          <div className="min-w-0">
            <div className="text-white text-sm font-semibold truncate">{user?.nombre} {user?.apellido}</div>
            <div className="text-white/50 text-xs">{rolLabel(user?.rol || '')}</div>
          </div>
          <button onClick={handleLogout} className="ml-auto text-white/30 hover:text-red-400 transition-colors" title="Cerrar sesión">
            <LogOut size={14} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {nav.map(({ icon: Icon, label, to }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                location.pathname === to
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-white/60 hover:bg-white/8 hover:text-white',
              )}
            >
              <Icon size={16} />
              {label}
              {location.pathname === to && <ChevronRight size={12} className="ml-auto opacity-50" />}
            </Link>
          ))}
        </nav>

        {/* Version */}
        <div className="px-5 py-3 text-white/20 text-xs">v1.0.0</div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex-shrink-0 h-14 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 shadow-sm flex items-center px-4 gap-3 z-30">
          <button
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={18} />
          </button>

          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wide hidden sm:block">Suministros</span>
            <span className="text-slate-300 hidden sm:block">›</span>
            <span className="font-bold text-slate-800 truncate">
              {nav.find(n => n.to === location.pathname)?.label || 'Inicio'}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Must change password warning */}
            {user?.mustChangePassword && (
              <Link to="/cambiar-password" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold hover:bg-amber-100">
                ⚠️ Cambiar contraseña
              </Link>
            )}
            {/* No firma warning for secretaria */}
            {user?.rol === 'secretaria' && !user.firmaUrl && (
              <Link to="/mi-perfil" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold hover:bg-blue-100">
                ✍️ Configurar firma
              </Link>
            )}
            {/* User avatar */}
            <Link to="/mi-perfil" className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                {getInitials(user?.nombre || 'U', user?.apellido)}
              </div>
              <div className="hidden sm:block text-right">
                <div className="text-xs font-bold text-slate-700 leading-none">{user?.nombre?.split(' ')[0]}</div>
                <div className="text-xs text-slate-400 leading-none mt-0.5">{rolLabel(user?.rol || '')}</div>
              </div>
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* FAB - Nuevo Pedido */}
      <button
        onClick={() => navigate('/nuevo-pedido')}
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3.5 rounded-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 active:scale-95 text-sm"
      >
        <span className="text-lg leading-none">＋</span>
        Nuevo pedido
      </button>
    </div>
  );
}

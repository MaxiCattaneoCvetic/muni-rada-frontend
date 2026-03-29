import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { authApi, pagosApi, pedidosApi } from '../../api/services';
import { isDemoMode } from '../../lib/demo';
import type { UserRole } from '../../types';
import { PedidoStage } from '../../types';
import { cn, rolLabel, rolBadgeClass, getInitials } from '../../lib/utils';
import {
  DEMO_ROLE_ICONS,
  DEMO_ROLE_HEADER_IDLE,
  demoRoleHeaderActive,
} from '../../lib/demo-role-icons';
import { Menu } from 'lucide-react';

const DEMO_ROLES = ['secretaria', 'compras', 'tesoreria', 'admin'] as const satisfies readonly UserRole[];

const NAV_BY_ROLE: Record<string, { icon: string; label: string; to: string; badgeKey?: 'aprobar' | 'firmar' | 'presupuestos' | 'pagos' | 'facturas' }[]> = {
  secretaria: [
    { icon: '🏠', label: 'Inicio', to: '/dashboard' },
    { icon: '✅', label: 'Aprobar pedidos', to: '/aprobar', badgeKey: 'aprobar' },
    { icon: '✍️', label: 'Firmar presupuesto', to: '/firmar', badgeKey: 'firmar' },
    { icon: '📦', label: 'Historial de pedidos', to: '/historial' },
    { icon: '🏪', label: 'Proveedores', to: '/proveedores' },
  ],
  compras: [
    { icon: '🏠', label: 'Inicio', to: '/dashboard' },
    { icon: '💰', label: 'Presupuestos', to: '/presupuestos', badgeKey: 'presupuestos' },
    { icon: '🏪', label: 'Proveedores', to: '/proveedores' },
  ],
  tesoreria: [
    { icon: '🏠', label: 'Inicio', to: '/dashboard' },
    { icon: '💳', label: 'Pagos y sellados', to: '/pagos', badgeKey: 'pagos' },
    { icon: '🧾', label: 'Facturas por vencer', to: '/facturas', badgeKey: 'facturas' },
  ],
  admin: [
    { icon: '🏠', label: 'Inicio', to: '/dashboard' },
    { icon: '📦', label: 'Todos los pedidos', to: '/admin/pedidos' },
    { icon: '🏪', label: 'Proveedores', to: '/proveedores' },
    { icon: '👥', label: 'Usuarios', to: '/admin/usuarios' },
    { icon: '📊', label: 'Reportes', to: '/admin/reportes' },
    { icon: '⚙️', label: 'Configuración', to: '/admin/config' },
  ],
};

const ROL_AVATAR_STYLE: Record<string, { iconBg: string; iconColor: string }> = {
  secretaria: { iconBg: 'rgba(59,130,246,.28)', iconColor: '#93c5fd' },
  compras: { iconBg: 'rgba(139,92,246,.28)', iconColor: '#c4b5fd' },
  tesoreria: { iconBg: 'rgba(34,197,94,.24)', iconColor: '#86efac' },
  admin: { iconBg: 'rgba(245,158,11,.24)', iconColor: '#fcd34d' },
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, login } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const nav = NAV_BY_ROLE[user?.rol || ''] || [];
  const avatarStyle = ROL_AVATAR_STYLE[user?.rol || ''] || ROL_AVATAR_STYLE.secretaria;
  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos', 'sidebar', user?.rol],
    queryFn: () => pedidosApi.getAll(),
    refetchInterval: 30000,
  });
  const { data: pagos = [] } = useQuery({
    queryKey: ['pagos', 'sidebar'],
    queryFn: () => pagosApi.getAll(),
    refetchInterval: 30000,
    enabled: user?.rol === 'tesoreria' || user?.rol === 'admin',
  });
  const navBadgeCount = {
    aprobar: pedidos.filter((p) => p.stage === PedidoStage.APROBACION).length,
    firmar: pedidos.filter((p) => p.stage === PedidoStage.FIRMA).length,
    presupuestos: pedidos.filter((p) => p.stage === PedidoStage.PRESUPUESTOS || p.stage === PedidoStage.CARGA_FACTURA).length,
    pagos: pedidos.filter((p) => p.stage === PedidoStage.GESTION_PAGOS).length,
    facturas: pagos.length,
  };

  const handleLogout = () => {
    logout();
    navigate(isDemoMode() ? '/demo' : '/login');
  };

  const [switchingRole, setSwitchingRole] = useState(false);
  const switchDemoRole = async (rol: UserRole) => {
    if (!isDemoMode() || rol === user?.rol) return;
    setSwitchingRole(true);
    try {
      const res = await authApi.demo(rol);
      login(res.user, res.accessToken);
      navigate('/dashboard', { replace: true });
    } finally {
      setSwitchingRole(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--gradient-bg)' }}>
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 backdrop-blur-sm lg:hidden"
          style={{ background: 'rgba(15,23,42,.55)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed lg:relative inset-y-0 left-0 z-50 flex-shrink-0 flex min-h-0 flex-col',
        'h-screen overflow-hidden transition-transform duration-300 lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      )}
      style={{
        width: '236px',
        background: 'var(--gradient-sidebar)',
        boxShadow: '4px 0 24px rgba(15,23,42,.15)',
      }}>
        {/* Brand */}
        <div className="px-4 pt-5 pb-3.5">
          <div className="text-[15px] font-extrabold tracking-[-.3px] text-white">Suministros</div>
          <div className="mt-0.5 text-[10px] uppercase tracking-[.6px] text-white/40">Municipalidad Rada Tilly</div>
        </div>

        {/* Nav */}
        <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 pt-1">
          {nav.map(({ icon, label, to, badgeKey }) => {
            const active = location.pathname === to;
            const count = badgeKey ? navBadgeCount[badgeKey] : 0;
            const badgeClass =
              badgeKey === 'aprobar' ? 'rgba(239,68,68,.25)' :
              badgeKey === 'firmar' ? 'rgba(245,158,11,.25)' :
              badgeKey === 'presupuestos' ? 'rgba(139,92,246,.25)' :
              badgeKey === 'pagos' ? 'rgba(59,130,246,.25)' :
              badgeKey === 'facturas' ? 'rgba(34,197,94,.25)' :
              'rgba(59,130,246,.25)';
            const badgeColor =
              badgeKey === 'aprobar' ? '#f87171' :
              badgeKey === 'firmar' ? '#fbbf24' :
              badgeKey === 'presupuestos' ? '#c4b5fd' :
              badgeKey === 'pagos' ? '#60a5fa' :
              badgeKey === 'facturas' ? '#86efac' :
              '#60a5fa';

            return (
              <Link
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'group relative mb-0.5 flex items-center gap-[9px] rounded-[9px] px-[10px] py-[9px] transition-all',
                  active
                    ? 'text-[#93c5fd]'
                    : 'text-white/50 hover:bg-white/[0.08] hover:text-white/85',
                )}
                style={{
                  fontSize: '13px',
                  fontWeight: active ? 700 : 500,
                  background: active
                    ? 'linear-gradient(135deg, rgba(59,130,246,.3) 0%, rgba(37,99,235,.2) 100%)'
                    : undefined,
                  boxShadow: active
                    ? 'inset 0 0 0 1px rgba(59,130,246,.3)'
                    : undefined,
                }}
              >
                {active && (
                  <div
                    className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r"
                    style={{ background: 'var(--gradient-blue)' }}
                  />
                )}
                <span className="w-5 shrink-0 text-center text-[15px]">{icon}</span>
                <span className="min-w-0 flex-1 truncate">{label}</span>
                {!!count && (
                  <span
                    className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-[5px] text-[10px] font-extrabold"
                    style={{ background: badgeClass, color: badgeColor }}
                  >
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User profile — pie del sidebar */}
        <div className="mx-2 mt-auto shrink-0 border-t border-white/[0.08] pb-3 pt-2">
          <Link
            to="/mi-perfil"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 transition-all"
            style={{
              background: 'rgba(255,255,255,.05)',
              border: '1px solid rgba(255,255,255,.08)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239,68,68,.15)';
              e.currentTarget.style.borderColor = 'rgba(239,68,68,.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,.05)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)';
            }}
          >
            <div
              className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] text-[12px] font-extrabold"
              style={{ background: avatarStyle.iconBg, color: avatarStyle.iconColor }}
            >
              {getInitials(user?.nombre || 'U', user?.apellido)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-bold text-white">{user?.nombre} {user?.apellido}</div>
              <div className="mt-px text-[11px] text-white/45">{rolLabel(user?.rol || '')}</div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleLogout();
              }}
              className="ml-auto text-[10px] font-bold transition-colors"
              style={{ color: 'rgba(239,68,68,.8)' }}
            >
              Salir
            </button>
          </Link>
        </div>

      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header 
          className={cn(
            'grid flex-shrink-0 items-center px-5 gap-x-3 z-10',
            isDemoMode()
              ? 'grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]'
              : 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)]',
          )}
          style={{
            height: '60px',
            background: 'rgba(255,255,255,.92)',
            backdropFilter: 'blur(20px) saturate(200%)',
            borderBottom: '1px solid rgba(15,23,42,.07)',
            boxShadow: '0 1px 0 rgba(15,23,42,.05), 0 4px 16px rgba(15,23,42,.06)',
          }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="lg:hidden w-9 h-9 rounded-[9px] flex-shrink-0 flex items-center justify-center text-lg cursor-pointer transition-all"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text2)',
                boxShadow: 'var(--shadow-xs)',
              }}
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={18} />
            </button>

            <div 
              className="h-[22px] flex-shrink-0 hidden sm:block"
              style={{ width: '1px', background: 'var(--border2)' }}
            />

            <div className="flex items-center gap-1.5 min-w-0">
              <span 
                className="uppercase hidden sm:block whitespace-nowrap"
                style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', letterSpacing: '.4px' }}
              >
                Suministros
              </span>
              <span className="hidden sm:block" style={{ fontSize: '12px', color: 'var(--border2)' }}>›</span>
              <span 
                className="font-extrabold whitespace-nowrap truncate"
                style={{ fontSize: '15px', color: 'var(--text)', letterSpacing: '-.3px' }}
              >
                {nav.find(n => n.to === location.pathname)?.label || 'Inicio'}
              </span>
            </div>
          </div>

          {isDemoMode() && (
            <div className="flex shrink-0 items-center justify-center">
              <div
                className="flex items-center gap-1.5 rounded-[10px] px-1.5 py-1"
                role="group"
                aria-label="Ver como otro perfil"
                style={{
                  background: 'rgba(255,255,255,.85)',
                  border: '1px solid rgba(15,23,42,.08)',
                  boxShadow: '0 1px 4px rgba(15,23,42,.06)',
                }}
              >
                <span
                  className="hidden md:inline uppercase whitespace-nowrap"
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: 'var(--text3)',
                    letterSpacing: '1px',
                  }}
                >
                  Ver perfil
                </span>
                <div className="flex items-center gap-0.5 sm:gap-1">
                  {DEMO_ROLES.map((rol) => {
                    const Icon = DEMO_ROLE_ICONS[rol];
                    const active = user?.rol === rol;
                    const on = demoRoleHeaderActive(rol);
                    return (
                      <button
                        key={rol}
                        type="button"
                        disabled={switchingRole}
                        title={rolLabel(rol)}
                        aria-pressed={active}
                        onClick={() => void switchDemoRole(rol)}
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] transition-colors duration-150',
                          'border border-transparent',
                          !active && 'hover:bg-slate-500/15',
                          switchingRole && 'pointer-events-none opacity-45',
                        )}
                        style={
                          active
                            ? {
                                background: on.background,
                                color: on.color,
                                borderColor: on.border,
                                boxShadow: on.boxShadow,
                              }
                            : {
                                background: DEMO_ROLE_HEADER_IDLE.background,
                                color: DEMO_ROLE_HEADER_IDLE.color,
                              }
                        }
                      >
                        <Icon className="h-4 w-4" strokeWidth={2} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="flex min-w-0 items-center justify-end gap-2.5">
            {/* Must change password warning */}
            {user?.mustChangePassword && (
              <Link 
                to="/cambiar-password" 
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all cursor-pointer"
                style={{
                  background: 'var(--red-lt)',
                  border: '1px solid var(--red-brd)',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: 'var(--red)',
                }}
              >
                <div 
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: 'var(--red)' }}
                />
                Cambiar contraseña
              </Link>
            )}
            {/* No firma warning for secretaria */}
            {user?.rol === 'secretaria' && !user.firmaUrl && (
              <Link 
                to="/mi-perfil" 
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all cursor-pointer"
                style={{
                  background: 'var(--blue-lt)',
                  border: '1px solid var(--blue-brd)',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: 'var(--blue)',
                }}
              >
                <div 
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--blue-mid)' }}
                />
                Configurar firma
              </Link>
            )}
            {/* User avatar */}
            <Link 
              to="/mi-perfil" 
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-full cursor-pointer transition-all"
              style={{
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              <div 
                className={cn('w-7 h-7 rounded-full flex items-center justify-center font-extrabold flex-shrink-0', rolBadgeClass(user?.rol || '').replace('badge-', 'bg-'))}
                style={{ fontSize: '10px' }}
              >
                {getInitials(user?.nombre || 'U', user?.apellido)}
              </div>
              <div className="hidden sm:flex flex-col" style={{ lineHeight: 1.2 }}>
                <div className="font-bold" style={{ fontSize: '12px', color: 'var(--text)' }}>
                  {user?.nombre?.split(' ')[0]}
                </div>
                <div className="font-semibold" style={{ fontSize: '10px', color: 'var(--text3)' }}>
                  {rolLabel(user?.rol || '')}
                </div>
              </div>
            </Link>
          </div>
        </header>

        {/* Content */}
        <main 
          className="flex-1 overflow-y-auto w-full min-w-0"
          style={{ padding: '24px' }}
        >
          {children}
        </main>
      </div>

      {/* FAB - Nuevo Pedido */}
      <button
        onClick={() => navigate('/nuevo-pedido')}
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 text-white font-bold px-5 py-3.5 rounded-full transition-all hover:-translate-y-1 active:scale-95"
        style={{
          background: 'var(--gradient-blue)',
          boxShadow: 'var(--shadow-blue)',
          fontSize: '13px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(59,130,246,.35)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'var(--shadow-blue)';
        }}
      >
        <span className="text-lg leading-none">＋</span>
        <span>Nuevo pedido</span>
      </button>
    </div>
  );
}

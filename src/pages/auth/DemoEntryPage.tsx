import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { authApi } from '../../api/services';
import { useAuthStore } from '../../store/auth.store';
import type { UserRole } from '../../types';
import { isDemoMode } from '../../lib/demo';
import { cn } from '../../lib/utils';
import { DEMO_ROLE_ICONS, demoRoleIconSurface } from '../../lib/demo-role-icons';

const ROLES: UserRole[] = ['secretaria', 'compras', 'tesoreria', 'admin'];

const ROLE_COPY: Record<UserRole, { title: string; blurb: string }> = {
  secretaria: {
    title: 'Secretaría',
    blurb: 'Gestioná pedidos, aprobaciones y la firma de presupuestos.',
  },
  compras: {
    title: 'Compras',
    blurb: 'Buscá y cargá presupuestos de proveedores.',
  },
  tesoreria: {
    title: 'Tesorería',
    blurb: 'Registrá sellados y pagos.',
  },
  admin: {
    title: 'Administración',
    blurb: 'Vista completa del sistema, usuarios y configuración.',
  },
};

function normalizeRol(s: string | undefined): UserRole | null {
  if (!s) return null;
  const x = s.toLowerCase().trim();
  if (ROLES.includes(x as UserRole)) return x as UserRole;
  return null;
}

export default function DemoEntryPage() {
  if (!isDemoMode()) return <Navigate to="/login" replace />;

  const { rol: rolParam } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const autoAttempted = useRef<Set<string>>(new Set());

  const enterAs = useCallback(
    async (rol: UserRole) => {
      setError('');
      setLoading(true);
      try {
        const res = await authApi.demo(rol);
        login(res.user, res.accessToken);
        navigate('/dashboard', { replace: true });
      } catch (e: unknown) {
        const msg =
          (e as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'No pudimos iniciar la sesión. Revisá que el servidor esté en marcha.';
        setError(typeof msg === 'string' ? msg : 'Error');
      } finally {
        setLoading(false);
      }
    },
    [login, navigate],
  );

  useEffect(() => {
    const fromPath = normalizeRol(rolParam);
    const fromQuery = normalizeRol(searchParams.get('rol') || undefined);
    const target = fromPath || fromQuery;
    if (!target) return;
    const key = `${fromPath || ''}|${fromQuery || ''}`;
    if (autoAttempted.current.has(key)) return;
    autoAttempted.current.add(key);
    void enterAs(target);
  }, [rolParam, searchParams, enterAs]);

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #1e40af 100%)' }}
    >
      {/* Background effects */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 60% 50% at 20% 30%, rgba(59,130,246,.2) 0%, transparent 60%),
            radial-gradient(ellipse 40% 60% at 80% 70%, rgba(139,92,246,.15) 0%, transparent 60%),
            radial-gradient(ellipse 30% 30% at 60% 10%, rgba(96,165,250,.12) 0%, transparent 50%)
          `
        }}
      />
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      />

      <div className="max-w-3xl w-full relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div 
            className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full backdrop-blur-xl"
            style={{
              background: 'rgba(255,255,255,.1)',
              border: '1px solid rgba(255,255,255,.2)',
              boxShadow: '0 2px 8px rgba(0,0,0,.2)',
            }}
          >
            <div 
              className="w-[7px] h-[7px] rounded-full"
              style={{
                background: '#4ade80',
                boxShadow: '0 0 8px rgba(74,222,128,.5)',
                animation: 'float 2s ease-in-out infinite',
              }}
            />
            <span className="font-semibold uppercase" style={{ fontSize: '11px', color: 'rgba(255,255,255,.85)', letterSpacing: '2px' }}>
              Demostración
            </span>
          </div>
          
          <h1 
            className="text-white font-extrabold mb-2"
            style={{ fontSize: '30px', letterSpacing: '-.8px', lineHeight: '1.15' }}
          >
            Elegí el perfil que querés ver
          </h1>
          <p 
            className="max-w-lg mx-auto"
            style={{ fontSize: '13px', color: 'rgba(255,255,255,.6)', lineHeight: '1.6' }}
          >
            Podés recorrer el sistema como cada área lo usaría en la vida real. Más adelante podés
            cambiar de perfil desde la barra superior.
          </p>
        </div>

        {loading && (
          <div className="text-center py-10" style={{ fontSize: '13px', color: 'rgba(255,255,255,.5)' }}>
            Un momento…
          </div>
        )}

        {error && (
          <div className="alert alert-danger mb-6">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2.5 max-w-[720px] mx-auto">
          {ROLES.map((rol) => {
            const Icon = DEMO_ROLE_ICONS[rol];
            const copy = ROLE_COPY[rol];
            const iconSurface = demoRoleIconSurface(rol);
            return (
              <button
                key={rol}
                type="button"
                disabled={loading}
                onClick={() => void enterAs(rol)}
                className={cn(
                  'text-left p-3.5 rounded-[14px] cursor-pointer transition-all backdrop-blur-xl disabled:opacity-50',
                )}
                style={{
                  background: 'rgba(255,255,255,.08)',
                  border: '1px solid rgba(255,255,255,.12)',
                  boxShadow: '0 2px 12px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,.14)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,.25)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,.08)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,.12)';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.1)';
                }}
              >
                <div className="flex items-center gap-3.5">
                  <div 
                    className="w-[42px] h-[42px] rounded-[11px] flex items-center justify-center shrink-0 font-extrabold"
                    style={{
                      fontSize: '14px',
                      background: iconSurface.background,
                      color: iconSurface.color,
                    }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-white font-bold" style={{ fontSize: '14px' }}>{copy.title}</div>
                    <div className="text-white/55 mt-0.5" style={{ fontSize: '12px' }}>{copy.blurb}</div>
                  </div>
                  <div 
                    className="px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      border: '1px solid rgba(255,255,255,.2)',
                      background: 'rgba(255,255,255,.1)',
                      color: 'rgba(255,255,255,.8)',
                    }}
                  >
                    VER
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

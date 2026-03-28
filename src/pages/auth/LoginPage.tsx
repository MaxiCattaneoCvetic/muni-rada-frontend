import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from '../../api/services';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      login(res.user, res.accessToken);
      if (res.user.mustChangePassword) {
        navigate('/cambiar-password');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #1e40af 100%)',
      }}
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
      
      <div className="w-full max-w-[420px] relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div 
            className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full backdrop-blur-xl"
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
            <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,.85)', letterSpacing: '.3px' }}>
              Sistema Activo
            </span>
          </div>
          
          <h1 
            className="text-[30px] font-extrabold text-white mb-1.5"
            style={{ letterSpacing: '-.8px', lineHeight: '1.15' }}
          >
            <span>Suministros</span>
          </h1>
          <p className="text-[13px]" style={{ color: 'rgba(255,255,255,.55)', letterSpacing: '.2px' }}>
            Municipalidad de Rada Tilly
          </p>
          <p className="mt-5 text-[13px] text-center" style={{ color: 'rgba(255,255,255,.5)' }}>
            Accedé con tu cuenta institucional para continuar.
          </p>
        </div>

        {/* Form Card */}
        <div 
          className="rounded-2xl p-6 backdrop-blur-xl"
          style={{
            background: 'rgba(255,255,255,.95)',
            border: '1px solid rgba(255,255,255,.5)',
            boxShadow: '0 8px 32px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.6)',
          }}
        >
          <h2 className="text-lg font-extrabold mb-5" style={{ color: 'var(--text)', letterSpacing: '-.3px' }}>
            Iniciar sesión
          </h2>

          {error && (
            <div className="alert alert-danger mb-4">
              <span className="text-base">⚠️</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email institucional</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="usuario@radatilly.gob.ar"
                className="input"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
                required
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center py-3 text-sm font-bold mt-2"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <p 
            className="text-center mt-5"
            style={{ fontSize: '11px', color: 'var(--text3)' }}
          >
            ¿Problemas para ingresar? Contactá a Sistemas.
          </p>
        </div>
      </div>
    </div>
  );
}

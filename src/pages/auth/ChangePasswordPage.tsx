import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../../api/services';
import { useAuthStore } from '../../store/auth.store';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (next !== confirm) { setError('Las contraseñas no coinciden'); return; }
    if (next.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    setLoading(true);
    try {
      await usersApi.changePassword(current, next);
      updateUser({ mustChangePassword: false });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cambiar contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">🔐</div>
            <h2 className="text-xl font-bold text-slate-800">Cambiar contraseña</h2>
            <p className="text-sm text-slate-500 mt-1">
              {user?.mustChangePassword
                ? 'Debés establecer una nueva contraseña antes de continuar.'
                : 'Actualizá tu contraseña de acceso.'}
            </p>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Contraseña actual</label>
              <input type="password" value={current} onChange={e => setCurrent(e.target.value)} className="input" required />
            </div>
            <div>
              <label className="label">Nueva contraseña</label>
              <input type="password" value={next} onChange={e => setNext(e.target.value)} className="input" required minLength={6} />
            </div>
            <div>
              <label className="label">Confirmar nueva contraseña</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="input" required minLength={6} />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center py-3 mt-2">
              {loading ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

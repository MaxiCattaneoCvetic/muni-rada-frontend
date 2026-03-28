import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../api/services';
import { rolLabel, rolBadgeClass, getInitials } from '../../lib/utils';
import { UserPlus, RefreshCw, Power, PowerOff } from 'lucide-react';
export function AdminUsuariosPage() {
  const qc = useQueryClient();
  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: usersApi.getAll });
  const [showForm, setShowForm] = useState(false);
  const [resetId, setResetId] = useState<string | null>(null);
  const [newPass, setNewPass] = useState('');
  const [form, setForm] = useState({ email: '', nombre: '', apellido: '', rol: 'secretaria', password: '' });
  const [error, setError] = useState('');

  const createMut = useMutation({
    mutationFn: () => usersApi.create(form as any),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setShowForm(false); setForm({ email: '', nombre: '', apellido: '', rol: 'secretaria', password: '' }); },
    onError: (e: any) => setError(e.response?.data?.message || 'Error'),
  });

  const resetMut = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => usersApi.resetPassword(id, password),
    onSuccess: () => { setResetId(null); setNewPass(''); alert('Contraseña blanqueada. El usuario deberá cambiarla al próximo login.'); },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => active ? usersApi.deactivate(id) : usersApi.activate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const ROLES = ['secretaria', 'compras', 'tesoreria', 'admin'];

  return (
    <div className="page-shell space-y-6">
      <div className="flex items-center justify-between">
        <div className="page-heading">
          <div className="page-kicker">Administración</div>
          <h1 className="page-title">Usuarios</h1>
          <p className="page-subtitle">{users.filter(u => u.isActive).length} usuarios activos</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary gap-2">
          <UserPlus size={16} /> Nuevo usuario
        </button>
      </div>

      {/* New user form */}
      {showForm && (
        <div className="card p-6 border-2 border-blue-200">
          <h3 className="font-bold mb-4">Crear nuevo usuario</h3>
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Nombre *</label><input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className="input" /></div>
            <div><label className="label">Apellido *</label><input value={form.apellido} onChange={e => setForm(f => ({ ...f, apellido: e.target.value }))} className="input" /></div>
            <div className="col-span-2"><label className="label">Email *</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input" /></div>
            <div>
              <label className="label">Rol *</label>
              <select value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))} className="input">
                {ROLES.map(r => <option key={r} value={r}>{rolLabel(r)}</option>)}
              </select>
            </div>
            <div><label className="label">Contraseña inicial *</label><input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="input" placeholder="Mín. 6 caracteres" /></div>
          </div>
          <div className="alert alert-warning mt-3 mb-0">⚠️ El usuario deberá cambiar la contraseña al primer login.</div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setShowForm(false)} className="btn btn-ghost flex-1 justify-center">Cancelar</button>
            <button onClick={() => createMut.mutate()} disabled={createMut.isPending} className="btn btn-primary flex-1 justify-center">
              {createMut.isPending ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {resetId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-white/70">
            <h3 className="font-bold text-lg mb-1">Blanquear contraseña</h3>
            <p className="text-sm text-slate-500 mb-4">El usuario deberá cambiarla al próximo login.</p>
            <label className="label">Nueva contraseña temporal</label>
            <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} className="input mb-4" placeholder="Mín. 6 caracteres" />
            <div className="flex gap-3">
              <button onClick={() => setResetId(null)} className="btn btn-ghost flex-1 justify-center">Cancelar</button>
              <button onClick={() => { if (newPass.length < 6) return; resetMut.mutate({ id: resetId, password: newPass }); }} disabled={resetMut.isPending} className="btn btn-warning flex-1 justify-center">
                {resetMut.isPending ? '...' : 'Blanquear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Cargando usuarios...</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {users.map(u => (
              <div key={u.id} className={`flex items-center gap-4 px-6 py-4 ${!u.isActive ? 'opacity-50 bg-slate-50' : ''}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${rolBadgeClass(u.rol)}`}>
                  {getInitials(u.nombre, u.apellido)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800">{u.nombre} {u.apellido}</div>
                  <div className="text-sm text-slate-400">{u.email}</div>
                </div>
                <span className={`badge ${rolBadgeClass(u.rol)}`}>{rolLabel(u.rol)}</span>
                <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>{u.isActive ? 'Activo' : 'Inactivo'}</span>
                {u.mustChangePassword && <span className="badge badge-amber text-xs">Cambio pendiente</span>}
                <div className="flex items-center gap-2">
                  <button onClick={() => setResetId(u.id)} className="btn btn-xs btn-ghost gap-1" title="Blanquear contraseña">
                    <RefreshCw size={12} />
                  </button>
                  <button onClick={() => toggleMut.mutate({ id: u.id, active: u.isActive })} className={`btn btn-xs gap-1 ${u.isActive ? 'btn-danger' : 'btn-ghost'}`} title={u.isActive ? 'Desactivar' : 'Activar'}>
                    {u.isActive ? <PowerOff size={12} /> : <Power size={12} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

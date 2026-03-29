import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../api/services';
import { rolLabel, rolBadgeClass, getInitials } from '../../lib/utils';
import { useAuthStore } from '../../store/auth.store';
import type { User, AreaMunicipal } from '../../types';
import { AREAS } from '../../types';
import { UserPlus, RefreshCw, Power, PowerOff, Pencil, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';

const ROLES = ['secretaria', 'compras', 'tesoreria', 'admin'] as const;

type EditFormState = {
  nombre: string;
  apellido: string;
  rol: string;
  areaAsignada: string;
  sinRestriccionAreas: boolean;
  areasSeleccionadas: AreaMunicipal[];
};

function editFormFromUser(u: User): EditFormState {
  const sin = u.areasPedidoPermitidas === null || u.areasPedidoPermitidas === undefined;
  return {
    nombre: u.nombre,
    apellido: u.apellido,
    rol: u.rol,
    areaAsignada: u.areaAsignada ?? '',
    sinRestriccionAreas: sin,
    areasSeleccionadas: sin ? [] : [...u.areasPedidoPermitidas!],
  };
}

export function AdminUsuariosPage() {
  const qc = useQueryClient();
  const { user: currentUser, updateUser } = useAuthStore();
  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: usersApi.getAll });
  const [showForm, setShowForm] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [resetId, setResetId] = useState<string | null>(null);
  const [newPass, setNewPass] = useState('');
  const [form, setForm] = useState({
    email: '',
    nombre: '',
    apellido: '',
    rol: 'secretaria',
    password: '',
    areaAsignada: '' as string,
    sinRestriccionAreas: true,
    areasSeleccionadas: [] as AreaMunicipal[],
  });
  const [error, setError] = useState('');
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);

  const syncCurrentUserIfNeeded = async (updatedId: string) => {
    if (currentUser?.id !== updatedId) return;
    const me = await usersApi.getMe();
    updateUser({
      ...me,
      nombreCompleto: `${me.nombre} ${me.apellido}`,
    });
  };

  const createMut = useMutation({
    mutationFn: () =>
      usersApi.create({
        email: form.email,
        nombre: form.nombre,
        apellido: form.apellido,
        rol: form.rol as User['rol'],
        password: form.password,
        areaAsignada: form.areaAsignada ? (form.areaAsignada as AreaMunicipal) : null,
        areasPedidoPermitidas: form.sinRestriccionAreas ? null : form.areasSeleccionadas,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setError('');
      setShowForm(false);
      setCreateStep(1);
      setForm({
        email: '',
        nombre: '',
        apellido: '',
        rol: 'secretaria',
        password: '',
        areaAsignada: '',
        sinRestriccionAreas: true,
        areasSeleccionadas: [],
      });
    },
    onError: (e: unknown) =>
      setError((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Error'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Parameters<typeof usersApi.update>[1] }) =>
      usersApi.update(id, dto),
    onSuccess: async (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setEditUser(null);
      setEditForm(null);
      await syncCurrentUserIfNeeded(id);
    },
    onError: (e: unknown) =>
      setError((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Error'),
  });

  const resetMut = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => usersApi.resetPassword(id, password),
    onSuccess: () => {
      setResetId(null);
      setNewPass('');
      alert('Contraseña blanqueada. El usuario deberá cambiarla al próximo login.');
    },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? usersApi.deactivate(id) : usersApi.activate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const openEdit = (u: User) => {
    setError('');
    setEditUser(u);
    setEditForm(editFormFromUser(u));
  };

  const toggleAreaSeleccionada = (area: AreaMunicipal, list: AreaMunicipal[], setList: (a: AreaMunicipal[]) => void) => {
    if (list.includes(area)) setList(list.filter((x) => x !== area));
    else setList([...list, area]);
  };

  const closeCreateModal = () => {
    setShowForm(false);
    setCreateStep(1);
    setError('');
  };

  return (
    <div className="page-shell space-y-6">
      <div className="flex items-center justify-between">
        <div className="page-heading">
          <div className="page-kicker">Administración</div>
          <h1 className="page-title">Usuarios</h1>
          <p className="page-subtitle">{users.filter((u) => u.isActive).length} usuarios activos</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreateStep(1);
            setError('');
            setShowForm(true);
          }}
          className="btn btn-primary gap-2"
        >
          <UserPlus size={16} /> Nuevo usuario
        </button>
      </div>

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-user-wizard-title"
          onClick={closeCreateModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-xl p-6 sm:p-8 my-6 sm:my-10"
            onClick={(e) => e.stopPropagation()}
          >
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="min-w-0 pr-2">
              <h3 id="new-user-wizard-title" className="font-bold text-lg text-slate-800">
                Nuevo usuario
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {createStep === 1 && 'Datos de la persona'}
                {createStep === 2 && 'Rol, área municipal y contraseña'}
                {createStep === 3 && 'Permisos para crear pedidos'}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Paso {createStep} de 3
              </span>
              <button
                type="button"
                onClick={closeCreateModal}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex gap-2 mb-6" role="progressbar" aria-valuenow={createStep} aria-valuemin={1} aria-valuemax={3}>
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${s <= createStep ? 'bg-blue-500' : 'bg-slate-200'}`}
              />
            ))}
          </div>

          {error && !editUser && <div className="alert alert-danger mb-4">{error}</div>}

          {createStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="label">Nombre *</label>
                <input
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  className="input"
                  placeholder="Ej. María"
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Apellido *</label>
                <input
                  value={form.apellido}
                  onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))}
                  className="input"
                  placeholder="Ej. González"
                />
              </div>
              <div>
                <label className="label">Correo electrónico *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="input"
                  placeholder="nombre@dominio.gob.ar"
                />
              </div>
            </div>
          )}

          {createStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="label">Rol *</label>
                <select
                  value={form.rol}
                  onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value }))}
                  className="input"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {rolLabel(r)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">Función en el circuito de suministros (Secretaría, Compras, etc.).</p>
              </div>
              <div>
                <label className="label">Área municipal (opcional)</label>
                <select
                  value={form.areaAsignada}
                  onChange={(e) => setForm((f) => ({ ...f, areaAsignada: e.target.value }))}
                  className="input"
                >
                  <option value="">— Sin definir —</option>
                  {AREAS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Dependencia donde trabaja (distinto del rol). Sirve de referencia y valor por defecto al cargar pedidos.
                </p>
              </div>
              <div>
                <label className="label">Contraseña inicial *</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="input"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-900">
                Al primer ingreso le pediremos que cambie esta contraseña.
              </div>
            </div>
          )}

          {createStep === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 -mt-1">
                Acá definís <strong>para qué áreas</strong> puede pedir suministros; no es lo mismo que el rol ni el área municipal del paso anterior.
              </p>
              <div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.sinRestriccionAreas}
                    onChange={(e) => setForm((f) => ({ ...f, sinRestriccionAreas: e.target.checked }))}
                  />
                  <span className="text-sm font-semibold text-slate-700">Puede pedir suministros para cualquier área</span>
                </label>
                <p className="text-xs text-slate-500 mt-1 ml-6">
                  Desactivá para elegir solo algunas áreas (por ejemplo, Compras para varias direcciones).
                </p>
              </div>
              {!form.sinRestriccionAreas && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {AREAS.map((a) => (
                    <label key={a} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.areasSeleccionadas.includes(a)}
                        onChange={() =>
                          toggleAreaSeleccionada(a, form.areasSeleccionadas, (list) =>
                            setForm((f) => ({ ...f, areasSeleccionadas: list })),
                          )
                        }
                      />
                      {a}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3 mt-8 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={closeCreateModal}
              className="btn btn-ghost flex-1 min-w-[100px] justify-center"
            >
              Cancelar
            </button>
            {createStep > 1 && (
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setCreateStep((s) => s - 1);
                }}
                className="btn btn-ghost gap-1 flex-1 min-w-[100px] justify-center"
              >
                <ChevronLeft size={18} /> Atrás
              </button>
            )}
            {createStep < 3 ? (
              <button
                type="button"
                onClick={() => {
                  setError('');
                  if (createStep === 1) {
                    if (!form.nombre.trim() || !form.apellido.trim() || !form.email.trim()) {
                      setError('Completá nombre, apellido y email.');
                      return;
                    }
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
                      setError('Ingresá un email válido.');
                      return;
                    }
                  }
                  if (createStep === 2) {
                    if (form.password.length < 6) {
                      setError('La contraseña debe tener al menos 6 caracteres.');
                      return;
                    }
                  }
                  setCreateStep((s) => s + 1);
                }}
                className="btn btn-primary gap-1 flex-1 min-w-[120px] justify-center"
              >
                Siguiente <ChevronRight size={18} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setError('');
                  if (!form.sinRestriccionAreas && form.areasSeleccionadas.length === 0) {
                    setError('Marcá al menos un área o activá “cualquier área”.');
                    return;
                  }
                  createMut.mutate();
                }}
                disabled={createMut.isPending}
                className="btn btn-primary gap-1 flex-1 min-w-[120px] justify-center"
              >
                {createMut.isPending ? 'Creando...' : (
                  <>
                    <Check size={18} /> Crear usuario
                  </>
                )}
              </button>
            )}
          </div>
          </div>
        </div>
      )}

      {resetId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-white/70">
            <h3 className="font-bold text-lg mb-1">Blanquear contraseña</h3>
            <p className="text-sm text-slate-500 mb-4">El usuario deberá cambiarla al próximo login.</p>
            <label className="label">Nueva contraseña temporal</label>
            <input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              className="input mb-4"
              placeholder="Mín. 6 caracteres"
            />
            <div className="flex gap-3">
              <button type="button" onClick={() => setResetId(null)} className="btn btn-ghost flex-1 justify-center">
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (newPass.length < 6) return;
                  resetMut.mutate({ id: resetId, password: newPass });
                }}
                disabled={resetMut.isPending}
                className="btn btn-warning flex-1 justify-center"
              >
                {resetMut.isPending ? '...' : 'Blanquear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editUser && editForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-white/70 my-8">
            <h3 className="font-bold text-lg mb-1">Editar usuario</h3>
            <p className="text-sm text-slate-500 mb-4">{editUser.email}</p>
            {error && <div className="alert alert-danger mb-3">{error}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Nombre *</label>
                <input
                  value={editForm.nombre}
                  onChange={(e) => setEditForm((f) => (f ? { ...f, nombre: e.target.value } : f))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Apellido *</label>
                <input
                  value={editForm.apellido}
                  onChange={(e) => setEditForm((f) => (f ? { ...f, apellido: e.target.value } : f))}
                  className="input"
                />
              </div>
              <div className="col-span-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Rol y dependencia</p>
                <label className="label">Rol *</label>
                <select
                  value={editForm.rol}
                  onChange={(e) => setEditForm((f) => (f ? { ...f, rol: e.target.value } : f))}
                  className="input"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {rolLabel(r)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1 mb-3">Función en el circuito (Secretaría, Compras, etc.).</p>
                <label className="label">Área municipal (opcional)</label>
                <select
                  value={editForm.areaAsignada}
                  onChange={(e) => setEditForm((f) => (f ? { ...f, areaAsignada: e.target.value } : f))}
                  className="input"
                >
                  <option value="">— Sin definir —</option>
                  {AREAS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Permisos al crear pedidos</p>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editForm.sinRestriccionAreas}
                    onChange={(e) =>
                      setEditForm((f) =>
                        f ? { ...f, sinRestriccionAreas: e.target.checked } : f,
                      )
                    }
                  />
                  <span className="text-sm font-semibold text-slate-700">
                    Permitir pedidos para todas las áreas municipales
                  </span>
                </label>
                <p className="text-xs text-slate-500 mt-1 ml-6">
                  Desactivá para limitar en qué áreas puede crear pedidos.
                </p>
              </div>
              {!editForm.sinRestriccionAreas && (
                <div className="col-span-2 flex flex-wrap gap-2">
                  {AREAS.map((a) => (
                    <label key={a} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.areasSeleccionadas.includes(a)}
                        onChange={() =>
                          setEditForm((f) => {
                            if (!f) return f;
                            const list = f.areasSeleccionadas;
                            if (list.includes(a)) {
                              return { ...f, areasSeleccionadas: list.filter((x) => x !== a) };
                            }
                            return { ...f, areasSeleccionadas: [...list, a] };
                          })
                        }
                      />
                      {a}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setEditUser(null);
                  setEditForm(null);
                  setError('');
                }}
                className="btn btn-ghost flex-1 justify-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  if (!editForm.sinRestriccionAreas && editForm.areasSeleccionadas.length === 0) {
                    setError('Marcá al menos un área o volvé a “todas las áreas”.');
                    return;
                  }
                  updateMut.mutate({
                    id: editUser.id,
                    dto: {
                      nombre: editForm.nombre,
                      apellido: editForm.apellido,
                      rol: editForm.rol as User['rol'],
                      areaAsignada: editForm.areaAsignada ? (editForm.areaAsignada as AreaMunicipal) : null,
                      areasPedidoPermitidas: editForm.sinRestriccionAreas ? null : editForm.areasSeleccionadas,
                    },
                  });
                }}
                disabled={updateMut.isPending}
                className="btn btn-primary flex-1 justify-center"
              >
                {updateMut.isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Cargando usuarios...</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {users.map((u) => (
              <div
                key={u.id}
                className={`flex flex-wrap items-center gap-4 px-6 py-4 ${!u.isActive ? 'opacity-50 bg-slate-50' : ''}`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${rolBadgeClass(u.rol)}`}
                >
                  {getInitials(u.nombre, u.apellido)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800">
                    {u.nombre} {u.apellido}
                  </div>
                  <div className="text-sm text-slate-400">{u.email}</div>
                  {u.areaAsignada && (
                    <div className="text-xs text-slate-500 mt-0.5">Área: {u.areaAsignada}</div>
                  )}
                </div>
                <span className={`badge ${rolBadgeClass(u.rol)}`}>{rolLabel(u.rol)}</span>
                <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>
                  {u.isActive ? 'Activo' : 'Inactivo'}
                </span>
                {u.mustChangePassword && <span className="badge badge-amber text-xs">Cambio pendiente</span>}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => openEdit(u)}
                    className="btn btn-xs btn-ghost gap-1"
                    title="Editar datos y permisos"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetId(u.id)}
                    className="btn btn-xs btn-ghost gap-1"
                    title="Blanquear contraseña"
                  >
                    <RefreshCw size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleMut.mutate({ id: u.id, active: u.isActive })}
                    className={`btn btn-xs gap-1 ${u.isActive ? 'btn-danger' : 'btn-ghost'}`}
                    title={u.isActive ? 'Desactivar' : 'Activar'}
                  >
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

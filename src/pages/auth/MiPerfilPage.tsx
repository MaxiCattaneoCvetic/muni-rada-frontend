import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { usersApi } from '../../api/services';
import { useAuthStore } from '../../store/auth.store';
import { Upload, CheckCircle } from 'lucide-react';

export function MiPerfilPage() {
  const { user, updateUser } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const firmaMut = useMutation({
    mutationFn: (file: File) => usersApi.uploadFirma(file),
    onSuccess: (data) => {
      updateUser({ firmaUrl: data.firmaUrl });
      setSuccess('Firma guardada correctamente ✅');
    },
    onError: (e: any) => setError(e.response?.data?.message || 'Error al subir firma'),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setError('');
    firmaMut.mutate(file);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Mi perfil</h1>

      {/* User info */}
      <div className="card p-6 space-y-3">
        <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Datos personales</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-slate-400">Nombre</span><div className="font-semibold">{user?.nombre} {user?.apellido}</div></div>
          <div><span className="text-slate-400">Email</span><div className="font-semibold">{user?.email}</div></div>
          <div><span className="text-slate-400">Rol</span><div className="font-semibold capitalize">{user?.rol}</div></div>
        </div>
      </div>

      {/* Firma — solo para secretaria */}
      {user?.rol === 'secretaria' && (
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Firma digital</h2>
          <p className="text-sm text-slate-500">
            Subí una foto o escáner de tu firma. Se usará automáticamente al aprobar presupuestos.
          </p>

          {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}
          {success && <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2"><CheckCircle size={16} />{success}</div>}

          {/* Current firma */}
          {user.firmaUrl && !preview && (
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2">Firma actual:</p>
              <div className="border-2 border-green-200 rounded-xl p-4 bg-green-50">
                <img src={user.firmaUrl} alt="Tu firma" className="max-h-24 object-contain" />
              </div>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2">Nueva firma{firmaMut.isPending ? ' (subiendo...)' : ' (guardada)'}:</p>
              <div className="border-2 border-blue-200 rounded-xl p-4 bg-blue-50">
                <img src={preview} alt="Preview" className="max-h-24 object-contain" />
              </div>
            </div>
          )}

          {/* Upload button */}
          <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={firmaMut.isPending}
            className="btn btn-ghost w-full justify-center gap-2 py-3 border-dashed"
          >
            <Upload size={16} />
            {firmaMut.isPending ? 'Subiendo...' : user?.firmaUrl ? 'Reemplazar firma' : 'Subir firma escaneada'}
          </button>
          <p className="text-xs text-slate-400">Formatos: JPG, PNG, PDF · Máx 5MB</p>
        </div>
      )}

      {/* Change password */}
      <div className="card p-6">
        <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wide mb-3">Seguridad</h2>
        <a href="/cambiar-password" className="btn btn-ghost gap-2">
          🔐 Cambiar contraseña
        </a>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { Pedido } from '../../types';
import { pedidosApi, selladosApi, pagosApi } from '../../api/services';
import { useAuthStore } from '../../store/auth.store';
import { formatMoney } from '../../lib/utils';
import { X } from 'lucide-react';

interface Props {
  pedido: Pedido;
  action: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ActionModal({ pedido, action, onClose, onSuccess }: Props) {
  const { user } = useAuthStore();
  const [nota, setNota] = useState('');
  const [motivo, setMotivo] = useState('');
  const [numeroSellado, setNumeroSellado] = useState('');
  const [fechaSellado, setFechaSellado] = useState(new Date().toISOString().split('T')[0]);
  const [montoSellado, setMontoSellado] = useState('');
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
  const [numeroTransf, setNumeroTransf] = useState('');
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);
  const [montoPagado, setMontoPagado] = useState(pedido.monto?.toString() || '');
  const [facturaFile, setFacturaFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  const mut = useMutation({
    onSuccess,
    onError: (e: any) => setError(e.response?.data?.message || 'Error al procesar'),
  });

  const submit = () => {
    setError('');
    if (action === 'aprobar' || action === 'aprobar-urgente') {
      mut.mutate(pedidosApi.aprobar(pedido.id, nota) as any);
    } else if (action === 'rechazar') {
      if (!motivo) { setError('Ingresá el motivo del rechazo'); return; }
      mut.mutate(pedidosApi.rechazar(pedido.id, motivo) as any);
    } else if (action === 'firmar') {
      if (!user?.firmaUrl) { setError('No tenés una firma configurada. Andá a Mi Perfil para subir tu firma.'); return; }
      mut.mutate(pedidosApi.firmar(pedido.id, nota) as any);
    } else if (action === 'confirmar-recepcion') {
      mut.mutate(pedidosApi.confirmarRecepcion(pedido.id, nota) as any);
    } else if (action === 'sellado') {
      if (!numeroSellado || !montoSellado) { setError('Completá número y monto del sellado'); return; }
      mut.mutate(selladosApi.registrar(pedido.id, {
        numeroSellado, fechaSellado, montoSellado: parseFloat(montoSellado),
      }, comprobanteFile || undefined) as any);
    } else if (action === 'pago') {
      if (!numeroTransf) { setError('Ingresá el número de transferencia'); return; }
      mut.mutate(pagosApi.registrar(pedido.id, {
        numeroTransferencia: numeroTransf, fechaPago, montoPagado: parseFloat(montoPagado),
      }, facturaFile || undefined) as any);
    }
  };

  const titles: Record<string, string> = {
    'aprobar': '✅ Aprobar pedido',
    'aprobar-urgente': '🚨 Aprobar pedido urgente',
    'rechazar': '✗ Rechazar pedido',
    'firmar': '✍️ Firmar presupuesto',
    'confirmar-recepcion': '📦 Confirmar recepción',
    'sellado': '🏛️ Registrar sellado provincial',
    'pago': '💳 Registrar pago',
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between sticky top-0 bg-white rounded-t-2xl">
          <div>
            <h3 className="font-bold text-slate-800 text-base">{titles[action]}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{pedido.numero} · {pedido.descripcion}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

          {/* Pedido info */}
          <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1.5">
            <div className="flex justify-between"><span className="text-slate-500">Área</span><span className="font-semibold">{pedido.area}</span></div>
            {pedido.monto && <div className="flex justify-between"><span className="text-slate-500">Monto</span><span className="font-bold font-mono">{formatMoney(pedido.monto)}</span></div>}
            {pedido.proveedorSeleccionado && <div className="flex justify-between"><span className="text-slate-500">Proveedor</span><span className="font-semibold">{pedido.proveedorSeleccionado}</span></div>}
          </div>

          {/* Firma info */}
          {action === 'firmar' && (
            <>
              {user?.firmaUrl ? (
                <div className="border-2 border-green-200 rounded-xl p-4 bg-green-50">
                  <p className="text-sm font-semibold text-green-700 mb-2">✅ Se usará tu firma registrada:</p>
                  <img src={user.firmaUrl} alt="Tu firma" className="max-h-20 object-contain bg-white rounded-lg p-2 border border-green-100" />
                </div>
              ) : (
                <div className="border-2 border-red-200 rounded-xl p-4 bg-red-50">
                  <p className="text-sm font-semibold text-red-700">❌ No tenés firma configurada. Andá a Mi Perfil para subir tu firma escaneada antes de firmar.</p>
                </div>
              )}
            </>
          )}

          {/* Nota/motivo */}
          {(action === 'aprobar' || action === 'aprobar-urgente' || action === 'firmar' || action === 'confirmar-recepcion') && (
            <div>
              <label className="label">Nota (opcional)</label>
              <textarea value={nota} onChange={e => setNota(e.target.value)} className="input resize-none" rows={3} placeholder="Notas adicionales..." />
            </div>
          )}
          {action === 'rechazar' && (
            <div>
              <label className="label">Motivo del rechazo *</label>
              <textarea value={motivo} onChange={e => setMotivo(e.target.value)} className="input resize-none" rows={3} placeholder="Explicá el motivo del rechazo..." required />
            </div>
          )}

          {/* Sellado fields */}
          {action === 'sellado' && (
            <>
              <div><label className="label">N° de sellado *</label><input value={numeroSellado} onChange={e => setNumeroSellado(e.target.value)} className="input" placeholder="SELL-2026-082" /></div>
              <div><label className="label">Fecha del sellado *</label><input type="date" value={fechaSellado} onChange={e => setFechaSellado(e.target.value)} className="input" /></div>
              <div><label className="label">Monto del sellado ($) *</label><input type="number" value={montoSellado} onChange={e => setMontoSellado(e.target.value)} className="input" placeholder="15000" /></div>
              <div>
                <label className="label">Comprobante (PDF) — opcional</label>
                <input type="file" accept=".pdf" onChange={e => setComprobanteFile(e.target.files?.[0] || null)} className="input py-2 text-sm" />
              </div>
            </>
          )}

          {/* Pago fields */}
          {action === 'pago' && (
            <>
              <div><label className="label">N° de transferencia *</label><input value={numeroTransf} onChange={e => setNumeroTransf(e.target.value)} className="input" placeholder="TRF-00234581" /></div>
              <div><label className="label">Fecha de pago</label><input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)} className="input" /></div>
              <div><label className="label">Monto pagado ($)</label><input type="number" value={montoPagado} onChange={e => setMontoPagado(e.target.value)} className="input" /></div>
              <div>
                <label className="label">Factura (PDF) — opcional</label>
                <input type="file" accept=".pdf" onChange={e => setFacturaFile(e.target.files?.[0] || null)} className="input py-2 text-sm" />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end sticky bottom-0 bg-white rounded-b-2xl">
          <button onClick={onClose} className="btn btn-ghost">Cancelar</button>
          <button
            onClick={submit}
            disabled={mut.isPending || (action === 'firmar' && !user?.firmaUrl)}
            className={`btn ${action.includes('rechazar') ? 'btn-danger' : action === 'firmar' || action === 'confirmar-recepcion' ? 'btn-success' : 'btn-primary'}`}
          >
            {mut.isPending ? 'Procesando...' : titles[action]}
          </button>
        </div>
      </div>
    </div>
  );
}

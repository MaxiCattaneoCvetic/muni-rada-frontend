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
    <div 
      className="fixed inset-0 z-[300] flex items-center justify-center p-5 backdrop-blur-sm"
      style={{ background: 'rgba(15,23,42,.55)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="w-full max-w-[580px] max-h-[90vh] overflow-y-auto flex flex-col"
        style={{
          background: 'var(--white)',
          borderRadius: '20px',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid rgba(255,255,255,.8)',
        }}
      >
        {/* Header */}
        <div 
          className="px-5 py-4 border-b flex items-start justify-between gap-3 flex-shrink-0 sticky top-0 z-10"
          style={{
            borderBottom: '1px solid var(--border)',
            background: 'linear-gradient(135deg, #fff, #fafbfd)',
          }}
        >
          <div>
            <h3 
              className="font-extrabold"
              style={{ fontSize: '15px', color: 'var(--text)', letterSpacing: '-.2px' }}
            >
              {titles[action]}
            </h3>
            <p 
              className="mt-0.5"
              style={{ fontSize: '12px', color: 'var(--text2)' }}
            >
              {pedido.numero} · {pedido.descripcion}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="w-[30px] h-[30px] rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer transition-all"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text2)',
              fontSize: '14px',
              boxShadow: 'var(--shadow-xs)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--red-lt)';
              e.currentTarget.style.color = 'var(--red)';
              e.currentTarget.style.borderColor = 'var(--red-brd)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--surface)';
              e.currentTarget.style.color = 'var(--text2)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3.5 flex-1">
          {error && <div className="alert alert-danger">{error}</div>}

          {/* Pedido info */}
          <div 
            className="rounded-[10px] p-3.5 space-y-2"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div className="flex justify-between">
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Área</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{pedido.area}</span>
            </div>
            {pedido.monto && (
              <div className="flex justify-between">
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Monto</span>
                <span 
                  className="font-mono font-extrabold"
                  style={{ fontSize: '13px', color: 'var(--amber)', letterSpacing: '-.3px' }}
                >
                  {formatMoney(pedido.monto)}
                </span>
              </div>
            )}
            {pedido.proveedorSeleccionado && (
              <div className="flex justify-between">
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Proveedor</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{pedido.proveedorSeleccionado}</span>
              </div>
            )}
          </div>

          {/* Firma info */}
          {action === 'firmar' && (
            <>
              {user?.firmaUrl ? (
                <div className="alert alert-success">
                  <p className="font-semibold" style={{ fontSize: '12px' }}>✅ Se usará tu firma registrada:</p>
                  <img src={user.firmaUrl} alt="Tu firma" className="max-h-20 object-contain bg-white rounded-lg p-2 mt-2" style={{ border: '1px solid var(--green-brd)' }} />
                </div>
              ) : (
                <div className="alert alert-danger">
                  <p className="font-semibold" style={{ fontSize: '12px' }}>❌ No tenés firma configurada. Andá a Mi Perfil para subir tu firma escaneada antes de firmar.</p>
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
        <div 
          className="px-5 py-3.5 border-t flex gap-2 justify-end flex-shrink-0 sticky bottom-0"
          style={{
            borderTop: '1px solid var(--border)',
            background: 'var(--white)',
          }}
        >
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

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, AlertCircle, Plus, X } from 'lucide-react';
import { ReportarProblemaModal } from '../reportar/ReportarProblemaModal';

export function SpeedDialFAB() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [open]);

  const handleNuevoPedido = () => {
    setOpen(false);
    navigate('/nuevo-pedido');
  };

  const handleReportarProblema = () => {
    setOpen(false);
    setShowModal(true);
  };

  return (
    <>
      <div
        ref={containerRef}
        className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-30 flex flex-col items-end gap-3"
      >
        {/* Action buttons — slide up when open */}
        <div
          className="flex flex-col items-end gap-2 transition-all duration-200"
          style={{
            opacity: open ? 1 : 0,
            transform: open ? 'translateY(0)' : 'translateY(12px)',
            pointerEvents: open ? 'auto' : 'none',
          }}
        >
          {/* Reportar problema */}
          <div className="flex items-center gap-2.5">
            <span
              className="px-3 py-1.5 rounded-full font-semibold whitespace-nowrap pointer-events-none"
              style={{
                fontSize: '12px',
                background: 'var(--white)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              Reportar problema
            </span>
            <button
              onClick={handleReportarProblema}
              className="flex items-center justify-center rounded-full transition-all hover:-translate-y-0.5 active:scale-95"
              style={{
                width: '46px',
                height: '46px',
                background: 'var(--amber-lt)',
                border: '2px solid var(--amber-brd)',
                color: 'var(--amber)',
                boxShadow: 'var(--shadow-sm)',
              }}
              aria-label="Reportar problema"
            >
              <AlertCircle size={20} />
            </button>
          </div>

          {/* Nuevo pedido */}
          <div className="flex items-center gap-2.5">
            <span
              className="px-3 py-1.5 rounded-full font-semibold whitespace-nowrap pointer-events-none"
              style={{
                fontSize: '12px',
                background: 'var(--white)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              Nuevo pedido
            </span>
            <button
              onClick={handleNuevoPedido}
              className="flex items-center justify-center rounded-full transition-all hover:-translate-y-0.5 active:scale-95"
              style={{
                width: '46px',
                height: '46px',
                background: 'var(--blue-lt)',
                border: '2px solid var(--blue-brd)',
                color: 'var(--blue)',
                boxShadow: 'var(--shadow-sm)',
              }}
              aria-label="Nuevo pedido"
            >
              <ShoppingCart size={20} />
            </button>
          </div>
        </div>

        {/* Main FAB toggle */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-white font-bold px-3.5 sm:px-5 py-3 sm:py-3.5 rounded-full transition-all hover:-translate-y-1 active:scale-95"
          style={{
            background: 'var(--gradient-blue)',
            boxShadow: open ? '0 6px 20px rgba(59,130,246,.35)' : 'var(--shadow-blue)',
            fontSize: '13px',
          }}
          aria-expanded={open}
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        >
          <span
            className="transition-transform duration-200"
            style={{ transform: open ? 'rotate(45deg)' : 'rotate(0deg)', display: 'inline-flex' }}
          >
            {open ? <X size={18} /> : <Plus size={18} />}
          </span>
          <span className="hidden sm:inline">{open ? 'Cerrar' : 'Nuevo'}</span>
        </button>
      </div>

      {showModal && <ReportarProblemaModal onClose={() => setShowModal(false)} />}
    </>
  );
}

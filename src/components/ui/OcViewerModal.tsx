import { X, ExternalLink, FileText } from 'lucide-react';

interface OcViewerModalProps {
  url: string;
  numero?: string;
  pedidoNumero?: string;
  onClose: () => void;
}

export function OcViewerModal({ url, numero, pedidoNumero, onClose }: OcViewerModalProps) {
  return (
    <div
      className="fixed inset-0 z-[400] flex flex-col"
      style={{ background: 'rgba(15,23,42,.72)', backdropFilter: 'blur(4px)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 flex-shrink-0"
        style={{ background: 'var(--white)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <FileText size={16} style={{ color: 'var(--blue)' }} />
          <span className="font-extrabold" style={{ fontSize: '14px', color: 'var(--text)' }}>
            {numero ?? 'Orden de Compra'}
          </span>
          {pedidoNumero && (
            <span style={{ fontSize: '12px', color: 'var(--text3)' }}>· {pedidoNumero}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={url}
            download
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary btn-sm gap-1.5"
          >
            <ExternalLink size={13} /> Descargar
          </a>
          <button
            onClick={onClose}
            className="w-[30px] h-[30px] rounded-lg flex items-center justify-center transition-all"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text2)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--red-lt)';
              e.currentTarget.style.color = 'var(--red)';
              e.currentTarget.style.borderColor = 'var(--red-brd)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--surface)';
              e.currentTarget.style.color = 'var(--text2)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* PDF iframe */}
      <div className="flex-1 overflow-hidden">
        <iframe
          src={url}
          className="w-full h-full"
          title="Orden de Compra"
          style={{ border: 'none', display: 'block' }}
        />
      </div>
    </div>
  );
}

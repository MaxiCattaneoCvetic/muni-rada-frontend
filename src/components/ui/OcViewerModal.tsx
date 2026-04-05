import { useMemo, useState } from 'react';
import { X, Download, FileText } from 'lucide-react';

interface OcViewerModalProps {
  url: string;
  numero?: string;
  pedidoNumero?: string;
  title?: string;
  onClose: () => void;
}

export function OcViewerModal({ url, numero, pedidoNumero, title, onClose }: OcViewerModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const isImage = useMemo(() => /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(url), [url]);

  const getFilename = () => {
    try {
      const pathname = new URL(url).pathname;
      const lastSegment = pathname.split('/').filter(Boolean).pop();
      if (lastSegment) return decodeURIComponent(lastSegment);
    } catch {
      // Fall back to a generated name below.
    }
    const baseName = numero ?? title ?? 'documento';
    return `${baseName.replace(/[^\w.-]+/g, '_')}.pdf`;
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = getFilename();
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setIsDownloading(false);
    }
  };

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
            {numero ?? title ?? 'Documento PDF'}
          </span>
          {pedidoNumero && (
            <span style={{ fontSize: '12px', color: 'var(--text3)' }}>· {pedidoNumero}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="btn btn-primary btn-sm gap-1.5"
            type="button"
            disabled={isDownloading}
          >
            <Download size={13} /> {isDownloading ? 'Descargando...' : 'Descargar'}
          </button>
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

      {/* Document viewer */}
      <div className="flex-1 overflow-hidden" style={{ background: isImage ? '#0f172a' : 'transparent' }}>
        {isImage ? (
          <div className="w-full h-full flex items-center justify-center p-6">
            <img
              src={url}
              alt={title ?? numero ?? 'Documento'}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
          </div>
        ) : (
          <iframe
            src={url}
            className="w-full h-full"
            title={title ?? numero ?? 'Documento PDF'}
            style={{ border: 'none', display: 'block' }}
          />
        )}
      </div>
    </div>
  );
}

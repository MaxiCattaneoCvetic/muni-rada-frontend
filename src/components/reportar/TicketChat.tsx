import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, MessageSquare } from 'lucide-react';
import { reportesApi, type Mensaje } from '../../api/reportes';
import { formatDateTime } from '../../lib/utils';

interface TicketChatProps {
  reporteId: string;
  /** true cuando quien visualiza el chat es del equipo de soporte (admin) */
  isAdmin: boolean;
}

function ChatBubble({ mensaje, isAdmin }: { mensaje: Mensaje; isAdmin: boolean }) {
  const isMine = isAdmin ? mensaje.esAdmin : !mensaje.esAdmin;
  const senderLabel = mensaje.esAdmin
    ? 'Soporte'
    : mensaje.autor
    ? `${mensaje.autor.nombre} ${mensaje.autor.apellido}`.trim() || mensaje.autor.email
    : 'Usuario';

  return (
    <div className={`flex flex-col gap-0.5 ${isMine ? 'items-end' : 'items-start'}`}>
      <span style={{ fontSize: '10px', color: 'var(--text3)', fontWeight: 700, letterSpacing: '.2px' }}>
        {senderLabel}
      </span>
      <div
        style={{
          maxWidth: '82%',
          padding: '8px 12px',
          borderRadius: isMine ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
          background: mensaje.esAdmin
            ? 'linear-gradient(135deg, #4f46e5, #6366f1)'
            : 'var(--surface)',
          color: mensaje.esAdmin ? '#fff' : 'var(--text)',
          border: mensaje.esAdmin ? 'none' : '1px solid var(--border)',
          fontSize: '13px',
          fontWeight: 500,
          lineHeight: 1.55,
          wordBreak: 'break-word',
          boxShadow: mensaje.esAdmin
            ? '0 2px 8px rgba(99,102,241,.35)'
            : 'var(--shadow-xs)',
        }}
      >
        {mensaje.contenido}
      </div>
      <span style={{ fontSize: '10px', color: 'var(--text3)' }}>
        {formatDateTime(mensaje.createdAt)}
      </span>
    </div>
  );
}

export function TicketChat({ reporteId, isAdmin }: TicketChatProps) {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: mensajes = [], isLoading } = useQuery({
    queryKey: ['mensajes', reporteId],
    queryFn: () => reportesApi.getMensajes(reporteId),
    refetchInterval: 15_000,
  });

  const mut = useMutation({
    mutationFn: (contenido: string) => reportesApi.postMensaje(reporteId, contenido),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mensajes', reporteId] });
      setText('');
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes.length]);

  const send = () => {
    const c = text.trim();
    if (!c || mut.isPending) return;
    mut.mutate(c);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header label */}
      <div className="flex items-center gap-1.5">
        <MessageSquare size={13} style={{ color: 'var(--text2)' }} />
        <span className="label" style={{ marginBottom: 0 }}>Conversación</span>
      </div>

      {/* Mensajes */}
      <div
        className="flex flex-col gap-3 overflow-y-auto rounded-xl p-3"
        style={{
          minHeight: '80px',
          maxHeight: '260px',
          background: 'var(--white)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-xs) inset',
        }}
      >
        {isLoading ? (
          <p style={{ fontSize: '12px', color: 'var(--text3)', textAlign: 'center', margin: 'auto 0' }}>
            Cargando mensajes…
          </p>
        ) : mensajes.length === 0 ? (
          <div style={{ margin: 'auto 0', textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: 'var(--text3)', fontWeight: 600 }}>
              Aún no hay mensajes
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>
              {isAdmin
                ? 'Escribí para ponerte en contacto con el usuario.'
                : 'Podés escribir para consultar el estado o agregar información.'}
            </p>
          </div>
        ) : (
          mensajes.map((m) => (
            <ChatBubble key={m.id} mensaje={m} isAdmin={isAdmin} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 items-end">
        <textarea
          className="input resize-none flex-1"
          rows={2}
          placeholder="Escribí un mensaje… (Enter para enviar, Shift+Enter para salto)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          style={{ fontSize: '13px' }}
        />
        <button
          onClick={send}
          disabled={!text.trim() || mut.isPending}
          className="btn btn-primary"
          style={{
            alignSelf: 'flex-end',
            width: '38px',
            height: '38px',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}

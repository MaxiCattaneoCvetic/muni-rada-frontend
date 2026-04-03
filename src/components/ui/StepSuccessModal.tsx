import React from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

export type SuccessTheme = 'green' | 'amber' | 'blue' | 'teal';

export interface StepSuccessModalProps {
  theme: SuccessTheme;
  title: string;
  nextStep: string;
  nextStepSub?: string;
  isFinal?: boolean;
  pedidoNumero: string;
  pedidoDescripcion: string;
  urgenteNote?: string;
  /** Optional extra content rendered between the next-step card and the footer button. */
  bottomExtra?: React.ReactNode;
  onDismiss: () => void;
}

const THEME_TOKENS: Record<SuccessTheme, {
  bg: string; border: string; text: string; textMid: string; icon: string; nextBg: string; nextBorder: string;
}> = {
  green: { bg: 'var(--green-lt)',  border: 'var(--green-brd)', text: 'var(--green)',  textMid: 'var(--green-mid)', icon: '#166534', nextBg: '#f0fdf4', nextBorder: 'var(--green-brd)' },
  amber: { bg: 'var(--amber-lt)',  border: 'var(--amber-brd)', text: 'var(--amber)',  textMid: 'var(--amber-mid)', icon: '#92400e', nextBg: '#fffbeb', nextBorder: 'var(--amber-brd)' },
  blue:  { bg: 'var(--blue-lt)',   border: 'var(--blue-brd)',  text: 'var(--blue)',   textMid: 'var(--blue-mid)',  icon: '#1e40af', nextBg: '#eff6ff', nextBorder: 'var(--blue-brd)'  },
  teal:  { bg: 'var(--teal-lt)',   border: 'var(--teal-brd)',  text: 'var(--teal)',   textMid: 'var(--teal-mid)',  icon: '#0f766e', nextBg: '#f0fdfa', nextBorder: 'var(--teal-brd)'  },
};

export function StepSuccessModal({
  theme,
  title,
  nextStep,
  nextStepSub,
  isFinal,
  pedidoNumero,
  pedidoDescripcion,
  urgenteNote,
  bottomExtra,
  onDismiss,
}: StepSuccessModalProps) {
  const t = THEME_TOKENS[theme];
  const isReject = theme === 'amber' && isFinal;
  const shortDesc = pedidoDescripcion.length > 36
    ? pedidoDescripcion.slice(0, 36) + '…'
    : pedidoDescripcion;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-5 backdrop-blur-sm"
      style={{ background: 'rgba(15,23,42,.55)' }}
    >
      <div
        className="w-full max-w-[480px] flex flex-col overflow-hidden"
        style={{
          background: 'var(--white)',
          borderRadius: '20px',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid rgba(255,255,255,.8)',
          animation: 'popIn .35s cubic-bezier(.34,1.56,.64,1) both',
        }}
      >
        {/* Themed top section */}
        <div
          className="flex flex-col items-center px-6 pt-8 pb-6 gap-4"
          style={{ background: t.bg, borderBottom: `1px solid ${t.border}` }}
        >
          {/* Animated SVG icon */}
          <div style={{ animation: 'popIn .4s cubic-bezier(.34,1.56,.64,1) .1s both' }}>
            <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
              <circle
                cx="36" cy="36" r="32"
                stroke={t.icon}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray="202"
                strokeDashoffset="202"
                style={{ animation: 'drawCircle .55s ease-out .15s forwards' }}
              />
              {isReject ? (
                <>
                  <line
                    x1="24" y1="24" x2="48" y2="48"
                    stroke={t.icon} strokeWidth="3.5" strokeLinecap="round"
                    strokeDasharray="34" strokeDashoffset="34"
                    style={{ animation: 'drawX .3s ease-out .6s forwards' }}
                  />
                  <line
                    x1="48" y1="24" x2="24" y2="48"
                    stroke={t.icon} strokeWidth="3.5" strokeLinecap="round"
                    strokeDasharray="34" strokeDashoffset="34"
                    style={{ animation: 'drawX .3s ease-out .75s forwards' }}
                  />
                </>
              ) : (
                <polyline
                  points="22,37 32,47 50,27"
                  stroke={t.icon}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  strokeDasharray="55"
                  strokeDashoffset="55"
                  style={{ animation: 'drawCheck .3s ease-out .65s forwards' }}
                />
              )}
            </svg>
          </div>

          {/* Title + pedido pill */}
          <div className="text-center" style={{ animation: 'fadeSlideUp .4s ease-out .3s both' }}>
            <h2
              className="font-extrabold tracking-tight"
              style={{ fontSize: '20px', color: t.text, letterSpacing: '-.3px' }}
            >
              {title}
            </h2>
            <div
              className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1"
              style={{
                background: 'rgba(255,255,255,.7)',
                border: `1px solid ${t.border}`,
                fontSize: '12px',
                fontWeight: 700,
                color: t.text,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {pedidoNumero}
              <span style={{ fontFamily: 'inherit', fontWeight: 500, color: t.textMid, opacity: .8 }}>
                · {shortDesc}
              </span>
            </div>
          </div>
        </div>

        {/* Next step card */}
        <div className="px-5 py-5" style={{ animation: 'fadeSlideUp .4s ease-out .45s both' }}>
          <p
            className="mb-3 text-[10px] font-extrabold uppercase tracking-[.07em]"
            style={{ color: 'var(--text3)' }}
          >
            {isFinal ? 'Estado final' : '¿Qué pasa ahora?'}
          </p>
          <div
            className="flex gap-3 rounded-2xl p-4"
            style={{ background: t.nextBg, border: `1px solid ${t.nextBorder}` }}
          >
            <div
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
              style={{ background: t.icon }}
            >
              {isFinal
                ? <CheckCircle2 size={15} color="white" strokeWidth={2.5} />
                : <ArrowRight size={15} color="white" strokeWidth={2.5} />
              }
            </div>
            <div className="min-w-0">
              <p className="font-extrabold leading-snug" style={{ fontSize: '13px', color: 'var(--text)' }}>
                {nextStep}
              </p>
              {nextStepSub && (
                <p className="mt-1 leading-relaxed" style={{ fontSize: '12px', color: 'var(--text2)' }}>
                  {nextStepSub}
                </p>
              )}
            </div>
          </div>

          {urgenteNote && !isFinal && (
            <div
              className="mt-3 flex items-start gap-2 rounded-xl px-3.5 py-2.5"
              style={{
                background: 'var(--amber-lt)',
                border: '1px solid var(--amber-brd)',
                animation: 'fadeSlideUp .4s ease-out .55s both',
              }}
            >
              <AlertTriangle size={15} className="shrink-0 mt-0.5" style={{ color: 'var(--amber)' }} />
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--amber)' }}>
                {urgenteNote}
              </p>
            </div>
          )}
        </div>

        {bottomExtra && (
          <div className="px-5 pb-1" style={{ animation: 'fadeSlideUp .4s ease-out .55s both' }}>
            {bottomExtra}
          </div>
        )}

        {/* Footer */}
        <div
          className="px-5 pb-5 pt-4 flex justify-end"
          style={{ animation: 'fadeSlideUp .4s ease-out .5s both' }}
        >
          <button onClick={onDismiss} className="btn btn-primary" style={{ minWidth: '120px' }}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

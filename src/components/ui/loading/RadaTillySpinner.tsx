import { useId } from 'react';
import './RadaTillySpinner.css';

interface RadaTillySpinnerProps {
  label?: string;
  size?: number;
  showLabel?: boolean;
}

interface RadaTillyLoaderProps {
  variant?: 'fullscreen' | 'contained' | 'inline';
  label?: string;
  size?: number;
  soft?: boolean;
}

interface ButtonSpinnerProps {
  label?: string;
}

export function RadaTillySpinner({
  label = 'Cargando',
  size = 56,
  showLabel = true,
}: RadaTillySpinnerProps) {
  const ringSize = size + 20;
  const ringOffset = -10;
  const clipId = useId();

  return (
    <div className="rt-spinner-root" aria-live="polite" aria-busy="true">
      <div
        className="rt-spinner-stage"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <svg
          className="rt-ring-svg"
          style={{
            width: ringSize,
            height: ringSize,
            top: ringOffset,
            left: ringOffset,
          }}
          viewBox="0 0 76 76"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="38"
            cy="38"
            r="34"
            fill="none"
            stroke="#2a6ba8"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="52 160"
            opacity="0.9"
          />
          <circle
            cx="38"
            cy="38"
            r="34"
            fill="none"
            stroke="#d4e8f7"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="120 92"
            opacity="0.4"
          />
        </svg>

        <svg
          className="rt-shield-svg"
          style={{ width: size, height: size }}
          viewBox="0 0 56 70"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <clipPath id={clipId}>
              <ellipse cx="28" cy="36" rx="24" ry="29" />
            </clipPath>
          </defs>

          <ellipse cx="28" cy="36" rx="26" ry="31" fill="white" stroke="#1a1a1a" strokeWidth="1.8" />

          <g clipPath={`url(#${clipId})`}>
            <rect x="4" y="10" width="48" height="54" fill="#d4e8f7" />
            <rect x="4" y="48" width="48" height="18" fill="#2a6ba8" />
            <rect x="4" y="10" width="48" height="24" fill="#f5e8c0" />

            <g className="rt-sun-g">
              <circle cx="28" cy="26" r="7" fill="#e8a020" />
              <line x1="28" y1="16" x2="28" y2="13" stroke="#e8a020" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="35" y1="19" x2="37" y2="17" stroke="#e8a020" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="38" y1="26" x2="41" y2="26" stroke="#e8a020" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="35" y1="33" x2="37" y2="35" stroke="#e8a020" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="21" y1="19" x2="19" y2="17" stroke="#e8a020" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="18" y1="26" x2="15" y2="26" stroke="#e8a020" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="21" y1="33" x2="19" y2="35" stroke="#e8a020" strokeWidth="1.2" strokeLinecap="round" />
            </g>

            <line x1="4" y1="44" x2="52" y2="44" stroke="#1a6ba8" strokeWidth="0.6" />

            <g className="rt-wave-g">
              <path d="M0 46 Q7 42 14 46 Q21 50 28 46 Q35 42 42 46 Q49 50 56 46 Q63 42 70 46" fill="none" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M0 51 Q7 47 14 51 Q21 55 28 51 Q35 47 42 51 Q49 55 56 51 Q63 47 70 51" fill="none" stroke="white" strokeWidth="0.9" strokeLinecap="round" opacity="0.5" />
            </g>

            <path d="M4 40 Q16 34 28 37 Q40 34 52 40 L52 45 L4 45 Z" fill="#5a8a30" opacity="0.55" />
          </g>
        </svg>
      </div>

      {showLabel && (
        <div className="rt-spinner-label">
          {label}
          <span className="rt-dot" />
          <span className="rt-dot" />
          <span className="rt-dot" />
        </div>
      )}
    </div>
  );
}

export function RadaTillyLoader({
  variant = 'contained',
  label = 'Cargando',
  size = 56,
  soft = false,
}: RadaTillyLoaderProps) {
  if (variant === 'fullscreen') {
    return (
      <div className="rt-loader rt-loader--fullscreen">
        <RadaTillySpinner label={label} size={size} />
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="rt-loader rt-loader--inline">
        <RadaTillySpinner label={label} size={size} showLabel={false} />
      </div>
    );
  }

  return (
    <div className="rt-loader rt-loader--contained">
      <div className={`rt-loader-card${soft ? ' rt-loader-card--soft' : ''}`}>
        <div style={{ padding: '28px 18px' }}>
          <RadaTillySpinner label={label} size={size} />
        </div>
      </div>
    </div>
  );
}

export function ButtonSpinner({ label = 'Procesando' }: ButtonSpinnerProps) {
  return (
    <span className="rt-button-spinner" aria-live="polite" aria-busy="true">
      <span className="rt-button-spinner__ring" aria-hidden="true" />
      <span className="rt-button-spinner__label">{label}</span>
    </span>
  );
}

export default RadaTillySpinner;

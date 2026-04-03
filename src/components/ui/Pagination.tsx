import { useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// ── Hook ─────────────────────────────────────────────────────────────────────

export function usePagination({
  total,
  pageSize,
  page,
  setPage,
  resetDeps = [],
}: {
  total: number;
  pageSize: number;
  page: number;
  setPage: (p: number) => void;
  /** Reset to page 1 whenever any of these values change (e.g. search, filter) */
  resetDeps?: unknown[];
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const end = Math.min(start + pageSize, total);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); }, resetDeps);

  return { page: safePage, totalPages, start, end };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  start: number;
  end: number;
  onPage: (p: number) => void;
  /** Label for items, default "resultados" */
  itemLabel?: string;
}

export function Pagination({ page, totalPages, total, start, end, onPage, itemLabel = 'resultados' }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = buildPageWindows(page, totalPages);

  return (
    <div className="pagination-bar">
      <span className="pagination-info">
        {start + 1}–{end} de {total} {itemLabel}
      </span>

      <div className="pagination-controls">
        <button
          className="pagination-btn"
          disabled={page === 1}
          onClick={() => onPage(page - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft size={14} />
        </button>

        {pages.map((item, i) =>
          item === '…' ? (
            <span key={`dots-${i}`} className="pagination-dots">…</span>
          ) : (
            <button
              key={item}
              className={`pagination-btn${item === page ? ' active' : ''}`}
              onClick={() => onPage(item as number)}
              aria-current={item === page ? 'page' : undefined}
            >
              {item}
            </button>
          )
        )}

        <button
          className="pagination-btn"
          disabled={page === totalPages}
          onClick={() => onPage(page + 1)}
          aria-label="Página siguiente"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildPageWindows(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const result: (number | '…')[] = [1];

  if (current > 3) result.push('…');

  const rangeStart = Math.max(2, current - 1);
  const rangeEnd = Math.min(total - 1, current + 1);
  for (let i = rangeStart; i <= rangeEnd; i++) result.push(i);

  if (current < total - 2) result.push('…');

  result.push(total);
  return result;
}

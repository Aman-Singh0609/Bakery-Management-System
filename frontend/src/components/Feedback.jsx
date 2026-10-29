import { Loader2 } from 'lucide-react';

export function Spinner({ label = 'Loading' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-cocoa-muted" role="status">
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 rounded-full border-2 border-line" />
        <Loader2 className="h-10 w-10 animate-spin text-berry" />
      </div>
      <span className="text-sm">{label}…</span>
    </div>
  );
}

export function ErrorNote({ children, onRetry }) {
  if (!children) return null;
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-berry/20 bg-berry-light px-4 py-3 text-sm text-berry-dark"
      role="alert"
    >
      <span className="flex items-center gap-2">
        <span className="text-base">⚠️</span>
        {children}
      </span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full bg-berry/10 px-3 py-1 text-xs font-semibold text-berry hover:bg-berry/20 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="panel flex flex-col items-start gap-4 px-8 py-14 sm:items-center sm:text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-box-light text-3xl">
        🧁
      </div>
      <h2 className="text-xl font-bold">{title}</h2>
      {children && <p className="max-w-md text-sm text-cocoa-soft">{children}</p>}
      {action}
    </div>
  );
}

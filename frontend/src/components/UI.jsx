import { clsx } from 'clsx';

// ── Button ────────────────────────────────────────────────────────────────
export function Button({ children, variant = 'primary', size = 'md', className, loading, ...props }) {
  const base = 'inline-flex items-center gap-2 font-medium rounded-lg transition-all duration-200 cursor-pointer border-0 font-body disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-gradient-to-r from-accent to-cyan-400 text-black font-semibold shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:shadow-[0_0_30px_rgba(0,229,255,0.45)] hover:-translate-y-px',
    purple:  'bg-gradient-to-r from-accent2 to-purple-500 text-white font-semibold shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.4)] hover:-translate-y-px',
    ghost:   'bg-transparent border border-white/10 text-muted hover:border-accent hover:text-accent',
    danger:  'bg-danger/10 border border-danger/30 text-danger hover:bg-danger/20',
    success: 'bg-accent3/10 border border-accent3/30 text-accent3 hover:bg-accent3/20',
  };
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' };
  return (
    <button className={clsx(base, variants[variant], sizes[size], className)} {...props}>
      {loading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : null}
      {children}
    </button>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────
export function Card({ children, className, glow, ...props }) {
  return (
    <div className={clsx(
      'bg-surface border rounded-2xl overflow-hidden',
      glow ? 'border-accent/20 shadow-[0_0_30px_rgba(0,229,255,0.05)]' : 'border-white/7',
      className
    )} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={clsx('px-5 py-4 border-b border-white/7 flex items-center justify-between', className)}>
      <div>
        <div className="font-display font-bold text-sm text-text">{title}</div>
        {subtitle && <div className="text-xs text-muted mt-0.5">{subtitle}</div>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────
export function Badge({ children, color = 'default' }) {
  const colors = {
    default: 'bg-white/8 text-muted',
    cyan:    'bg-accent/10 text-accent',
    green:   'bg-accent3/10 text-accent3',
    purple:  'bg-accent2/20 text-purple-300',
    warn:    'bg-warn/10 text-warn',
    danger:  'bg-danger/10 text-danger',
    live:    'bg-accent3/10 text-accent3 animate-blink',
  };
  return (
    <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full', colors[color])}>
      {children}
    </span>
  );
}

// ── StatusDot ─────────────────────────────────────────────────────────────
export function StatusDot({ status }) {
  const map = {
    applying:     { color: 'bg-accent animate-pulse-dot', label: 'Applying…' },
    applied:      { color: 'bg-accent3', label: 'Applied' },
    queued:       { color: 'bg-muted', label: 'Queued' },
    review_needed:{ color: 'bg-warn', label: 'Needs Review' },
    interview:    { color: 'bg-purple-400', label: 'Interview' },
    offer:        { color: 'bg-accent3', label: 'Offer!' },
    rejected:     { color: 'bg-danger', label: 'Rejected' },
    discovered:   { color: 'bg-muted', label: 'New' },
    analyzing:    { color: 'bg-warn animate-pulse', label: 'Analyzing' },
  };
  const s = map[status] || map.discovered;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={clsx('w-1.5 h-1.5 rounded-full', s.color)} />
      <span className="text-muted">{s.label}</span>
    </span>
  );
}

// ── ProgressBar ───────────────────────────────────────────────────────────
export function ProgressBar({ value, color = 'cyan', label, showValue = true }) {
  const colors = {
    cyan:   'from-accent to-cyan-400',
    green:  'from-accent3 to-emerald-400',
    purple: 'from-accent2 to-purple-400',
  };
  return (
    <div className="flex items-center gap-3">
      {label && <span className="text-xs text-muted w-28 shrink-0">{label}</span>}
      <div className="flex-1 h-1.5 bg-white/7 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full bg-gradient-to-r transition-all duration-700', colors[color])}
          style={{ width: `${value}%` }}
        />
      </div>
      {showValue && <span className="text-xs text-text font-medium w-8 text-right">{value}%</span>}
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────
export function Toggle({ checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/7 last:border-0">
      <div className="flex-1 min-w-0 pr-4">
        <div className="text-sm font-medium text-text">{label}</div>
        {description && <div className="text-xs text-muted mt-0.5">{description}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative w-10 h-5.5 rounded-full border transition-all shrink-0',
          checked ? 'bg-accent border-accent' : 'bg-surface2 border-white/10'
        )}
        style={{ height: '22px' }}
      >
        <span className={clsx(
          'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all',
          checked ? 'left-[calc(100%-18px)]' : 'left-0.5'
        )} />
      </button>
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────
export function Spinner({ size = 'md' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' };
  return <div className={clsx('border-2 border-accent/30 border-t-accent rounded-full animate-spin', sizes[size])} />;
}

// ── Empty State ───────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <div className="font-display font-bold text-lg mb-2">{title}</div>
      <div className="text-muted text-sm mb-6 max-w-xs">{description}</div>
      {action}
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────
export function Input({ label, error, className, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-muted">{label}</label>}
      <input
        className={clsx(
          'bg-surface2 border rounded-lg px-3 py-2.5 text-sm text-text placeholder-muted outline-none transition-all',
          error ? 'border-danger focus:border-danger' : 'border-white/10 focus:border-accent',
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}

// ── Notification Toast ────────────────────────────────────────────────────
export function NotificationStack({ notifications }) {
  return (
    <div className="fixed bottom-5 right-5 flex flex-col gap-2 z-50">
      {notifications.map(n => (
        <div
          key={n.id}
          className={clsx(
            'flex items-center gap-3 px-4 py-3 rounded-xl border text-sm shadow-xl animate-fadeUp',
            n.type === 'error'   ? 'bg-danger/10 border-danger/30 text-danger' :
            n.type === 'success' ? 'bg-accent3/10 border-accent3/30 text-accent3' :
                                   'bg-surface border-white/10 text-text'
          )}
        >
          <span>{n.type === 'error' ? '✕' : n.type === 'success' ? '✓' : 'ℹ'}</span>
          <span>{n.message}</span>
        </div>
      ))}
    </div>
  );
}

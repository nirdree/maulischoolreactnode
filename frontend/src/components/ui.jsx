// components/ui.jsx - Reusable UI components for the school management system
import { Loader2 } from 'lucide-react';

// ── Page wrapper ─────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-slate-400 text-sm mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageContent({ children, className = '' }) {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
}

// ── Cards ────────────────────────────────────────────────────
export function Card({ children, className = '' }) {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, color = 'indigo', trend }) {
  const colors = {
    indigo: 'bg-indigo-500/10 text-indigo-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
    rose: 'bg-rose-500/10 text-rose-400',
    violet: 'bg-violet-500/10 text-violet-400',
    sky: 'bg-sky-500/10 text-sky-400',
  };
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value ?? '—'}</p>
          {trend && <p className="text-xs text-slate-500 mt-1">{trend}</p>}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color] || colors.indigo}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Table ────────────────────────────────────────────────────
export function Table({ columns, data, loading, emptyMessage = 'No data found' }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800">
            {columns.map((col) => (
              <th key={col.key} className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto" />
              </td>
            </tr>
          ) : data?.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-slate-500 text-sm">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data?.map((row, i) => (
              <tr key={row._id || i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                {columns.map((col) => (
                  <td key={col.key} className="py-3 px-4 text-slate-300">
                    {col.render ? col.render(row) : row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Buttons ──────────────────────────────────────────────────
export function Button({ children, onClick, variant = 'primary', size = 'md', disabled, className = '', type = 'button' }) {
  const variants = {
    primary:   'bg-indigo-600 hover:bg-indigo-500 text-white',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-white',
    danger:    'bg-rose-600 hover:bg-rose-500 text-white',
    ghost:     'bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700',
    success:   'bg-emerald-600 hover:bg-emerald-500 text-white',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm font-semibold',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

// ── Badge ────────────────────────────────────────────────────
export function Badge({ label, color = 'slate' }) {
  const colors = {
    slate:   'bg-slate-700 text-slate-300',
    green:   'bg-emerald-500/15 text-emerald-400',
    red:     'bg-rose-500/15 text-rose-400',
    yellow:  'bg-amber-500/15 text-amber-400',
    blue:    'bg-sky-500/15 text-sky-400',
    purple:  'bg-violet-500/15 text-violet-400',
    indigo:  'bg-indigo-500/15 text-indigo-400',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.slate}`}>
      {label}
    </span>
  );
}

// ── Input ────────────────────────────────────────────────────
export function Input({ label, error, className = '', ...props }) {
  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>}
      <input
        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
        {...props}
      />
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
    </div>
  );
}

// ── Select ───────────────────────────────────────────────────
export function Select({ label, options, error, className = '', ...props }) {
  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>}
      <select
        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${width} bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ── Status badge helpers ──────────────────────────────────────
export function studentStatusBadge(status) {
  const map = {
    Approved:    { label: 'Approved',   color: 'green' },
    UnderReview: { label: 'Under Review', color: 'yellow' },
    Rejected:    { label: 'Rejected',   color: 'red' },
    OnHold:      { label: 'On Hold',    color: 'blue' },
    Left:        { label: 'Left',       color: 'slate' },
    Alumni:      { label: 'Alumni',     color: 'purple' },
  };
  const b = map[status] || { label: status, color: 'slate' };
  return <Badge label={b.label} color={b.color} />;
}

export function feeStatusBadge(status) {
  const map = {
    Paid:          { color: 'green' },
    Pending:       { color: 'yellow' },
    Overdue:       { color: 'red' },
    PartiallyPaid: { color: 'blue' },
    Waived:        { color: 'purple' },
  };
  const b = map[status] || { color: 'slate' };
  return <Badge label={status} color={b.color} />;
}

export function leaveStatusBadge(status) {
  const map = { Approved: 'green', Pending: 'yellow', Rejected: 'red' };
  return <Badge label={status} color={map[status] || 'slate'} />;
}
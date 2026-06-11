export function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

const buttonStyles = {
  primary: 'border-transparent bg-brand-600 text-white shadow-sm hover:bg-brand-700 focus-visible:outline-brand-600',
  secondary: 'border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-brand-600',
  subtle: 'border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:outline-brand-600',
  danger: 'border-red-200 bg-white text-red-700 shadow-sm hover:bg-red-50 focus-visible:outline-red-600',
  success: 'border-transparent bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:outline-emerald-600',
};

const buttonSizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-4 py-2.5 text-base',
};

export function Button({ as: Component = 'button', variant = 'primary', size = 'md', className = '', children, ...props }) {
  return (
    <Component
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg border font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-60',
        buttonStyles[variant] ?? buttonStyles.primary,
        buttonSizes[size] ?? buttonSizes.md,
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function Card({ className = '', children, ...props }) {
  return (
    <div className={cx('rounded-2xl border border-slate-200 bg-white shadow-sm', className)} {...props}>
      {children}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        {eyebrow && <p className="text-sm font-semibold text-brand-700">{eyebrow}</p>}
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const alertStyles = {
  error: 'border-red-200 bg-red-50 text-red-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
};

export function Alert({ tone = 'info', children }) {
  return (
    <div className={cx('rounded-xl border px-4 py-3 text-sm', alertStyles[tone] ?? alertStyles.info)}>
      {children}
    </div>
  );
}

const badgeStyles = {
  gray: 'bg-slate-100 text-slate-700 ring-slate-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
};

export function Badge({ tone = 'gray', className = '', children }) {
  return (
    <span className={cx('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', badgeStyles[tone] ?? badgeStyles.gray, className)}>
      {children}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <Card className="p-8 text-center">
      {Icon && (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Icon size={24} />
        </div>
      )}
      <h2 className="font-semibold text-slate-950">{title}</h2>
      {description && <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

export function Tabs({ items, activeId, onChange }) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={cx(
            'rounded-lg px-3 py-1.5 text-sm font-semibold transition',
            activeId === item.id ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-950',
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <div>
      {label && <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>}
      {children}
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

const controlClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-500';

export function Input({ className = '', ...props }) {
  return <input className={cx(controlClass, className)} {...props} />;
}

export function Select({ className = '', children, ...props }) {
  return (
    <select className={cx(controlClass, className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className = '', ...props }) {
  return <textarea className={cx(controlClass, 'min-h-24', className)} {...props} />;
}

export function Progress({ value, className = '', barClassName = '' }) {
  return (
    <div className={cx('h-2 overflow-hidden rounded-full bg-slate-100', className)}>
      <div className={cx('h-full rounded-full bg-brand-600 transition-all', barClassName)} style={{ width: `${value}%` }} />
    </div>
  );
}

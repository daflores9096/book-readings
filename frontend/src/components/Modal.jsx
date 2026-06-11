export default function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700" aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

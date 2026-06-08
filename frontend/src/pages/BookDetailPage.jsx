import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { deleteMyBook, getMyBooks, updateMyBook } from '../api.js';
import { authorsLabel, coverSrc, progressPercent } from '../navigation.js';

const STATUS_LABELS = {
  want_to_read: 'Quiere leer',
  reading: 'Leyendo',
  read: 'Leídos',
};

export default function BookDetailPage() {
  const { userBookId } = useParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(0);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await getMyBooks();
      const found = (res.data ?? []).find((item) => String(item.id) === String(userBookId));
      if (!found) {
        setError('Libro no encontrado en tu biblioteca');
        setEntry(null);
        return;
      }
      setEntry(found);
      setCurrentPage(found.current_page || 0);
    } catch (err) {
      setError(err.message || 'No se pudo cargar el libro');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [userBookId]);

  async function saveUpdate(payload) {
    setSaving(true);
    setError('');
    try {
      const res = await updateMyBook(entry.id, payload);
      setEntry(res.data);
      setCurrentPage(res.data.current_page || 0);
    } catch (err) {
      setError(err.message || 'No se pudo actualizar');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!confirm('¿Quitar este libro de tu biblioteca?')) return;
    try {
      await deleteMyBook(entry.id);
      navigate('/library');
    } catch (err) {
      setError(err.message || 'No se pudo eliminar');
    }
  }

  if (loading) {
    return <p className="rounded-xl bg-white p-6 text-slate-500 shadow-sm">Cargando…</p>;
  }

  if (!entry) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <p className="text-red-600">{error || 'Libro no encontrado'}</p>
        <Link to="/library" className="mt-3 inline-block text-indigo-600">Volver a biblioteca</Link>
      </div>
    );
  }

  const cover = coverSrc(entry);
  const progress = progressPercent(entry);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link to="/library" className="text-sm text-white/75 hover:text-white">← Mi biblioteca</Link>
          <h1 className="mt-2 text-2xl font-bold text-white">{entry.title}</h1>
          <p className="text-sm text-white/75">{authorsLabel(entry.authors)}</p>
        </div>
        <button type="button" onClick={handleRemove} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
          <Trash2 size={16} />
          Quitar
        </button>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-5 rounded-xl bg-white p-5 shadow-sm lg:grid-cols-[180px_1fr]">
        <div className="mx-auto h-64 w-44 overflow-hidden rounded-lg bg-slate-100 lg:mx-0">
          {cover ? <img src={cover} alt={entry.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-slate-400">Sin portada</div>}
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="Estado" value={STATUS_LABELS[entry.status] || entry.status} />
            <Info label="ISBN" value={entry.isbn13 || entry.isbn10 || '—'} />
            <Info label="Páginas" value={entry.page_count || '—'} />
            <Info label="Inicio lectura" value={entry.started_at || '—'} />
            <Info label="Fin lectura" value={entry.finished_at || '—'} />
          </div>

          {entry.page_count ? (
            <div>
              <div className="mb-2 flex justify-between text-sm text-slate-600">
                <span>Progreso de lectura</span>
                <span>{progress}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-indigo-600" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-sm font-medium">Página actual</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="number"
                min="0"
                max={entry.page_count || undefined}
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={currentPage}
                onChange={(e) => setCurrentPage(Number(e.target.value))}
              />
              <button
                type="button"
                disabled={saving}
                onClick={() => saveUpdate({ current_page: currentPage })}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                Guardar avance
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Cambiar estante</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  disabled={saving || entry.status === value}
                  onClick={() => saveUpdate({ status: value, current_page: currentPage })}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${
                    entry.status === value ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="font-medium text-slate-800">{value}</div>
    </div>
  );
}

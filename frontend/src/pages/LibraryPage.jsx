import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { getMyBooks } from '../api.js';
import { SHELF_TABS, authorsLabel, coverSrc, progressPercent } from '../navigation.js';

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState('want_to_read');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(status) {
    setLoading(true);
    setError('');
    try {
      const res = await getMyBooks(status);
      setEntries(res.data ?? []);
    } catch (err) {
      setError(err.message || 'No se pudo cargar la biblioteca');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(activeTab);
  }, [activeTab]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Mi biblioteca</h1>
          <p className="text-sm text-white/75">Organiza tus libros como en GoodReads</p>
        </div>
        <Link to="/books/add" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
          + Agregar libro
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {SHELF_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              activeTab === tab.id ? 'bg-white text-[#0f3a68] shadow' : 'bg-white/15 text-white hover:bg-white/25'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <p className="rounded-xl bg-white p-6 text-slate-500 shadow-sm">Cargando…</p>
      ) : entries.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <BookOpen className="mx-auto mb-3 text-slate-400" size={36} />
          <p className="text-slate-600">No tienes libros en esta estantería.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {entries.map((entry) => {
            const cover = coverSrc(entry);
            const progress = progressPercent(entry);
            return (
              <Link
                key={entry.id}
                to={`/books/${entry.id}`}
                className="overflow-hidden rounded-xl bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex gap-4 p-4">
                  <div className="h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    {cover ? (
                      <img src={cover} alt={entry.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-400">Sin portada</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-semibold text-slate-800">{entry.title}</h2>
                    <p className="mt-1 text-sm text-slate-500">{authorsLabel(entry.authors)}</p>
                    {entry.page_count ? (
                      <div className="mt-3">
                        <div className="mb-1 flex justify-between text-xs text-slate-500">
                          <span>Progreso</span>
                          <span>{entry.current_page}/{entry.page_count}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-indigo-600" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-slate-400">Página {entry.current_page || 0}</p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

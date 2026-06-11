import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Flame, Trophy } from 'lucide-react';
import StarRating from '../components/StarRating.jsx';
import { getActiveChallenge, getMyBooks } from '../api.js';
import { SHELF_TABS, authorsLabel, coverSrc, progressPercent } from '../navigation.js';

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState('want_to_read');
  const [entries, setEntries] = useState([]);
  const [challenge, setChallenge] = useState(null);
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

  useEffect(() => {
    async function loadChallenge() {
      try {
        const res = await getActiveChallenge();
        setChallenge(res.data ?? null);
      } catch (err) {
        setChallenge(null);
        setError((current) => current || err.message || 'No se pudo cargar el desafío vigente');
      }
    }

    loadChallenge();
  }, []);

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

      <ChallengeBanner challenge={challenge} />

      <div className="flex flex-wrap gap-2">
        {SHELF_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              activeTab === tab.id
                ? 'bg-[#061f3f] text-white shadow ring-2 ring-white/40'
                : 'bg-[#0b2f5f] text-white hover:bg-[#123f79]'
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
                    {entry.status === 'read' && (
                      <div className="mt-3">
                        <StarRating value={entry.rating || 0} disabled size={16} />
                      </div>
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

function ChallengeBanner({ challenge }) {
  if (!challenge) {
    return (
    <div className="overflow-hidden rounded-2xl border border-white/20 bg-slate-950/70 p-3 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-orange-200">
              <Flame size={15} />
              Reto lector
            </div>
            <h2 className="mt-1 text-base font-bold">Crea un desafío y conquista tu próxima meta</h2>
            <p className="text-xs text-white/70">Define cuántos libros leerás este mes o año.</p>
          </div>
          <Link to="/challenges" className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-orange-900/30 hover:bg-orange-600">
            Crear desafío
          </Link>
        </div>
      </div>
    );
  }

  const completed = Number(challenge.completed_books) || 0;
  const target = Number(challenge.target_books) || 1;
  const percent = Number(challenge.progress_percent) || 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-orange-200 bg-gradient-to-br from-slate-950 via-[#26113f] to-[#7c1d1d] p-3 text-white shadow-2xl shadow-orange-950/30">
      <div className="pointer-events-none absolute -right-10 -top-14 h-32 w-32 rounded-full bg-orange-400/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 left-10 h-28 w-28 rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-orange-200">
              <Trophy size={15} />
              Desafío activo
            </div>
            <h2 className="mt-1 text-lg font-black">{challenge.name}</h2>
            <p className="text-xs text-white/70">{challenge.starts_at} al {challenge.ends_at}</p>
          </div>
          <Link to="/challenges" className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-white/20">
            Ver desafíos
          </Link>
        </div>

        <div className="mt-3">
          <div className="mb-1 flex flex-wrap items-end justify-between gap-2">
            <div>
              <span className="text-xl font-black text-orange-200">{completed}</span>
              <span className="text-xs text-white/60"> / {target} libros</span>
            </div>
            <div className="text-right">
              <div className="text-lg font-black">{percent}%</div>
              <div className="text-[10px] uppercase tracking-wide text-white/60">{challenge.is_completed ? 'Meta conquistada' : 'En marcha'}</div>
            </div>
          </div>
          <div className="h-3 overflow-hidden rounded-full border border-white/20 bg-black/30 p-0.5 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-400 via-rose-500 to-fuchsia-500 shadow-[0_0_18px_rgba(251,146,60,0.75)] transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-2 text-xs font-medium text-orange-100">
            {challenge.remaining_books === 0
              ? 'Lo lograste. Este desafío ya está completo.'
              : `Te faltan ${challenge.remaining_books} libro${challenge.remaining_books === 1 ? '' : 's'} para vencer este desafío.`}
          </p>
        </div>
      </div>
    </div>
  );
}

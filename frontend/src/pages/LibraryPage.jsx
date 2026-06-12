import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Flame, Trophy } from 'lucide-react';
import StarRating from '../components/StarRating.jsx';
import { getActiveChallenge, getMyBooks } from '../api.js';
import { SHELF_TABS, authorsLabel, coverSrc, progressPercent } from '../navigation.js';
import { Alert, Button, Card, EmptyState, PageHeader, Progress, Tabs } from '../components/ui.jsx';

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState('reading');
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
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Mi biblioteca"
        description="Organiza tus libros, registra tu progreso y mantén tus metas de lectura al día."
        actions={<Button as={Link} to="/books/add">+ Agregar libro</Button>}
      />

      <ChallengeBanner challenge={challenge} />

      <Tabs items={SHELF_TABS} activeId={activeTab} onChange={setActiveTab} />

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <Card className="p-6 text-sm text-slate-600">Cargando...</Card>
      ) : entries.length === 0 ? (
        <EmptyState icon={BookOpen} title="No tienes libros en esta estantería." description="Agrega un libro o cambia de estante para ver tus lecturas." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {entries.map((entry) => {
            const cover = coverSrc(entry);
            const progress = progressPercent(entry);
            return (
              <Link
                key={entry.id}
                to={`/books/${entry.id}`}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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
                        <Progress value={progress} />
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
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">
              <Flame size={15} />
              Reto lector
            </div>
            <h2 className="mt-1 text-base font-bold text-slate-950">Crea un desafío y conquista tu próxima meta</h2>
            <p className="text-xs text-slate-600">Define cuántos libros leerás este mes o año.</p>
          </div>
          <Button as={Link} to="/challenges" size="sm">
            Crear desafío
          </Button>
        </div>
      </Card>
    );
  }

  const completed = Number(challenge.completed_books) || 0;
  const target = Number(challenge.target_books) || 1;
  const percent = Number(challenge.progress_percent) || 0;

  return (
    <Card className="overflow-hidden p-4">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">
              <Trophy size={15} />
              Desafío activo
            </div>
            <h2 className="mt-1 text-lg font-bold text-slate-950">{challenge.name}</h2>
            <p className="text-xs text-slate-600">{challenge.starts_at} al {challenge.ends_at}</p>
          </div>
          <Button as={Link} to="/challenges" variant="secondary" size="sm">
            Ver desafíos
          </Button>
        </div>

        <div className="mt-3">
          <div className="mb-1 flex flex-wrap items-end justify-between gap-2">
            <div>
              <span className="text-xl font-bold text-slate-950">{completed}</span>
              <span className="text-xs text-slate-500"> / {target} libros</span>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-slate-950">{percent}%</div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500">{challenge.is_completed ? 'Meta conquistada' : 'En marcha'}</div>
            </div>
          </div>
          <Progress value={percent} className="h-3" barClassName="bg-orange-500" />
          <p className="mt-2 text-xs font-medium text-slate-600">
            {challenge.remaining_books === 0
              ? 'Lo lograste. Este desafío ya está completo.'
              : `Te faltan ${challenge.remaining_books} libro${challenge.remaining_books === 1 ? '' : 's'} para vencer este desafío.`}
          </p>
        </div>
      </div>
    </Card>
  );
}

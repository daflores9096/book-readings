import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookOpen, Trophy } from 'lucide-react';
import StarRating from '../components/StarRating.jsx';
import { getChallengeBooks } from '../api.js';
import { authorsLabel, coverSrc } from '../navigation.js';
import { Alert, Button, Card, EmptyState, PageHeader, Progress } from '../components/ui.jsx';

export default function ChallengeDetailPage() {
  const { challengeId } = useParams();
  const [challenge, setChallenge] = useState(null);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await getChallengeBooks(challengeId);
        setChallenge(res.data.challenge ?? null);
        setBooks(res.data.books ?? []);
      } catch (err) {
        setError(err.message || 'No se pudo cargar el desafío');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [challengeId]);

  if (loading) {
    return <Card className="p-6 text-sm text-slate-600">Cargando...</Card>;
  }

  if (!challenge) {
    return (
      <Card className="p-6">
        <Alert tone="error">{error || 'Desafío no encontrado'}</Alert>
        <Button as={Link} to="/challenges" variant="secondary" className="mt-4">
          Volver a desafíos
        </Button>
      </Card>
    );
  }

  const completed = Number(challenge.completed_books) || 0;
  const target = Number(challenge.target_books) || 1;
  const percent = Number(challenge.progress_percent) || 0;
  const isCompleted = Boolean(challenge.is_completed);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader
        eyebrow={<Link to="/challenges" className="hover:underline">Desafíos</Link>}
        title={challenge.name}
        description={`${challenge.starts_at} al ${challenge.ends_at}`}
      />

      {error && <Alert tone="error">{error}</Alert>}

      <Card className={`p-5 ${isCompleted ? 'border-emerald-200 bg-emerald-50/60' : ''}`}>
        <div className="flex items-start gap-3">
          <Trophy size={22} className={isCompleted ? 'text-emerald-600' : 'text-orange-500'} />
          <div className="flex-1">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-slate-600">Progreso del desafío</p>
                <p className="text-2xl font-bold text-slate-950">
                  {completed}
                  <span className="text-base font-medium text-slate-500"> / {target} libros</span>
                </p>
              </div>
              <p className={`text-lg font-bold ${isCompleted ? 'text-emerald-700' : 'text-orange-600'}`}>
                {percent}%
              </p>
            </div>
            <Progress
              value={percent}
              className="mt-3 h-3"
              barClassName={isCompleted ? 'bg-emerald-500' : 'bg-orange-500'}
            />
            <p className={`mt-2 text-sm font-medium ${isCompleted ? 'text-emerald-700' : 'text-slate-600'}`}>
              {isCompleted
                ? 'Desafío completado. Estos son los libros que leíste en este período.'
                : `Te faltan ${challenge.remaining_books} libro${challenge.remaining_books === 1 ? '' : 's'} para completar este desafío.`}
            </p>
          </div>
        </div>
      </Card>

      {books.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Todavía no hay libros leídos en este desafío."
          description="Cuando marques libros como leídos dentro del período del desafío, aparecerán aquí."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {books.map((book) => {
            const cover = coverSrc(book);
            return (
              <Link
                key={book.id}
                to={`/books/${book.id}`}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex gap-4 p-4">
                  <div className="h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    {cover ? (
                      <img src={cover} alt={book.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-400">Sin portada</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-slate-800">{book.title}</h2>
                    <p className="mt-1 text-sm text-slate-500">{authorsLabel(book.authors)}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      Leído el {book.finished_at || '—'}
                    </p>
                    {book.rating > 0 && (
                      <div className="mt-3">
                        <StarRating value={book.rating} disabled size={16} />
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

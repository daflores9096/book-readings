import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookMarked, BookOpen, Library, Ruler } from 'lucide-react';
import StarRating from '../components/StarRating.jsx';
import { addMyBook, getActivityFeed, getMyBooks } from '../api.js';
import {
  activityMessage,
  STATUS_BADGE,
  authorsLabel,
  coverSrc,
  displayName,
  formatActivityDate,
  progressPercent,
} from '../navigation.js';
import { useAuth } from '../auth.jsx';
import { Alert, Badge, Button, Card, EmptyState, PageHeader, Progress } from '../components/ui.jsx';

const FEED_PAGE_SIZE = 20;

function computeReadingStats(books) {
  const year = new Date().getFullYear();
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const readThisYear = books.filter((book) => {
    if (!book.finished_at) return false;
    return book.finished_at >= yearStart && book.finished_at <= yearEnd;
  });

  const withPages = readThisYear.filter((book) => Number(book.page_count) > 0);

  let longestThisYear = null;
  let shortestThisYear = null;

  for (const book of withPages) {
    const pages = Number(book.page_count);
    if (!longestThisYear || pages > Number(longestThisYear.page_count)) {
      longestThisYear = book;
    }
    if (!shortestThisYear || pages < Number(shortestThisYear.page_count)) {
      shortestThisYear = book;
    }
  }

  return {
    year,
    readThisYear: readThisYear.length,
    totalRead: books.length,
    longestThisYear,
    shortestThisYear,
  };
}

export default function HomePage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [readBooks, setReadBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [addingBookIds, setAddingBookIds] = useState({});
  const stats = useMemo(() => computeReadingStats(readBooks), [readBooks]);

  async function loadFeed() {
    setLoading(true);
    setError('');
    try {
      const res = await getActivityFeed({ limit: FEED_PAGE_SIZE, offset: 0 });
      const nextItems = res.data ?? [];
      setItems(nextItems);
      setHasMore(nextItems.length === FEED_PAGE_SIZE);
    } catch (err) {
      setError(err.message || 'No se pudo cargar la actividad');
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    setStatsLoading(true);
    try {
      const res = await getMyBooks('read');
      setReadBooks(res.data ?? []);
    } catch (err) {
      setError((current) => current || err.message || 'No se pudieron cargar tus estadísticas');
    } finally {
      setStatsLoading(false);
    }
  }

  async function loadMore() {
    if (loading || loadingMore || !hasMore) return;

    setLoadingMore(true);
    setError('');
    try {
      const res = await getActivityFeed({ limit: FEED_PAGE_SIZE, offset: items.length });
      const nextItems = res.data ?? [];
      setItems((current) => [...current, ...nextItems]);
      setHasMore(nextItems.length === FEED_PAGE_SIZE);
    } catch (err) {
      setError(err.message || 'No se pudo cargar más actividad');
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleAddWantToRead(item) {
    setError('');
    setMessage('');
    setAddingBookIds((current) => ({ ...current, [item.book_id]: true }));
    try {
      const res = await addMyBook({ book_id: item.book_id, status: 'want_to_read' });
      setItems((current) =>
        current.map((activity) =>
          Number(activity.book_id) === Number(item.book_id)
            ? { ...activity, viewer_user_book_id: res.data?.id ?? true, viewer_has_book: true }
            : activity,
        ),
      );
      setMessage(`"${item.title}" se agregó a tu biblioteca en Quiero leer.`);
    } catch (err) {
      setError(err.message || 'No se pudo agregar el libro a tu biblioteca');
    } finally {
      setAddingBookIds((current) => ({ ...current, [item.book_id]: false }));
    }
  }

  useEffect(() => {
    loadFeed();
    loadStats();
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Inicio" description="Actividad tuya y de tus amigos." />

      <ReadingStatsCards stats={stats} loading={statsLoading} />

      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}

      {loading ? (
        <Card className="p-6 text-sm text-slate-600">Cargando actividad...</Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Aún no hay actividad."
          description="Agrega libros a tu biblioteca o conecta con amigos para ver actualizaciones aquí."
          action={<Button as={Link} to="/friends" variant="secondary">Ir a Mis amigos</Button>}
        />
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <ActivityCard
              key={item.id}
              item={item}
              currentUserId={Number(user?.id)}
              isAdding={!!addingBookIds[item.book_id]}
              onAddWantToRead={() => handleAddWantToRead(item)}
            />
          ))}
          <div className="py-2 text-center">
            {hasMore ? (
              <Button type="button" variant="secondary" size="sm" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Cargando...' : 'Mostrar más'}
              </Button>
            ) : (
              <p className="text-sm text-slate-500">No hay más actividad</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ReadingStatsCards({ stats, loading }) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="p-4">
            <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <StatCard
        icon={BookMarked}
        label={`Leídos en ${stats.year}`}
        value={String(stats.readThisYear)}
        hint="Libros marcados como leídos este año"
      />
      <StatCard
        icon={Library}
        label="Total leídos"
        value={String(stats.totalRead)}
        hint="Todos los libros que has terminado"
      />
      <StatCard
        icon={Ruler}
        label="Más extenso este año"
        value={stats.longestThisYear ? `${stats.longestThisYear.page_count} págs.` : '—'}
        hint={stats.longestThisYear?.title ?? 'Sin libros con páginas registradas este año'}
        bookId={stats.longestThisYear?.id}
        book={stats.longestThisYear}
      />
      <StatCard
        icon={BookOpen}
        label="Más corto este año"
        value={stats.shortestThisYear ? `${stats.shortestThisYear.page_count} págs.` : '—'}
        hint={stats.shortestThisYear?.title ?? 'Sin libros con páginas registradas este año'}
        bookId={stats.shortestThisYear?.id}
        book={stats.shortestThisYear}
      />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint, bookId, book }) {
  const cover = book ? coverSrc(book) : null;

  const content = (
    <Card className="h-full p-4 transition hover:border-brand-200 hover:shadow-sm">
      <div className="flex items-stretch gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Icon size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
            <p className="mt-1 line-clamp-2 text-sm text-slate-600">{hint}</p>
          </div>
        </div>
        {cover ? (
          <div className="h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
            <img src={cover} alt={book.title} className="h-full w-full object-cover" />
          </div>
        ) : null}
      </div>
    </Card>
  );

  if (bookId) {
    return <Link to={`/books/${bookId}`} className="block">{content}</Link>;
  }

  return content;
}

function ActivityCard({ item, currentUserId, isAdding, onAddWantToRead }) {
  const cover = coverSrc(item);
  const meta = item.metadata || {};
  const currentPage = meta.current_page ?? item.current_page ?? 0;
  const pageCount = meta.page_count ?? item.page_count ?? 0;
  const progress = progressPercent({ current_page: currentPage, page_count: pageCount });
  const rating = meta.rating ?? item.rating ?? 0;
  const status = meta.status ?? item.status;
  const isOwn = Number(item.user_id) === currentUserId;
  const actorName = displayName({ username: item.username, full_name: item.full_name });
  const actionLabel = activityMessage(item.type, isOwn);
  const linkTarget = item.user_book_id ? `/books/${item.user_book_id}` : null;
  const isInViewerLibrary = Boolean(item.viewer_has_book) || Boolean(item.viewer_user_book_id);
  const canAddToLibrary = !isOwn && !isInViewerLibrary;

  const content = (
    <Card className="p-4">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
          {actorName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-700">
            {isOwn ? (
              <span className="font-semibold text-slate-900">Tú {actionLabel}</span>
            ) : (
              <>
                <span className="font-semibold text-slate-900">{actorName}</span>
                {' '}
                {actionLabel}
              </>
            )}
          </p>
          <p className="text-xs text-slate-400">{formatActivityDate(item.created_at)}</p>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
          {cover ? (
            <img src={cover} alt={item.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-400">Sin portada</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-slate-900">{item.title}</h2>
          <p className="text-sm text-teal-700">{authorsLabel(item.authors)}</p>

          {status && isOwn && (
            <Badge tone="brand" className="mt-2">
              {STATUS_BADGE[status] || status}
            </Badge>
          )}

          {(item.type === 'progress_updated' || item.type === 'status_reading' || item.type === 'book_added_reading') && pageCount > 0 && (
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>Progreso</span>
                <span>Página {currentPage} de {pageCount}</span>
              </div>
              <Progress value={progress} barClassName="bg-amber-600" />
            </div>
          )}

          {(item.type === 'rating_updated' || (item.type === 'status_read' && rating > 0)) && rating > 0 && (
            <div className="mt-3">
              <StarRating value={rating} disabled size={18} />
            </div>
          )}

          {canAddToLibrary && (
            <Button
              type="button"
              disabled={isAdding}
              onClick={onAddWantToRead}
              className="mt-4"
              size="sm"
            >
              {isAdding ? 'Agregando…' : 'Quiero leer'}
            </Button>
          )}

          {!isOwn && isInViewerLibrary && (
            <p className="mt-4 text-xs font-medium text-emerald-700">Ya está en tu biblioteca</p>
          )}
        </div>
      </div>
    </Card>
  );

  if (linkTarget && isOwn) {
    return <Link to={linkTarget} className="block transition hover:-translate-y-0.5">{content}</Link>;
  }

  return content;
}

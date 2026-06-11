import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import StarRating from '../components/StarRating.jsx';
import { addMyBook, getActivityFeed } from '../api.js';
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

export default function HomePage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [addingBookIds, setAddingBookIds] = useState({});

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await getActivityFeed({ limit: 10 });
      setItems(res.data ?? []);
    } catch (err) {
      setError(err.message || 'No se pudo cargar la actividad');
    } finally {
      setLoading(false);
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
    load();
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Inicio" description="Actividad tuya y de tus amigos." />

      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}

      {loading ? (
        <Card className="p-6 text-sm text-slate-600">Cargando...</Card>
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
        </div>
      )}
    </div>
  );
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

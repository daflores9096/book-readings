import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Ruler, Trophy } from 'lucide-react';
import StarRating from '../components/StarRating.jsx';
import { getFriendProfile } from '../api.js';
import { authorsLabel, coverSrc, displayName } from '../navigation.js';
import { useAuth } from '../auth.jsx';
import { Alert, Card, EmptyState, Progress } from '../components/ui.jsx';

export default function FriendProfilePage() {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await getFriendProfile(userId);
        if (!cancelled) {
          setProfile(res.data ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'No se pudo cargar el perfil');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return <Card className="mx-auto max-w-3xl p-6 text-sm text-slate-600">Cargando perfil...</Card>;
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <BackLink />
        <Alert tone="error">{error || 'Perfil no encontrado'}</Alert>
      </div>
    );
  }

  const name = displayName(profile.user);
  const isSelf = profile.is_self || Number(currentUser?.id) === Number(profile.user.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink />

      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xl font-semibold text-white">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-slate-950">{isSelf ? 'Tu perfil' : name}</h1>
            <p className="text-sm text-slate-500">@{profile.user.username}</p>
            {isSelf && (
              <p className="mt-1 text-xs text-slate-500">Así ven tu lectura tus amigos.</p>
            )}
          </div>
        </div>
      </Card>

      <section className="space-y-3">
        <SectionTitle>Desafío activo</SectionTitle>
        <ChallengeSection challenge={profile.active_challenge} isSelf={isSelf} />
      </section>

      <section className="space-y-3">
        <SectionTitle>Destacados {profile.year}</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <HighlightCard
            icon={Ruler}
            label="Más extenso este año"
            book={profile.longest_this_year}
          />
          <HighlightCard
            icon={BookOpen}
            label="Más corto este año"
            book={profile.shortest_this_year}
          />
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle>Últimos libros leídos</SectionTitle>
        {profile.recent_books.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Sin libros leídos aún"
            description={isSelf ? 'Cuando marques libros como leídos, aparecerán aquí.' : 'Este lector aún no ha registrado libros terminados.'}
          />
        ) : (
          <div className="space-y-3">
            {profile.recent_books.map((book, index) => (
              <BookRow key={`${book.title}-${book.finished_at}-${index}`} book={book} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/friends"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900"
    >
      <ArrowLeft size={16} />
      Volver a Mis amigos
    </Link>
  );
}

function SectionTitle({ children }) {
  return <h2 className="text-lg font-semibold tracking-tight text-slate-950">{children}</h2>;
}

function ChallengeSection({ challenge, isSelf }) {
  if (!challenge) {
    return (
      <Card className="p-4">
        <p className="text-sm text-slate-500">
          {isSelf ? 'No tienes un desafío activo en este momento.' : 'No tiene un desafío activo en este momento.'}
        </p>
      </Card>
    );
  }

  const completed = Number(challenge.completed_books) || 0;
  const target = Number(challenge.target_books) || 1;
  const percent = Number(challenge.progress_percent) || 0;

  return (
    <Card className="overflow-hidden p-4">
      <div className="flex items-start gap-2">
        <Trophy size={16} className="mt-0.5 shrink-0 text-orange-600" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">Desafío activo</p>
          <h3 className="mt-1 text-base font-bold text-slate-950">{challenge.name}</h3>
          <p className="text-xs text-slate-500">{challenge.starts_at} al {challenge.ends_at}</p>

          <div className="mt-3">
            <div className="mb-1 flex items-end justify-between gap-2">
              <div>
                <span className="text-xl font-bold text-slate-950">{completed}</span>
                <span className="text-xs text-slate-500"> / {target} libros</span>
              </div>
              <span className="text-sm font-semibold text-slate-700">{percent}%</span>
            </div>
            <Progress value={percent} className="h-2.5" barClassName="bg-orange-500" />
            <p className="mt-2 text-xs text-slate-600">
              {challenge.is_completed
                ? 'Meta completada.'
                : `Faltan ${challenge.remaining_books} libro${challenge.remaining_books === 1 ? '' : 's'} para completar el desafío.`}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function HighlightCard({ icon: Icon, label, book }) {
  const cover = book ? coverSrc(book) : null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-4 text-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.95)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_42%)]" />
      <div className="relative flex items-stretch gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-slate-400">
            <Icon size={15} strokeWidth={1.75} />
            <p className="text-[11px] font-medium uppercase tracking-[0.18em]">{label}</p>
          </div>
          <div className="mt-3 flex items-end gap-1.5">
            <p className="text-3xl font-semibold tracking-tight text-white">
              {book?.page_count ? book.page_count : '—'}
            </p>
            {book?.page_count ? <span className="pb-1 text-sm font-medium text-slate-400">págs.</span> : null}
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-400">
            {book?.title ?? 'Sin libros con páginas registradas este año'}
          </p>
        </div>
        {cover ? (
          <div className="h-24 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-inner">
            <img src={cover} alt={book.title} className="h-full w-full object-cover" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function BookRow({ book }) {
  const cover = coverSrc(book);

  return (
    <Card className="p-4">
      <div className="flex gap-4">
        <div className="h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
          {cover ? (
            <img src={cover} alt={book.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-400">Sin portada</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900">{book.title}</h3>
          <p className="text-sm text-teal-700">{authorsLabel(book.authors)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            {book.finished_at && (
              <span>Terminado {formatFinishedDate(book.finished_at)}</span>
            )}
            {book.page_count ? <span>{book.page_count} págs.</span> : null}
          </div>
          {book.rating > 0 && (
            <div className="mt-2">
              <StarRating value={book.rating} disabled size={16} />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function formatFinishedDate(value) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}

import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpDown, BookOpen, Flame, Search, Trophy, X } from 'lucide-react';
import StarRating from '../components/StarRating.jsx';
import { getActiveChallenge, getMyBooks } from '../api.js';
import {
  LIBRARY_TAB_IDS,
  SHELF_TABS,
  STATUS_BADGE,
  authorsLabel,
  coverSrc,
  progressPercent,
} from '../navigation.js';
import { Alert, Button, Card, EmptyState, Input, PageHeader, Progress, Tabs } from '../components/ui.jsx';

const SHELF_BADGE_TONE = {
  reading: 'brand',
  want_to_read: 'orange',
  read: 'green',
};

const PAGE_SIZE = 20;

const SORT_OPTIONS = {
  read: [
    { id: 'title', label: 'Título' },
    { id: 'author', label: 'Autor' },
    { id: 'created_at', label: 'Fecha añadido' },
    { id: 'finished_at', label: 'Fecha fin' },
  ],
  default: [
    { id: 'title', label: 'Título' },
    { id: 'author', label: 'Autor' },
    { id: 'created_at', label: 'Fecha añadido' },
  ],
};

function defaultSortForShelf(shelf) {
  return shelf === 'read' ? 'finished_at' : 'created_at';
}

function defaultDirectionForSort(sortBy) {
  return sortBy === 'title' || sortBy === 'author' ? 'asc' : 'desc';
}

function normalizeText(value) {
  return String(value ?? '').trim().toLocaleLowerCase('es');
}

function firstAuthor(entry) {
  return normalizeText(entry?.authors?.[0] ?? '');
}

function timeValue(value) {
  if (!value) return null;
  const time = new Date(String(value).replace(' ', 'T')).getTime();
  return Number.isNaN(time) ? null : time;
}

function compareDates(left, right, field, direction) {
  const leftTime = timeValue(left?.[field]);
  const rightTime = timeValue(right?.[field]);
  if (leftTime === rightTime) return 0;
  if (leftTime === null) return 1;
  if (rightTime === null) return -1;
  return direction === 'asc' ? leftTime - rightTime : rightTime - leftTime;
}

function sortEntries(entries, sortBy, direction) {
  return [...entries].sort((left, right) => {
    let result = 0;

    if (sortBy === 'title') {
      result = normalizeText(left.title).localeCompare(normalizeText(right.title), 'es');
    } else if (sortBy === 'author') {
      result = firstAuthor(left).localeCompare(firstAuthor(right), 'es');
    } else {
      result = compareDates(left, right, sortBy, direction);
    }

    if (result !== 0) {
      return direction === 'desc' && (sortBy === 'title' || sortBy === 'author') ? -result : result;
    }

    return normalizeText(left.title).localeCompare(normalizeText(right.title), 'es');
  });
}

function countByShelf(entries) {
  const counts = { reading: 0, want_to_read: 0, read: 0, all: entries.length };
  for (const entry of entries) {
    if (entry.status in counts) {
      counts[entry.status] += 1;
    }
  }
  return counts;
}

function entrySearchText(entry) {
  const parts = [
    entry.title,
    ...(entry.authors ?? []),
    entry.isbn,
    entry.publisher,
    entry.description,
  ];
  return normalizeText(parts.filter(Boolean).join(' '));
}

function matchesSearch(entry, query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return true;

  const haystack = entrySearchText(entry);
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  return tokens.every((token) => haystack.includes(token));
}

export default function LibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedShelf = searchParams.get('status');
  const initialTab = LIBRARY_TAB_IDS.includes(requestedShelf) ? requestedShelf : 'reading';
  const [activeTab, setActiveTab] = useState(initialTab);
  const initialSort = defaultSortForShelf(initialTab);
  const [sortBy, setSortBy] = useState(initialSort);
  const [sortDirection, setSortDirection] = useState(defaultDirectionForSort(initialSort));
  const [allEntries, setAllEntries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const shelfCounts = useMemo(() => countByShelf(allEntries), [allEntries]);
  const tabItems = useMemo(
    () => SHELF_TABS.map((tab) => ({
      ...tab,
      label: `${tab.label} (${shelfCounts[tab.id] ?? 0})`,
    })),
    [shelfCounts],
  );

  const entries = useMemo(() => {
    if (activeTab === 'all') return allEntries;
    return allEntries.filter((entry) => entry.status === activeTab);
  }, [allEntries, activeTab]);

  const filteredEntries = useMemo(
    () => entries.filter((entry) => matchesSearch(entry, searchQuery)),
    [entries, searchQuery],
  );

  const sortOptions = activeTab === 'read' ? SORT_OPTIONS.read : SORT_OPTIONS.default;
  const sortedEntries = useMemo(
    () => sortEntries(filteredEntries, sortBy, sortDirection),
    [filteredEntries, sortBy, sortDirection],
  );
  const visibleEntries = useMemo(() => sortedEntries.slice(0, visibleCount), [sortedEntries, visibleCount]);
  const hasMore = visibleCount < sortedEntries.length;

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await getMyBooks();
      setAllEntries(res.data ?? []);
    } catch (err) {
      setError(err.message || 'No se pudo cargar la biblioteca');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const nextSort = defaultSortForShelf(activeTab);
    setSortBy(nextSort);
    setSortDirection(defaultDirectionForSort(nextSort));
    setVisibleCount(PAGE_SIZE);
  }, [activeTab]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [sortBy, sortDirection]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery]);

  useEffect(() => {
    const shelf = searchParams.get('status');
    if (LIBRARY_TAB_IDS.includes(shelf) && shelf !== activeTab) {
      setActiveTab(shelf);
    }
  }, [searchParams, activeTab]);

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

  const emptyTitle = activeTab === 'all'
    ? 'No tienes libros en tu biblioteca.'
    : 'No tienes libros en esta estantería.';
  const isSearching = normalizeText(searchQuery).length > 0;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Mi biblioteca"
        description="Organiza tus libros, registra tu progreso y mantén tus metas de lectura al día."
        actions={<Button as={Link} to="/books/add">+ Agregar libro</Button>}
      />

      <ChallengeBanner challenge={challenge} />

      <Tabs
        items={tabItems}
        activeId={activeTab}
        onChange={(shelf) => {
          setActiveTab(shelf);
          setSearchParams({ status: shelf });
        }}
      />

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <Card className="p-6 text-sm text-slate-600">Cargando...</Card>
      ) : allEntries.length === 0 ? (
        <EmptyState icon={BookOpen} title={emptyTitle} description="Agrega un libro o cambia de estante para ver tus lecturas." />
      ) : entries.length === 0 ? (
        <EmptyState icon={BookOpen} title={emptyTitle} description="Agrega un libro o cambia de estante para ver tus lecturas." />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input
                className="pl-10 pr-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por título, autor, ISBN o editorial…"
                aria-label="Buscar libros"
              />
              {isSearching && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  onClick={() => setSearchQuery('')}
                  aria-label="Limpiar búsqueda"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm lg:w-auto">
              <span className="shrink-0 text-sm font-medium text-slate-600">Ordenar por</span>
              <select
                className="min-w-0 flex-1 appearance-none bg-transparent text-sm font-semibold text-brand-700 outline-none sm:w-40"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setSortDirection(defaultDirectionForSort(e.target.value));
                }}
                aria-label="Ordenar biblioteca por"
              >
                {sortOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="shrink-0 rounded-md p-1 text-brand-700 transition hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-200"
                onClick={() => setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))}
                aria-label={sortDirection === 'asc' ? 'Ordenar descendente' : 'Ordenar ascendente'}
                title={sortDirection === 'asc' ? 'Ascendente' : 'Descendente'}
              >
                <ArrowUpDown size={18} />
              </button>
            </div>
          </div>

          {isSearching && (
            <p className="text-sm text-slate-500">
              {filteredEntries.length === 0
                ? 'Ningún libro coincide con tu búsqueda.'
                : `${filteredEntries.length} libro${filteredEntries.length === 1 ? '' : 's'} encontrado${filteredEntries.length === 1 ? '' : 's'}.`}
            </p>
          )}

          {filteredEntries.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Sin resultados"
              description="Prueba con otro título, autor o ISBN, o limpia la búsqueda para ver todos los libros de esta estantería."
            />
          ) : (
            <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleEntries.map((entry) => {
              const cover = coverSrc(entry);
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
                      {entry.status && (
                        <ShelfStatusBadge status={entry.status} className="mt-2" />
                      )}
                      <BookReadingStatus entry={entry} />
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

          <div className="py-2 text-center">
            {hasMore ? (
              <Button type="button" variant="secondary" size="sm" onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}>
                Mostrar más
              </Button>
            ) : sortedEntries.length > PAGE_SIZE ? (
              <p className="text-sm text-slate-500">No hay más libros</p>
            ) : null}
          </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ShelfStatusBadge({ status, className = '' }) {
  const label = STATUS_BADGE[status];
  if (!label) {
    return null;
  }

  const tone = SHELF_BADGE_TONE[status] ?? 'gray';
  const toneClass = {
    brand: 'bg-brand-50 text-brand-700 ring-brand-200',
    orange: 'bg-orange-50 text-orange-700 ring-orange-200',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    gray: 'bg-slate-100 text-slate-700 ring-slate-200',
  }[tone];

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${toneClass} ${className}`}>
      {label}
    </span>
  );
}

function BookReadingStatus({ entry }) {
  if (entry.status === 'reading') {
    if (entry.page_count) {
      const progress = progressPercent(entry);
      return (
        <div className="mt-2">
          <div className="mb-1 flex justify-between text-xs text-slate-500">
            <span>Progreso</span>
            <span>{entry.current_page}/{entry.page_count}</span>
          </div>
          <Progress value={progress} />
        </div>
      );
    }

    return (
      <p className="mt-2 text-xs text-slate-400">
        Página {entry.current_page || 0}
      </p>
    );
  }

  if (entry.status === 'want_to_read') {
    return (
      <p className="mt-2 text-xs text-slate-500">
        {entry.page_count ? `${entry.page_count} páginas` : 'Páginas no registradas'}
      </p>
    );
  }

  return null;
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

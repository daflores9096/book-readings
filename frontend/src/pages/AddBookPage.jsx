import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addMyBook, createBook, searchBooks } from '../api.js';
import { authorsLabel, coverSrc } from '../navigation.js';

export default function AddBookPage() {
  const navigate = useNavigate();
  const [searchType, setSearchType] = useState('isbn');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState('want_to_read');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    setError('');
    setNotFound(false);
    setResults([]);
    setSelected(null);
    if (!query.trim()) {
      setError('Ingresa un texto de búsqueda');
      return;
    }
    setLoading(true);
    try {
      const res = await searchBooks(searchType, query.trim());
      const foundResults = res.data.results ?? [];
      setResults(foundResults);
      setSelected(foundResults[0] ?? null);
    } catch (err) {
      if (err.status === 404 && err.data?.data?.found === false) {
        setNotFound(true);
      } else {
        setError(err.message || 'No se pudo buscar el libro');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!selected) return;
    setLoading(true);
    setError('');
    try {
      let book = selected;
      if (!book.id) {
        const created = await createBook({
          ...selected,
          source: selected.source ?? 'google_books',
        });
        book = created.data;
      }
      const added = await addMyBook({ book_id: book.id, status });
      navigate(`/books/${added.data.id}`);
    } catch (err) {
      setError(err.message || 'No se pudo agregar el libro');
    } finally {
      setLoading(false);
    }
  }

  const selectedCover = selected ? coverSrc(selected) : null;
  const manualHref = searchType === 'isbn'
    ? `/books/add/manual?isbn=${encodeURIComponent(query.trim())}`
    : '/books/add/manual';
  const placeholders = {
    isbn: '9780143127741',
    title: 'Cien años de soledad',
    author: 'Gabriel García Márquez',
  };
  const labels = {
    isbn: 'ISBN',
    title: 'Título',
    author: 'Autor',
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Agregar libro</h1>
        <p className="text-sm text-white/75">Busca por ISBN, título o autor en Open Library y Google Books</p>
      </div>

      <form onSubmit={handleSearch} className="rounded-xl bg-white p-5 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-[180px_1fr_auto]">
          <div>
            <label className="mb-2 block text-sm font-medium">Buscar por</label>
            <select
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
              value={searchType}
              onChange={(e) => {
                setSearchType(e.target.value);
                setResults([]);
                setSelected(null);
                setNotFound(false);
                setError('');
              }}
            >
              <option value="isbn">ISBN</option>
              <option value="title">Título</option>
              <option value="author">Autor</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">{labels[searchType]}</label>
            <input
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholders[searchType]}
            />
          </div>
          <input
            type="submit"
            disabled={loading}
            className="self-end rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            value={loading ? 'Buscando…' : 'Buscar'}
          />
        </div>
      </form>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {notFound && (
        <div className="rounded-xl bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-medium">No encontramos libros para esa búsqueda.</p>
          <p className="mt-1">Puedes crear el libro manualmente y subir la portada desde tu cámara.</p>
          <Link to={manualHref} className="mt-3 inline-block rounded-lg bg-amber-700 px-3 py-1.5 text-white hover:bg-amber-800">
            Crear manualmente
          </Link>
        </div>
      )}

      {results.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-800">Resultados encontrados</h2>
              <span className="text-sm text-slate-500">{results.length} resultado{results.length === 1 ? '' : 's'}</span>
            </div>
            <div className="space-y-3">
              {results.map((book, index) => {
                const cover = coverSrc(book);
                const selectedKey = `${selected?.isbn13 ?? selected?.title}-${selected?.source}`;
                const bookKey = `${book.isbn13 ?? book.title}-${book.source}`;
                return (
                  <button
                    key={`${bookKey}-${index}`}
                    type="button"
                    onClick={() => setSelected(book)}
                    className={`flex w-full gap-3 rounded-xl border p-3 text-left hover:bg-slate-50 ${
                      selectedKey === bookKey ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="h-24 w-16 shrink-0 overflow-hidden rounded bg-slate-100">
                      {cover ? <img src={cover} alt={book.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[10px] text-slate-400">Sin portada</div>}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800">{book.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{authorsLabel(book.authors)}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {book.isbn13 ? `ISBN-13: ${book.isbn13}` : 'Sin ISBN'} · {book.source}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selected && (
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-semibold text-slate-800">Libro seleccionado</h2>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="mx-auto h-48 w-32 shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:mx-0">
                  {selectedCover ? <img src={selectedCover} alt={selected.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-slate-400">Sin portada</div>}
            </div>
            <div className="flex-1">
                  <h3 className="text-xl font-semibold text-slate-800">{selected.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{authorsLabel(selected.authors)}</p>
                  <p className="mt-2 text-sm text-slate-600">ISBN-13: {selected.isbn13 || '—'}</p>
                  <p className="text-sm text-slate-600">Páginas: {selected.page_count || '—'}</p>
                  <p className="text-sm text-slate-600">Fuente: {selected.source || 'local'}</p>
              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium">Agregar a</label>
                <select className="w-full rounded-lg border border-slate-300 px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="want_to_read">Quiero leer</option>
                  <option value="reading">Leyendo</option>
                  <option value="read">Leídos</option>
                </select>
              </div>
              <button type="button" onClick={handleAdd} disabled={loading} className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
                {loading ? 'Guardando…' : 'Agregar a mi biblioteca'}
              </button>
            </div>
          </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

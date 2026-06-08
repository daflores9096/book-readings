import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addMyBook, createBook, lookupBook } from '../api.js';
import { authorsLabel, coverSrc } from '../navigation.js';

export default function AddBookPage() {
  const navigate = useNavigate();
  const [isbn, setIsbn] = useState('');
  const [preview, setPreview] = useState(null);
  const [lookupSource, setLookupSource] = useState('');
  const [status, setStatus] = useState('want_to_read');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  async function handleLookup(e) {
    e.preventDefault();
    setError('');
    setNotFound(false);
    setPreview(null);
    if (!isbn.trim()) {
      setError('Ingresa un ISBN');
      return;
    }
    setLoading(true);
    try {
      const res = await lookupBook(isbn.trim());
      setPreview(res.data.book);
      setLookupSource(res.data.source ?? 'local');
    } catch (err) {
      if (err.status === 404 && err.data?.data?.found === false) {
        setNotFound(true);
      } else {
        setError(err.message || 'No se pudo buscar el ISBN');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!preview) return;
    setLoading(true);
    setError('');
    try {
      let book = preview;
      if (!book.id) {
        const created = await createBook({
          ...preview,
          source: preview.source ?? lookupSource,
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

  const cover = preview ? coverSrc(preview) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Agregar por ISBN</h1>
        <p className="text-sm text-white/75">Buscaremos metadata en Open Library y Google Books</p>
      </div>

      <form onSubmit={handleLookup} className="rounded-xl bg-white p-5 shadow-sm">
        <label className="mb-2 block text-sm font-medium">ISBN (10 o 13)</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            placeholder="9780143127741"
          />
          <button type="submit" disabled={loading} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
            {loading ? 'Buscando…' : 'Buscar'}
          </button>
        </div>
      </form>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {notFound && (
        <div className="rounded-xl bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-medium">No encontramos información para ese ISBN.</p>
          <p className="mt-1">Puedes crear el libro manualmente y subir la portada desde tu cámara.</p>
          <Link to={`/books/add/manual?isbn=${encodeURIComponent(isbn.trim())}`} className="mt-3 inline-block rounded-lg bg-amber-700 px-3 py-1.5 text-white hover:bg-amber-800">
            Crear manualmente
          </Link>
        </div>
      )}

      {preview && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="mx-auto h-48 w-32 shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:mx-0">
              {cover ? <img src={cover} alt={preview.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-slate-400">Sin portada</div>}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-slate-800">{preview.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{authorsLabel(preview.authors)}</p>
              <p className="mt-2 text-sm text-slate-600">ISBN-13: {preview.isbn13 || '—'}</p>
              <p className="text-sm text-slate-600">Páginas: {preview.page_count || '—'}</p>
              <p className="text-sm text-slate-600">Fuente: {lookupSource || preview.source || 'local'}</p>
              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium">Agregar a</label>
                <select className="w-full rounded-lg border border-slate-300 px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="want_to_read">Quiere leer</option>
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
  );
}

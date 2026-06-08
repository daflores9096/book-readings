import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CoverCapture from '../components/CoverCapture.jsx';
import { addMyBook, createBook, uploadBookCover } from '../api.js';

export default function ManualBookPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialIsbn = useMemo(() => params.get('isbn') ?? '', [params]);

  const [form, setForm] = useState({
    isbn: initialIsbn,
    title: '',
    authors: '',
    page_count: '',
    publisher: '',
    published_date: '',
    description: '',
    status: 'want_to_read',
  });
  const [coverFile, setCoverFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) {
      setError('El título es obligatorio');
      return;
    }
    setLoading(true);
    try {
      const authors = form.authors
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);

      const created = await createBook({
        isbn: form.isbn.trim() || undefined,
        title: form.title.trim(),
        authors,
        page_count: form.page_count ? Number(form.page_count) : null,
        publisher: form.publisher || null,
        published_date: form.published_date || null,
        description: form.description || null,
        source: 'manual',
      });

      const book = created.data;
      if (coverFile) {
        await uploadBookCover(book.id, coverFile);
      }

      const added = await addMyBook({ book_id: book.id, status: form.status });
      navigate(`/books/${added.data.id}`);
    } catch (err) {
      setError(err.message || 'No se pudo crear el libro');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Nuevo libro manual</h1>
        <p className="text-sm text-white/75">Completa los datos y sube una portada optimizada</p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-5 rounded-xl bg-white p-5 shadow-sm lg:grid-cols-2">
        <CoverCapture onChange={setCoverFile} />
        <div className="space-y-3">
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <Field label="ISBN" value={form.isbn} onChange={(v) => setForm((f) => ({ ...f, isbn: v }))} />
          <Field label="Título" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} required />
          <Field label="Autores (separados por coma)" value={form.authors} onChange={(v) => setForm((f) => ({ ...f, authors: v }))} />
          <Field label="Páginas" type="number" value={form.page_count} onChange={(v) => setForm((f) => ({ ...f, page_count: v }))} />
          <Field label="Editorial" value={form.publisher} onChange={(v) => setForm((f) => ({ ...f, publisher: v }))} />
          <Field label="Fecha publicación" value={form.published_date} onChange={(v) => setForm((f) => ({ ...f, published_date: v }))} />
          <div>
            <label className="mb-1 block text-sm font-medium">Descripción</label>
            <textarea className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Agregar a</label>
            <select className="w-full rounded-lg border border-slate-300 px-3 py-2" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="want_to_read">Quiere leer</option>
              <option value="reading">Leyendo</option>
              <option value="read">Leídos</option>
            </select>
          </div>
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
            {loading ? 'Guardando…' : 'Crear libro'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required = false }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input className="w-full rounded-lg border border-slate-300 px-3 py-2" type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} />
    </div>
  );
}

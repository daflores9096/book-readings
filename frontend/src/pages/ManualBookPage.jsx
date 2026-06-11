import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CoverCapture from '../components/CoverCapture.jsx';
import { addMyBook, createBook, uploadBookCover } from '../api.js';
import { Alert, Button, Card, Field as UiField, Input, PageHeader, Select, Textarea } from '../components/ui.jsx';

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
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Nuevo libro manual" description="Completa los datos y sube una portada optimizada." />

      <Card className="p-5">
      <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-2">
        <CoverCapture onChange={setCoverFile} />
        <div className="space-y-3">
          {error && <Alert tone="error">{error}</Alert>}
          <Field label="ISBN" value={form.isbn} onChange={(v) => setForm((f) => ({ ...f, isbn: v }))} />
          <Field label="Título" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} required />
          <Field label="Autores (separados por coma)" value={form.authors} onChange={(v) => setForm((f) => ({ ...f, authors: v }))} />
          <Field label="Páginas" type="number" value={form.page_count} onChange={(v) => setForm((f) => ({ ...f, page_count: v }))} />
          <Field label="Editorial" value={form.publisher} onChange={(v) => setForm((f) => ({ ...f, publisher: v }))} />
          <Field label="Fecha publicación" value={form.published_date} onChange={(v) => setForm((f) => ({ ...f, published_date: v }))} />
          <UiField label="Descripción">
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </UiField>
          <UiField label="Agregar a">
            <Select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="want_to_read">Quiero leer</option>
              <option value="reading">Leyendo</option>
              <option value="read">Leídos</option>
            </Select>
          </UiField>
          <Button type="submit" disabled={loading} variant="success" className="w-full">
            {loading ? 'Guardando…' : 'Crear libro'}
          </Button>
        </div>
      </form>
      </Card>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required = false }) {
  return (
    <UiField label={label}>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} />
    </UiField>
  );
}

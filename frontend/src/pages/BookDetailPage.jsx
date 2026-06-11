import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import Modal from '../components/Modal.jsx';
import CoverCapture from '../components/CoverCapture.jsx';
import StarRating from '../components/StarRating.jsx';
import { deleteMyBook, getMyBooks, updateBook, updateMyBook, uploadBookCover } from '../api.js';
import { authorsLabel, coverSrc, progressPercent } from '../navigation.js';
import { Alert, Button, Card, Field, Input, PageHeader, Progress, Select, Textarea } from '../components/ui.jsx';

const STATUS_LABELS = {
  want_to_read: 'Quiero leer',
  reading: 'Leyendo',
  read: 'Leídos',
};

export default function BookDetailPage() {
  const { userBookId } = useParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [quickStatus, setQuickStatus] = useState('want_to_read');
  const [quickCurrentPage, setQuickCurrentPage] = useState(0);
  const [quickRating, setQuickRating] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [coverFile, setCoverFile] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await getMyBooks();
      const found = (res.data ?? []).find((item) => String(item.id) === String(userBookId));
      if (!found) {
        setError('Libro no encontrado en tu biblioteca');
        setEntry(null);
        return;
      }
      setEntry(found);
      syncQuickForm(found);
    } catch (err) {
      setError(err.message || 'No se pudo cargar el libro');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [userBookId]);

  function openEditModal() {
    setError('');
    setCoverFile(null);
    setEditForm({
      title: entry.title ?? '',
      authors: (entry.authors ?? []).join(', '),
      isbn13: entry.isbn13 ?? '',
      page_count: entry.page_count ?? '',
      publisher: entry.publisher ?? '',
      published_date: entry.published_date ?? '',
      description: entry.description ?? '',
      cover_url: entry.cover_url ?? '',
      status: entry.status ?? 'want_to_read',
      current_page: entry.current_page ?? 0,
      rating: entry.rating ?? 0,
      started_at: entry.started_at ?? '',
      finished_at: entry.finished_at ?? '',
    });
    setEditOpen(true);
  }

  function syncQuickForm(data) {
    setQuickStatus(data.status ?? 'want_to_read');
    setQuickCurrentPage(data.current_page ?? 0);
    setQuickRating(data.rating ?? 0);
  }

  async function handleSaveQuickReading() {
    setSaving(true);
    setError('');
    try {
      const updated = await updateMyBook(entry.id, {
        status: quickStatus,
        current_page: Number(quickCurrentPage || 0),
        rating: quickStatus === 'read' ? Number(quickRating || 0) : 0,
      });
      setEntry(updated.data);
      syncQuickForm(updated.data);
    } catch (err) {
      setError(err.message || 'No se pudo actualizar la lectura');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit() {
    if (!editForm) return;
    setSaving(true);
    setError('');
    try {
      const bookPayload = {
        title: editForm.title.trim(),
        authors: editForm.authors
          .split(',')
          .map((author) => author.trim())
          .filter(Boolean),
        isbn13: editForm.isbn13.trim() || null,
        page_count: editForm.page_count === '' ? null : Number(editForm.page_count),
        publisher: editForm.publisher || null,
        published_date: editForm.published_date || null,
        description: editForm.description || null,
        cover_url: editForm.cover_url || null,
      };

      await updateBook(entry.book_id, bookPayload);
      if (coverFile) {
        await uploadBookCover(entry.book_id, coverFile);
      }

      await updateMyBook(entry.id, {
        status: editForm.status,
        current_page: Number(editForm.current_page || 0),
        rating: editForm.status === 'read' ? Number(editForm.rating || 0) : 0,
        page_count: editForm.page_count === '' ? null : Number(editForm.page_count),
        started_at: editForm.started_at || null,
        finished_at: editForm.finished_at || null,
      });

      setEditOpen(false);
      setCoverFile(null);
      await load();
    } catch (err) {
      setError(err.message || 'No se pudo guardar la edición');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!confirm('¿Quitar este libro de tu biblioteca?')) return;
    try {
      await deleteMyBook(entry.id);
      navigate('/library');
    } catch (err) {
      setError(err.message || 'No se pudo eliminar');
    }
  }

  if (loading) {
    return <Card className="p-6 text-sm text-slate-600">Cargando...</Card>;
  }

  if (!entry) {
    return (
      <Card className="p-6">
        <Alert tone="error">{error || 'Libro no encontrado'}</Alert>
        <Button as={Link} to="/library" variant="secondary" className="mt-4">Volver a biblioteca</Button>
      </Card>
    );
  }

  const cover = coverSrc(entry);
  const progress = progressPercent(entry);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader
        eyebrow={<Link to="/library" className="hover:underline">Mi biblioteca</Link>}
        title={entry.title}
        description={authorsLabel(entry.authors)}
        actions={(
          <>
            <Button type="button" onClick={openEditModal} variant="secondary" size="sm">
            <Pencil size={16} />
            Editar
            </Button>
            <Button type="button" onClick={handleRemove} variant="danger" size="sm">
            <Trash2 size={16} />
            Quitar
            </Button>
          </>
        )}
      />

      {error && <Alert tone="error">{error}</Alert>}

      <Card className="grid gap-5 p-5 lg:grid-cols-[180px_1fr]">
        <div className="mx-auto h-64 w-44 overflow-hidden rounded-lg bg-slate-100 lg:mx-0">
          {cover ? <img src={cover} alt={entry.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-slate-400">Sin portada</div>}
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="Estado" value={STATUS_LABELS[entry.status] || entry.status} />
            <Info label="ISBN" value={entry.isbn13 || entry.isbn10 || '—'} />
            <Info label="Páginas" value={entry.page_count || '—'} />
            <Info label="Página actual" value={entry.current_page || 0} />
            <Info label="Inicio lectura" value={entry.started_at || '—'} />
            <Info label="Fin lectura" value={entry.finished_at || '—'} />
            <Info label="Editorial" value={entry.publisher || '—'} />
            <Info label="Publicación" value={entry.published_date || '—'} />
          </div>

          {entry.status === 'read' && (
            <div className="rounded-xl bg-slate-50 p-4">
              <h2 className="mb-2 font-semibold text-slate-800">Puntuación</h2>
              <StarRating value={entry.rating || 0} disabled />
            </div>
          )}

          {entry.page_count ? (
            <div>
              <div className="mb-2 flex justify-between text-sm text-slate-600">
                <span>Progreso de lectura</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
          ) : null}

          <div className="rounded-xl border border-slate-100 p-4">
            <h2 className="mb-3 font-semibold text-slate-800">Actualizar lectura</h2>
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <Field label="Estante">
                <Select
                  value={quickStatus}
                  onChange={(e) => setQuickStatus(e.target.value)}
                >
                  <option value="want_to_read">Quiero leer</option>
                  <option value="reading">Leyendo</option>
                  <option value="read">Leídos</option>
                </Select>
              </Field>
              <Field label="Página actual">
                <Input
                  type="number"
                  min="0"
                  max={entry.page_count || undefined}
                  value={quickCurrentPage}
                  onChange={(e) => setQuickCurrentPage(e.target.value)}
                />
              </Field>
              {quickStatus === 'read' && (
                <div>
                  <label className="mb-1 block text-sm font-medium">Puntuación</label>
                  <StarRating value={quickRating} onChange={setQuickRating} />
                </div>
              )}
              <Button
                type="button"
                disabled={saving}
                className="self-end"
                onClick={handleSaveQuickReading}
              >
                {saving ? 'Guardando…' : 'Actualizar'}
              </Button>
            </div>
          </div>

          {entry.description && (
            <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <h2 className="mb-2 font-semibold text-slate-800">Descripción</h2>
              <p>{entry.description}</p>
            </div>
          )}
        </div>
      </Card>

      {editOpen && editForm && (
        <Modal title="Editar libro" onClose={() => setEditOpen(false)} wide>
          <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
            <CoverCapture onChange={setCoverFile} previewUrl={coverSrc({ ...entry, cover_path: entry.cover_path, cover_url: editForm.cover_url })} />
            <div className="space-y-3">
              <EditField label="Título" value={editForm.title} onChange={(value) => setEditForm((form) => ({ ...form, title: value }))} required />
              <EditField label="Autores (separados por coma)" value={editForm.authors} onChange={(value) => setEditForm((form) => ({ ...form, authors: value }))} />
              <div className="grid gap-3 sm:grid-cols-2">
                <EditField label="ISBN-13" value={editForm.isbn13} onChange={(value) => setEditForm((form) => ({ ...form, isbn13: value }))} />
                <EditField label="Número de páginas" type="number" value={editForm.page_count} onChange={(value) => setEditForm((form) => ({ ...form, page_count: value }))} />
                <EditField label="Editorial" value={editForm.publisher} onChange={(value) => setEditForm((form) => ({ ...form, publisher: value }))} />
                <EditField label="Fecha publicación" value={editForm.published_date} onChange={(value) => setEditForm((form) => ({ ...form, published_date: value }))} />
              </div>
              <EditField label="URL de portada externa" value={editForm.cover_url} onChange={(value) => setEditForm((form) => ({ ...form, cover_url: value }))} />
              <Field label="Descripción">
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((form) => ({ ...form, description: e.target.value }))}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Estante">
                  <Select
                    value={editForm.status}
                    onChange={(e) => setEditForm((form) => ({ ...form, status: e.target.value }))}
                  >
                    <option value="want_to_read">Quiero leer</option>
                    <option value="reading">Leyendo</option>
                    <option value="read">Leídos</option>
                  </Select>
                </Field>
                <EditField label="Página actual" type="number" value={editForm.current_page} onChange={(value) => setEditForm((form) => ({ ...form, current_page: value }))} />
                <EditField label="Fecha inicio de lectura" type="date" value={editForm.started_at} onChange={(value) => setEditForm((form) => ({ ...form, started_at: value }))} />
                <EditField label="Fecha fin de lectura" type="date" value={editForm.finished_at} onChange={(value) => setEditForm((form) => ({ ...form, finished_at: value }))} />
              </div>
              {editForm.status === 'read' && (
                <div>
                  <label className="mb-1 block text-sm font-medium">Puntuación</label>
                  <StarRating
                    value={editForm.rating}
                    onChange={(value) => setEditForm((form) => ({ ...form, rating: value }))}
                  />
                  <p className="mt-1 text-xs text-slate-500">Selecciona de 0 a 5 estrellas.</p>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>
                  Cancelar
                </Button>
                <Button type="button" disabled={saving} onClick={handleSaveEdit}>
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="font-medium text-slate-800">{value}</div>
    </div>
  );
}

function EditField({ label, value, onChange, type = 'text', required = false }) {
  return (
    <Field label={label}>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </Field>
  );
}

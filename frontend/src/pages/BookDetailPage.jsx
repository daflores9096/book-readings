import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import Modal from '../components/Modal.jsx';
import CoverCapture from '../components/CoverCapture.jsx';
import { deleteMyBook, getMyBooks, updateBook, updateMyBook, uploadBookCover } from '../api.js';
import { authorsLabel, coverSrc, progressPercent } from '../navigation.js';

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
      started_at: entry.started_at ?? '',
      finished_at: entry.finished_at ?? '',
    });
    setEditOpen(true);
  }

  function syncQuickForm(data) {
    setQuickStatus(data.status ?? 'want_to_read');
    setQuickCurrentPage(data.current_page ?? 0);
  }

  async function handleSaveQuickReading() {
    setSaving(true);
    setError('');
    try {
      await updateMyBook(entry.id, {
        status: quickStatus,
        current_page: Number(quickCurrentPage || 0),
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

      const updated = await updateMyBook(entry.id, {
        status: editForm.status,
        current_page: Number(editForm.current_page || 0),
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
    return <p className="rounded-xl bg-white p-6 text-slate-500 shadow-sm">Cargando…</p>;
  }

  if (!entry) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <p className="text-red-600">{error || 'Libro no encontrado'}</p>
        <Link to="/library" className="mt-3 inline-block text-indigo-600">Volver a biblioteca</Link>
      </div>
    );
  }

  const cover = coverSrc(entry);
  const progress = progressPercent(entry);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link to="/library" className="text-sm text-white/75 hover:text-white">← Mi biblioteca</Link>
          <h1 className="mt-2 text-2xl font-bold text-white">{entry.title}</h1>
          <p className="text-sm text-white/75">{authorsLabel(entry.authors)}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={openEditModal} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
            <Pencil size={16} />
            Editar
          </button>
          <button type="button" onClick={handleRemove} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
            <Trash2 size={16} />
            Quitar
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-5 rounded-xl bg-white p-5 shadow-sm lg:grid-cols-[180px_1fr]">
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

          {entry.page_count ? (
            <div>
              <div className="mb-2 flex justify-between text-sm text-slate-600">
                <span>Progreso de lectura</span>
                <span>{progress}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-indigo-600" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-slate-100 p-4">
            <h2 className="mb-3 font-semibold text-slate-800">Actualizar lectura</h2>
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <div>
                <label className="mb-1 block text-sm font-medium">Estante</label>
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={quickStatus}
                  onChange={(e) => setQuickStatus(e.target.value)}
                >
                  <option value="want_to_read">Quiero leer</option>
                  <option value="reading">Leyendo</option>
                  <option value="read">Leídos</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Página actual</label>
                <input
                  type="number"
                  min="0"
                  max={entry.page_count || undefined}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={quickCurrentPage}
                  onChange={(e) => setQuickCurrentPage(e.target.value)}
                />
              </div>
              <button
                type="button"
                disabled={saving}
                className="self-end rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                onClick={handleSaveQuickReading}
              >
                {saving ? 'Guardando…' : 'Actualizar'}
              </button>
            </div>
          </div>

          {entry.description && (
            <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <h2 className="mb-2 font-semibold text-slate-800">Descripción</h2>
              <p>{entry.description}</p>
            </div>
          )}
        </div>
      </div>

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
              <div>
                <label className="mb-1 block text-sm font-medium">Descripción</label>
                <textarea
                  className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={editForm.description}
                  onChange={(e) => setEditForm((form) => ({ ...form, description: e.target.value }))}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Estante</label>
                  <select
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    value={editForm.status}
                    onChange={(e) => setEditForm((form) => ({ ...form, status: e.target.value }))}
                  >
                    <option value="want_to_read">Quiero leer</option>
                    <option value="reading">Leyendo</option>
                    <option value="read">Leídos</option>
                  </select>
                </div>
                <EditField label="Página actual" type="number" value={editForm.current_page} onChange={(value) => setEditForm((form) => ({ ...form, current_page: value }))} />
                <EditField label="Fecha inicio de lectura" type="date" value={editForm.started_at} onChange={(value) => setEditForm((form) => ({ ...form, started_at: value }))} />
                <EditField label="Fecha fin de lectura" type="date" value={editForm.finished_at} onChange={(value) => setEditForm((form) => ({ ...form, finished_at: value }))} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={() => setEditOpen(false)}>
                  Cancelar
                </button>
                <button type="button" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60" onClick={handleSaveEdit}>
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
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
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input
        className="w-full rounded-lg border border-slate-300 px-3 py-2"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </div>
  );
}

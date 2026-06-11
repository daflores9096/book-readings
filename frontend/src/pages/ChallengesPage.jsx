import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Trophy } from 'lucide-react';
import Modal from '../components/Modal.jsx';
import { createChallenge, deleteChallenge, getChallenges } from '../api.js';
import { Alert, Button, Card, EmptyState, Field as UiField, Input, PageHeader, Progress, Select } from '../components/ui.jsx';

export default function ChallengesPage() {
  const now = new Date();
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    target_books: 12,
    period_type: 'year',
    period_year: now.getFullYear(),
    period_month: now.getMonth() + 1,
  });

  const years = useMemo(() => {
    const year = now.getFullYear();
    return [year - 1, year, year + 1, year + 2];
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await getChallenges();
      setChallenges(res.data ?? []);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los desafíos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createChallenge({
        name: form.name.trim() || null,
        target_books: Number(form.target_books),
        period_type: form.period_type,
        period_year: Number(form.period_year),
        period_month: form.period_type === 'month' ? Number(form.period_month) : null,
      });
      setForm((current) => ({ ...current, name: '' }));
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err.message || 'No se pudo crear el desafío');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(challenge) {
    if (!confirm(`¿Eliminar el desafío "${challenge.name}"?`)) return;
    setError('');
    try {
      await deleteChallenge(challenge.id);
      await load();
    } catch (err) {
      setError(err.message || 'No se pudo eliminar el desafío');
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader
        title="Desafíos"
        description="Revisa tus retos y crea nuevas metas de lectura."
        actions={(
          <Button
          type="button"
          onClick={() => {
            setError('');
            setModalOpen(true);
          }}
        >
          <Plus size={16} />
          Nuevo desafío
          </Button>
        )}
      />

      {error && <Alert tone="error">{error}</Alert>}

      <Card className="p-5">
        <h2 className="mb-4 font-semibold text-slate-900">Mis desafíos</h2>
        {loading ? (
          <p className="text-sm text-slate-500">Cargando…</p>
        ) : challenges.length === 0 ? (
          <EmptyState icon={Trophy} title="Todavía no tienes desafíos." description="Crea uno para verlo como barra de progreso en Mi Biblioteca." />
        ) : (
          <div className="space-y-3">
            {challenges.map((challenge) => (
              <ChallengeRow key={challenge.id} challenge={challenge} onDelete={() => handleDelete(challenge)} />
            ))}
          </div>
        )}
      </Card>

      {modalOpen && (
        <Modal title="Nuevo desafío" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleCreate}>
            <p className="mb-4 text-sm text-slate-500">Convierte tu objetivo en una carrera mensual o anual.</p>
            <ChallengeFormFields form={form} setForm={setForm} years={years} />
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Creando…' : 'Crear desafío'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function ChallengeFormFields({ form, setForm, years }) {
  return (
    <div className="space-y-3">
      <Field label="Nombre" value={form.name} onChange={(value) => setForm((f) => ({ ...f, name: value }))} placeholder="Ej. Reto lector 2026" />
      <Field label="Libros objetivo" type="number" min="1" value={form.target_books} onChange={(value) => setForm((f) => ({ ...f, target_books: value }))} />

        <UiField label="Período">
        <Select value={form.period_type} onChange={(e) => setForm((f) => ({ ...f, period_type: e.target.value }))}>
          <option value="year">Año</option>
          <option value="month">Mes</option>
        </Select>
      </UiField>

      <div className="grid grid-cols-2 gap-3">
        <UiField label="Año">
          <Select value={form.period_year} onChange={(e) => setForm((f) => ({ ...f, period_year: Number(e.target.value) }))}>
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </Select>
        </UiField>
        {form.period_type === 'month' && (
          <UiField label="Mes">
            <Select value={form.period_month} onChange={(e) => setForm((f) => ({ ...f, period_month: Number(e.target.value) }))}>
              {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => <option key={month} value={month}>{month}</option>)}
            </Select>
          </UiField>
        )}
      </div>
    </div>
  );
}

function ChallengeRow({ challenge, onDelete }) {
  const completed = Number(challenge.completed_books) || 0;
  const target = Number(challenge.target_books) || 1;
  const percent = Number(challenge.progress_percent) || 0;

  return (
    <div className="rounded-xl border border-slate-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <Trophy size={18} className="text-orange-500" />
            {challenge.name}
          </div>
          <p className="mt-1 text-sm text-slate-500">{challenge.starts_at} al {challenge.ends_at}</p>
        </div>
        <button type="button" className="rounded-lg p-2 text-red-600 hover:bg-red-50" onClick={onDelete} aria-label="Eliminar desafío">
          <Trash2 size={16} />
        </button>
      </div>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-sm">
          <span className="font-medium text-slate-700">{completed}/{target} libros</span>
          <span className="font-semibold text-orange-600">{percent}%</span>
        </div>
        <Progress value={percent} className="h-3" barClassName="bg-orange-500" />
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', min, placeholder }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <Input
        type={type}
        min={min}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

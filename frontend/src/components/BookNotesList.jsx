import { Trash2 } from 'lucide-react';
import { formatNoteDate } from '../navigation.js';
import { Button, Card } from './ui.jsx';

export default function BookNotesList({ notes, loading, onDelete, deletingNoteId }) {
  if (loading) {
    return <Card className="p-5 text-sm text-slate-600">Cargando notas…</Card>;
  }

  if (!notes.length) {
    return (
      <Card className="p-5">
        <h2 className="font-semibold text-slate-800">Notas de lectura</h2>
        <p className="mt-2 text-sm text-slate-500">Aún no has guardado frases de este libro.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-800">Notas de lectura</h2>
      {notes.map((note) => (
        <Card key={note.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">{note.content}</p>
            <Button
              type="button"
              variant="danger"
              size="sm"
              className="shrink-0"
              disabled={deletingNoteId === note.id}
              onClick={() => onDelete?.(note)}
              aria-label="Eliminar nota"
            >
              <Trash2 size={14} />
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>{formatNoteDate(note.created_at)}</span>
            {note.page_number ? <span>Pág. {note.page_number}</span> : null}
          </div>
        </Card>
      ))}
    </div>
  );
}

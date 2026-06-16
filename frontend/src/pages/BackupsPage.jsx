import { useRef, useState } from 'react';
import { DatabaseBackup, Download, Upload } from 'lucide-react';
import { downloadBackup, restoreBackup } from '../api.js';
import { Alert, Button, Card, PageHeader } from '../components/ui.jsx';

export default function BackupsPage() {
  const fileInputRef = useRef(null);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function handleCreateBackup() {
    setCreating(true);
    setError('');
    setMessage('');
    try {
      await downloadBackup();
      setMessage('Respaldo descargado correctamente.');
    } catch (err) {
      setError(err.message || 'No se pudo crear el respaldo');
    } finally {
      setCreating(false);
    }
  }

  async function handleRestoreSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const confirmed = window.confirm(
      'Esta acción eliminará por completo todos los datos actuales de la base de datos y los reemplazará con el contenido del respaldo. ¿Deseas continuar?',
    );
    if (!confirmed) return;

    setRestoring(true);
    setError('');
    setMessage('');
    try {
      const res = await restoreBackup(file);
      setMessage(res.message || 'Respaldo restaurado correctamente.');
    } catch (err) {
      setError(err.message || 'No se pudo restaurar el respaldo');
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Respaldos"
        description="Crea y restaura copias completas de la base de datos."
      />

      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}

      <Card className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Download size={22} />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-slate-900">Crear respaldo</h2>
            <p className="mt-1 text-sm text-slate-600">
              Genera un archivo `.sql` con todas las tablas y todos los registros actuales de la base de datos.
            </p>
            <Button type="button" className="mt-4" onClick={handleCreateBackup} disabled={creating || restoring}>
              <Download size={16} />
              {creating ? 'Generando respaldo…' : 'Descargar respaldo'}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="border-amber-200 bg-amber-50/40 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Upload size={22} />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-slate-900">Restaurar respaldo</h2>
            <p className="mt-1 text-sm text-slate-600">
              Sube un archivo `.sql` generado por esta aplicación. La restauración borra completamente el contenido actual de la base de datos antes de importar el respaldo.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".sql,application/sql,text/sql"
              className="hidden"
              onChange={handleRestoreSelected}
            />
            <Button
              type="button"
              variant="secondary"
              className="mt-4"
              onClick={() => fileInputRef.current?.click()}
              disabled={creating || restoring}
            >
              <DatabaseBackup size={16} />
              {restoring ? 'Restaurando…' : 'Seleccionar respaldo'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

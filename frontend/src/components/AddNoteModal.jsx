import { useEffect, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import Modal from './Modal.jsx';
import { Alert, Button, Field, Input, Textarea } from './ui.jsx';
import { useSpeechDictation } from '../utils/useSpeechDictation.js';

export default function AddNoteModal({ open, onClose, onSave, saving, defaultPage = '' }) {
  const [content, setContent] = useState('');
  const [pageNumber, setPageNumber] = useState(defaultPage);
  const [submitError, setSubmitError] = useState('');

  const {
    listening,
    requestingMic,
    speechError,
    canDictate,
    needsHttps,
    toggleListening,
    stopListening,
    handleManualTextChange,
  } = useSpeechDictation({
    text: content,
    onTextChange: setContent,
    active: open,
  });

  useEffect(() => {
    if (!open) {
      setContent('');
      setPageNumber(defaultPage);
      setSubmitError('');
    }
  }, [open, defaultPage]);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) {
      setSubmitError('Escribe o dicta algo antes de guardar.');
      return;
    }

    setSubmitError('');
    stopListening();
    await onSave({
      content: trimmed,
      page_number: pageNumber === '' ? null : Number(pageNumber),
    });
  }

  if (!open) {
    return null;
  }

  return (
    <Modal title="Agregar nota" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {needsHttps && (
          <Alert tone="warning">
            Estás en HTTP. Chrome Android no permite el micrófono sin HTTPS. Usa un enlace https:// o escribe la nota a mano.
          </Alert>
        )}

        <Field label="Frase o párrafo">
          <Textarea
            rows={6}
            value={content}
            placeholder={listening ? 'Escuchando… habla cerca del micrófono' : 'Dicta o escribe la cita que quieres guardar'}
            onChange={(e) => handleManualTextChange(e.target.value)}
          />
        </Field>

        <Field label="Página (opcional)">
          <Input
            type="number"
            min="0"
            value={pageNumber}
            onChange={(e) => setPageNumber(e.target.value)}
            placeholder="Ej. 42"
          />
        </Field>

        {canDictate ? (
          <Button
            type="button"
            variant={listening ? 'danger' : 'secondary'}
            className="w-full"
            disabled={requestingMic}
            onClick={toggleListening}
          >
            {listening ? <MicOff size={16} /> : <Mic size={16} />}
            {requestingMic ? 'Solicitando micrófono…' : listening ? 'Detener dictado' : 'Dictar con micrófono'}
          </Button>
        ) : (
          <p className="text-xs text-slate-500">
            {needsHttps
              ? 'El dictado requiere HTTPS. También puedes escribir la nota a mano.'
              : 'El dictado por voz funciona en Chrome para Android. También puedes escribir la nota a mano.'}
          </p>
        )}

        {speechError && <Alert tone="error">{speechError}</Alert>}
        {submitError && <Alert tone="error">{submitError}</Alert>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar nota'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

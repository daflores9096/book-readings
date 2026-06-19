import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import Modal from './Modal.jsx';
import { Alert, Button, Field, Input, Textarea } from './ui.jsx';

function getSpeechRecognition() {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export default function AddNoteModal({ open, onClose, onSave, saving, defaultPage = '' }) {
  const [content, setContent] = useState('');
  const [pageNumber, setPageNumber] = useState(defaultPage);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    setSpeechSupported(Boolean(getSpeechRecognition()));
  }, []);

  useEffect(() => {
    if (!open) {
      stopListening();
      setContent('');
      setPageNumber(defaultPage);
      setSpeechError('');
      setInterimText('');
    }
  }, [open, defaultPage]);

  useEffect(() => () => stopListening(), []);

  function stopListening() {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
    setInterimText('');
  }

  function startListening() {
    const SpeechRecognitionCtor = getSpeechRecognition();
    if (!SpeechRecognitionCtor) {
      setSpeechError('Dictado no disponible en este navegador. Usa Chrome en Android o escribe la nota.');
      return;
    }

    setSpeechError('');
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'es-ES';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalChunk = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript.trim();
        if (!transcript) continue;
        if (event.results[i].isFinal) {
          finalChunk += (finalChunk ? ' ' : '') + transcript;
        } else {
          interim += (interim ? ' ' : '') + transcript;
        }
      }

      if (finalChunk) {
        setContent((prev) => (prev ? `${prev} ${finalChunk}` : finalChunk));
      }
      setInterimText(interim);
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        setSpeechError('Permiso de micrófono denegado. Actívalo en la configuración del navegador.');
      } else if (event.error !== 'aborted') {
        setSpeechError('No se pudo capturar el audio. Intenta de nuevo o escribe la nota.');
      }
      stopListening();
    };

    recognition.onend = () => {
      setListening(false);
      setInterimText('');
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  function toggleListening() {
    if (listening) {
      stopListening();
      return;
    }
    startListening();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) {
      setSpeechError('Escribe o dicta algo antes de guardar.');
      return;
    }

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
        <Field label="Frase o párrafo">
          <Textarea
            rows={6}
            value={content}
            placeholder={listening ? 'Escuchando… habla cerca del micrófono' : 'Dicta o escribe la cita que quieres guardar'}
            onChange={(e) => setContent(e.target.value)}
          />
          {interimText && (
            <p className="mt-2 text-sm italic text-slate-500">{interimText}</p>
          )}
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

        {speechSupported ? (
          <Button
            type="button"
            variant={listening ? 'danger' : 'secondary'}
            className="w-full"
            onClick={toggleListening}
          >
            {listening ? <MicOff size={16} /> : <Mic size={16} />}
            {listening ? 'Detener dictado' : 'Dictar con micrófono'}
          </Button>
        ) : (
          <p className="text-xs text-slate-500">
            El dictado por voz funciona en Chrome para Android. También puedes escribir la nota a mano.
          </p>
        )}

        {speechError && <Alert tone="error">{speechError}</Alert>}

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

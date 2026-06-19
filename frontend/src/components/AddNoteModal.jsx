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

function getMicBlockMessage(reason) {
  switch (reason) {
    case 'insecure':
      return 'El micrófono requiere HTTPS. Si entras por http:// (NAS o IP local), Chrome Android lo bloqueará. Configura HTTPS en Synology (Proxy inverso + certificado) o accede con https://.';
    case 'denied':
      return 'Permiso de micrófono denegado. En Chrome: toca el candado (o ⋮) → Configuración del sitio → Micrófono → Permitir. Luego recarga la página e intenta de nuevo.';
    case 'unsupported':
      return 'Este navegador no expone el micrófono. Usa Chrome en Android o escribe la nota a mano.';
    default:
      return 'No se pudo acceder al micrófono. Intenta de nuevo o escribe la nota.';
  }
}

function buildDictatedText(results) {
  const finals = [];
  let interim = '';

  for (let i = 0; i < results.length; i += 1) {
    const text = results[i][0]?.transcript?.trim() ?? '';
    if (!text) continue;

    if (results[i].isFinal) {
      finals.push(text);
    } else {
      interim = text;
    }
  }

  if (finals.length === 0) {
    return { dictated: '', interim };
  }

  if (finals.length === 1) {
    return { dictated: finals[0], interim };
  }

  const areCumulative = finals.every((part, index) => {
    if (index === 0) return true;
    const previous = finals[index - 1].toLowerCase();
    const current = part.toLowerCase();
    return current.startsWith(previous) || current.includes(previous);
  });

  return {
    dictated: areCumulative ? finals[finals.length - 1] : finals.join(' '),
    interim,
  };
}

function joinTextParts(...parts) {
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

async function requestMicrophoneAccess() {
  if (typeof window === 'undefined') {
    return { ok: false, reason: 'unsupported' };
  }

  if (!window.isSecureContext) {
    return { ok: false, reason: 'insecure' };
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return { ok: false, reason: 'unsupported' };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return { ok: true };
  } catch (err) {
    if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
      return { ok: false, reason: 'denied' };
    }
    return { ok: false, reason: 'error', message: err?.message };
  }
}

export default function AddNoteModal({ open, onClose, onSave, saving, defaultPage = '' }) {
  const [content, setContent] = useState('');
  const [pageNumber, setPageNumber] = useState(defaultPage);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [needsHttps, setNeedsHttps] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const [requestingMic, setRequestingMic] = useState(false);
  const recognitionRef = useRef(null);
  const dictationBaseRef = useRef('');
  const contentRef = useRef('');

  useEffect(() => {
    setSpeechSupported(Boolean(getSpeechRecognition()));
  }, []);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    if (!open) {
      stopListening();
      setContent('');
      setPageNumber(defaultPage);
      setSpeechError('');
      setRequestingMic(false);
      return;
    }

    setNeedsHttps(typeof window !== 'undefined' && !window.isSecureContext);
  }, [open, defaultPage]);

  useEffect(() => () => stopListening(), []);

  function stopListening() {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
  }

  function beginRecognition() {
    const SpeechRecognitionCtor = getSpeechRecognition();
    if (!SpeechRecognitionCtor) {
      setSpeechError(getMicBlockMessage('unsupported'));
      return;
    }

    dictationBaseRef.current = contentRef.current.trim();

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'es-ES';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      const { dictated, interim } = buildDictatedText(event.results);
      setContent(joinTextParts(dictationBaseRef.current, dictated, interim));
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        setSpeechError(getMicBlockMessage('denied'));
      } else if (event.error !== 'aborted') {
        setSpeechError('No se pudo capturar el audio. Intenta de nuevo o escribe la nota.');
      }
      stopListening();
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  async function startListening() {
    const SpeechRecognitionCtor = getSpeechRecognition();
    if (!SpeechRecognitionCtor) {
      setSpeechError(getMicBlockMessage('unsupported'));
      return;
    }

    setSpeechError('');
    setRequestingMic(true);

    const access = await requestMicrophoneAccess();
    setRequestingMic(false);

    if (!access.ok) {
      setSpeechError(getMicBlockMessage(access.reason));
      return;
    }

    beginRecognition();
  }

  async function toggleListening() {
    if (listening) {
      stopListening();
      return;
    }
    await startListening();
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

  const canDictate = speechSupported && !needsHttps;

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
            onChange={(e) => {
              setContent(e.target.value);
              if (listening) {
                dictationBaseRef.current = e.target.value.trim();
              }
            }}
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

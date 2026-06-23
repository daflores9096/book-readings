import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Alert, Button, Textarea } from './ui.jsx';
import {
  buildDictatedText,
  getMicBlockMessage,
  getSpeechRecognition,
  joinTextParts,
  requestMicrophoneAccess,
} from '../utils/speechDictation.js';

export default function DescriptionDictationField({ value, onChange, rows = 5 }) {
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [needsHttps, setNeedsHttps] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const [requestingMic, setRequestingMic] = useState(false);
  const recognitionRef = useRef(null);
  const dictationBaseRef = useRef('');
  const valueRef = useRef(value);

  useEffect(() => {
    setSpeechSupported(Boolean(getSpeechRecognition()));
    setNeedsHttps(typeof window !== 'undefined' && !window.isSecureContext);
  }, []);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

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

    dictationBaseRef.current = valueRef.current.trim();

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'es-ES';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      const { dictated, interim } = buildDictatedText(event.results);
      onChange(joinTextParts(dictationBaseRef.current, dictated, interim));
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        setSpeechError(getMicBlockMessage('denied'));
      } else if (event.error !== 'aborted') {
        setSpeechError('No se pudo capturar el audio. Intenta de nuevo o escribe la descripción.');
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

  const canDictate = speechSupported && !needsHttps;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <label className="block text-sm font-medium text-slate-800">Descripción</label>
        {canDictate && (
          <Button
            type="button"
            variant={listening ? 'danger' : 'secondary'}
            size="sm"
            disabled={requestingMic}
            onClick={toggleListening}
          >
            {listening ? <MicOff size={16} /> : <Mic size={16} />}
            {requestingMic ? 'Micrófono…' : listening ? 'Detener' : 'Dictar'}
          </Button>
        )}
      </div>

      {needsHttps && (
        <div className="mb-2">
          <Alert tone="warning">
            El dictado requiere HTTPS. También puedes escribir la descripción a mano.
          </Alert>
        </div>
      )}

      <Textarea
        rows={rows}
        value={value}
        placeholder={
          listening
            ? 'Escuchando… habla cerca del micrófono'
            : 'Sinopsis, contraportada o notas sobre el libro'
        }
        onChange={(e) => {
          onChange(e.target.value);
          if (listening) {
            dictationBaseRef.current = e.target.value.trim();
          }
        }}
      />

      <p className="mt-1 text-xs text-slate-500">
        {canDictate
          ? 'Usa Dictar para transcribir la sinopsis o contraportada. Puedes editar el texto mientras hablas.'
          : 'El dictado por voz funciona en Chrome para Android con HTTPS. También puedes escribir a mano.'}
      </p>

      {speechError && (
        <div className="mt-2">
          <Alert tone="error">{speechError}</Alert>
        </div>
      )}
    </div>
  );
}

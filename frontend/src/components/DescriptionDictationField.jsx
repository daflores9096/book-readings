import { Mic, MicOff } from 'lucide-react';
import { Alert, Button, Textarea } from './ui.jsx';
import { useSpeechDictation } from '../utils/useSpeechDictation.js';

export default function DescriptionDictationField({ value, onChange, rows = 5 }) {
  const {
    listening,
    requestingMic,
    speechError,
    canDictate,
    needsHttps,
    toggleListening,
    handleManualTextChange,
  } = useSpeechDictation({
    text: value,
    onTextChange: onChange,
  });

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
        onChange={(e) => handleManualTextChange(e.target.value)}
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

import { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, ScanText } from 'lucide-react';
import Modal from './Modal.jsx';
import { Alert, Button, Field, Textarea } from './ui.jsx';

const OCR_MAX_WIDTH = 2000;
const OCR_TIMEOUT_MS = 90000;

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

function cleanOcrText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function mergeDescription(current, extracted) {
  const cleaned = cleanOcrText(extracted);
  if (!cleaned) return current;
  if (!current.trim()) return cleaned;
  return `${current.trim()}\n\n${cleaned}`;
}

async function prepareImageForOcr(file) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const image = document.createElement('img');
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = objectUrl;
    });

    const scale = Math.min(1, OCR_MAX_WIDTH / img.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No se pudo procesar la imagen');
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error('No se pudo preparar la imagen'))),
        'image/jpeg',
        0.92,
      );
    });

    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function extractTextFromImage(file, onProgress) {
  const imageBlob = await prepareImageForOcr(file);
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('spa', 1, {
    logger: (message) => {
      if (message.status === 'recognizing text') {
        onProgress?.(`Reconociendo texto… ${Math.round((message.progress ?? 0) * 100)}%`);
      } else if (message.status === 'loading language traineddata') {
        onProgress?.('Cargando idioma español…');
      }
    },
  });

  try {
    const { data } = await worker.recognize(imageBlob);
    return cleanOcrText(data.text ?? '');
  } finally {
    await worker.terminate();
  }
}

function DescriptionOcrModal({ open, onClose, onApply, currentValue }) {
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const needsHttps = typeof window !== 'undefined' && !window.isSecureContext;

  function resetModal() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setExtractedText('');
    setProcessing(false);
    setProgress('');
    setError('');
  }

  function handleClose() {
    resetModal();
    onClose();
  }

  async function handleImageSelected(file) {
    if (!file) return;
    setError('');
    setExtractedText('');
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(file));
    setProcessing(true);
    setProgress('Preparando imagen…');

    try {
      const text = await withTimeout(
        extractTextFromImage(file, setProgress),
        OCR_TIMEOUT_MS,
        'El reconocimiento tardó demasiado. Intenta con una foto más nítida.',
      );
      if (!text) {
        setError('No se detectó texto legible. Acerca más la cámara, mejora la luz e intenta de nuevo.');
        return;
      }
      setExtractedText(text);
    } catch (err) {
      setError(err.message || 'No se pudo extraer el texto');
    } finally {
      setProcessing(false);
      setProgress('');
    }
  }

  async function handleInputChange(e) {
    const input = e.target;
    const file = input.files?.[0];
    input.value = '';
    if (file) {
      await handleImageSelected(file);
    }
  }

  function handleApply(mode) {
    const nextValue = mode === 'replace'
      ? extractedText
      : mergeDescription(currentValue, extractedText);
    onApply(nextValue);
    handleClose();
  }

  if (!open) {
    return null;
  }

  return (
    <Modal title="Escanear descripción" onClose={handleClose} wide>
      <div className="space-y-4">
        {needsHttps && (
          <Alert tone="warning">
            La cámara requiere HTTPS. También puedes elegir una foto desde la galería si ya la tomaste.
          </Alert>
        )}

        <p className="text-sm text-slate-600">
          Fotografía el párrafo descriptivo del libro (contraportada, solapa o ficha). Mantén el texto enfocado y con buena luz.
        </p>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          capture="environment"
          className="hidden"
          onChange={handleInputChange}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          className="hidden"
          onChange={handleInputChange}
        />

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={processing}
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera size={16} />
            Usar cámara
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={processing}
            onClick={() => galleryInputRef.current?.click()}
          >
            <ImageIcon size={16} />
            Galería
          </Button>
        </div>

        {previewUrl && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <img src={previewUrl} alt="Vista previa" className="max-h-64 w-full object-contain" />
          </div>
        )}

        {processing && (
          <p className="text-sm text-slate-600">{progress || 'Procesando…'}</p>
        )}

        {extractedText && !processing && (
          <Field label="Texto detectado (puedes editarlo antes de aplicar)">
            <Textarea
              rows={8}
              value={extractedText}
              onChange={(e) => setExtractedText(e.target.value)}
            />
          </Field>
        )}

        {error && <Alert tone="error">{error}</Alert>}

        {extractedText && !processing && (
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancelar
            </Button>
            {currentValue.trim() && (
              <Button type="button" variant="secondary" onClick={() => handleApply('append')}>
                Agregar al final
              </Button>
            )}
            <Button type="button" onClick={() => handleApply('replace')}>
              {currentValue.trim() ? 'Reemplazar descripción' : 'Usar este texto'}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function DescriptionOcrField({ value, onChange, rows = 5 }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <label className="block text-sm font-medium text-slate-800">Descripción</label>
          <Button type="button" variant="secondary" size="sm" onClick={() => setModalOpen(true)}>
            <ScanText size={16} />
            Escanear párrafo
          </Button>
        </div>
        <Textarea
          rows={rows}
          value={value}
          placeholder="Sinopsis, contraportada o notas sobre el libro"
          onChange={(e) => onChange(e.target.value)}
        />
        <p className="mt-1 text-xs text-slate-500">
          Usa la cámara para capturar el texto impreso. La calidad depende de la luz y la nitidez de la foto.
        </p>
      </div>

      <DescriptionOcrModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        currentValue={value}
        onApply={onChange}
      />
    </>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, X } from 'lucide-react';
import Modal from './Modal.jsx';
import { Alert, Button } from './ui.jsx';

function normalizeIsbn(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 13 && (digits.startsWith('978') || digits.startsWith('979'))) {
    return digits;
  }
  return null;
}

function canUseLiveCamera() {
  return Boolean(
    typeof window !== 'undefined'
    && window.isSecureContext
    && navigator.mediaDevices
    && typeof navigator.mediaDevices.getUserMedia === 'function',
  );
}

function cameraErrorMessage(err) {
  const name = err?.name ?? '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Permiso de cámara denegado. Actívalo en la configuración del navegador.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No se encontró ninguna cámara en este dispositivo.';
  }
  if (name === 'NotReadableError') {
    return 'La cámara está en uso por otra aplicación.';
  }
  if (!canUseLiveCamera()) {
    return 'La cámara en vivo requiere HTTPS. Usa la opción de tomar una foto del código de barras.';
  }
  return err?.message || 'No se pudo acceder a la cámara.';
}

export default function IsbnScanner({ onDetected, disabled }) {
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const controlsRef = useRef(null);
  const detectedRef = useRef(false);
  const onDetectedRef = useRef(onDetected);
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');
  const [decodingPhoto, setDecodingPhoto] = useState(false);
  const liveCamera = canUseLiveCamera();

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  function stopScanner() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    detectedRef.current = false;
  }

  function handleDetectedIsbn(isbn) {
    detectedRef.current = true;
    stopScanner();
    setActive(false);
    setError('');
    onDetectedRef.current?.(isbn);
  }

  useEffect(() => {
    if (!active || !liveCamera || !videoRef.current) return undefined;

    let cancelled = false;
    setError('');

    import('@zxing/browser')
      .then(({ BrowserMultiFormatReader }) => {
        if (cancelled || !videoRef.current) return null;
        const reader = new BrowserMultiFormatReader();
        return reader.decodeFromVideoDevice(undefined, videoRef.current, (result, scanError, controls) => {
          if (cancelled || detectedRef.current || !result) return;

          const isbn = normalizeIsbn(result.getText());
          if (!isbn) {
            setError('El código detectado no parece ser un ISBN válido.');
            return;
          }

          handleDetectedIsbn(isbn);
        });
      })
      .then((controls) => {
        if (!controls) return;
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      })
      .catch((err) => {
        setError(cameraErrorMessage(err));
      });

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [active, liveCamera]);

  async function handlePhotoSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || detectedRef.current) return;

    setError('');
    setDecodingPhoto(true);

    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();
      const url = URL.createObjectURL(file);

      try {
        const result = await reader.decodeFromImageUrl(url);
        const isbn = normalizeIsbn(result.getText());
        if (!isbn) {
          setError('No se detectó un ISBN válido en la foto. Intenta de nuevo con mejor luz y enfoque.');
          return;
        }
        handleDetectedIsbn(isbn);
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError(err.message?.includes('NotFoundException')
        ? 'No se encontró un código de barras en la imagen. Enfoca el ISBN e intenta otra foto.'
        : err.message || 'No se pudo leer el código de barras de la foto.');
    } finally {
      setDecodingPhoto(false);
    }
  }

  function openScanner() {
    setError('');
    detectedRef.current = false;
    setActive(true);
  }

  function closeScanner() {
    stopScanner();
    setActive(false);
    setError('');
    setDecodingPhoto(false);
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={openScanner} disabled={disabled}>
        <Camera size={16} />
        Escanear ISBN
      </Button>

      {active && (
        <Modal title="Escanear ISBN" onClose={closeScanner} wide>
          <div className="space-y-4">
            {liveCamera ? (
              <>
                <p className="text-sm text-slate-600">
                  Enfoca el código de barras del libro. Al detectar un ISBN válido, la búsqueda se hará automáticamente.
                </p>
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
                  <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
                </div>
              </>
            ) : (
              <>
                <Alert tone="warning">
                  La cámara en vivo no está disponible porque la app se abrió por HTTP. Toma una foto del código de barras ISBN; también funciona si accedes por HTTPS.
                </Alert>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoSelected}
                />
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={decodingPhoto}
                >
                  <ImagePlus size={16} />
                  {decodingPhoto ? 'Leyendo código…' : 'Tomar foto del código de barras'}
                </Button>
              </>
            )}

            {error && <Alert tone="warning">{error}</Alert>}

            <div className="flex justify-end">
              <Button type="button" variant="secondary" onClick={closeScanner}>
                <X size={16} />
                Cancelar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

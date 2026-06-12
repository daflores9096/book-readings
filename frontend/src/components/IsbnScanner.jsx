import { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import Modal from './Modal.jsx';
import { Alert, Button } from './ui.jsx';

function normalizeIsbn(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 13 && (digits.startsWith('978') || digits.startsWith('979'))) {
    return digits;
  }
  return null;
}

export default function IsbnScanner({ onDetected, disabled }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const detectedRef = useRef(false);
  const onDetectedRef = useRef(onDetected);
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  function stopScanner() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    detectedRef.current = false;
  }

  useEffect(() => {
    if (!active || !videoRef.current) return undefined;

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

          detectedRef.current = true;
          controls?.stop();
          controlsRef.current = null;
          setActive(false);
          onDetectedRef.current?.(isbn);
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
        setError(err.message || 'No se pudo acceder a la cámara.');
      });

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [active]);

  function closeScanner() {
    stopScanner();
    setActive(false);
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setActive(true)} disabled={disabled}>
        <Camera size={16} />
        Escanear ISBN
      </Button>

      {active && (
        <Modal title="Escanear ISBN" onClose={closeScanner} wide>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Enfoca el código de barras del libro. Al detectar un ISBN válido, la búsqueda se hará automáticamente.
            </p>
            {error && <Alert tone="warning">{error}</Alert>}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
              <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
            </div>
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

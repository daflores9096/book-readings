import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import Modal from './Modal.jsx';
import { Alert, Button } from './ui.jsx';

const SCANNER_ELEMENT_ID = 'isbn-barcode-scanner';

function normalizeScannedIsbn(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.length === 13 || digits.length === 10) {
    return digits;
  }
  return digits.length > 13 ? digits.slice(0, 13) : digits;
}

export default function IsbnScannerModal({ open, onClose, onScan }) {
  const scannerRef = useRef(null);
  const handledRef = useRef(false);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  const [error, setError] = useState('');
  const needsHttps = typeof window !== 'undefined' && !window.isSecureContext;

  useEffect(() => {
    onScanRef.current = onScan;
    onCloseRef.current = onClose;
  }, [onScan, onClose]);

  useEffect(() => {
    if (!open || needsHttps) {
      return undefined;
    }

    handledRef.current = false;
    setError('');

    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
      ],
      verbose: false,
    });
    scannerRef.current = scanner;

    const config = {
      fps: 10,
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        const width = Math.min(viewfinderWidth * 0.92, 340);
        const height = Math.max(Math.round(width * 0.38), 90);
        return {
          width: Math.min(width, viewfinderWidth),
          height: Math.min(height, viewfinderHeight),
        };
      },
      aspectRatio: 1.5,
    };

    scanner
      .start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          if (handledRef.current) return;

          const isbn = normalizeScannedIsbn(decodedText);
          if (isbn.length < 10) return;

          handledRef.current = true;
          scanner
            .stop()
            .then(() => scanner.clear())
            .catch(() => {})
            .finally(() => {
              scannerRef.current = null;
              onScanRef.current?.(isbn);
              onCloseRef.current?.();
            });
        },
        () => {},
      )
      .catch((err) => {
        setError(err?.message || 'No se pudo iniciar la cámara. Revisa los permisos.');
      });

    return () => {
      handledRef.current = true;
      const activeScanner = scannerRef.current;
      scannerRef.current = null;
      if (!activeScanner) return;

      activeScanner
        .stop()
        .then(() => activeScanner.clear())
        .catch(() => {});
    };
  }, [open, needsHttps]);

  if (!open) {
    return null;
  }

  return (
    <Modal title="Escanear ISBN" onClose={onClose}>
      <div className="space-y-4">
        {needsHttps ? (
          <Alert tone="warning">
            El escáner requiere HTTPS. Accede con un enlace seguro (por ejemplo, Tailscale Serve) o escribe el ISBN a mano.
          </Alert>
        ) : (
          <>
            <p className="text-sm text-slate-600">
              Apunta la cámara al código de barras del libro. Funciona mejor con buena luz y el código centrado.
            </p>
            <div
              id={SCANNER_ELEMENT_ID}
              className="overflow-hidden rounded-xl border border-slate-200 bg-black"
            />
          </>
        )}

        {error && <Alert tone="error">{error}</Alert>}

        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

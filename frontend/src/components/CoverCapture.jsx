import { useRef, useState } from 'react';
import { Camera, Image } from 'lucide-react';

const MAX_WIDTH = 720;
const MAX_HEIGHT = 960;
const MAX_FILE_SIZE = 180 * 1024;
const MIN_QUALITY = 0.55;
const PROCESS_TIMEOUT_MS = 25000;

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('No se pudo optimizar la imagen'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      quality,
    );
  });
}

function fileNameAsJpeg(name) {
  return name.includes('.') ? name.replace(/\.\w+$/, '.jpg') : `${name}.jpg`;
}

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo cargar la imagen. Prueba con JPG o PNG.'));
    };
    img.src = objectUrl;
  });
}

async function loadImageSource(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, {
        resizeWidth: MAX_WIDTH,
        resizeHeight: MAX_HEIGHT,
        resizeQuality: 'high',
      });
      const { width, height } = bitmap;
      return {
        draw: (ctx, w, h) => {
          ctx.drawImage(bitmap, 0, 0, w, h);
          bitmap.close();
        },
        width,
        height,
      };
    } catch {
      // Safari/iOS may reject some formats here; fall back to Image.
    }
  }

  const img = await loadImageElement(file);
  const scale = Math.min(1, MAX_WIDTH / img.width, MAX_HEIGHT / img.height);
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);
  return {
    draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
    width,
    height,
  };
}

async function optimizeImage(file) {
  const { draw, width, height } = await loadImageSource(file);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No se pudo procesar la imagen');
  }
  draw(ctx, width, height);

  let blob = null;
  for (const quality of [0.78, 0.7, 0.62, MIN_QUALITY]) {
    blob = await canvasToBlob(canvas, quality);
    if (blob.size <= MAX_FILE_SIZE) {
      break;
    }
  }

  return new File([blob], fileNameAsJpeg(file.name), { type: 'image/jpeg' });
}

export default function CoverCapture({ onChange, previewUrl }) {
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [localPreview, setLocalPreview] = useState(null);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  async function handleInputChange(e) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    await handleFile(file);
    input.value = '';
  }

  async function handleFile(file) {
    setError('');
    setProcessing(true);
    try {
      const optimized = await withTimeout(
        optimizeImage(file),
        PROCESS_TIMEOUT_MS,
        'La imagen tardó demasiado. Prueba con otra foto más pequeña.',
      );
      setLocalPreview(URL.createObjectURL(optimized));
      onChange?.(optimized);
    } catch (err) {
      setError(err.message || 'Error al procesar imagen');
    } finally {
      setProcessing(false);
    }
  }

  const shownPreview = localPreview || previewUrl;

  return (
    <div className="space-y-3">
      <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
        {shownPreview ? (
          <img src={shownPreview} alt="Portada" className="h-full w-full object-cover" />
        ) : (
          <div className="text-center text-sm text-slate-500">
            <Camera className="mx-auto mb-2" size={28} />
            Toma o selecciona una foto de portada
          </div>
        )}
      </div>
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
        <button
          type="button"
          disabled={processing}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          onClick={() => cameraInputRef.current?.click()}
        >
          <Camera size={16} />
          {processing ? 'Procesando...' : 'Usar cámara'}
        </button>
        <button
          type="button"
          disabled={processing}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          onClick={() => galleryInputRef.current?.click()}
        >
          <Image size={16} />
          {processing ? 'Procesando...' : 'Galería'}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

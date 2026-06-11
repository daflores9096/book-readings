import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';

const MAX_WIDTH = 720;
const MAX_HEIGHT = 960;
const MAX_FILE_SIZE = 180 * 1024;
const MIN_QUALITY = 0.55;

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

function optimizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        try {
          const scale = Math.min(1, MAX_WIDTH / img.width, MAX_HEIGHT / img.height);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          let blob = null;
          for (const quality of [0.78, 0.7, 0.62, MIN_QUALITY]) {
            blob = await canvasToBlob(canvas, quality);
            if (blob.size <= MAX_FILE_SIZE) {
              break;
            }
          }

          resolve(new File([blob], fileNameAsJpeg(file.name), { type: 'image/jpeg' }));
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CoverCapture({ onChange, previewUrl }) {
  const inputRef = useRef(null);
  const [localPreview, setLocalPreview] = useState(null);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  async function handleFile(file) {
    if (!file) return;
    setError('');
    setProcessing(true);
    try {
      const optimized = await optimizeImage(file);
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
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <button
        type="button"
        disabled={processing}
        className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        onClick={() => inputRef.current?.click()}
      >
        {processing ? 'Optimizando imagen...' : 'Usar cámara o galería'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

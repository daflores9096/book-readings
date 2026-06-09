import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';

function resizeImage(file, maxWidth = 900) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('No se pudo optimizar la imagen'));
              return;
            }
            resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
          },
          'image/jpeg',
          0.78,
        );
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

  async function handleFile(file) {
    if (!file) return;
    setError('');
    try {
      const optimized = await resizeImage(file);
      setLocalPreview(URL.createObjectURL(optimized));
      onChange?.(optimized);
    } catch (err) {
      setError(err.message || 'Error al procesar imagen');
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
        className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        onClick={() => inputRef.current?.click()}
      >
        Usar cámara o galería
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

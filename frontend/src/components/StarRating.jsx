import { Star } from 'lucide-react';

export default function StarRating({ value = 0, onChange, disabled = false, size = 22 }) {
  const rating = Number(value) || 0;
  const interactive = typeof onChange === 'function' && !disabled;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= rating;
        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            className={`rounded p-0.5 ${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
            onClick={() => onChange?.(rating === star ? 0 : star)}
            aria-label={`${star} estrella${star === 1 ? '' : 's'}`}
          >
            <Star
              size={size}
              className={active ? 'text-amber-400' : 'text-slate-300'}
              fill={active ? 'currentColor' : 'none'}
            />
          </button>
        );
      })}
    </div>
  );
}

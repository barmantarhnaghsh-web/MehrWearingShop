'use client';

export function StarRating({
  value,
  size = 14,
  onChange,
}: {
  value: number;
  size?: number;
  onChange?: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = value >= star - 0.25;
        const half = !filled && value >= star - 0.75;
        return onChange ? (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            style={{ fontSize: size }}
            className={filled || half ? 'text-amber-400' : 'text-slate-300'}
            aria-label={`${star}`}
          >
            ★
          </button>
        ) : (
          <span key={star} style={{ fontSize: size }} className={filled || half ? 'text-amber-400' : 'text-slate-300'}>
            {filled ? '★' : half ? '⯨' : '☆'}
          </span>
        );
      })}
    </div>
  );
}

import React, { useId } from 'react';

interface StarRatingBarProps {
  rating?: number | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<StarRatingBarProps['size']>, string> = {
  xs: 'w-3 h-3',
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

/**
 * Renders all 5 stars (★★★★★) filled proportionally according to the rating (0 to 5).
 * Does not render compact numeric/count badges like "5 (1)".
 */
export function StarRatingBar({
  rating = 0,
  size = 'sm',
  className = '',
}: StarRatingBarProps) {
  const baseId = useId();
  const safeRating = Math.min(5, Math.max(0, Number(rating || 0)));
  const iconClass = SIZE_CLASSES[size];

  return (
    <span
      className={`inline-flex items-center gap-0.5 shrink-0 ${className}`}
      role="img"
      aria-label={
        safeRating > 0 ? `Rated ${safeRating.toFixed(1)} out of 5 stars` : 'Unrated (0 of 5 stars)'
      }
      title={safeRating > 0 ? `${safeRating.toFixed(1)} / 5 stars` : 'No ratings yet'}
    >
      {[1, 2, 3, 4, 5].map((starIndex) => {
        const fillFraction = Math.min(1, Math.max(0, safeRating - (starIndex - 1)));
        const fillPercent = Math.round(fillFraction * 100);
        const gradId = `${baseId}-star-${starIndex}`;

        return (
          <svg
            key={starIndex}
            viewBox="0 0 24 24"
            className={iconClass}
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset={`${fillPercent}%`} stopColor="#F59E0B" />
                <stop offset={`${fillPercent}%`} stopColor="#DCDFE3" />
              </linearGradient>
            </defs>
            <path
              fill={
                fillPercent === 100
                  ? '#F59E0B'
                  : fillPercent === 0
                  ? '#DCDFE3'
                  : `url(#${gradId})`
              }
              d="M12 2.25l2.92 5.91 6.53.95-4.72 4.6 1.11 6.5L12 17.14l-5.84 3.07 1.11-6.5-4.72-4.6 6.53-.95L12 2.25z"
            />
          </svg>
        );
      })}
    </span>
  );
}

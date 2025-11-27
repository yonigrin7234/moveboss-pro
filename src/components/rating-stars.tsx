'use client';

import { Star } from 'lucide-react';

interface RatingStarsProps {
  rating: number;
  maxStars?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  count?: number;
}

export function RatingStars({
  rating,
  maxStars = 5,
  size = 'md',
  showValue = false,
  count,
}: RatingStarsProps) {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const textClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {Array.from({ length: maxStars }, (_, i) => {
          const filled = i < Math.floor(rating);
          const partial = i === Math.floor(rating) && rating % 1 > 0;

          return (
            <Star
              key={i}
              className={`${sizeClasses[size]} ${
                filled
                  ? 'fill-yellow-400 text-yellow-400'
                  : partial
                    ? 'fill-yellow-400/50 text-yellow-400'
                    : 'text-muted-foreground/30'
              }`}
            />
          );
        })}
      </div>
      {showValue && (
        <span className={`${textClasses[size]} text-muted-foreground ml-1`}>
          {rating.toFixed(1)}
          {count !== undefined && ` (${count})`}
        </span>
      )}
    </div>
  );
}

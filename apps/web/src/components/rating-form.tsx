'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RatingFormProps {
  loadId: string;
  raterCompanyId: string;
  ratedCompanyId: string;
  ratedCompanyName: string;
  raterType: 'shipper' | 'carrier';
  onSubmit: (formData: FormData) => Promise<void>;
}

export function RatingForm({
  loadId,
  raterCompanyId,
  ratedCompanyId,
  ratedCompanyName,
  raterType,
  onSubmit,
}: RatingFormProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayRating = hoveredRating || rating;

  async function handleSubmit(formData: FormData) {
    if (rating === 0) return;
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Rate {ratedCompanyName}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="load_id" value={loadId} />
          <input type="hidden" name="rater_company_id" value={raterCompanyId} />
          <input type="hidden" name="rated_company_id" value={ratedCompanyId} />
          <input type="hidden" name="rater_type" value={raterType} />
          <input type="hidden" name="rating" value={rating} />

          {/* Star Selection */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              How was your experience?
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="p-1 transition-transform hover:scale-110"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= displayRating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-muted-foreground">
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent'}
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label htmlFor="comment" className="text-sm text-muted-foreground">
              Comment (optional)
            </label>
            <Textarea
              id="comment"
              name="comment"
              placeholder="Share your experience..."
              rows={3}
            />
          </div>

          <Button
            type="submit"
            disabled={rating === 0 || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Rating'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

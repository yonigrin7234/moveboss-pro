'use client';

import { FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LoadDetailViewModel } from '@/lib/load-detail-model';

interface LoadDetailInstructionsProps {
  model: LoadDetailViewModel;
}

export function LoadDetailInstructions({ model }: LoadDetailInstructionsProps) {
  if (!model.specialInstructions) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Special Instructions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm bg-muted/50 p-3 rounded-lg whitespace-pre-wrap">
          {model.specialInstructions}
        </p>
      </CardContent>
    </Card>
  );
}

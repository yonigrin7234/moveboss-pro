'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight } from 'lucide-react';

interface CriticalBlockProps {
  message: string;
  href: string;
  actionText?: string;
}

export function CriticalBlock({ message, href, actionText = 'Fix Now' }: CriticalBlockProps) {
  return (
    <div className="bg-red-50 border-b border-red-100">
      <div className="max-w-[1400px] mx-auto px-6">
        <Link href={href} className="flex items-center justify-between py-2.5 group">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-red-100">
              <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
            </div>
            <span className="text-sm font-medium text-red-800">{message}</span>
          </div>
          <span className="flex items-center gap-1 text-xs font-semibold text-red-700 group-hover:text-red-800 transition-colors">
            {actionText}
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </Link>
      </div>
    </div>
  );
}

import Link from 'next/link';
import { AlertCircle, ArrowRight } from 'lucide-react';

interface CriticalAlertBarProps {
  message: string;
  href: string;
  actionText?: string;
}

export function CriticalAlertBar({ message, href, actionText = 'Fix →' }: CriticalAlertBarProps) {
  return (
    <Link href={href} className="block group">
      <div className="bg-red-50 border border-red-200 rounded-xl py-3 px-5 flex items-center justify-between hover:bg-red-100 transition-colors">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <AlertCircle className="relative h-4 w-4 text-red-500" />
          </div>
          <span className="text-sm font-medium text-red-800">{message}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm font-semibold text-red-700 group-hover:text-red-800 transition-colors">
          {actionText}
          <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </Link>
  );
}

import Link from 'next/link';
import { AlertCircle, ArrowRight } from 'lucide-react';

interface CriticalBlockProps {
  message: string;
  href: string;
  actionText?: string;
}

export function CriticalBlock({ message, href, actionText = 'Fix' }: CriticalBlockProps) {
  return (
    <Link
      href={href}
      className="block group"
    >
      <div className="bg-red-500/10 border-l-4 border-red-600 rounded-lg py-2.5 px-4 flex items-center justify-between hover:bg-red-500/15 transition-all">
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute h-5 w-5 animate-ping rounded-full bg-red-500 opacity-20" />
            <AlertCircle className="h-4 w-4 text-red-600 relative" />
          </div>
          <span className="text-sm font-medium text-red-700">{message}</span>
        </div>
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors group-hover:translate-x-0.5">
          {actionText}
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

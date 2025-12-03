import Link from 'next/link';
import { AlertCircle, ArrowRight } from 'lucide-react';

interface CriticalBlockProps {
  message: string;
  href: string;
  actionText?: string;
}

export function CriticalBlock({ message, href, actionText = 'Fix →' }: CriticalBlockProps) {
  return (
    <Link
      href={href}
      className="block group"
    >
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl py-4 px-6 flex items-center justify-between hover:bg-red-500/15 transition-all">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            {/* Animated pulse ring */}
            <span className="absolute h-8 w-8 animate-ping rounded-full bg-red-500 opacity-20" />
            <div className="relative flex items-center justify-center h-8 w-8 rounded-full bg-red-500/20">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
          </div>
          <span className="text-base font-semibold text-red-700">{message}</span>
        </div>
        <div className="flex items-center gap-2 text-red-700 font-semibold group-hover:translate-x-1 transition-transform">
          <span className="text-sm">{actionText}</span>
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}

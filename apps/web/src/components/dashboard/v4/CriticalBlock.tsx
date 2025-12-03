import Link from 'next/link';
import { AlertCircle, ArrowRight } from 'lucide-react';

interface CriticalBlockProps {
  message: string;
  href: string;
  actionText?: string;
}

export function CriticalBlock({ message, href, actionText = 'Fix' }: CriticalBlockProps) {
  return (
    <div className="sticky top-0 z-40 bg-background pb-6">
      <Link
        href={href}
        className="block group max-w-[1400px] mx-auto"
      >
        <div className="bg-red-500/10 border-l-4 border-red-600 rounded-lg py-3 px-6 flex items-center justify-between hover:bg-red-500/15 transition-all duration-150 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              {/* Animated pulse ring */}
              <span className="absolute h-6 w-6 animate-ping rounded-full bg-red-500 opacity-20" />
              <div className="relative flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <span className="text-sm font-semibold text-red-700">{message}</span>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors duration-150 group-hover:translate-x-1 transition-transform">
            <span>{actionText}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </Link>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CriticalBlockProps {
  message: string;
  href: string;
  actionText?: string;
}

export function CriticalBlock({ message, href, actionText = 'Fix' }: CriticalBlockProps) {
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={`${isSticky ? 'sticky top-0 z-40' : ''} transition-all duration-200`}>
      <Link
        href={href}
        className="block group"
      >
        <div className="bg-red-500/10 border-l-4 border-red-600 py-2 px-4 flex items-center justify-between hover:bg-red-500/15 transition-all duration-150">
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="absolute h-4 w-4 animate-ping rounded-full bg-red-500 opacity-20" />
              <AlertCircle className="h-5 w-5 text-red-600 relative" />
            </div>
            <span className="text-sm font-medium text-red-700">{message}</span>
          </div>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors duration-150 group-hover:translate-x-0.5">
            {actionText}
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </Link>
    </div>
  );
}

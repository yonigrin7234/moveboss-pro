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
      <Link href={href} className="block group">
        <div className="bg-red-50 border-l-4 border-red-600 py-3 px-5 flex items-center justify-between hover:bg-red-100/50 transition-colors duration-150">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-red-900">{message}</span>
          </div>
          <span className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors duration-150 group-hover:translate-x-0.5">
            {actionText}
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </Link>
    </div>
  );
}

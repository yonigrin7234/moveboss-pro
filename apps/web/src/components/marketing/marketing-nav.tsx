'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/ui/logo';

interface MarketingNavProps {
  isAuthenticated?: boolean;
}

export function MarketingNav({ isAuthenticated = false }: MarketingNavProps) {
  const pathname = usePathname();

  const navLinks = [
    { href: '/features', label: 'Features' },
    { href: '/pricing', label: 'Pricing' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#080B12]/80 backdrop-blur-xl border-b border-white/[0.06]">
      <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <Logo size={28} color="#0EA5E9" />
          <span className="text-lg font-semibold text-white tracking-tight">MoveBoss</span>
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-sky-500/10 text-sky-400 rounded border border-sky-500/20">
            PRO
          </span>
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm transition-colors ${
                pathname === link.href
                  ? 'text-white'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium bg-sky-500 hover:bg-sky-400 text-white rounded-lg transition-colors"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 text-sm font-medium bg-sky-500 hover:bg-sky-400 text-white rounded-lg transition-colors"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

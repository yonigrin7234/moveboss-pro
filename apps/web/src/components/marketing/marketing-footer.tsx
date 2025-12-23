import Link from 'next/link';
import { Logo } from '@/components/ui/logo';

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#080B12]">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Copyright */}
          <div className="flex items-center gap-3">
            <Logo size={24} color="#0EA5E9" />
            <span className="text-sm text-white/30">© 2025 MoveBoss</span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6">
            <Link
              href="/features"
              className="text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

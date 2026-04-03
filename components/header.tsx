'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X, TrendingUp } from 'lucide-react';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/#current', label: 'Current IPO' },
  { href: '/#upcoming', label: 'Upcoming IPO' },
  { href: '/#gmp', label: 'GMP Tracker' },
  { href: '/listed', label: 'Listed IPO' },
  { href: '/accuracy', label: 'AI Accuracy', badge: '94%' },
  { href: '/#news', label: 'News' },
];

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('--:--');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="sticky top-0 z-50 bg-card border-b border-border">
      <div className="max-w-[1440px] mx-auto flex items-center h-[58px] px-5">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 mr-5 shrink-0">
          <div className="w-[34px] h-[34px] bg-gradient-to-br from-primary to-cobalt rounded-[9px] flex items-center justify-center">
            <TrendingUp className="w-[18px] h-[18px] text-white" strokeWidth={2} />
          </div>
          <span className="font-[family-name:var(--font-sora)] font-black text-xl tracking-tight">
            IPO<span className="text-primary-mid">Gyani</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex gap-0.5 flex-1 overflow-x-auto">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13px] font-medium text-ink3 px-3 py-1.5 rounded-lg transition-colors hover:bg-background hover:text-foreground whitespace-nowrap"
            >
              {link.label}
              {link.badge && (
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-bg text-emerald ml-1 align-middle">
                  {link.badge}
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {/* Live Clock */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11.5px] text-ink3 px-2.5 py-1 rounded-full border border-border whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-mid animate-pulse" />
            <span>{currentTime}</span>
            <span>IST</span>
          </div>

          {/* Buttons */}
          <button className="hidden sm:block text-[12.5px] font-semibold px-4 py-1.5 rounded-lg border-[1.5px] border-border-secondary bg-card text-ink2 transition-colors hover:bg-background">
            Login
          </button>
          <button className="text-[12.5px] font-bold px-4 py-1.5 rounded-lg bg-gradient-to-br from-primary to-cobalt text-white transition-opacity hover:opacity-90">
            Pro
          </button>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-1.5 rounded-lg"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden border-t border-border bg-card px-5 py-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block text-sm font-medium text-ink2 py-2.5 border-b border-border last:border-0"
              onClick={() => setIsMenuOpen(false)}
            >
              {link.label}
              {link.badge && (
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-bg text-emerald ml-2">
                  {link.badge}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}

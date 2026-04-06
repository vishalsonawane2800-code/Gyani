'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X, TrendingUp, Search, Sparkles } from 'lucide-react';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '#current', label: 'Live IPOs', badge: '3', badgeColor: 'bg-emerald-500' },
  { href: '/listed', label: 'Listed' },
  { href: '/upcoming', label: 'Upcoming' },
  { href: '/gmp', label: 'GMP Today' },
  { href: '/allotment-status', label: 'Allotment' },
  { href: '/sme', label: 'SME IPOs' },
  { href: '/accuracy', label: 'AI Accuracy' },
];

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    const checkMarketHours = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const day = now.getDay();
      
      // Market open: Mon-Fri, 9:15 AM - 3:30 PM IST
      const isWeekday = day >= 1 && day <= 5;
      const currentMinutes = hours * 60 + minutes;
      const marketOpenMinutes = 9 * 60 + 15;
      const marketCloseMinutes = 15 * 60 + 30;
      
      setIsMarketOpen(isWeekday && currentMinutes >= marketOpenMinutes && currentMinutes <= marketCloseMinutes);
    };
    
    checkMarketHours();
    const interval = setInterval(checkMarketHours, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="sticky top-0 z-50 bg-card border-b border-border">
      <div className="max-w-[1440px] mx-auto flex items-center h-[58px] px-5">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 mr-5 shrink-0">
          <div className="w-[34px] h-[34px] rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #5b21b6 0%, #1d4ed8 100%)' }}>
            <TrendingUp className="w-[18px] h-[18px] text-white" strokeWidth={2} />
          </div>
          <span className="font-heading font-black text-xl tracking-tight text-foreground">
            IPO<span className="text-violet-600">Gyani</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex gap-0.5 flex-1 overflow-x-auto">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13px] font-medium text-ink3 px-3 py-1.5 rounded-lg transition-colors hover:bg-background hover:text-foreground whitespace-nowrap flex items-center gap-1.5"
            >
              {link.label}
              {link.badge && (
                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full text-white ${link.badgeColor}`}>
                  {link.badge}
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {/* Market Status */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11.5px] text-ink3 px-2.5 py-1 rounded-full border border-border whitespace-nowrap">
            <span className={`w-1.5 h-1.5 rounded-full ${isMarketOpen ? 'bg-emerald-mid animate-pulse' : 'bg-ink4'}`} />
            <span>{isMarketOpen ? 'Market Open' : 'Market Closed'}</span>
          </div>

          {/* Compact Search Bar */}
          <div className={`hidden md:flex items-center bg-secondary rounded-lg border transition-all ${
            isSearchFocused ? 'border-primary shadow-sm w-56' : 'border-transparent w-44'
          }`}>
            <Search className="w-3.5 h-3.5 text-ink4 ml-2.5 shrink-0" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              placeholder="Search IPO..."
              className="flex-1 border-none outline-none py-1.5 px-2 text-[12px] text-foreground placeholder:text-ink4 bg-transparent"
              maxLength={60}
              autoComplete="off"
              spellCheck="false"
            />
          </div>

          {/* Log in button */}
          <button className="hidden sm:block text-[12px] font-medium text-ink2 hover:text-foreground px-3 py-1.5 rounded-lg border border-border hover:border-border-secondary transition-colors">
            Log in
          </button>

          {/* Pro+ Button */}
          <button className="hidden sm:flex items-center gap-1.5 text-[12px] font-bold text-white px-3 py-1.5 rounded-lg transition-all hover:opacity-90 hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg, #5b21b6 0%, #1d4ed8 100%)' }}>
            <Sparkles className="w-3.5 h-3.5" />
            Pro+
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
          {/* Mobile Search */}
          <div className="flex items-center bg-secondary rounded-lg border border-border mb-3">
            <Search className="w-4 h-4 text-ink4 ml-3 shrink-0" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search IPO..."
              className="flex-1 border-none outline-none py-2 px-2.5 text-[13px] text-foreground placeholder:text-ink4 bg-transparent"
              maxLength={60}
            />
          </div>
          
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2 text-sm font-medium text-ink2 py-2.5 border-b border-border last:border-0"
              onClick={() => setIsMenuOpen(false)}
            >
              {link.label}
              {link.badge && (
                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full text-white ${link.badgeColor}`}>
                  {link.badge}
                </span>
              )}
            </Link>
          ))}

          {/* Mobile buttons */}
          <div className="flex gap-2 mt-3 pt-3 border-t border-border">
            <button className="flex-1 text-[13px] font-medium text-ink2 py-2 rounded-lg border border-border">
              Log in
            </button>
            <button className="flex-1 flex items-center justify-center gap-1.5 text-[13px] font-bold text-white py-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #5b21b6 0%, #1d4ed8 100%)' }}>
              <Sparkles className="w-3.5 h-3.5" />
              Pro+
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

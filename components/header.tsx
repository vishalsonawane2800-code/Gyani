'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Menu, X, Search, LogOut, User as UserIcon } from 'lucide-react';
import useSWR from 'swr';
import { useUserAuth } from '@/lib/user-auth-context';

type NavLink = {
  href: string;
  label: string;
  // If `liveBadge` is true, the badge count is driven by the live-ipo-count
  // endpoint. Otherwise we fall back to the static badge string (if any).
  badge?: string;
  badgeColor?: string;
  liveBadge?: boolean;
};

const navLinks: NavLink[] = [
  { href: '/', label: 'Home' },
  // Live IPOs now has a dedicated page at /live - the previous `/#current`
  // anchor only worked from the homepage and often failed to scroll on
  // cross-page navigation.
  { href: '/live', label: 'Live IPOs', badgeColor: 'bg-emerald-500', liveBadge: true },
  { href: '/listed', label: 'Listed' },
  { href: '/upcoming', label: 'Upcoming' },
  { href: '/gmp', label: 'GMP Today' },
  { href: '/subscription', label: 'Subscription' },
  { href: '/news', label: 'IPO News' },
  { href: '/allotment-status', label: 'Allotment' },
  { href: '/accuracy', label: 'AI Accuracy' },
];

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { user, isAuthenticated, logout } = useUserAuth();

  // First name only, to keep the pill compact in the header.
  const firstName = user?.name?.split(' ')[0] ?? '';

  // Live IPOs count — refreshes every 2 minutes so the badge stays current
  // without hammering the API. Returns 0 if the endpoint is unreachable,
  // in which case we hide the badge entirely.
  const { data: liveData } = useSWR<{ count: number }>(
    '/api/public/live-ipo-count',
    fetcher,
    {
      refreshInterval: 120_000,
      revalidateOnFocus: true,
    }
  );
  const liveCount = liveData?.count ?? 0;

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

      setIsMarketOpen(
        isWeekday &&
          currentMinutes >= marketOpenMinutes &&
          currentMinutes <= marketCloseMinutes
      );
    };

    checkMarketHours();
    const interval = setInterval(checkMarketHours, 60000);
    return () => clearInterval(interval);
  }, []);

  // Resolve the badge value for a given nav link. For liveBadge links we
  // only show the badge when the count is > 0 so an empty pipeline doesn't
  // render a misleading "0" chip.
  const renderBadge = (link: NavLink) => {
    const value = link.liveBadge ? (liveCount > 0 ? String(liveCount) : '') : link.badge;
    if (!value) return null;
    return (
      <span
        className={`text-xs font-extrabold px-2 py-0.5 rounded-full text-white ${link.badgeColor ?? 'bg-primary'}`}
        aria-label={link.liveBadge ? `${liveCount} live IPOs` : undefined}
      >
        {value}
      </span>
    );
  };

  return (
    <nav className="sticky top-0 z-50 bg-card border-b border-border">
      <div className="max-w-[1440px] mx-auto flex items-center h-[58px] px-5">
        {/* Logo */}
        <Link href="/" className="flex items-center mr-5 shrink-0">
          <Image
            src="/images/logo.png"
            alt="IPOGyani - India's Smartest IPO Platform"
            width={185}
            height={47}
            className="h-[47px] w-auto"
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex gap-1 flex-1 overflow-x-auto">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-ink3 px-3 py-2 rounded transition-colors hover:bg-background hover:text-foreground whitespace-nowrap flex items-center gap-2"
            >
              {link.label}
              {renderBadge(link)}
            </Link>
          ))}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {/* Market Status */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-ink3 px-3 py-2 rounded-full border border-border whitespace-nowrap">
            <span className={`w-2 h-2 rounded-full ${isMarketOpen ? 'bg-emerald-mid animate-pulse' : 'bg-ink4'}`} />
            <span>{isMarketOpen ? 'Market Open' : 'Market Closed'}</span>
          </div>

          {/* Compact Search Bar */}
          <div
            className={`hidden md:flex items-center bg-secondary rounded border transition-all ${
              isSearchFocused ? 'border-primary shadow-sm w-56' : 'border-transparent w-44'
            }`}
          >
            <Search className="w-4 h-4 text-ink4 ml-3 shrink-0" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              placeholder="Search IPO..."
              className="flex-1 border-none outline-none py-2 px-2 text-sm text-foreground placeholder:text-ink4 bg-transparent"
              maxLength={60}
              autoComplete="off"
              spellCheck="false"
            />
          </div>

          {/* Log in / account button */}
          {isAuthenticated ? (
            <div className="hidden sm:flex items-center gap-1">
              <span
                className="inline-flex items-center gap-1.5 text-sm font-medium text-ink2 px-3 py-2 rounded border border-border"
                title={user?.email}
              >
                <UserIcon className="w-4 h-4 text-ink3" />
                Hi, {firstName}
              </span>
              <button
                onClick={logout}
                className="inline-flex items-center gap-1 text-sm font-medium text-ink2 hover:text-foreground px-2.5 py-2 rounded border border-border hover:border-border-secondary transition-colors"
                aria-label="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden sm:block text-sm font-medium text-ink2 hover:text-foreground px-3 py-2 rounded border border-border hover:border-border-secondary transition-colors"
            >
              Log in
            </Link>
          )}

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
          <div className="flex items-center bg-secondary rounded border border-border mb-3">
            <Search className="w-4 h-4 text-ink4 ml-3 shrink-0" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search IPO..."
              className="flex-1 border-none outline-none py-2 px-2 text-sm text-foreground placeholder:text-ink4 bg-transparent"
              maxLength={60}
            />
          </div>

          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2 text-sm font-medium text-ink2 py-2 border-b border-border last:border-0"
              onClick={() => setIsMenuOpen(false)}
            >
              {link.label}
              {renderBadge(link)}
            </Link>
          ))}

          {/* Mobile buttons */}
          <div className="flex gap-2 mt-3 pt-3 border-t border-border">
            {isAuthenticated ? (
              <>
                <span className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-medium text-ink2 py-2 rounded border border-border">
                  <UserIcon className="w-4 h-4 text-ink3" />
                  Hi, {firstName}
                </span>
                <button
                  onClick={() => { logout(); setIsMenuOpen(false); }}
                  className="inline-flex items-center justify-center gap-1 text-sm font-medium text-ink2 px-3 py-2 rounded border border-border"
                  aria-label="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsMenuOpen(false)}
                className="flex-1 text-center text-sm font-medium text-ink2 py-2 rounded border border-border"
              >
                Log in
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

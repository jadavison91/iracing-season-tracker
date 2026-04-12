'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { DriverSelector } from '@/components/DriverSelector';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useDriverData } from '@/contexts/DriverDataContext';
import { getSettings, saveSettings, LookbackWeeks } from '@/lib/settings';

interface HeaderProps {
  customerId: number | null;
  onCustomerIdChange: (id: number | null) => void;
}

function formatAge(ms: number): string {
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function RefreshControl() {
  const { data, forceRefresh } = useDriverData();
  const { isLoading, lastFetched, customerId } = data;

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const age = lastFetched ? now - lastFetched : null;
  const stale = age !== null && age > 2 * 60 * 60 * 1000;

  if (!customerId) return null;

  return (
    <div className="hidden items-center gap-1.5 sm:flex">
      {lastFetched && (
        <span
          className={`text-xs ${stale ? 'text-amber-500 dark:text-amber-400' : 'text-zinc-400 dark:text-zinc-500'}`}
        >
          {stale ? 'Stale · ' : ''}
          {formatAge(age!)}
        </span>
      )}
      <button
        onClick={() => forceRefresh()}
        disabled={isLoading}
        title="Refresh race data from API"
        className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-40 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
      >
        <svg
          className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
    </div>
  );
}

const LOOKBACK_OPTIONS: { value: LookbackWeeks; label: string }[] = [
  { value: 12, label: '12 weeks (1 season)' },
  { value: 24, label: '24 weeks (2 seasons)' },
  { value: 36, label: '36 weeks (3 seasons)' },
];

function SettingsPopover() {
  const [open, setOpen] = useState(false);
  const [lookbackWeeks, setLookbackWeeks] = useState<LookbackWeeks>(
    () => getSettings().lookbackWeeks
  );
  const { forceRefresh } = useDriverData();
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function handleLookbackChange(weeks: LookbackWeeks) {
    setLookbackWeeks(weeks);
    saveSettings({ lookbackWeeks: weeks });
    setOpen(false);
    // Clear cache and re-fetch so the new window takes effect immediately
    forceRefresh();
  }

  return (
    <div ref={ref} className="relative hidden sm:block">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Settings"
        className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 w-56 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            Data Lookback
          </p>
          <div className="space-y-1">
            {LOOKBACK_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleLookbackChange(opt.value)}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                  lookbackWeeks === opt.value
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800'
                }`}
              >
                {opt.label}
                {lookbackWeeks === opt.value && (
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
          <p className="mt-2.5 text-[11px] text-zinc-400 dark:text-zinc-500">
            Changing this will trigger a full data refresh.
          </p>
        </div>
      )}
    </div>
  );
}

export function Header({ customerId, onCustomerIdChange }: HeaderProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-zinc-800 dark:bg-zinc-900/95 dark:supports-[backdrop-filter]:bg-zinc-900/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/iRacing-Inline-Color-Blue.svg"
              alt="iRacing"
              width={100}
              height={18}
              className="dark:hidden"
              priority
            />
            <Image
              src="/images/iRacing-Inline-BW-White.svg"
              alt="iRacing"
              width={100}
              height={18}
              className="hidden dark:block"
              priority
            />
            <span className="text-sm font-semibold text-zinc-400 dark:text-zinc-500">Tracker</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {[
              { href: '/', label: 'Dashboard' },
              { href: '/races', label: 'Races' },
              { href: '/charts', label: 'Charts' },
              { href: '/opponents', label: 'Opponents' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  pathname === href
                    ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <RefreshControl />
          <SettingsPopover />
          <DriverSelector customerId={customerId} onCustomerIdChange={onCustomerIdChange} />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

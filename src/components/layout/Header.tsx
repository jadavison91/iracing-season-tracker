'use client';

import Link from 'next/link';
import { DriverSelector } from '@/components/DriverSelector';
import { ThemeToggle } from '@/components/ThemeToggle';

interface HeaderProps {
  customerId: number | null;
  onCustomerIdChange: (id: number | null) => void;
}

export function Header({ customerId, onCustomerIdChange }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-zinc-900/95 dark:supports-[backdrop-filter]:bg-zinc-900/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <svg
              className="h-6 w-6 text-red-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <span className="text-lg font-bold">iRacing Tracker</span>
          </Link>

          <nav className="hidden md:flex items-center gap-4">
            <Link
              href="/"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Dashboard
            </Link>
            <Link
              href="/charts"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Charts
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <DriverSelector customerId={customerId} onCustomerIdChange={onCustomerIdChange} />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { DriverSelector } from '@/components/DriverSelector';
import { ThemeToggle } from '@/components/ThemeToggle';

interface HeaderProps {
  customerId: number | null;
  onCustomerIdChange: (id: number | null) => void;
}

export function Header({ customerId, onCustomerIdChange }: HeaderProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-zinc-800 dark:bg-zinc-900/95 dark:supports-[backdrop-filter]:bg-zinc-900/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            {/* Light mode logo */}
            <Image
              src="/images/iRacing-Inline-Color-Blue.svg"
              alt="iRacing"
              width={100}
              height={18}
              className="dark:hidden"
              priority
            />
            {/* Dark mode logo */}
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
            <Link
              href="/"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                pathname === '/'
                  ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100'
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/charts"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                pathname === '/charts'
                  ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100'
              }`}
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

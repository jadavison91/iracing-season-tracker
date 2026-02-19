'use client';

import { Button } from '@/components/ui/button';
import { ReactNode } from 'react';

type EmptyStateVariant = 'no-driver' | 'no-races' | 'no-series' | 'error' | 'no-results';

interface EmptyStateProps {
  variant: EmptyStateVariant;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
}

const defaultContent: Record<EmptyStateVariant, { title: string; description: string }> = {
  'no-driver': {
    title: 'No Driver Selected',
    description: 'Enter a Customer ID to view racing statistics and performance data.',
  },
  'no-races': {
    title: 'No Races Found',
    description: 'No recent race data found for this driver. Get out there and race!',
  },
  'no-series': {
    title: 'No Active Series',
    description: 'No series participation found in recent races.',
  },
  'error': {
    title: 'Something Went Wrong',
    description: 'We encountered an error loading your data. Please try again.',
  },
  'no-results': {
    title: 'No Results',
    description: 'No results match your current filters. Try adjusting your search criteria.',
  },
};

export function EmptyState({ variant, title, description, action, children }: EmptyStateProps) {
  const content = defaultContent[variant];

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-6">
        <EmptyStateIllustration variant={variant} />
      </div>
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {title || content.title}
      </h3>
      <p className="mt-2 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
        {description || content.description}
      </p>
      {children && <div className="mt-4">{children}</div>}
      {action && (
        <Button onClick={action.onClick} className="mt-6">
          {action.label}
        </Button>
      )}
    </div>
  );
}

function EmptyStateIllustration({ variant }: { variant: EmptyStateVariant }) {
  switch (variant) {
    case 'no-driver':
      return (
        <svg
          className="h-24 w-24 text-zinc-300 dark:text-zinc-600"
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          {/* Helmet outline */}
          <ellipse cx="50" cy="45" rx="30" ry="25" />
          <path d="M20 45 Q20 70 50 75 Q80 70 80 45" />
          {/* Visor */}
          <path d="M25 40 Q50 50 75 40" strokeWidth="3" />
          {/* Question mark */}
          <text x="43" y="60" fontSize="20" fill="currentColor" stroke="none">?</text>
        </svg>
      );

    case 'no-races':
      return (
        <svg
          className="h-24 w-24 text-zinc-300 dark:text-zinc-600"
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          {/* Track oval */}
          <ellipse cx="50" cy="50" rx="40" ry="25" />
          {/* Inner track */}
          <ellipse cx="50" cy="50" rx="25" ry="12" />
          {/* Start/finish line */}
          <line x1="50" y1="25" x2="50" y2="38" strokeWidth="3" strokeDasharray="4 2" />
          {/* Checkered flag */}
          <rect x="60" y="15" width="15" height="12" fill="currentColor" opacity="0.3" />
          <rect x="60" y="15" width="5" height="4" fill="currentColor" />
          <rect x="70" y="15" width="5" height="4" fill="currentColor" />
          <rect x="65" y="19" width="5" height="4" fill="currentColor" />
          <rect x="60" y="23" width="5" height="4" fill="currentColor" />
          <rect x="70" y="23" width="5" height="4" fill="currentColor" />
          {/* Flag pole */}
          <line x1="60" y1="15" x2="60" y2="35" strokeWidth="2" />
        </svg>
      );

    case 'no-series':
      return (
        <svg
          className="h-24 w-24 text-zinc-300 dark:text-zinc-600"
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          {/* Trophy */}
          <path d="M35 25 L35 45 Q35 60 50 65 Q65 60 65 45 L65 25 Z" />
          {/* Trophy handles */}
          <path d="M35 30 Q20 30 20 40 Q20 50 35 50" />
          <path d="M65 30 Q80 30 80 40 Q80 50 65 50" />
          {/* Trophy base */}
          <rect x="40" y="65" width="20" height="5" />
          <rect x="35" y="70" width="30" height="8" rx="2" />
          {/* Empty indicator */}
          <line x1="40" y1="40" x2="60" y2="55" strokeWidth="3" opacity="0.5" />
          <line x1="60" y1="40" x2="40" y2="55" strokeWidth="3" opacity="0.5" />
        </svg>
      );

    case 'error':
      return (
        <svg
          className="h-24 w-24 text-red-300 dark:text-red-800"
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          {/* Warning triangle */}
          <path d="M50 15 L85 80 L15 80 Z" />
          {/* Exclamation mark */}
          <line x1="50" y1="35" x2="50" y2="55" strokeWidth="4" strokeLinecap="round" />
          <circle cx="50" cy="67" r="3" fill="currentColor" />
        </svg>
      );

    case 'no-results':
      return (
        <svg
          className="h-24 w-24 text-zinc-300 dark:text-zinc-600"
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          {/* Magnifying glass */}
          <circle cx="42" cy="42" r="22" />
          <line x1="58" y1="58" x2="78" y2="78" strokeWidth="4" strokeLinecap="round" />
          {/* X inside */}
          <line x1="32" y1="32" x2="52" y2="52" strokeWidth="3" />
          <line x1="52" y1="32" x2="32" y2="52" strokeWidth="3" />
        </svg>
      );

    default:
      return null;
  }
}

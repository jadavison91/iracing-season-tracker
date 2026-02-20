'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { ReactNode, useState } from 'react';
import { DriverDataProvider } from '@/contexts/DriverDataContext';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache data for 5 minutes
            staleTime: 5 * 60 * 1000,
            // Keep unused data in cache for 10 minutes
            gcTime: 10 * 60 * 1000,
            // Retry failed requests 2 times
            retry: 2,
            // Don't refetch on window focus for this app
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <DriverDataProvider>{children}</DriverDataProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

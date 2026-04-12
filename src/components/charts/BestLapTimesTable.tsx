'use client';

import { useState } from 'react';
import { BestLapRow } from '@/lib/mock-data';
import { formatLapTime } from '@/lib/iracing/types';

interface BestLapTimesTableProps {
  data: BestLapRow[];
}

export function BestLapTimesTable({ data }: BestLapTimesTableProps) {
  const [filterCar, setFilterCar] = useState<string>('');

  const cars = [...new Set(data.map((r) => r.carName))].sort();

  const filtered = filterCar === '' ? data : data.filter((r) => r.carName === filterCar);

  if (data.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500">
        No lap time data available. Lap times are recorded once subsession data is fetched.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {cars.length > 1 && (
        <select
          value={filterCar}
          onChange={(e) => setFilterCar(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        >
          <option value="">All cars</option>
          {cars.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      )}

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Track
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Best Lap
              </th>
              <th className="hidden px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 sm:table-cell">
                Series
              </th>
              <th className="hidden px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 sm:table-cell">
                Date
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Visits
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filtered.map((row) => (
              <tr
                key={`${row.trackName}||${row.carName}`}
                className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
              >
                <td className="px-3 py-2">
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">
                    {row.trackName}
                  </div>
                  <span className="mt-0.5 inline-block text-[11px] text-zinc-500 dark:text-zinc-400">
                    {row.carName}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatLapTime(row.bestLapTime)}
                  </span>
                </td>
                <td className="hidden px-3 py-2 text-left text-zinc-500 dark:text-zinc-400 sm:table-cell">
                  {row.seriesName}
                </td>
                <td className="hidden px-3 py-2 text-right text-zinc-500 dark:text-zinc-400 sm:table-cell">
                  {new Date(row.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-500 dark:text-zinc-400">
                  {row.attempts}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

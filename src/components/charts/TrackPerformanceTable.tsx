'use client';

import { useState } from 'react';
import { TrackPerformanceRow } from '@/lib/mock-data';

type SortKey = 'races' | 'bestFinish' | 'avgFinish' | 'avgIncidents' | 'wins';

interface TrackPerformanceTableProps {
  data: TrackPerformanceRow[];
}

export function TrackPerformanceTable({ data }: TrackPerformanceTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('races');
  const [filterCar, setFilterCar] = useState<string>('');

  const cars = [...new Set(data.map((r) => r.carName))].sort();

  const sorted = [...data]
    .filter((r) => filterCar === '' || r.carName === filterCar)
    .sort((a, b) => {
      if (sortKey === 'bestFinish') return a.bestFinish - b.bestFinish;
      if (sortKey === 'avgFinish') return a.avgFinish - b.avgFinish;
      if (sortKey === 'avgIncidents') return a.avgIncidents - b.avgIncidents;
      if (sortKey === 'wins') return b.wins - a.wins;
      return b.races - a.races;
    });

  function ColHeader({
    label,
    col,
    className,
  }: {
    label: string;
    col: SortKey;
    className?: string;
  }) {
    return (
      <th
        className={`cursor-pointer select-none whitespace-nowrap px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 ${className ?? ''} ${sortKey === col ? 'text-blue-600 dark:text-blue-400' : ''}`}
        onClick={() => setSortKey(col)}
      >
        {label}
        {sortKey === col && <span className="ml-1">↓</span>}
      </th>
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
              <ColHeader label="Races" col="races" />
              <ColHeader label="Wins" col="wins" />
              <ColHeader label="Best" col="bestFinish" />
              <ColHeader label="Avg Finish" col="avgFinish" />
              <ColHeader label="Avg Inc" col="avgIncidents" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {sorted.map((row) => (
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
                <td className="px-3 py-2 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                  {row.races}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {row.wins > 0 ? (
                    <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                      {row.wins}
                    </span>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  <span
                    className={
                      row.bestFinish === 1
                        ? 'font-semibold text-yellow-600 dark:text-yellow-400'
                        : row.bestFinish <= 3
                          ? 'font-medium text-amber-600 dark:text-amber-400'
                          : 'text-zinc-600 dark:text-zinc-400'
                    }
                  >
                    P{row.bestFinish}
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                  P{row.avgFinish}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  <span
                    className={
                      row.avgIncidents === 0
                        ? 'text-green-600 dark:text-green-400'
                        : row.avgIncidents >= 4
                          ? 'text-red-500 dark:text-red-400'
                          : 'text-zinc-600 dark:text-zinc-400'
                    }
                  >
                    {row.avgIncidents}x
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

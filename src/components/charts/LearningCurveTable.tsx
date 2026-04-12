'use client';

import React, { useState } from 'react';
import { LearningCurveRow } from '@/lib/mock-data';
import { formatLapTime } from '@/lib/iracing/types';

// Compact inline sparkline showing lap time delta per visit relative to first visit
function VisitSparkline({ row }: { row: LearningCurveRow }) {
  const maxDelta = Math.max(...row.visits.map((v) => Math.abs(v.delta)));

  return (
    <div className="flex items-end gap-0.5" title="Lap time vs first visit (down = faster)">
      {row.visits.map((v) => {
        const heightPct = maxDelta > 0 ? Math.abs(v.delta) / maxDelta : 0;
        const height = Math.max(4, Math.round(heightPct * 20));
        const isFaster = v.delta < 0;
        const isFirst = v.visitNum === 1;

        return (
          <div
            key={v.visitNum}
            className="group relative"
            title={`Visit ${v.visitNum}: ${formatLapTime(v.bestLapTime)} (${v.delta < 0 ? '' : '+'}${(v.delta / 100).toFixed(2)}s)`}
          >
            <div
              style={{ height: `${height}px`, width: '6px' }}
              className={`rounded-sm ${
                isFirst
                  ? 'bg-zinc-400 dark:bg-zinc-500'
                  : isFaster
                    ? 'bg-green-500 dark:bg-green-400'
                    : 'bg-red-400 dark:bg-red-500'
              }`}
            />
          </div>
        );
      })}
    </div>
  );
}

interface LearningCurveTableProps {
  data: LearningCurveRow[];
}

export function LearningCurveTable({ data }: LearningCurveTableProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterCar, setFilterCar] = useState<string>('');

  const cars = [...new Set(data.map((r) => r.carName))].sort();

  const filtered = filterCar === '' ? data : data.filter((r) => r.carName === filterCar);

  if (data.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500">
        No multi-visit track data available. Lap times require subsession data to be fetched.
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
                First
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Best
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Improvement
              </th>
              <th className="hidden px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 sm:table-cell">
                Trend
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filtered.map((row) => {
              const rowKey = `${row.trackName}__${row.carClassName}`;
              return (
                <React.Fragment key={rowKey}>
                  <tr
                    onClick={() => setExpanded(expanded === rowKey ? null : rowKey)}
                    className="cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                  >
                    <td className="px-3 py-2">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {row.trackName}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {row.carName}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          · {row.visits.length} visits
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-zinc-500 dark:text-zinc-400">
                      {formatLapTime(row.firstLap)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatLapTime(row.bestLap)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {row.improvement > 0 ? (
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          -{(row.improvement / 100).toFixed(2)}s
                          <span className="ml-1 text-xs font-normal opacity-70">
                            ({row.improvementPct}%)
                          </span>
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="hidden px-3 py-2 sm:table-cell">
                      <VisitSparkline row={row} />
                    </td>
                  </tr>
                  {expanded === rowKey && (
                    <tr key={`${rowKey}-detail`}>
                      <td colSpan={5} className="bg-zinc-50 px-3 py-3 dark:bg-zinc-800/40">
                        <div className="space-y-1">
                          {row.visits.map((v) => (
                            <div
                              key={v.visitNum}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="text-zinc-500 dark:text-zinc-400">
                                Visit {v.visitNum} —{' '}
                                {new Date(v.date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                                <span className="ml-2 text-zinc-400">
                                  ({v.lapsComplete} lap{v.lapsComplete !== 1 ? 's' : ''})
                                </span>
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-zinc-700 dark:text-zinc-300">
                                  {formatLapTime(v.bestLapTime)}
                                </span>
                                {v.visitNum > 1 && (
                                  <span
                                    className={`w-16 text-right font-mono font-medium ${
                                      v.delta < 0
                                        ? 'text-green-600 dark:text-green-400'
                                        : v.delta > 0
                                          ? 'text-red-500 dark:text-red-400'
                                          : 'text-zinc-400'
                                    }`}
                                  >
                                    {v.delta < 0 ? '' : '+'}
                                    {(v.delta / 100).toFixed(2)}s
                                  </span>
                                )}
                                {v.visitNum === 1 && (
                                  <span className="w-16 text-right text-zinc-400">baseline</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { RecentRace } from '@/lib/iracing/types';

interface SeasonStats {
  seasonId: number;
  label: string;
  races: number;
  wins: number;
  podiums: number;
  avgFinish: number;
  avgIncidents: number;
  irChange: number;
  srChange: number; // in thousandths (3580 = 3.58)
  poles: number;
  lapsLed: number;
}

interface SeasonComparisonTableProps {
  races: RecentRace[];
}

function fmt(n: number, decimals = 1): string {
  return n.toFixed(decimals);
}

function srLabel(sr: number): string {
  return (sr / 100).toFixed(2);
}

export function SeasonComparisonTable({ races }: SeasonComparisonTableProps) {
  const [sortBy, setSortBy] = useState<keyof SeasonStats>('seasonId');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const seasons = useMemo((): SeasonStats[] => {
    if (races.length === 0) return [];

    // Group by calendar season (S1/S2/S3/S4 + year) derived from race date,
    // not by seasonId — each series has its own seasonId for the same quarter.
    function calendarSeasonKey(r: RecentRace): string {
      const d = new Date(r.sessionStartTime);
      const month = d.getMonth();
      const year = d.getFullYear();
      const q = month < 3 ? 1 : month < 6 ? 2 : month < 9 ? 3 : 4;
      // Zero-pad for reliable sort order: "2025-4", "2026-1"
      return `${year}-${q}`;
    }

    const byCalendarSeason = new Map<string, RecentRace[]>();
    races.forEach((r) => {
      const key = calendarSeasonKey(r);
      const existing = byCalendarSeason.get(key) ?? [];
      existing.push(r);
      byCalendarSeason.set(key, existing);
    });

    return [...byCalendarSeason.entries()].map(([key, seasonRaces]) => {
      const [year, q] = key.split('-');
      const label = `S${q} ${year}`;
      // Use a numeric key for sorting (year * 10 + quarter)
      const seasonId = Number(year) * 10 + Number(q);

      const wins = seasonRaces.filter((r) => r.finishPositionInClass === 1).length;
      const podiums = seasonRaces.filter((r) => r.finishPositionInClass <= 3).length;
      const poles = seasonRaces.filter((r) => r.startPositionInClass === 1).length;
      const lapsLed = seasonRaces.reduce((s, r) => s + r.lapsLed, 0);
      const avgFinish =
        seasonRaces.reduce((s, r) => s + r.finishPositionInClass, 0) / seasonRaces.length;
      const avgIncidents = seasonRaces.reduce((s, r) => s + r.incidents, 0) / seasonRaces.length;

      // iR change: sum of (newIR - oldIR) for races that have valid iRating data
      const withIR = seasonRaces.filter((r) => r.newIRating > 0 && r.oldIRating > 0);
      const irChange = withIR.reduce((s, r) => s + (r.newIRating - r.oldIRating), 0);

      // SR change: earliest oldSR to latest newSR (in raw units, divide by 100 to display)
      const withSR = seasonRaces
        .filter((r) => r.newSafetyRating > 0 && r.oldSafetyRating > 0)
        .sort(
          (a, b) => new Date(a.sessionStartTime).getTime() - new Date(b.sessionStartTime).getTime()
        );
      const srChange =
        withSR.length > 0
          ? withSR[withSR.length - 1].newSafetyRating - withSR[0].oldSafetyRating
          : 0;

      return {
        seasonId,
        label,
        races: seasonRaces.length,
        wins,
        podiums,
        poles,
        lapsLed,
        avgFinish,
        avgIncidents,
        irChange,
        srChange,
      };
    });
  }, [races]);

  const sorted = useMemo(() => {
    return [...seasons].sort((a, b) => {
      const val = (a[sortBy] as number) - (b[sortBy] as number);
      return sortDir === 'asc' ? val : -val;
    });
  }, [seasons, sortBy, sortDir]);

  function handleSort(key: keyof SeasonStats) {
    if (key === sortBy) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('desc');
    }
  }

  if (sorted.length === 0) {
    return <p className="text-sm text-zinc-400 dark:text-zinc-500">No season data available.</p>;
  }

  if (sorted.length < 2) {
    return (
      <p className="text-sm text-zinc-400 dark:text-zinc-500">
        Only one season in the cache — comparison requires at least two seasons.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-700">
            <Th
              label="Season"
              col="seasonId"
              sort={sortBy}
              dir={sortDir}
              onSort={handleSort}
              className="pl-1"
            />
            <Th label="Races" col="races" sort={sortBy} dir={sortDir} onSort={handleSort} />
            <Th label="Wins" col="wins" sort={sortBy} dir={sortDir} onSort={handleSort} />
            <Th label="Podiums" col="podiums" sort={sortBy} dir={sortDir} onSort={handleSort} />
            <Th label="Poles" col="poles" sort={sortBy} dir={sortDir} onSort={handleSort} />
            <Th label="Laps Led" col="lapsLed" sort={sortBy} dir={sortDir} onSort={handleSort} />
            <Th label="Avg Fin" col="avgFinish" sort={sortBy} dir={sortDir} onSort={handleSort} />
            <Th
              label="Avg Inc"
              col="avgIncidents"
              sort={sortBy}
              dir={sortDir}
              onSort={handleSort}
            />
            <Th label="iR Δ" col="irChange" sort={sortBy} dir={sortDir} onSort={handleSort} />
            <Th label="SR Δ" col="srChange" sort={sortBy} dir={sortDir} onSort={handleSort} />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {sorted.map((s) => (
            <tr
              key={s.seasonId}
              className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
            >
              <td className="py-2.5 pl-1 pr-3 font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                {s.label}
              </td>
              <td className="px-3 py-2.5 font-mono text-zinc-700 dark:text-zinc-300">{s.races}</td>
              <td className="px-3 py-2.5 font-mono">
                <span
                  className={
                    s.wins > 0 ? 'font-bold text-yellow-500' : 'text-zinc-500 dark:text-zinc-400'
                  }
                >
                  {s.wins}
                </span>
              </td>
              <td className="px-3 py-2.5 font-mono">
                <span
                  className={
                    s.podiums > 0
                      ? 'text-amber-500 dark:text-amber-400'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }
                >
                  {s.podiums}
                </span>
              </td>
              <td className="px-3 py-2.5 font-mono text-zinc-500 dark:text-zinc-400">{s.poles}</td>
              <td className="px-3 py-2.5 font-mono text-zinc-500 dark:text-zinc-400">
                {s.lapsLed}
              </td>
              <td className="px-3 py-2.5 font-mono text-zinc-700 dark:text-zinc-300">
                {fmt(s.avgFinish)}
              </td>
              <td className="px-3 py-2.5 font-mono">
                <span
                  className={
                    s.avgIncidents === 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : s.avgIncidents >= 4
                        ? 'text-red-500 dark:text-red-400'
                        : 'text-amber-500 dark:text-amber-400'
                  }
                >
                  {fmt(s.avgIncidents)}x
                </span>
              </td>
              <td className="px-3 py-2.5 font-mono font-semibold">
                <span
                  className={
                    s.irChange > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : s.irChange < 0
                        ? 'text-red-500 dark:text-red-400'
                        : 'text-zinc-400'
                  }
                >
                  {s.irChange > 0 ? '+' : ''}
                  {s.irChange}
                </span>
              </td>
              <td className="px-3 py-2.5 font-mono font-semibold">
                <span
                  className={
                    s.srChange > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : s.srChange < 0
                        ? 'text-red-500 dark:text-red-400'
                        : 'text-zinc-400'
                  }
                >
                  {s.srChange > 0 ? '+' : ''}
                  {srLabel(s.srChange)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  label,
  col,
  sort,
  dir,
  onSort,
  className = '',
}: {
  label: string;
  col: keyof SeasonStats;
  sort: keyof SeasonStats;
  dir: 'asc' | 'desc';
  onSort: (k: keyof SeasonStats) => void;
  className?: string;
}) {
  const active = sort === col;
  return (
    <th
      onClick={() => onSort(col)}
      className={`cursor-pointer select-none whitespace-nowrap px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 ${className}`}
    >
      {label}
      {active && <span className="ml-1">{dir === 'asc' ? '↑' : '↓'}</span>}
    </th>
  );
}

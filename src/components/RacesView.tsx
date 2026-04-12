'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { useDriverData, getDiscipline } from '@/contexts/DriverDataContext';
import { RecentRace, formatLapTime } from '@/lib/iracing/types';
import { deriveSeasonLabel } from '@/lib/season-utils';

interface RacesViewProps {
  customerId: number | null;
}

type SortKey = 'date' | 'track' | 'finish' | 'ir' | 'incidents' | 'sof';
type SortDir = 'asc' | 'desc';

type Discipline = 'all' | 'formula' | 'road' | 'oval' | 'dirt_oval' | 'dirt_road';

interface SeasonOption {
  label: string; // e.g. "S1 2026" or "All Seasons"
}

const DISCIPLINE_LABELS: Record<Discipline, string> = {
  all: 'All',
  formula: 'Formula',
  road: 'Sports Car',
  oval: 'Oval',
  dirt_oval: 'Dirt Oval',
  dirt_road: 'Dirt Road',
};

const DISCIPLINE_COLORS: Record<string, string> = {
  formula: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  road: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  oval: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  dirt_oval: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  dirt_road: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};

const PAGE_SIZE = 25;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function SortHeader({
  label,
  sortKey,
  current,
  dir,
  onSort,
  className = '',
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = current === sortKey;
  return (
    <th
      className={`cursor-pointer select-none whitespace-nowrap px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 ${className}`}
      onClick={() => onSort(sortKey)}
    >
      {label}
      {active && <span className="ml-1">{dir === 'asc' ? '↑' : '↓'}</span>}
    </th>
  );
}

export function RacesView({ customerId }: RacesViewProps) {
  const { data: driverData, setCustomerId } = useDriverData();
  const [discipline, setDiscipline] = useState<Discipline>('all');
  // 'latest' = auto-select most recent season; 'all' = show all seasons; number = specific season
  // 'latest' = auto-select most recent label; 'all' = all seasons; otherwise season label string
  const [selectedSeason, setSelectedSeason] = useState<string>('latest');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);

  useEffect(() => {
    setCustomerId(customerId);
  }, [customerId, setCustomerId]);

  // Reset to page 0 when filters change
  useEffect(() => {
    setPage(0); // eslint-disable-line react-hooks/set-state-in-effect
  }, [discipline, search, selectedSeason]);

  const races = driverData.races;
  const isLoading = driverData.isLoading;

  // Each race gets a label like "S1 2026". Group by label since different series
  // have different seasonId values for the same calendar season period.
  const raceLabels = useMemo(() => races.map((r) => deriveSeasonLabel(r.seasonId, [r])), [races]);

  // Unique season labels sorted newest-first (S4 2025, S1 2026, …)
  const seasonOptions = useMemo((): SeasonOption[] => {
    const labels = [...new Set(raceLabels)].sort((a, b) => {
      // Parse "S2 2025" into comparable value: year*10 + season
      const parse = (l: string) => {
        const m = l.match(/S(\d) (\d{4})/);
        return m ? Number(m[2]) * 10 + Number(m[1]) : 0;
      };
      return parse(b) - parse(a);
    });
    return [{ label: 'All Seasons' }, ...labels.map((l) => ({ label: l }))];
  }, [raceLabels]);

  // Resolve the effective label: 'latest' picks the most recent one
  const effectiveLabel = useMemo((): string => {
    if (selectedSeason === 'all') return 'all';
    if (selectedSeason === 'latest') return seasonOptions[1]?.label ?? 'all';
    return selectedSeason;
  }, [selectedSeason, seasonOptions]);

  const seasonRaces = useMemo(
    () =>
      effectiveLabel === 'all' ? races : races.filter((_, i) => raceLabels[i] === effectiveLabel),
    [races, raceLabels, effectiveLabel]
  );

  const summary = useMemo(() => {
    if (seasonRaces.length === 0)
      return { total: 0, wins: 0, podiums: 0, avgInc: '0.0', irGained: 0 };
    const wins = seasonRaces.filter((r) => r.finishPositionInClass === 1).length;
    const podiums = seasonRaces.filter((r) => r.finishPositionInClass <= 3).length;
    const totalInc = seasonRaces.reduce((s, r) => s + r.incidents, 0);
    const avgInc = (totalInc / seasonRaces.length).toFixed(1);
    const withIR = seasonRaces.filter((r) => r.newIRating > 0 && r.oldIRating > 0);
    const irGained = withIR.reduce((s, r) => s + (r.newIRating - r.oldIRating), 0);
    return { total: seasonRaces.length, wins, podiums, avgInc, irGained };
  }, [seasonRaces]);

  const filtered = useMemo(() => {
    let out = seasonRaces.slice();
    if (discipline !== 'all') {
      out = out.filter((r) => getDiscipline(r) === discipline);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(
        (r) => r.trackName.toLowerCase().includes(q) || r.seriesName.toLowerCase().includes(q)
      );
    }
    out.sort((a, b) => {
      let val = 0;
      if (sortKey === 'date')
        val = new Date(a.sessionStartTime).getTime() - new Date(b.sessionStartTime).getTime();
      else if (sortKey === 'track') val = a.trackName.localeCompare(b.trackName);
      else if (sortKey === 'finish') val = a.finishPositionInClass - b.finishPositionInClass;
      else if (sortKey === 'ir') val = a.newIRating - a.oldIRating - (b.newIRating - b.oldIRating);
      else if (sortKey === 'incidents') val = a.incidents - b.incidents;
      else if (sortKey === 'sof') val = a.strengthOfField - b.strengthOfField;
      return sortDir === 'asc' ? val : -val;
    });
    return out;
  }, [seasonRaces, discipline, search, sortKey, sortDir]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  if (!customerId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <EmptyState
            variant="no-driver"
            description="Enter a Customer ID to view your race history."
          />
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (races.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <EmptyState
            variant="no-races"
            title="No Races Found"
            description="No races found for this season."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Summary bar */}
      <div className="rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-50 p-5 dark:from-zinc-900 dark:to-zinc-800 sm:p-6">
        <div className="mb-3">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Race History</h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            {summary.total} races
            {effectiveLabel !== 'all' && ` · ${effectiveLabel}`}
          </p>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <StatBox
            label="Wins"
            value={summary.wins}
            highlight={summary.wins > 0 ? 'gold' : undefined}
          />
          <StatBox
            label="Podiums"
            value={summary.podiums}
            highlight={summary.podiums > 0 ? 'bronze' : undefined}
          />
          <StatBox label="Avg Inc" value={`${summary.avgInc}x`} />
          <StatBox
            label="iR Gained"
            value={`${summary.irGained >= 0 ? '+' : ''}${summary.irGained}`}
            highlight={summary.irGained > 0 ? 'green' : summary.irGained < 0 ? 'red' : undefined}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Season selector */}
        {seasonOptions.length > 2 && (
          <select
            value={effectiveLabel}
            onChange={(e) => setSelectedSeason(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 outline-none focus:border-blue-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          >
            {seasonOptions.map((opt) => (
              <option key={opt.label} value={opt.label === 'All Seasons' ? 'all' : opt.label}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
        {/* Discipline tabs */}
        <div className="flex gap-1 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800/50">
          {(Object.keys(DISCIPLINE_LABELS) as Discipline[]).map((d) => (
            <button
              key={d}
              onClick={() => setDiscipline(d)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                discipline === d
                  ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              {DISCIPLINE_LABELS[d]}
            </button>
          ))}
        </div>
        {/* Search */}
        <input
          type="search"
          placeholder="Search track or series…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-blue-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
        {filtered.length !== seasonRaces.length && (
          <span className="whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">
            {filtered.length} of {seasonRaces.length}
          </span>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 dark:border-zinc-700">
                <tr>
                  <SortHeader
                    label="Date"
                    sortKey="date"
                    current={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                    className="pl-4"
                  />
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Cat
                  </th>
                  <SortHeader
                    label="Track"
                    sortKey="track"
                    current={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Series
                  </th>
                  <SortHeader
                    label="Finish"
                    sortKey="finish"
                    current={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Start
                  </th>
                  <SortHeader
                    label="iR Δ"
                    sortKey="ir"
                    current={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <SortHeader
                    label="Inc"
                    sortKey="incidents"
                    current={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <SortHeader
                    label="SoF"
                    sortKey="sof"
                    current={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Best Lap
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {paged.map((race) => (
                  <RaceRow key={race.subsessionId} race={race} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 dark:border-zinc-700">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Page {page + 1} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-md border border-zinc-200 px-3 py-1 text-xs disabled:opacity-40 dark:border-zinc-700"
                >
                  Prev
                </button>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-md border border-zinc-200 px-3 py-1 text-xs disabled:opacity-40 dark:border-zinc-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RaceRow({ race }: { race: RecentRace }) {
  const disc = getDiscipline(race);
  const iRDelta =
    race.newIRating > 0 && race.oldIRating > 0 ? race.newIRating - race.oldIRating : null;
  const incColor =
    race.incidents === 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : race.incidents >= 8
        ? 'text-red-500 dark:text-red-400'
        : 'text-amber-500 dark:text-amber-400';

  return (
    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
      <td className="whitespace-nowrap pl-4 pr-3 py-2.5 text-xs text-zinc-500 dark:text-zinc-400">
        {formatDate(race.sessionStartTime)}
      </td>
      <td className="px-3 py-2.5">
        <span
          className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${DISCIPLINE_COLORS[disc]}`}
        >
          {DISCIPLINE_LABELS[disc as Discipline] ?? disc.replace('_', ' ')}
        </span>
      </td>
      <td className="px-3 py-2.5 font-medium text-zinc-900 dark:text-zinc-100 max-w-[160px] truncate">
        {race.trackName}
      </td>
      <td className="px-3 py-2.5 text-zinc-500 dark:text-zinc-400 max-w-[180px] truncate text-xs">
        {race.seriesName}
      </td>
      <td className="px-3 py-2.5">
        <span
          className={`font-mono font-bold ${
            race.finishPositionInClass === 1
              ? 'text-yellow-500'
              : race.finishPositionInClass <= 3
                ? 'text-amber-500 dark:text-amber-400'
                : 'text-zinc-900 dark:text-zinc-100'
          }`}
        >
          P{race.finishPositionInClass}
        </span>
        <span className="ml-1 text-xs text-zinc-400">/{race.numDrivers}</span>
      </td>
      <td className="px-3 py-2.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">
        P{race.startPositionInClass}
      </td>
      <td className="px-3 py-2.5">
        {iRDelta !== null ? (
          <span
            className={`font-mono text-xs font-semibold ${
              iRDelta > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : iRDelta < 0
                  ? 'text-red-500 dark:text-red-400'
                  : 'text-zinc-400'
            }`}
          >
            {iRDelta > 0 ? '+' : ''}
            {iRDelta}
          </span>
        ) : (
          <span className="text-xs text-zinc-300 dark:text-zinc-600">—</span>
        )}
      </td>
      <td className={`px-3 py-2.5 font-mono text-xs font-semibold ${incColor}`}>
        {race.incidents}x
      </td>
      <td className="px-3 py-2.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">
        {race.strengthOfField > 0 ? race.strengthOfField.toLocaleString() : '—'}
      </td>
      <td className="px-3 py-2.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">
        {race.bestLapTime > 0 ? formatLapTime(race.bestLapTime) : '—'}
      </td>
    </tr>
  );
}

interface StatBoxProps {
  label: string;
  value: string | number;
  highlight?: 'green' | 'gold' | 'bronze' | 'red';
}

function StatBox({ label, value, highlight }: StatBoxProps) {
  const color =
    highlight === 'green'
      ? 'text-emerald-600 dark:text-emerald-400'
      : highlight === 'gold'
        ? 'text-yellow-500 dark:text-yellow-400'
        : highlight === 'bronze'
          ? 'text-amber-600 dark:text-amber-400'
          : highlight === 'red'
            ? 'text-red-500 dark:text-red-400'
            : 'text-zinc-900 dark:text-zinc-100';

  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-center dark:border-zinc-700 dark:bg-zinc-800">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-zinc-500 dark:text-zinc-400">{label}</div>
    </div>
  );
}

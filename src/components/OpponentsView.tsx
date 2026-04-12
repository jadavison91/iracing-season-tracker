'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { useDriverData } from '@/contexts/DriverDataContext';
import { useOpponents } from '@/hooks/useOpponents';
import { Opponent, OpponentTag, getOpponentTag, setOpponentTag } from '@/lib/opponents';

interface OpponentsViewProps {
  customerId: number | null;
}

type MainTab = 'rivals' | 'all';
type SortKey = 'encounters' | 'ir' | 'avgpos' | 'incidents' | 'lastSeen';
type CategoryFilter = 'all' | 'formula' | 'road' | 'oval' | 'cross';

const PAGE_SIZE = 20;
const RECENT_DAYS = 14;

// ── Derived stats ────────────────────────────────────────────────────────────

interface OpponentStats extends Opponent {
  totalEnc: number;
  recentEnc: number;
  avgPos: number;
  avgInc: number;
  maxIR: number;
  lastSeen: string;
  recentlyMet: boolean;
  isCrossRacer: boolean;
  myWinRate: number; // % of shared races I finished ahead
  tag: OpponentTag | null;
}

function computeStats(
  opponents: Opponent[],
  myRaces: { subsessionId: number; finishPositionInClass: number }[]
): OpponentStats[] {
  const cutoff = new Date(Date.now() - RECENT_DAYS * 86_400_000).toISOString().slice(0, 10);
  const cutoff3d = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);

  return opponents.map((d) => {
    const enc = d.encounters ?? [];
    const recent = enc.filter((e) => e.date >= cutoff);
    const allFormula = enc.filter((e) => e.category === 'formula');
    const allRoad = enc.filter((e) => e.category === 'road');
    const isCrossRacer = allFormula.length > 0 && allRoad.length > 0;

    const avgPos = recent.length ? recent.reduce((s, e) => s + e.pos, 0) / recent.length : 0;
    const avgInc = recent.length ? recent.reduce((s, e) => s + e.inc, 0) / recent.length : 0;
    const maxIR = Math.max(
      ...enc.map((e) => Math.max(e.iRBefore ?? 0, e.iRAfter ?? 0)),
      d.peakIR ?? 0
    );
    const sorted = enc.slice().sort((a, b) => b.date.localeCompare(a.date));
    const lastSeen = sorted[0]?.date ?? '';
    const recentlyMet = enc.some((e) => e.date >= cutoff3d);

    // Win rate: fraction of shared races where I finished ahead of them
    let iAhead = 0;
    let shared = 0;
    enc.forEach((e) => {
      const myRace = myRaces.find((r) => String(r.subsessionId) === e.raceId);
      if (!myRace) return;
      shared++;
      if (myRace.finishPositionInClass < e.pos) iAhead++;
    });
    const myWinRate = shared > 0 ? iAhead / shared : 0;

    return {
      ...d,
      totalEnc: enc.length,
      recentEnc: recent.length,
      avgPos,
      avgInc,
      maxIR,
      lastSeen,
      recentlyMet,
      isCrossRacer,
      myWinRate,
      tag: getOpponentTag(d),
    };
  });
}

// ── Tag UI ───────────────────────────────────────────────────────────────────

const TAG_CONFIG: Record<OpponentTag, { label: string; color: string; bg: string }> = {
  rival: {
    label: 'Rival',
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-100 dark:bg-blue-900/40',
  },
  friendly: {
    label: 'Friendly',
    color: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-100 dark:bg-emerald-900/40',
  },
  blocker: {
    label: 'Blocker',
    color: 'text-orange-700 dark:text-orange-300',
    bg: 'bg-orange-100 dark:bg-orange-900/40',
  },
};

function TagBadge({ tag }: { tag: OpponentTag | null }) {
  if (!tag) return null;
  const cfg = TAG_CONFIG[tag];
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function TagPicker({
  custId,
  iracingId,
  current,
  onChange,
}: {
  custId: number;
  iracingId: string;
  current: OpponentTag | null;
  onChange: () => void;
}) {
  const options: (OpponentTag | null)[] = ['rival', 'friendly', 'blocker', null];

  function handleSet(tag: OpponentTag | null) {
    setOpponentTag(custId, iracingId, tag);
    onChange();
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-xs text-zinc-400 mr-1">Tag:</span>
      {options.map((tag) => {
        const active = current === tag;
        const label = tag ? TAG_CONFIG[tag].label : 'None';
        const activeCls = tag
          ? `${TAG_CONFIG[tag].bg} ${TAG_CONFIG[tag].color} font-semibold`
          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 font-semibold';
        const inactiveCls =
          'border border-zinc-200 text-zinc-400 dark:border-zinc-700 dark:text-zinc-500';
        return (
          <button
            key={tag ?? 'none'}
            onClick={() => handleSet(tag)}
            className={`rounded px-2 py-0.5 text-xs transition-colors ${active ? activeCls : inactiveCls}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Rivals tab ───────────────────────────────────────────────────────────────

function RivalsTab({
  custId,
  stats,
  myCurrentIR,
  onTagChange,
}: {
  custId: number;
  stats: OpponentStats[];
  myCurrentIR: number;
  onTagChange: () => void;
}) {
  const rivals = useMemo(() => stats.filter((d) => d.tag === 'rival'), [stats]);

  if (rivals.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 px-8 py-16 text-center">
        <div className="text-4xl mb-3">🏁</div>
        <h3 className="text-base font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
          No rivals tagged yet
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
          Switch to the <strong>All Opponents</strong> tab, find drivers you race regularly, and tag
          them as <strong>Rival</strong> to track them here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rivals.map((r) => (
        <RivalCard
          key={r.iracingId}
          custId={custId}
          opp={r}
          myCurrentIR={myCurrentIR}
          onTagChange={onTagChange}
        />
      ))}
    </div>
  );
}

function RivalCard({
  custId,
  opp,
  myCurrentIR,
  onTagChange,
}: {
  custId: number;
  opp: OpponentStats;
  myCurrentIR: number;
  onTagChange: () => void;
}) {
  const categories = [...new Set(opp.encounters.map((e) => e.category))];
  const iRDiff = myCurrentIR > 0 && opp.currentIR > 0 ? opp.currentIR - myCurrentIR : null;
  const winPct = Math.round(opp.myWinRate * 100);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/60">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-semibold text-zinc-900 dark:text-zinc-100">{opp.name}</div>
          <div className="text-xs text-zinc-400 mt-0.5">#{opp.iracingId}</div>
        </div>
        {opp.currentIR > 0 && (
          <div className="text-right">
            <div className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {opp.currentIR.toLocaleString()}
            </div>
            {iRDiff !== null && (
              <div
                className={`text-[10px] font-mono ${iRDiff > 0 ? 'text-red-500' : 'text-emerald-500'}`}
              >
                {iRDiff > 0 ? '+' : ''}
                {iRDiff} vs you
              </div>
            )}
          </div>
        )}
      </div>

      {/* Win rate bar */}
      {opp.totalEnc > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
            <span>Your win rate</span>
            <span
              className={`font-semibold ${winPct >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}
            >
              {winPct}% ({opp.totalEnc} races)
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-700">
            <div
              className={`h-1.5 rounded-full ${winPct >= 50 ? 'bg-emerald-500' : 'bg-red-500'}`}
              style={{ width: `${winPct}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-1 flex-wrap">
          {categories.slice(0, 3).map((c) => (
            <span
              key={c}
              className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
            >
              {c.replace('_', ' ')}
            </span>
          ))}
        </div>
        <span className="text-[10px] text-zinc-400">{opp.lastSeen || '—'}</span>
      </div>

      <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-700">
        <TagPicker
          custId={custId}
          iracingId={opp.iracingId}
          current={opp.tag}
          onChange={onTagChange}
        />
      </div>
    </div>
  );
}

// ── All Opponents tab ────────────────────────────────────────────────────────

const DISC_COLORS: Record<string, string> = {
  formula: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  road: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  oval: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  dirt_oval: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  dirt_road: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};

function AllOpponentsTab({
  custId,
  stats,
  onTagChange,
}: {
  custId: number;
  stats: OpponentStats[];
  onTagChange: () => void;
}) {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<CategoryFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('encounters');
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setPage(0);
  }, [search, catFilter]);

  const highestIR = useMemo(
    () =>
      stats
        .filter((d) => d.maxIR > 0)
        .sort((a, b) => b.maxIR - a.maxIR)
        .slice(0, 5),
    [stats]
  );
  const mostFrequent = useMemo(
    () =>
      stats
        .slice()
        .sort((a, b) => b.totalEnc - a.totalEnc)
        .slice(0, 5),
    [stats]
  );
  const crossRacers = useMemo(() => stats.filter((d) => d.isCrossRacer), [stats]);

  const filtered = useMemo(() => {
    let out = stats.filter((d) => d.totalEnc > 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter((d) => d.name.toLowerCase().includes(q) || d.iracingId.includes(q));
    }
    if (catFilter === 'formula')
      out = out.filter((d) => d.encounters.some((e) => e.category === 'formula'));
    else if (catFilter === 'road')
      out = out.filter((d) => d.encounters.some((e) => e.category === 'road'));
    else if (catFilter === 'oval')
      out = out.filter((d) => d.encounters.some((e) => e.category === 'oval'));
    else if (catFilter === 'cross') out = out.filter((d) => d.isCrossRacer);

    if (sortKey === 'encounters') out.sort((a, b) => b.totalEnc - a.totalEnc);
    else if (sortKey === 'ir') out.sort((a, b) => b.maxIR - a.maxIR);
    else if (sortKey === 'avgpos') out.sort((a, b) => a.avgPos - b.avgPos);
    else if (sortKey === 'incidents') out.sort((a, b) => b.avgInc - a.avgInc);
    else if (sortKey === 'lastSeen') out.sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
    return out;
  }, [stats, search, catFilter, sortKey]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Top panels */}
      <div className="grid gap-4 md:grid-cols-2">
        <TopList
          title="Highest iRating"
          color="text-yellow-500 dark:text-yellow-400"
          items={highestIR.map((d) => ({
            name: d.name,
            sub: `${d.totalEnc}× encountered`,
            value: d.maxIR.toLocaleString(),
          }))}
        />
        <TopList
          title="Most Frequent"
          color="text-blue-500 dark:text-blue-400"
          items={mostFrequent.map((d) => ({
            name: d.name,
            sub: d.lastSeen ? `Last: ${d.lastSeen}` : '',
            value: `${d.totalEnc}×`,
          }))}
        />
      </div>

      {/* Cross-racers callout */}
      {crossRacers.length > 0 && (
        <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 dark:border-violet-900/50 dark:bg-violet-900/10">
          <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
            Cross-Racers ({crossRacers.length})
          </p>
          <p className="mt-0.5 text-xs text-violet-600 dark:text-violet-400">
            Drivers you&apos;ve faced in both Formula and Road —{' '}
            {crossRacers
              .slice(0, 3)
              .map((d) => d.name.split(' ')[0])
              .join(', ')}
            {crossRacers.length > 3 ? ` +${crossRacers.length - 3} more` : ''}
          </p>
        </div>
      )}

      {/* Searchable table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">All Opponents</CardTitle>
            <div className="flex gap-2 flex-wrap">
              {(['all', 'formula', 'road', 'oval', 'cross'] as CategoryFilter[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCatFilter(c)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                    catFilter === c
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'border border-zinc-200 text-zinc-500 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400'
                  }`}
                >
                  {c}
                </button>
              ))}
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="encounters">Most met</option>
                <option value="ir">Highest iR</option>
                <option value="avgpos">Best avg pos</option>
                <option value="incidents">Most incidents</option>
                <option value="lastSeen">Recently seen</option>
              </select>
            </div>
          </div>
          <input
            type="search"
            placeholder="Search by name or iRacing ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-blue-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 dark:border-zinc-700">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Driver
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Met
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Peak iR
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Avg Pos
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Last Seen
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Disciplines
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Tag
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {paged.map((opp) => (
                  <>
                    <OpponentRow
                      key={opp.iracingId}
                      custId={custId}
                      opp={opp}
                      expanded={expandedId === opp.iracingId}
                      onToggle={() =>
                        setExpandedId(expandedId === opp.iracingId ? null : opp.iracingId)
                      }
                      onTagChange={onTagChange}
                    />
                    {expandedId === opp.iracingId && (
                      <tr
                        key={`${opp.iracingId}-detail`}
                        className="bg-zinc-50 dark:bg-zinc-900/50"
                      >
                        <td colSpan={7} className="px-6 py-3">
                          <TagPicker
                            custId={custId}
                            iracingId={opp.iracingId}
                            current={opp.tag}
                            onChange={onTagChange}
                          />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 dark:border-zinc-700">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {filtered.length} opponents · Page {page + 1} of {totalPages}
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

function OpponentRow({
  custId,
  opp,
  expanded,
  onToggle,
  onTagChange,
}: {
  custId: number;
  opp: OpponentStats;
  expanded: boolean;
  onToggle: () => void;
  onTagChange: () => void;
}) {
  const categories = [...new Set(opp.encounters.map((e) => e.category))];
  const threeDays = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);
  const fresh = opp.lastSeen >= threeDays;

  return (
    <tr
      className={`cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${expanded ? 'bg-zinc-50 dark:bg-zinc-900/50' : ''}`}
      onClick={onToggle}
    >
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div>
            <div className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              {opp.name}
              {opp.isCrossRacer && (
                <span className="text-[10px] rounded bg-violet-100 px-1 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300">
                  Cross
                </span>
              )}
              {fresh && (
                <span
                  className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block"
                  title="Met in the last 3 days"
                />
              )}
            </div>
            <div className="text-[10px] text-zinc-400">#{opp.iracingId}</div>
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5 text-right font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">
        {opp.totalEnc}×
      </td>
      <td className="px-3 py-2.5 text-right font-mono text-sm text-zinc-700 dark:text-zinc-300">
        {opp.maxIR > 0 ? opp.maxIR.toLocaleString() : '—'}
      </td>
      <td className="px-3 py-2.5 text-right font-mono text-xs text-zinc-500 dark:text-zinc-400">
        {opp.avgPos > 0 ? `P${opp.avgPos.toFixed(1)}` : '—'}
      </td>
      <td className="px-3 py-2.5 text-right text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
        {opp.lastSeen || '—'}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex gap-1 flex-wrap">
          {categories.map((c) => (
            <span
              key={c}
              className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${DISC_COLORS[c] ?? ''}`}
            >
              {c.replace('_', ' ')}
            </span>
          ))}
        </div>
      </td>
      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
        {opp.tag ? (
          <TagBadge tag={opp.tag} />
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 border border-dashed border-zinc-300 dark:border-zinc-600 rounded px-1.5 py-0.5"
          >
            + Tag
          </button>
        )}
      </td>
    </tr>
  );
}

function TopList({
  title,
  color,
  items,
}: {
  title: string;
  color: string;
  items: { name: string; sub: string; value: string }[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className={`text-sm font-bold uppercase tracking-wide ${color}`}>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {items.length === 0 ? (
          <p className="text-xs text-zinc-400">None yet</p>
        ) : (
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] text-zinc-400 w-4 shrink-0">{i + 1}.</span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {item.name.split(' ').slice(0, 2).join(' ')}
                    </div>
                    <div className="text-[10px] text-zinc-400">{item.sub}</div>
                  </div>
                </div>
                <span className={`font-mono text-sm font-bold shrink-0 ml-2 ${color}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main view ────────────────────────────────────────────────────────────────

export function OpponentsView({ customerId }: OpponentsViewProps) {
  const { data: driverData, setCustomerId } = useDriverData();
  const { opponents: rawOpponents, refresh } = useOpponents();
  const [activeTab, setActiveTab] = useState<MainTab>('rivals');

  useEffect(() => {
    setCustomerId(customerId);
  }, [customerId, setCustomerId]);

  const isLoading = driverData.isLoading;

  const myCurrentIR = useMemo(() => {
    const withIR = driverData.races.filter((r) => r.newIRating > 0);
    if (withIR.length === 0) return 0;
    return [...withIR].sort((a, b) => b.sessionStartTime.localeCompare(a.sessionStartTime))[0]
      .newIRating;
  }, [driverData.races]);

  const myRaceIndex = useMemo(
    () =>
      driverData.races.map((r) => ({
        subsessionId: r.subsessionId,
        finishPositionInClass: r.finishPositionInClass,
      })),
    [driverData.races]
  );

  const stats = useMemo(() => computeStats(rawOpponents, myRaceIndex), [rawOpponents, myRaceIndex]);

  // Re-read opponents from localStorage after a tag change
  const handleTagChange = useCallback(() => {
    refresh();
  }, [refresh]);

  const rivalCount = stats.filter((d) => d.tag === 'rival').length;

  if (!customerId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <EmptyState
            variant="no-driver"
            description="Enter a Customer ID to view opponent data."
          />
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (rawOpponents.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <EmptyState
            variant="no-races"
            title="No Opponent Data"
            description="Fetch your races to automatically build your opponent history. Opponents are tracked from full race grids."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-50 p-5 dark:from-zinc-900 dark:to-zinc-800 sm:p-6">
        <div className="mb-3">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Opponents</h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            {stats.length} drivers encountered · {rivalCount} tagged as rival
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label="Total" value={stats.length} />
          <SummaryCard label="Rivals" value={rivalCount} color="text-blue-600 dark:text-blue-400" />
          <SummaryCard
            label="Cross-Racers"
            value={stats.filter((d) => d.isCrossRacer).length}
            color="text-violet-600 dark:text-violet-400"
          />
          <SummaryCard
            label="Highest iR"
            value={
              stats
                .filter((d) => d.maxIR > 0)
                .sort((a, b) => b.maxIR - a.maxIR)[0]
                ?.maxIR.toLocaleString() ?? '—'
            }
            color="text-yellow-500 dark:text-yellow-400"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 w-fit dark:border-zinc-700 dark:bg-zinc-800/50">
        {(
          [
            ['rivals', `Rivals${rivalCount > 0 ? ` (${rivalCount})` : ''}`],
            ['all', 'All Opponents'],
          ] as [MainTab, string][]
        ).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'rivals' ? (
        <RivalsTab
          custId={customerId}
          stats={stats}
          myCurrentIR={myCurrentIR}
          onTagChange={handleTagChange}
        />
      ) : (
        <AllOpponentsTab custId={customerId} stats={stats} onTagChange={handleTagChange} />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color = '',
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-1">
        {label}
      </div>
      <div className={`text-xl font-bold font-mono ${color || 'text-zinc-900 dark:text-zinc-100'}`}>
        {value}
      </div>
    </div>
  );
}

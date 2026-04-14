'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDriverData, getDiscipline } from '@/contexts/DriverDataContext';
import { RaceDetailModal } from '@/components/RaceDetailModal';
import { RecentRace } from '@/lib/iracing/types';
import { deriveSeasonLabel } from '@/lib/season-utils';

// ── Constants ─────────────────────────────────────────────

type Discipline = 'all' | 'formula' | 'road' | 'oval' | 'dirt_oval' | 'dirt_road';

const DISC_OPTIONS: { value: Discipline; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'road', label: 'Road' },
  { value: 'formula', label: 'Formula' },
  { value: 'oval', label: 'Oval' },
  { value: 'dirt_oval', label: 'Dirt Oval' },
  { value: 'dirt_road', label: 'Dirt Road' },
];

const DISC_COLORS: Record<string, string> = {
  road: '#C5F131',
  sports_car: '#C5F131',
  formula: '#60A5FA',
  oval: '#FBBF24',
  dirt_oval: '#A78BFA',
  dirt_road: '#34D399',
};

// ── Helpers ───────────────────────────────────────────────

function positionColor(pos: number): string {
  if (pos === 1) return 'var(--v2-accent)';
  if (pos <= 3) return '#FBBF24';
  if (pos <= 5) return 'var(--v2-text)';
  return 'var(--v2-text-muted)';
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function irDelta(race: RecentRace): number | null {
  return race.newIRating > 0 && race.oldIRating > 0 ? race.newIRating - race.oldIRating : null;
}

// ── Race card ─────────────────────────────────────────────

function RaceCard({ race, onClick }: { race: RecentRace; onClick: () => void }) {
  const disc = getDiscipline(race);
  const accentColor = DISC_COLORS[disc] ?? 'var(--v2-text-muted)';
  const pos = race.finishPositionInClass;
  const delta = irDelta(race);

  const incColor =
    race.incidents === 0
      ? 'var(--v2-text-dim)'
      : race.incidents >= 4
        ? 'var(--v2-negative)'
        : race.incidents >= 2
          ? 'var(--v2-warning)'
          : 'var(--v2-text-muted)';

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '13px 16px',
        borderRadius: 10,
        background: 'var(--v2-surface)',
        borderTop: '1px solid var(--v2-border)',
        borderRight: '1px solid var(--v2-border)',
        borderBottom: '1px solid var(--v2-border)',
        borderLeft: `3px solid ${accentColor}`,
        cursor: 'pointer',
        transition: 'background 0.12s, border-color 0.12s',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = 'var(--v2-surface-2)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = 'var(--v2-surface)';
      }}
    >
      {/* Position */}
      <div
        style={{
          fontFamily: 'var(--font-v2-mono, monospace)',
          fontWeight: 700,
          lineHeight: 1,
          color: positionColor(pos),
          flexShrink: 0,
          width: 46,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 28 }}>P{pos}</div>
        {race.numDrivers > 0 && (
          <div style={{ fontSize: 9, color: 'var(--v2-text-muted)', marginTop: 2 }}>
            /{race.numDrivers}
          </div>
        )}
      </div>

      {/* Main info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--v2-text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {race.trackName}
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--v2-text-muted)',
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {race.seriesName}
        </div>
      </div>

      {/* Right stats */}
      <div
        style={{
          flexShrink: 0,
          textAlign: 'right',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          alignItems: 'flex-end',
        }}
      >
        {/* iR delta */}
        <span
          style={{
            fontFamily: 'var(--font-v2-mono, monospace)',
            fontSize: 15,
            fontWeight: 700,
            color:
              delta === null
                ? 'var(--v2-text-dim)'
                : delta > 0
                  ? 'var(--v2-positive)'
                  : delta < 0
                    ? 'var(--v2-negative)'
                    : 'var(--v2-text-muted)',
          }}
        >
          {delta === null ? '—' : (delta > 0 ? '+' : '') + delta}
        </span>

        {/* Incidents + date */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: incColor }}>
            {race.incidents > 0 ? `${race.incidents}x` : '✓'}
          </span>
          <span style={{ fontSize: 10, color: 'var(--v2-text-dim)' }}>
            {formatShortDate(race.sessionStartTime)}
          </span>
        </div>
      </div>

      {/* Open detail arrow */}
      <svg
        width={14}
        height={14}
        viewBox="0 0 14 14"
        fill="none"
        stroke="var(--v2-text-dim)"
        style={{ flexShrink: 0 }}
      >
        <path
          d="M3 7h8M7 3l4 4-4 4"
          strokeWidth={1.3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// ── Month group header ────────────────────────────────────

function MonthDivider({ label, count }: { label: string; count: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 10,
        marginTop: 28,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.1em',
          color: 'var(--v2-text-muted)',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--v2-border)' }} />
      <span style={{ fontSize: 10, color: 'var(--v2-text-dim)', whiteSpace: 'nowrap' }}>
        {count}
      </span>
    </div>
  );
}

// ── Stat chip ─────────────────────────────────────────────

function SummaryChip({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="v2-stat-chip">
      <span className="chip-label">{label}</span>
      <span className="chip-value" style={{ color: color ?? 'var(--v2-text)' }}>
        {value}
      </span>
    </div>
  );
}

// ── Filter sidebar ────────────────────────────────────────

function FilterSidebar({
  discipline,
  setDiscipline,
  search,
  setSearch,
  selectedSeason,
  setSelectedSeason,
  seasonOptions,
  effectiveLabel,
  resultCount,
  totalCount,
}: {
  discipline: Discipline;
  setDiscipline: (d: Discipline) => void;
  search: string;
  setSearch: (s: string) => void;
  selectedSeason: string;
  setSelectedSeason: (s: string) => void;
  seasonOptions: { label: string; value: string }[];
  effectiveLabel: string;
  resultCount: number;
  totalCount: number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {/* Season */}
      {seasonOptions.length > 2 && (
        <div>
          <div className="v2-section-label" style={{ marginBottom: 8 }}>
            Season
          </div>
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--v2-surface-2)',
              border: '1px solid var(--v2-border-hi)',
              borderRadius: 8,
              padding: '8px 10px',
              color: 'var(--v2-text)',
              fontSize: 12,
              fontFamily: 'var(--font-v2-sans, inherit)',
              cursor: 'pointer',
              outline: 'none',
              appearance: 'none',
            }}
          >
            {seasonOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Discipline */}
      <div>
        <div className="v2-section-label" style={{ marginBottom: 8 }}>
          Discipline
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {DISC_OPTIONS.map((opt) => {
            const active = discipline === opt.value;
            const color =
              opt.value === 'all'
                ? 'var(--v2-accent)'
                : (DISC_COLORS[opt.value] ?? 'var(--v2-text-muted)');
            return (
              <button
                key={opt.value}
                onClick={() => setDiscipline(opt.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 10px',
                  borderRadius: 7,
                  background: active ? 'var(--v2-accent-glow)' : 'none',
                  border: 'none',
                  color: active ? 'var(--v2-accent)' : 'var(--v2-text-muted)',
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  width: '100%',
                  transition: 'background 0.1s, color 0.1s',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--v2-text)';
                    (e.currentTarget as HTMLButtonElement).style.background =
                      'rgba(255,255,255,0.04)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--v2-text-muted)';
                    (e.currentTarget as HTMLButtonElement).style.background = 'none';
                  }
                }}
              >
                {opt.value !== 'all' && (
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: color,
                      flexShrink: 0,
                      opacity: active ? 1 : 0.6,
                    }}
                  />
                )}
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <div>
        <div className="v2-section-label" style={{ marginBottom: 8 }}>
          Search
        </div>
        <div style={{ position: 'relative' }}>
          <svg
            width={13}
            height={13}
            viewBox="0 0 13 13"
            fill="none"
            stroke="var(--v2-text-dim)"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
          >
            <circle cx="5.5" cy="5.5" r="4" strokeWidth={1.3} />
            <path d="M9 9l2.5 2.5" strokeWidth={1.3} strokeLinecap="round" />
          </svg>
          <input
            type="search"
            placeholder="Track or series…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--v2-surface-2)',
              border: '1px solid var(--v2-border)',
              borderRadius: 8,
              padding: '8px 10px 8px 30px',
              color: 'var(--v2-text)',
              fontSize: 12,
              fontFamily: 'var(--font-v2-sans, inherit)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) =>
              ((e.currentTarget as HTMLInputElement).style.borderColor = 'var(--v2-border-hi)')
            }
            onBlur={(e) =>
              ((e.currentTarget as HTMLInputElement).style.borderColor = 'var(--v2-border)')
            }
          />
        </div>
        {search && (
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--v2-text-muted)' }}>
            {resultCount} of {totalCount}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────

interface RaceLogProps {
  customerId: number | null;
}

export function RaceLog({ customerId }: RaceLogProps) {
  const { data: driverData, setCustomerId } = useDriverData();
  const { races, isLoading } = driverData;

  const [discipline, setDiscipline] = useState<Discipline>('all');
  const [selectedSeason, setSelectedSeason] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedRace, setSelectedRace] = useState<RecentRace | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setCustomerId(customerId);
  }, [customerId, setCustomerId]);

  // Season labels
  const raceLabels = useMemo(() => races.map((r) => deriveSeasonLabel(r.seasonId, [r])), [races]);

  const seasonOptions = useMemo((): { label: string; value: string }[] => {
    const labels = [...new Set(raceLabels)].sort((a, b) => {
      const parse = (l: string) => {
        const m = l.match(/S(\d) (\d{4})/);
        return m ? Number(m[2]) * 10 + Number(m[1]) : 0;
      };
      return parse(b) - parse(a);
    });
    return [{ label: 'All Seasons', value: 'all' }, ...labels.map((l) => ({ label: l, value: l }))];
  }, [raceLabels]);

  const effectiveLabel = useMemo((): string => {
    if (selectedSeason === 'all') return 'all';
    if (selectedSeason === 'latest') return seasonOptions[1]?.value ?? 'all';
    return selectedSeason;
  }, [selectedSeason, seasonOptions]);

  const seasonRaces = useMemo(
    () =>
      effectiveLabel === 'all' ? races : races.filter((_, i) => raceLabels[i] === effectiveLabel),
    [races, raceLabels, effectiveLabel]
  );

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
    // Newest first
    return out.sort(
      (a, b) => new Date(b.sessionStartTime).getTime() - new Date(a.sessionStartTime).getTime()
    );
  }, [seasonRaces, discipline, search]);

  const stats = useMemo(() => {
    if (!filtered.length) return null;
    const wins = filtered.filter((r) => r.finishPositionInClass === 1).length;
    const podiums = filtered.filter((r) => r.finishPositionInClass <= 3).length;
    const avgInc = filtered.reduce((s, r) => s + r.incidents, 0) / filtered.length;
    const withIR = filtered.filter((r) => r.newIRating > 0 && r.oldIRating > 0);
    const irGained = withIR.reduce((s, r) => s + (r.newIRating - r.oldIRating), 0);
    const avgSoF = withIR.length
      ? filtered.filter((r) => r.strengthOfField > 0).reduce((s, r) => s + r.strengthOfField, 0) /
        Math.max(filtered.filter((r) => r.strengthOfField > 0).length, 1)
      : 0;
    return { wins, podiums, avgInc, irGained, avgSoF };
  }, [filtered]);

  // Group by month (numeric key for reliable sort)
  const byMonth = useMemo(() => {
    const groups = new Map<number, { label: string; races: RecentRace[] }>();
    filtered.forEach((r) => {
      const d = new Date(r.sessionStartTime);
      const key = d.getFullYear() * 100 + d.getMonth();
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!groups.has(key)) groups.set(key, { label, races: [] });
      groups.get(key)!.races.push(r);
    });
    return Array.from(groups.entries())
      .sort(([a], [b]) => b - a)
      .map(([, v]) => v);
  }, [filtered]);

  // ── Render ───────────────────────────────────────────────

  if (!customerId) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '70vh',
          padding: 32,
          textAlign: 'center',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ fontSize: 16, color: 'var(--v2-text-muted)' }}>
          Select a driver to view race history
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '28px 24px 48px' }} className="race-log-root">
      <style>{`
        @media (min-width: 768px) {
          .race-log-layout { flex-direction: row !important; }
          .race-log-filters { display: block !important; width: 188px !important; flex-shrink: 0; position: sticky; top: 24px; align-self: flex-start; }
          .race-log-mobile-filters { display: none !important; }
        }
        @media (max-width: 767px) {
          .race-log-filters { display: none !important; }
        }
        @media (min-width: 1024px) {
          .race-log-root { padding-left: 2.5rem; padding-right: 2.5rem; padding-top: 2.5rem; }
        }
      `}</style>

      {/* Page header */}
      <div style={{ marginBottom: 20 }} className="v2-fade-in">
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: 'var(--v2-text)',
            margin: 0,
          }}
        >
          Race Log
        </h1>
        {effectiveLabel !== 'all' && (
          <div style={{ fontSize: 12, color: 'var(--v2-text-muted)', marginTop: 4 }}>
            {effectiveLabel}
            {filtered.length !== seasonRaces.length && ` · ${filtered.length} shown`}
          </div>
        )}
      </div>

      {/* Stat chips */}
      <div
        className="v2-fade-in-1"
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 4,
          marginBottom: 24,
        }}
      >
        {isLoading && !stats ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="v2-skeleton"
              style={{ width: 86, height: 60, borderRadius: 10, flexShrink: 0 }}
            />
          ))
        ) : stats ? (
          <>
            <SummaryChip label="Races" value={filtered.length} />
            <SummaryChip
              label="Wins"
              value={stats.wins}
              color={stats.wins > 0 ? 'var(--v2-accent)' : undefined}
            />
            <SummaryChip
              label="Podiums"
              value={stats.podiums}
              color={stats.podiums > 0 ? 'var(--v2-positive)' : undefined}
            />
            <SummaryChip
              label="Avg Inc"
              value={stats.avgInc.toFixed(1)}
              color={stats.avgInc > 3 ? 'var(--v2-negative)' : undefined}
            />
            <SummaryChip
              label="iR Gained"
              value={(stats.irGained > 0 ? '+' : '') + stats.irGained}
              color={
                stats.irGained > 0
                  ? 'var(--v2-positive)'
                  : stats.irGained < 0
                    ? 'var(--v2-negative)'
                    : undefined
              }
            />
          </>
        ) : null}
      </div>

      {/* Mobile filter pills */}
      <div
        className="race-log-mobile-filters v2-fade-in-1"
        style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          marginBottom: 16,
          paddingBottom: 4,
        }}
      >
        {DISC_OPTIONS.map((opt) => {
          const active = discipline === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setDiscipline(opt.value)}
              style={{
                flexShrink: 0,
                padding: '6px 12px',
                borderRadius: 20,
                border: `1px solid ${active ? 'var(--v2-accent)' : 'var(--v2-border)'}`,
                background: active ? 'var(--v2-accent-glow)' : 'var(--v2-surface)',
                color: active ? 'var(--v2-accent)' : 'var(--v2-text-muted)',
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                transition: 'all 0.12s',
              }}
            >
              {opt.label}
            </button>
          );
        })}

        {/* Mobile search */}
        <input
          type="search"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flexShrink: 0,
            width: 120,
            background: 'var(--v2-surface)',
            border: '1px solid var(--v2-border)',
            borderRadius: 20,
            padding: '6px 12px',
            color: 'var(--v2-text)',
            fontSize: 12,
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
      </div>

      {/* Content: filter sidebar + timeline */}
      <div
        className="race-log-layout v2-fade-in-2"
        style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
      >
        {/* Filter sidebar (desktop only) */}
        <div className="race-log-filters">
          <FilterSidebar
            discipline={discipline}
            setDiscipline={setDiscipline}
            search={search}
            setSearch={setSearch}
            selectedSeason={selectedSeason}
            setSelectedSeason={(v) => setSelectedSeason(v)}
            seasonOptions={seasonOptions}
            effectiveLabel={effectiveLabel}
            resultCount={filtered.length}
            totalCount={seasonRaces.length}
          />
        </div>

        {/* Timeline */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {isLoading && filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="v2-skeleton" style={{ height: 72, borderRadius: 10 }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 200,
                color: 'var(--v2-text-muted)',
                fontSize: 13,
                borderRadius: 10,
                border: '1px dashed var(--v2-border)',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <span>No races match these filters</span>
              {(discipline !== 'all' || search) && (
                <button
                  onClick={() => {
                    setDiscipline('all');
                    setSearch('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--v2-accent)',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    padding: 0,
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            byMonth.map((group) => (
              <div key={group.label}>
                <MonthDivider label={group.label} count={group.races.length} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {group.races.map((race) => (
                    <RaceCard
                      key={race.subsessionId}
                      race={race}
                      onClick={() => {
                        setSelectedRace(race);
                        setModalOpen(true);
                      }}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <RaceDetailModal
        race={selectedRace}
        customerId={customerId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}

'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useDriverSummary } from '@/hooks';
import { useActiveSeries } from '@/hooks/useActiveSeries';
import { useDriverData, getDiscipline } from '@/contexts/DriverDataContext';
import { RecentRace } from '@/lib/iracing/types';

// ── Types ─────────────────────────────────────────────────

type Discipline = 'road' | 'formula' | 'oval' | 'dirt_oval' | 'dirt_road' | 'sports_car';

// ── Constants ─────────────────────────────────────────────

const DISC_COLORS: Record<string, string> = {
  road: '#C5F131',
  sports_car: '#C5F131',
  formula: '#60A5FA',
  oval: '#FBBF24',
  dirt_oval: '#A78BFA',
  dirt_road: '#34D399',
};

const DISC_LABELS: Record<string, string> = {
  road: 'Road',
  sports_car: 'Road',
  formula: 'Formula',
  oval: 'Oval',
  dirt_oval: 'Dirt Oval',
  dirt_road: 'Dirt Road',
};

const LICENSE_COLORS: Record<string, string> = {
  A: '#3B82F6',
  B: '#22C55E',
  C: '#EAB308',
  D: '#F97316',
  R: '#EF4444',
  P: '#8B5CF6',
  WC: '#EC4899',
};

// ── Helpers ───────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatIR(n: number): string {
  return n >= 1000 ? (n / 1000).toFixed(2) + 'k' : String(n);
}

function positionLabel(pos: number): string {
  if (pos === 1) return 'P1';
  if (pos === 2) return 'P2';
  if (pos === 3) return 'P3';
  return `P${pos}`;
}

function positionColor(pos: number): string {
  if (pos === 1) return 'var(--v2-accent)';
  if (pos <= 3) return '#FBBF24';
  if (pos <= 5) return 'var(--v2-text)';
  return 'var(--v2-text-muted)';
}

function irDeltaDisplay(delta: number): { text: string; color: string } {
  if (delta === 0) return { text: '—', color: 'var(--v2-text-muted)' };
  return {
    text: (delta > 0 ? '+' : '') + delta,
    color: delta > 0 ? 'var(--v2-positive)' : 'var(--v2-negative)',
  };
}

// ── Sparkline ─────────────────────────────────────────────

function Sparkline({
  positions,
  width = 80,
  height = 26,
}: {
  positions: number[];
  width?: number;
  height?: number;
}) {
  if (positions.length < 2) {
    if (positions.length === 1) {
      return (
        <svg width={width} height={height}>
          <circle cx={width / 2} cy={height / 2} r={3} fill="var(--v2-accent)" opacity={0.6} />
        </svg>
      );
    }
    return <div style={{ width, height }} />;
  }

  const pad = 3;
  const maxPos = Math.max(...positions, 5);
  const range = Math.max(maxPos - 1, 1);

  const pts = positions.map((pos, i) => {
    const x = pad + (i / (positions.length - 1)) * (width - pad * 2);
    // P1 = top (small y), worst = bottom (large y)
    const y = pad + ((pos - 1) / range) * (height - pad * 2);
    return { x, y };
  });

  const pointsStr = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} overflow="visible">
      <polyline
        points={pointsStr}
        stroke="rgba(197,241,49,0.35)"
        strokeWidth={1.5}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === pts.length - 1 ? 2.5 : 1.5}
          fill={i === pts.length - 1 ? '#C5F131' : 'rgba(197,241,49,0.5)'}
        />
      ))}
      {/* Invisible hover area */}
      <rect x={last.x - 6} y={last.y - 6} width={12} height={12} fill="transparent" />
    </svg>
  );
}

// ── iRating hero chart ────────────────────────────────────

interface IRChartPoint {
  date: string;
  [key: string]: string | number;
}

function IRatingHeroChart({ races, isLoading }: { races: RecentRace[]; isLoading: boolean }) {
  const { series: discSeries, points } = useMemo(() => {
    const withIR = races
      .filter((r) => r.newIRating > 0)
      .sort(
        (a, b) => new Date(a.sessionStartTime).getTime() - new Date(b.sessionStartTime).getTime()
      );

    if (withIR.length < 2) return { series: [], points: [] };

    // Group by discipline
    const byDisc = new Map<string, { date: string; ir: number; track: string }[]>();
    withIR.forEach((r) => {
      const disc = getDiscipline(r);
      if (!byDisc.has(disc)) byDisc.set(disc, []);
      byDisc.get(disc)!.push({
        date: r.sessionStartTime.slice(0, 10),
        ir: r.newIRating,
        track: r.trackName,
      });
    });

    const activeSeries = Array.from(byDisc.entries())
      .filter(([, data]) => data.length >= 1)
      .map(([disc]) => disc);

    if (activeSeries.length === 0) return { series: [], points: [] };

    // Unified date axis
    const allDates = [...new Set(withIR.map((r) => r.sessionStartTime.slice(0, 10)))].sort();

    const pts: IRChartPoint[] = allDates.map((date) => {
      const entry: IRChartPoint = { date };
      activeSeries.forEach((disc) => {
        const match = byDisc.get(disc)!.find((d) => d.date === date);
        if (match) {
          entry[`ir_${disc}`] = match.ir;
          entry[`track_${disc}`] = match.track;
        }
      });
      return entry;
    });

    // Forward-fill to keep lines continuous
    activeSeries.forEach((disc) => {
      let last: number | undefined;
      pts.forEach((p) => {
        if (p[`ir_${disc}`] !== undefined) {
          last = p[`ir_${disc}`] as number;
        } else if (last !== undefined) {
          p[`ir_${disc}`] = last;
        }
      });
    });

    return { series: activeSeries, points: pts };
  }, [races]);

  if (isLoading && races.length === 0) {
    return <div className="v2-skeleton" style={{ height: 220, borderRadius: 8, marginTop: 8 }} />;
  }

  if (points.length === 0) {
    return (
      <div
        style={{
          height: 180,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--v2-text-dim)',
          fontSize: 13,
          borderRadius: 8,
          border: '1px dashed var(--v2-border)',
          marginTop: 8,
        }}
      >
        {isLoading ? 'Loading race data…' : 'No iRating data yet'}
      </div>
    );
  }

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: { dataKey: string; value: number; color: string }[];
    label?: string;
  }) => {
    if (!active || !payload || payload.length === 0) return null;
    const pointData = points.find((p) => p.date === label);

    return (
      <div className="v2-chart-tooltip">
        <div style={{ fontSize: 11, color: 'var(--v2-text-muted)', marginBottom: 6 }}>
          {label ? formatDate(label) : ''}
        </div>
        {payload.map((entry) => {
          const disc = entry.dataKey.replace('ir_', '');
          const track = pointData?.[`track_${disc}`] as string | undefined;
          return (
            <div
              key={disc}
              style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: entry.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 12 }}>
                <span style={{ color: 'var(--v2-text-muted)', marginRight: 4 }}>
                  {DISC_LABELS[disc] ?? disc}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-v2-mono, monospace)',
                    fontWeight: 600,
                    color: entry.color,
                  }}
                >
                  {entry.value.toLocaleString()}
                </span>
              </span>
            </div>
          );
        })}
        {payload.length > 0 &&
          (() => {
            const disc = payload[0].dataKey.replace('ir_', '');
            const track = pointData?.[`track_${disc}`] as string | undefined;
            return track ? (
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--v2-text-dim)',
                  marginTop: 4,
                  borderTop: '1px solid var(--v2-border)',
                  paddingTop: 4,
                }}
              >
                {track}
              </div>
            ) : null;
          })()}
      </div>
    );
  };

  return (
    <div style={{ height: 220, marginTop: 8 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="1 6" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'var(--v2-text-muted)', fontFamily: 'inherit' }}
            tickFormatter={formatDate}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            tickCount={5}
            dy={6}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--v2-text-muted)', fontFamily: 'inherit' }}
            axisLine={false}
            tickLine={false}
            domain={['dataMin - 80', 'dataMax + 80']}
            width={48}
            tickFormatter={(v) => v.toLocaleString()}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: 'var(--v2-border-hi)', strokeWidth: 1 }}
          />
          {discSeries.map((disc) => (
            <Line
              key={disc}
              type="monotone"
              dataKey={`ir_${disc}`}
              stroke={DISC_COLORS[disc] ?? '#fff'}
              strokeWidth={2}
              dot={{ r: 3, fill: DISC_COLORS[disc] ?? '#fff', strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
              connectNulls={false}
              isAnimationActive={true}
              animationDuration={600}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Stat chip ─────────────────────────────────────────────

function StatChip({
  label,
  value,
  variant,
}: {
  label: string;
  value: string | number;
  variant?: 'default' | 'positive' | 'negative' | 'accent';
}) {
  const cls = variant && variant !== 'default' ? ` ${variant}` : '';
  return (
    <div className="v2-stat-chip">
      <span className="chip-label">{label}</span>
      <span className={`chip-value${cls}`}>{value}</span>
    </div>
  );
}

// ── Series row ────────────────────────────────────────────

function SeriesRow({
  series,
  races,
  index,
}: {
  series: ReturnType<typeof useActiveSeries>['data'][number];
  races: RecentRace[];
  index: number;
}) {
  const seriesRaces = races
    .filter((r) => r.seriesId === series.seriesId)
    .sort(
      (a, b) => new Date(a.sessionStartTime).getTime() - new Date(b.sessionStartTime).getTime()
    );

  const positions = seriesRaces.map((r) => r.finishPositionInClass);
  const wins = seriesRaces.filter((r) => r.finishPositionInClass === 1).length;
  const discColor = DISC_COLORS[series.category as Discipline] ?? 'var(--v2-text-muted)';
  const discLabel = DISC_LABELS[series.category as Discipline] ?? series.category;

  return (
    <Link
      href={`/v2/series/${series.seriesId}`}
      className={`v2-series-row v2-fade-in-${Math.min(index + 1, 4)}`}
    >
      {/* Category dot */}
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: discColor,
          flexShrink: 0,
        }}
      />

      {/* Name + discipline */}
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
          {series.seriesName}
        </div>
        <div
          style={{
            fontSize: 10,
            color: 'var(--v2-text-muted)',
            marginTop: 1,
            letterSpacing: '0.04em',
          }}
        >
          {discLabel}
          {series.carName ? ` · ${series.carName}` : ''}
        </div>
      </div>

      {/* Sparkline */}
      <div style={{ flexShrink: 0 }}>
        <Sparkline positions={positions} width={70} height={24} />
      </div>

      {/* Stats */}
      <div
        style={{
          flexShrink: 0,
          textAlign: 'right',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          minWidth: 60,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-v2-mono, monospace)',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--v2-text)',
          }}
        >
          {series.totalPoints}
          <span style={{ fontSize: 10, color: 'var(--v2-text-muted)', marginLeft: 3 }}>pts</span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--v2-text-muted)' }}>
          {wins > 0 && <span style={{ color: 'var(--v2-accent)', marginRight: 4 }}>{wins}W</span>}
          {series.racesEntered}R
        </div>
      </div>

      {/* Arrow */}
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
    </Link>
  );
}

// ── Recent race card ──────────────────────────────────────

function RecentRaceCard({ race }: { race: RecentRace }) {
  const delta = race.newIRating - race.oldIRating;
  const { text: deltaText, color: deltaColor } = irDeltaDisplay(delta);
  const pos = race.finishPositionInClass;

  return (
    <div className="v2-race-card" style={{ minWidth: 200, maxWidth: 240, flexShrink: 0 }}>
      {/* Position */}
      <div
        style={{
          fontFamily: 'var(--font-v2-mono, monospace)',
          fontSize: 36,
          fontWeight: 700,
          lineHeight: 1,
          color: positionColor(pos),
          flexShrink: 0,
          minWidth: 52,
        }}
      >
        {positionLabel(pos)}
      </div>

      {/* Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--v2-text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: 3,
          }}
        >
          {race.trackName}
        </div>
        <div
          style={{
            fontSize: 10,
            color: 'var(--v2-text-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: 5,
          }}
        >
          {race.seriesName}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span
            style={{
              fontFamily: 'var(--font-v2-mono, monospace)',
              fontSize: 12,
              fontWeight: 600,
              color: deltaColor,
            }}
          >
            {deltaText}
          </span>
          <span
            style={{
              fontSize: 10,
              color:
                race.incidents >= 4
                  ? 'var(--v2-negative)'
                  : race.incidents >= 2
                    ? 'var(--v2-warning)'
                    : 'var(--v2-text-dim)',
            }}
          >
            {race.incidents}x
          </span>
          <span style={{ fontSize: 10, color: 'var(--v2-text-dim)' }}>
            {formatDate(race.sessionStartTime)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── No driver state ───────────────────────────────────────

function NullState() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        padding: 32,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'var(--v2-accent-glow)',
          border: '2px solid rgba(197,241,49,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}
      >
        <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="var(--v2-accent)">
          <circle cx="12" cy="8" r="4" strokeWidth={1.5} />
          <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7" strokeWidth={1.5} strokeLinecap="round" />
        </svg>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Select your driver</div>
      <div
        style={{
          fontSize: 13,
          color: 'var(--v2-text-muted)',
          maxWidth: 320,
          lineHeight: 1.6,
          marginBottom: 24,
        }}
      >
        Enter your iRacing Customer ID to load your season data. You can find it in your profile
        URL.
      </div>
      <code
        style={{
          fontSize: 11,
          background: 'var(--v2-surface)',
          border: '1px solid var(--v2-border)',
          borderRadius: 6,
          padding: '6px 12px',
          color: 'var(--v2-text-muted)',
          letterSpacing: '0.03em',
        }}
      >
        members.iracing.com/...?custid=
        <span style={{ color: 'var(--v2-accent)' }}>123456</span>
      </code>
    </div>
  );
}

// ── Main component ────────────────────────────────────────

interface SeasonHQProps {
  customerId: number | null;
}

export function SeasonHQ({ customerId }: SeasonHQProps) {
  const { data: driver, isLoading: isLoadingDriver } = useDriverSummary(customerId);
  const { data: activeSeries, isLoading: isLoadingSeries } = useActiveSeries(customerId);
  const { data: driverData, setCustomerId } = useDriverData();
  const { races, isLoading: isLoadingRaces } = driverData;

  // Sync customerId with DriverDataContext so race enrichment runs
  useEffect(() => {
    setCustomerId(customerId);
  }, [customerId, setCustomerId]);

  if (!customerId) return <NullState />;

  // ── Derived stats ──────────────────────────────────────

  const seasonRaces = useMemo(() => {
    if (!races.length) return [];
    // Sort newest first for display
    return [...races].sort(
      (a, b) => new Date(b.sessionStartTime).getTime() - new Date(a.sessionStartTime).getTime()
    );
  }, [races]);

  const stats = useMemo(() => {
    if (!seasonRaces.length) return null;

    const total = seasonRaces.length;
    const wins = seasonRaces.filter((r) => r.finishPositionInClass === 1).length;
    const podiums = seasonRaces.filter((r) => r.finishPositionInClass <= 3).length;
    const avgInc = seasonRaces.reduce((s, r) => s + r.incidents, 0) / total;
    const avgSoF =
      seasonRaces.filter((r) => r.strengthOfField > 0).reduce((s, r) => s + r.strengthOfField, 0) /
      Math.max(seasonRaces.filter((r) => r.strengthOfField > 0).length, 1);

    // iR delta: last race newIR - first race oldIR (for races with iR data)
    const withIR = seasonRaces.filter((r) => r.newIRating > 0);
    const irDelta =
      withIR.length >= 2 ? withIR[0].newIRating - withIR[withIR.length - 1].oldIRating : 0;

    return { total, wins, podiums, avgInc, avgSoF, irDelta };
  }, [seasonRaces]);

  const recentFive = seasonRaces.slice(0, 5);

  // ── Primary iRating for hero display ──────────────────

  const primaryIR = useMemo(() => {
    if (!driver?.licenses.length) return null;
    const withIR = driver.licenses.filter((l) => l.iRating > 0);
    if (!withIR.length) return null;
    const top = withIR.reduce((best, l) => (l.iRating > best.iRating ? l : best));
    return top;
  }, [driver]);

  // ── Legend items for iRating chart ────────────────────

  const chartDiscs = useMemo(() => {
    if (!races.length) return [];
    const seen = new Set<string>();
    races.filter((r) => r.newIRating > 0).forEach((r) => seen.add(getDiscipline(r)));
    return Array.from(seen);
  }, [races]);

  return (
    <div style={{ padding: '28px 24px 40px' }} className="lg:px-10 lg:pt-10">
      {/* ── Hero ────────────────────────────────────────── */}
      <section className="v2-fade-in" style={{ marginBottom: 32 }}>
        {/* Driver name row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 16,
            marginBottom: 10,
            flexWrap: 'wrap',
          }}
        >
          {isLoadingDriver ? (
            <div className="v2-skeleton" style={{ width: 260, height: 52 }} />
          ) : driver ? (
            <>
              <h1
                style={{
                  fontSize: 'clamp(36px, 5vw, 56px)',
                  fontWeight: 800,
                  lineHeight: 1,
                  color: 'var(--v2-text)',
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}
              >
                {driver.displayName}
              </h1>

              {/* License badges */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingBottom: 4 }}>
                {driver.licenses
                  .filter((l) => l.iRating > 0)
                  .sort((a, b) => b.iRating - a.iRating)
                  .slice(0, 3)
                  .map((l) => (
                    <span
                      key={l.categoryId}
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 4,
                        background: (LICENSE_COLORS[l.groupName] ?? '#666') + '22',
                        color: LICENSE_COLORS[l.groupName] ?? '#aaa',
                        letterSpacing: '0.06em',
                        fontFamily: 'var(--font-v2-mono, monospace)',
                        border: `1px solid ${LICENSE_COLORS[l.groupName] ?? '#666'}44`,
                      }}
                    >
                      {l.groupName} · {formatIR(l.iRating)}
                    </span>
                  ))}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 24, color: 'var(--v2-text-muted)' }}>Loading driver…</div>
          )}
        </div>

        {/* Chart legend */}
        {chartDiscs.length > 0 && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
            {chartDiscs.map((d) => (
              <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span
                  style={{
                    width: 20,
                    height: 2,
                    borderRadius: 1,
                    background: DISC_COLORS[d] ?? '#888',
                    display: 'inline-block',
                  }}
                />
                <span style={{ fontSize: 11, color: 'var(--v2-text-muted)' }}>
                  {DISC_LABELS[d] ?? d}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* iRating chart */}
        <IRatingHeroChart races={races} isLoading={isLoadingRaces} />

        {/* Stat chips */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 16,
            overflowX: 'auto',
            paddingBottom: 4,
          }}
        >
          {isLoadingRaces && !stats ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="v2-skeleton"
                style={{ width: 90, height: 60, borderRadius: 10, flexShrink: 0 }}
              />
            ))
          ) : stats ? (
            <>
              <StatChip label="Races" value={stats.total} />
              <StatChip
                label="Wins"
                value={stats.wins}
                variant={stats.wins > 0 ? 'accent' : 'default'}
              />
              <StatChip
                label="Podiums"
                value={stats.podiums}
                variant={stats.podiums > 0 ? 'positive' : 'default'}
              />
              <StatChip
                label="Avg Inc"
                value={stats.avgInc.toFixed(1)}
                variant={stats.avgInc > 3 ? 'negative' : 'default'}
              />
              <StatChip
                label="iR Delta"
                value={(stats.irDelta > 0 ? '+' : '') + stats.irDelta}
                variant={
                  stats.irDelta > 0 ? 'positive' : stats.irDelta < 0 ? 'negative' : 'default'
                }
              />
              <StatChip
                label="Avg SoF"
                value={stats.avgSoF > 0 ? Math.round(stats.avgSoF).toLocaleString() : '—'}
              />
            </>
          ) : null}
        </div>
      </section>

      {/* ── Content grid ────────────────────────────────── */}
      <div
        className="lg:grid lg:grid-cols-2 lg:gap-10"
        style={{ display: 'flex', flexDirection: 'column', gap: 32 }}
      >
        {/* ── Series this season ───────────────────────── */}
        <section className="v2-fade-in-2">
          <div className="v2-section-label">Series This Season</div>

          {isLoadingSeries ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="v2-skeleton" style={{ height: 60, borderRadius: 6 }} />
              ))}
            </div>
          ) : activeSeries.length === 0 ? (
            <div
              style={{
                padding: '24px 0',
                color: 'var(--v2-text-muted)',
                fontSize: 13,
                textAlign: 'center',
                borderRadius: 8,
                border: '1px dashed var(--v2-border)',
              }}
            >
              No series found for this season
            </div>
          ) : (
            <div>
              {activeSeries.map((s, i) => (
                <SeriesRow key={s.seriesId} series={s} races={races} index={i} />
              ))}
            </div>
          )}
        </section>

        {/* ── Recent races ─────────────────────────────── */}
        <section className="v2-fade-in-3">
          <div className="v2-section-label">Recent Races</div>

          {isLoadingRaces && recentFive.length === 0 ? (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="v2-skeleton"
                  style={{ width: 200, height: 88, borderRadius: 10, flexShrink: 0 }}
                />
              ))}
            </div>
          ) : recentFive.length === 0 ? (
            <div
              style={{
                padding: '24px 0',
                color: 'var(--v2-text-muted)',
                fontSize: 13,
                textAlign: 'center',
                borderRadius: 8,
                border: '1px dashed var(--v2-border)',
              }}
            >
              No recent races
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {recentFive.map((race) => (
                <RecentRaceCard key={race.subsessionId} race={race} />
              ))}
            </div>
          )}

          {recentFive.length > 0 && (
            <Link
              href="/v2/races"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 14,
                fontSize: 12,
                color: 'var(--v2-text-muted)',
                textDecoration: 'none',
                transition: 'color 0.12s',
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--v2-accent)')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--v2-text-muted)')
              }
            >
              View all races
              <svg width={12} height={12} viewBox="0 0 12 12" fill="none" stroke="currentColor">
                <path
                  d="M2 6h8M6 2l4 4-4 4"
                  strokeWidth={1.3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          )}
        </section>
      </div>

      {/* Tailwind-style class definitions for grid layout */}
      <style>{`
        @media (min-width: 1024px) {
          .lg\\:grid { display: grid !important; }
          .lg\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .lg\\:gap-10 { gap: 2.5rem; }
          .lg\\:px-10 { padding-left: 2.5rem; padding-right: 2.5rem; }
          .lg\\:pt-10 { padding-top: 2.5rem; }
        }
      `}</style>
    </div>
  );
}

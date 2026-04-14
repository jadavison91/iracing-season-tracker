'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import Image from 'next/image';
import { useSeriesRaces } from '@/hooks/useSeriesRaces';
import { useSeriesSchedule } from '@/hooks/useSeriesSchedule';
import { useDriverData } from '@/contexts/DriverDataContext';
import { useCarAssets, getCarImageUrl } from '@/hooks/useCarAssets';
import { RaceDetailModal } from '@/components/RaceDetailModal';
import { TrackPerformanceTable } from '@/components/charts/TrackPerformanceTable';
import { BestLapTimesTable } from '@/components/charts/BestLapTimesTable';
import { LearningCurveTable } from '@/components/charts/LearningCurveTable';
import { PositionsGainedChart } from '@/components/charts/PositionsGainedChart';
import { SoFDistributionChart } from '@/components/charts/SoFDistributionChart';
import { IncidentTrendChart } from '@/components/charts/IncidentTrendChart';
import {
  getTrackPerformance,
  getBestLaps,
  getLearningCurve,
  getPositionsGained,
  getSoFDistribution,
  getIncidentTrend,
} from '@/lib/mock-data';
import { RecentRace, WeekResult } from '@/lib/iracing/types';

// ── Helpers ───────────────────────────────────────────────

function positionColor(pos: number): string {
  if (pos === 1) return 'var(--v2-accent)';
  if (pos <= 3) return '#FBBF24';
  if (pos <= 5) return 'var(--v2-text)';
  return 'var(--v2-text-muted)';
}

function irDelta(race: RecentRace): number | null {
  return race.newIRating > 0 && race.oldIRating > 0 ? race.newIRating - race.oldIRating : null;
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Season week row (all statuses) ───────────────────────

function SeasonWeekRow({
  week,
  onRaceClick,
}: {
  week: WeekResult;
  onRaceClick: (race: RecentRace) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { displayWeek, schedule, status, bestResult, allResults, isCounting } = week;

  const pos = bestResult?.finishPositionInClass ?? null;
  const delta = bestResult ? irDelta(bestResult) : null;
  const isActive = status === 'active';
  const isUpcoming = status === 'upcoming';
  const isSkipped = status === 'skipped';
  const hasResult = pos !== null;
  const hasMultiple = allResults.length > 1;

  const otherAttempts = useMemo(
    () =>
      [...allResults]
        .sort((a, b) => b.champPoints - a.champPoints)
        .filter((r) => r.subsessionId !== bestResult?.subsessionId),
    [allResults, bestResult]
  );

  const rowBg = isActive
    ? 'rgba(197,241,49,0.04)'
    : isUpcoming || isSkipped
      ? 'transparent'
      : 'transparent';

  const leftBorder = isCounting
    ? '2px solid var(--v2-accent)'
    : isActive
      ? '2px solid rgba(197,241,49,0.4)'
      : '2px solid transparent';

  return (
    <div style={{ borderTop: '1px solid var(--v2-border)' }}>
      {/* Main row */}
      <div
        className="v2-week-row"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 14px',
          background: rowBg,
          borderLeft: leftBorder,
          cursor: hasResult ? 'pointer' : 'default',
          transition: 'background 0.1s',
          opacity: isSkipped ? 0.45 : 1,
        }}
        onClick={hasResult ? () => onRaceClick(bestResult!) : undefined}
        onMouseEnter={(e) => {
          if (hasResult)
            (e.currentTarget as HTMLDivElement).style.background = 'var(--v2-surface-2)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = rowBg;
        }}
      >
        {/* Week number */}
        <div
          style={{
            fontFamily: 'var(--font-v2-mono, monospace)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.06em',
            color: isActive ? 'var(--v2-accent)' : 'var(--v2-text-dim)',
            width: 30,
            flexShrink: 0,
          }}
        >
          Wk {displayWeek}
        </div>

        {/* Track name */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: isUpcoming || isSkipped ? 'var(--v2-text-muted)' : 'var(--v2-text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {schedule?.trackName || '—'}
          </div>
          {schedule?.trackConfig && (
            <div style={{ fontSize: 10, color: 'var(--v2-text-dim)', marginTop: 1 }}>
              {schedule.trackConfig}
            </div>
          )}
        </div>

        {/* Status badge for non-completed/non-counted weeks, or position for results */}
        <div style={{ flexShrink: 0, width: 70, textAlign: 'right' }}>
          {hasResult ? (
            <span
              style={{
                fontFamily: 'var(--font-v2-mono, monospace)',
                fontSize: 16,
                fontWeight: 700,
                color: positionColor(pos),
              }}
            >
              P{pos}
            </span>
          ) : isActive ? (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: 'var(--v2-accent)',
                textTransform: 'uppercase',
              }}
            >
              Active
            </span>
          ) : isUpcoming ? (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--v2-text-dim)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Upcoming
            </span>
          ) : isSkipped ? (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--v2-text-dim)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Skipped
            </span>
          ) : null}
        </div>

        {/* iR delta */}
        <div
          className="v2-hide-mobile"
          style={{
            fontFamily: 'var(--font-v2-mono, monospace)',
            fontSize: 12,
            fontWeight: 600,
            color:
              delta === null
                ? 'transparent'
                : delta > 0
                  ? 'var(--v2-positive)'
                  : delta < 0
                    ? 'var(--v2-negative)'
                    : 'var(--v2-text-muted)',
            flexShrink: 0,
            width: 54,
            textAlign: 'right',
          }}
        >
          {delta !== null ? `${delta > 0 ? '+' : ''}${delta}` : '—'}
        </div>

        {/* Points */}
        <div
          style={{
            fontFamily: 'var(--font-v2-mono, monospace)',
            fontSize: 12,
            color: hasResult
              ? isCounting
                ? 'var(--v2-accent)'
                : 'var(--v2-text-muted)'
              : 'var(--v2-text-dim)',
            flexShrink: 0,
            width: 44,
            textAlign: 'right',
          }}
        >
          {bestResult ? `${bestResult.champPoints}pt` : '—'}
        </div>

        {/* Incidents */}
        <div
          className="v2-hide-mobile"
          style={{
            fontSize: 11,
            color:
              bestResult && bestResult.incidents >= 4
                ? 'var(--v2-negative)'
                : 'var(--v2-text-muted)',
            flexShrink: 0,
            width: 28,
            textAlign: 'right',
          }}
        >
          {bestResult ? `${bestResult.incidents}x` : ''}
        </div>

        {/* Expand toggle or spacer */}
        <div style={{ flexShrink: 0, width: 44, display: 'flex', justifyContent: 'flex-end' }}>
          {hasMultiple && (
            <div
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                padding: '2px 7px',
                borderRadius: 99,
                border: '1px solid var(--v2-border-hi)',
                background: 'var(--v2-surface-2)',
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--v2-text-muted)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {allResults.length}
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                stroke="currentColor"
                style={{
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.15s',
                }}
              >
                <path
                  d="M2 3.5l3 3 3-3"
                  strokeWidth={1.3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Expanded sub-rows */}
      {expanded &&
        otherAttempts.map((race) => (
          <AttemptRow key={race.subsessionId} race={race} onClick={() => onRaceClick(race)} />
        ))}
    </div>
  );
}

// ── Chart sub-components (module-level to avoid recreating on render) ────────

function FinishDot(props: { cx?: number; cy?: number; payload?: { pos: number } }) {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined || !payload) return null;
  const color =
    payload.pos === 1 ? 'var(--v2-accent)' : payload.pos <= 3 ? '#FBBF24' : 'rgba(197,241,49,0.3)';
  return <circle cx={cx} cy={cy} r={payload.pos <= 3 ? 4 : 3} fill={color} stroke="none" />;
}

function FinishTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { track: string; date: string; pos: number; iR: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="v2-chart-tooltip">
      <div style={{ fontWeight: 600, marginBottom: 4 }}>P{d.pos}</div>
      <div style={{ color: 'var(--v2-text-muted)', fontSize: 11 }}>{d.track}</div>
      <div style={{ color: 'var(--v2-text-muted)', fontSize: 11 }}>{d.date}</div>
      {d.iR !== 0 && (
        <div
          style={{
            marginTop: 4,
            fontSize: 11,
            color: d.iR > 0 ? 'var(--v2-positive)' : 'var(--v2-negative)',
          }}
        >
          {d.iR > 0 ? '+' : ''}
          {d.iR} iR
        </div>
      )}
    </div>
  );
}

// ── Finish position chart ─────────────────────────────────

function FinishTrendChart({ races }: { races: RecentRace[] }) {
  const data = useMemo(() => {
    return [...races]
      .sort(
        (a, b) => new Date(a.sessionStartTime).getTime() - new Date(b.sessionStartTime).getTime()
      )
      .map((r, i) => ({
        index: i + 1,
        pos: r.finishPositionInClass,
        track: r.trackName || '',
        date: r.sessionStartTime
          ? new Date(r.sessionStartTime).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })
          : '',
        iR: r.newIRating > 0 && r.oldIRating > 0 ? r.newIRating - r.oldIRating : 0,
      }));
  }, [races]);

  if (data.length < 2) return null;

  const maxPos = Math.max(...data.map((d) => d.pos), 1);

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="index"
          tick={{ fontSize: 10, fill: 'var(--v2-text-muted)' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[1, maxPos + 1]}
          reversed
          tick={{ fontSize: 10, fill: 'var(--v2-text-muted)' }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          tickFormatter={(v: number) => `P${v}`}
        />
        <Tooltip content={<FinishTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.06)' }} />
        <ReferenceLine
          y={1}
          stroke="rgba(197,241,49,0.15)"
          strokeDasharray="4 4"
          label={{ value: 'P1', position: 'right', fontSize: 9, fill: 'var(--v2-accent)' }}
        />
        <Line
          type="monotone"
          dataKey="pos"
          stroke="rgba(197,241,49,0.5)"
          strokeWidth={1.5}
          dot={<FinishDot />}
          activeDot={{ r: 5, fill: 'var(--v2-accent)' }}
          animationDuration={600}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Attempt sub-row (compact, shown when week is expanded) ─

function AttemptRow({ race, onClick }: { race: RecentRace; onClick: () => void }) {
  const pos = race.finishPositionInClass;
  const delta = irDelta(race);

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '8px 14px 8px 52px',
        background: 'rgba(255,255,255,0.02)',
        borderTop: '1px solid var(--v2-border)',
        borderRight: 'none',
        borderBottom: 'none',
        borderLeft: '2px solid transparent',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--v2-surface-2)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.02)';
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-v2-mono, monospace)',
          fontSize: 13,
          fontWeight: 600,
          color: positionColor(pos),
          width: 28,
          flexShrink: 0,
        }}
      >
        P{pos}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 11, color: 'var(--v2-text-muted)' }}>
          {race.sessionStartTime ? formatShortDate(race.sessionStartTime) : ''}
          {race.numDrivers > 0 && ` · ${race.numDrivers} drivers`}
        </span>
      </div>

      {delta !== null && (
        <div
          className="v2-hide-mobile"
          style={{
            fontFamily: 'var(--font-v2-mono, monospace)',
            fontSize: 11,
            color:
              delta > 0
                ? 'var(--v2-positive)'
                : delta < 0
                  ? 'var(--v2-negative)'
                  : 'var(--v2-text-muted)',
            flexShrink: 0,
            width: 54,
            textAlign: 'right',
          }}
        >
          {delta > 0 ? '+' : ''}
          {delta}
        </div>
      )}

      <div
        style={{
          fontFamily: 'var(--font-v2-mono, monospace)',
          fontSize: 11,
          color: 'var(--v2-text-muted)',
          flexShrink: 0,
          width: 44,
          textAlign: 'right',
        }}
      >
        {race.champPoints}pt
      </div>

      <div
        style={{
          fontSize: 10,
          color: race.incidents >= 4 ? 'var(--v2-negative)' : 'var(--v2-text-dim)',
          flexShrink: 0,
          width: 32,
          textAlign: 'right',
        }}
      >
        {race.incidents}x
      </div>

      {/* Spacer to align with the expand toggle column */}
      <div style={{ width: 44, flexShrink: 0 }} />
    </button>
  );
}

// ── Stat card ─────────────────────────────────────────────

function StatCard({
  label,
  value,
  accent,
  mono = true,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        padding: '14px 16px',
        background: 'var(--v2-surface)',
        borderRadius: 10,
        border: '1px solid var(--v2-border)',
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.1em',
          color: 'var(--v2-text-muted)',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: mono ? 'var(--font-v2-mono, monospace)' : 'inherit',
          fontSize: 22,
          fontWeight: 700,
          lineHeight: 1,
          color: accent ? 'var(--v2-accent)' : 'var(--v2-text)',
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────

function LoadingSkeleton() {
  const pulse: React.CSSProperties = {
    background: 'var(--v2-surface-2)',
    borderRadius: 6,
    animation: 'v2-pulse 1.5s ease-in-out infinite',
  };
  return (
    <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ ...pulse, width: 60, height: 14 }} />
      </div>
      <div style={{ ...pulse, width: 280, height: 32 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ ...pulse, height: 68 }} />
        ))}
      </div>
      <div style={{ ...pulse, height: 180 }} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────

interface SeriesFocusProps {
  customerId: number | null;
  seriesId: number;
}

export function SeriesFocus({ customerId, seriesId }: SeriesFocusProps) {
  const { setCustomerId } = useDriverData();
  const { data, isLoading } = useSeriesRaces(customerId, seriesId);
  const {
    weekResults,
    seasonTotal,
    weeksCounting,
    isLoading: scheduleLoading,
  } = useSeriesSchedule(customerId, seriesId);
  const { data: carAssets } = useCarAssets();

  const [selectedRace, setSelectedRace] = useState<RecentRace | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (customerId) setCustomerId(customerId);
  }, [customerId, setCustomerId]);

  // Races sorted oldest-first for the chart, newest-first for the table
  const racesChronological = useMemo(
    () =>
      data?.races
        ? [...data.races].sort(
            (a, b) =>
              new Date(a.sessionStartTime).getTime() - new Date(b.sessionStartTime).getTime()
          )
        : [],
    [data]
  );

  const handleRaceClick = (race: RecentRace) => {
    setSelectedRace(race);
    setModalOpen(true);
  };

  // Analysis data — must be before early returns (Rules of Hooks)
  const analysisData = useMemo(() => {
    const races = data?.races ?? [];
    return {
      trackPerformance: getTrackPerformance(races),
      bestLaps: getBestLaps(races),
      learningCurve: getLearningCurve(races),
      positionsGained: getPositionsGained(races),
      sofDistribution: getSoFDistribution(races),
      incidentTrend: getIncidentTrend(races),
    };
  }, [data]);

  if (!customerId) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--v2-text-muted)' }}>
        Enter a Customer ID to view series data.
      </div>
    );
  }

  if (isLoading || scheduleLoading) {
    return <LoadingSkeleton />;
  }

  if (!data) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--v2-text-muted)' }}>
        No race data found for this series.{' '}
        <Link href="/v2" style={{ color: 'var(--v2-accent)' }}>
          Back to Season HQ
        </Link>
      </div>
    );
  }

  const { seriesName, stats } = data;

  // Car image for hero banner — use the most common car in the series
  const primaryCarId = data.races[0]?.carId;
  const carAsset = primaryCarId ? carAssets?.[primaryCarId.toString()] : undefined;
  const carImageUrl = getCarImageUrl(carAsset, 'small');
  const carName = data.races[0]?.carName;

  const racesRaced = weekResults.filter(
    (w) => w.status === 'completed' || (w.status === 'active' && w.bestResult)
  ).length;
  const totalWeeks = weekResults.length;

  // Points progress: what fraction of max possible (8 weeks × theoretical max per week)
  // We use 8 as denominator since max counting weeks = 8
  const progressPct =
    weeksCounting > 0 ? Math.min((racesRaced / Math.max(totalWeeks, 1)) * 100, 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* ── Hero banner ────────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          height: 200,
          overflow: 'hidden',
          background: 'var(--v2-surface)',
          borderBottom: '1px solid var(--v2-border)',
          flexShrink: 0,
        }}
      >
        {/* Car image */}
        {carImageUrl ? (
          <Image
            src={carImageUrl}
            alt={carName || seriesName}
            fill
            unoptimized
            sizes="900px"
            style={{
              objectFit: 'cover',
              objectPosition: 'center 40%',
              opacity: 0.45,
            }}
          />
        ) : (
          /* Fallback: subtle grid pattern */
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'linear-gradient(rgba(197,241,49,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(197,241,49,0.03) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
        )}

        {/* Gradient overlays — bottom-up for text legibility, edge vignette */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to bottom, rgba(9,9,14,0.3) 0%, rgba(9,9,14,0.0) 30%, rgba(9,9,14,0.7) 70%, rgba(9,9,14,0.97) 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to right, rgba(9,9,14,0.6) 0%, transparent 40%, transparent 60%, rgba(9,9,14,0.4) 100%)',
          }}
        />

        {/* Back nav — top left */}
        <Link
          href="/v2"
          style={{
            position: 'absolute',
            top: 16,
            left: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            color: 'rgba(255,255,255,0.6)',
            fontSize: 12,
            textDecoration: 'none',
            letterSpacing: '0.04em',
            transition: 'color 0.12s',
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Season HQ
        </Link>

        {/* Car name badge — top right */}
        {carName && (
          <div
            style={{
              position: 'absolute',
              top: 16,
              right: 20,
              fontSize: 11,
              color: 'rgba(255,255,255,0.45)',
              letterSpacing: '0.06em',
              fontWeight: 500,
            }}
          >
            {carName}
          </div>
        )}

        {/* Series name — bottom left */}
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            right: 20,
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--font-v2-sans, system-ui)',
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--v2-text)',
              margin: 0,
              lineHeight: 1.2,
              letterSpacing: '-0.01em',
            }}
          >
            {seriesName}
          </h1>
        </div>
      </div>

      {/* ── Championship hero ───────────────────────────── */}
      <div
        style={{
          padding: '24px 24px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* Points + progress */}
        <div
          style={{
            padding: '20px 20px',
            background: 'var(--v2-surface)',
            borderRadius: 12,
            border: '1px solid var(--v2-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
            <div
              style={{
                fontFamily: 'var(--font-v2-mono, monospace)',
                fontSize: 44,
                fontWeight: 700,
                color: 'var(--v2-accent)',
                lineHeight: 1,
              }}
            >
              {seasonTotal}
            </div>
            <div style={{ fontSize: 14, color: 'var(--v2-text-muted)', lineHeight: 1.2 }}>
              pts
              <br />
              <span style={{ fontSize: 12 }}>{weeksCounting}/8 weeks counting</span>
            </div>
          </div>

          {/* Progress bar: weeks raced / total weeks */}
          <div
            style={{
              height: 4,
              background: 'var(--v2-surface-3)',
              borderRadius: 2,
              overflow: 'hidden',
              marginBottom: 10,
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progressPct}%`,
                background: 'var(--v2-accent)',
                borderRadius: 2,
                transition: 'width 0.6s ease',
              }}
            />
          </div>

          <div style={{ fontSize: 11, color: 'var(--v2-text-muted)' }}>
            {racesRaced} of {totalWeeks} weeks raced
          </div>
        </div>

        {/* Stats grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: 8,
          }}
        >
          <StatCard label="Races" value={stats.totalRaces} />
          <StatCard label="Wins" value={stats.wins} accent={stats.wins > 0} />
          <StatCard label="Podiums" value={stats.podiums} />
          <StatCard label="Top 5s" value={stats.top5s} />
          <StatCard label="Avg Finish" value={`P${stats.avgFinish}`} />
          <StatCard label="Best Finish" value={`P${stats.bestFinish}`} accent />
          <StatCard label="Avg Inc" value={`${stats.avgIncidents}x`} />
          <StatCard label="Avg SoF" value={stats.avgSoF.toLocaleString()} />
        </div>
      </div>

      {/* Season Timeline section removed — replaced by unified Season Schedule below */}

      {/* ── Finish position trend ───────────────────────── */}
      {racesChronological.length >= 2 && (
        <div style={{ padding: '24px 24px 0' }}>
          <div className="v2-section-label">Finish Position Trend</div>
          <div
            style={{
              background: 'var(--v2-surface)',
              borderRadius: 12,
              border: '1px solid var(--v2-border)',
              padding: '16px 8px 12px 0',
            }}
          >
            <FinishTrendChart races={racesChronological} />
          </div>
        </div>
      )}

      {/* ── Positions gained ────────────────────────────── */}
      {analysisData.positionsGained.length >= 2 && (
        <div style={{ padding: '24px 24px 0' }}>
          <div className="v2-section-label">Positions Gained / Lost</div>
          <div
            style={{
              background: 'var(--v2-surface)',
              borderRadius: 12,
              border: '1px solid var(--v2-border)',
              padding: '16px 8px 12px 0',
            }}
          >
            <PositionsGainedChart data={analysisData.positionsGained} />
          </div>
        </div>
      )}

      {/* ── Incident trend ──────────────────────────────── */}
      {analysisData.incidentTrend.length >= 2 && (
        <div style={{ padding: '24px 24px 0' }}>
          <div className="v2-section-label">Incident Trend</div>
          <div
            style={{
              background: 'var(--v2-surface)',
              borderRadius: 12,
              border: '1px solid var(--v2-border)',
              padding: '16px 8px 12px 0',
            }}
          >
            <IncidentTrendChart data={analysisData.incidentTrend} />
          </div>
        </div>
      )}

      {/* ── SoF distribution ────────────────────────────── */}
      {analysisData.sofDistribution.length > 0 && (
        <div style={{ padding: '24px 24px 0' }}>
          <div className="v2-section-label">Strength of Field Distribution</div>
          <div
            style={{
              background: 'var(--v2-surface)',
              borderRadius: 12,
              border: '1px solid var(--v2-border)',
              padding: '16px 8px 12px 0',
            }}
          >
            <SoFDistributionChart data={analysisData.sofDistribution} />
          </div>
        </div>
      )}

      {/* ── Track performance ───────────────────────────── */}
      {analysisData.trackPerformance.length > 0 && (
        <div style={{ padding: '24px 24px 0' }}>
          <div className="v2-section-label">Track Performance</div>
          <div
            style={{
              background: 'var(--v2-surface)',
              borderRadius: 12,
              border: '1px solid var(--v2-border)',
              overflow: 'hidden',
            }}
          >
            <TrackPerformanceTable data={analysisData.trackPerformance} />
          </div>
        </div>
      )}

      {/* ── Best lap times ───────────────────────────────── */}
      {analysisData.bestLaps.length > 0 && (
        <div style={{ padding: '24px 24px 0' }}>
          <div className="v2-section-label">Best Lap Times</div>
          <div
            style={{
              background: 'var(--v2-surface)',
              borderRadius: 12,
              border: '1px solid var(--v2-border)',
              overflow: 'hidden',
              padding: '16px',
            }}
          >
            <BestLapTimesTable data={analysisData.bestLaps} />
          </div>
        </div>
      )}

      {/* ── Learning curve ───────────────────────────────── */}
      {analysisData.learningCurve.length > 0 && (
        <div style={{ padding: '24px 24px 0' }}>
          <div className="v2-section-label">Learning Curve</div>
          <div
            style={{
              background: 'var(--v2-surface)',
              borderRadius: 12,
              border: '1px solid var(--v2-border)',
              overflow: 'hidden',
              padding: '16px',
            }}
          >
            <LearningCurveTable data={analysisData.learningCurve} />
          </div>
        </div>
      )}

      {/* ── Season schedule + results ────────────────────── */}
      <div style={{ padding: '24px 24px 32px' }}>
        <div className="v2-section-label">Season ({data.races.length} races)</div>
        <div
          style={{
            background: 'var(--v2-surface)',
            borderRadius: 12,
            border: '1px solid var(--v2-border)',
            overflow: 'hidden',
          }}
        >
          {weekResults.length === 0 ? (
            <div
              style={{
                padding: '32px 20px',
                textAlign: 'center',
                color: 'var(--v2-text-muted)',
                fontSize: 13,
              }}
            >
              No schedule data available.
            </div>
          ) : (
            weekResults.map((week) => (
              <SeasonWeekRow key={week.weekNum} week={week} onRaceClick={handleRaceClick} />
            ))
          )}
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 11,
            color: 'var(--v2-text-muted)',
            display: 'flex',
            gap: 16,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                width: 8,
                height: 2,
                background: 'var(--v2-accent)',
                display: 'inline-block',
                borderRadius: 1,
              }}
            />
            Counting toward championship
          </span>
          <span>Click a result to view race details</span>
        </div>
      </div>

      {/* ── Detail modal ────────────────────────────────── */}
      <RaceDetailModal
        race={selectedRace}
        customerId={customerId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}

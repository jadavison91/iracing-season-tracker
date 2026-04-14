'use client';

import { useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useActiveSeries, ActiveSeriesData } from '@/hooks/useActiveSeries';
import { useDriverData } from '@/contexts/DriverDataContext';
import { useCarAssets, getCarImageUrl } from '@/hooks/useCarAssets';
import { useSeriesSchedule } from '@/hooks/useSeriesSchedule';
import { RecentRace, WeekResult } from '@/lib/iracing/types';

// ── Shared helpers & constants ────────────────────────────

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

function positionColor(pos: number): string {
  if (pos === 1) return 'var(--v2-accent)';
  if (pos <= 3) return '#FBBF24';
  if (pos <= 5) return 'var(--v2-text)';
  return 'var(--v2-text-muted)';
}

function shortTrackName(name: string): string {
  return name
    .replace(' International Speedway', '')
    .replace(' International Raceway', '')
    .replace(' Motor Speedway', '')
    .replace(' Motorsports Park', '')
    .replace(' Race Track', '')
    .replace(' Circuit', '');
}

// ── Sparkline (shared) ────────────────────────────────────

function Sparkline({ positions }: { positions: number[] }) {
  const width = 70;
  const height = 24;
  if (positions.length < 2) {
    return <div style={{ width, height }} />;
  }
  const pad = 3;
  const maxPos = Math.max(...positions, 5);
  const range = Math.max(maxPos - 1, 1);
  const pts = positions.map((pos, i) => ({
    x: pad + (i / (positions.length - 1)) * (width - pad * 2),
    y: pad + ((pos - 1) / range) * (height - pad * 2),
  }));
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
          r={i === pts.length - 1 ? 3 : 2}
          fill={i === pts.length - 1 ? 'var(--v2-accent)' : 'rgba(197,241,49,0.4)'}
        />
      ))}
      <circle cx={last.x} cy={last.y} r={5} fill="rgba(197,241,49,0.15)" />
    </svg>
  );
}

// ── Current row (existing design) ────────────────────────

function CurrentSeriesRow({
  series,
  races,
  carImageUrl,
}: {
  series: ActiveSeriesData;
  races: RecentRace[];
  carImageUrl: string | null;
}) {
  const seriesRaces = races
    .filter((r) => r.seriesId === series.seriesId)
    .sort(
      (a, b) => new Date(a.sessionStartTime).getTime() - new Date(b.sessionStartTime).getTime()
    );

  const positions = seriesRaces.map((r) => r.finishPositionInClass);
  const wins = seriesRaces.filter((r) => r.finishPositionInClass === 1).length;
  const discColor = DISC_COLORS[series.category] ?? 'var(--v2-text-muted)';
  const discLabel = DISC_LABELS[series.category] ?? series.category;

  return (
    <div className="v2-series-row" style={{ pointerEvents: 'none', cursor: 'default' }}>
      {/* Car thumbnail */}
      <div
        style={{
          width: 64,
          height: 36,
          borderRadius: 6,
          overflow: 'hidden',
          flexShrink: 0,
          background: 'var(--v2-surface-2)',
          border: '1px solid var(--v2-border)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {carImageUrl && (
          <Image
            src={carImageUrl}
            alt={series.carName || series.seriesName}
            fill
            unoptimized
            sizes="64px"
            style={{ objectFit: 'cover', objectPosition: 'center 40%', opacity: 0.85 }}
          />
        )}
      </div>

      {/* Name */}
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
        <div style={{ fontSize: 10, color: 'var(--v2-text-muted)', marginTop: 1 }}>
          {discLabel}
          {series.carName ? ` · ${series.carName}` : ''}
        </div>
      </div>

      {/* Sparkline */}
      <Sparkline positions={positions} />

      {/* Stats */}
      <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 60 }}>
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
    </div>
  );
}

// ── Proposed row (enhanced design) ───────────────────────

function ProposedSeriesRow({
  series,
  races,
  carImageUrl,
  customerId,
}: {
  series: ActiveSeriesData;
  races: RecentRace[];
  carImageUrl: string | null;
  customerId: number;
}) {
  const { weekResults } = useSeriesSchedule(customerId, series.seriesId);

  const seriesRaces = useMemo(
    () =>
      races
        .filter((r) => r.seriesId === series.seriesId)
        .sort(
          (a, b) => new Date(a.sessionStartTime).getTime() - new Date(b.sessionStartTime).getTime()
        ),
    [races, series.seriesId]
  );

  const positions = seriesRaces.map((r) => r.finishPositionInClass);
  const wins = seriesRaces.filter((r) => r.finishPositionInClass === 1).length;
  const discColor = DISC_COLORS[series.category] ?? 'var(--v2-text-muted)';
  const discLabel = DISC_LABELS[series.category] ?? series.category;

  // Derive week status from schedule
  const activeWeek = weekResults.find((w) => w.status === 'active');
  const nextUpcoming = weekResults.find((w) => w.status === 'upcoming');
  const lastCompleted = [...weekResults]
    .reverse()
    .find((w) => w.status === 'completed' && w.bestResult);

  const weeksRaced = weekResults.filter(
    (w) => w.status === 'completed' || (w.status === 'active' && w.bestResult)
  ).length;
  const totalWeeks = weekResults.length || 12;

  // Build status line
  const statusWeek: WeekResult | null = activeWeek ?? nextUpcoming ?? null;
  const statusLabel = activeWeek ? 'Now' : nextUpcoming ? 'Next' : null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        background: 'var(--v2-surface)',
        borderRadius: 10,
        border: '1px solid var(--v2-border)',
        transition: 'border-color 0.12s',
      }}
    >
      {/* Car thumbnail */}
      <div
        style={{
          width: 64,
          height: 36,
          borderRadius: 6,
          overflow: 'hidden',
          flexShrink: 0,
          background: 'var(--v2-surface-2)',
          border: '1px solid var(--v2-border)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {carImageUrl && (
          <>
            <Image
              src={carImageUrl}
              alt={series.carName || series.seriesName}
              fill
              unoptimized
              sizes="64px"
              style={{ objectFit: 'cover', objectPosition: 'center 40%', opacity: 0.85 }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(135deg, ${discColor}18 0%, transparent 60%)`,
              }}
            />
          </>
        )}
      </div>

      {/* Name + week status */}
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
        <div style={{ fontSize: 10, color: 'var(--v2-text-muted)', marginTop: 1 }}>
          {discLabel}
          {series.carName ? ` · ${series.carName}` : ''}
        </div>

        {/* Week status row */}
        {statusWeek && statusLabel && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: activeWeek ? 'var(--v2-accent)' : 'var(--v2-text-dim)',
                background: activeWeek ? 'rgba(197,241,49,0.1)' : 'var(--v2-surface-2)',
                border: activeWeek
                  ? '1px solid rgba(197,241,49,0.25)'
                  : '1px solid var(--v2-border)',
                borderRadius: 4,
                padding: '1px 5px',
              }}
            >
              {statusLabel}
            </span>
            <span style={{ fontSize: 10, color: 'var(--v2-text-muted)' }}>
              Wk {statusWeek.displayWeek} · {shortTrackName(statusWeek.schedule?.trackName ?? '')}
              {statusWeek.schedule?.trackConfig ? ` — ${statusWeek.schedule.trackConfig}` : ''}
            </span>
          </div>
        )}

        {/* Last result (if no active/upcoming) */}
        {!statusWeek && lastCompleted?.bestResult && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
            <span
              style={{
                fontFamily: 'var(--font-v2-mono, monospace)',
                fontSize: 11,
                fontWeight: 700,
                color: positionColor(lastCompleted.bestResult.finishPositionInClass),
              }}
            >
              P{lastCompleted.bestResult.finishPositionInClass}
            </span>
            <span style={{ fontSize: 10, color: 'var(--v2-text-dim)' }}>
              Wk {lastCompleted.displayWeek} ·{' '}
              {shortTrackName(lastCompleted.bestResult.trackName ?? '')}
            </span>
          </div>
        )}
      </div>

      {/* Week progress + sparkline */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 4,
        }}
      >
        <Sparkline positions={positions} />
        {weekResults.length > 0 && (
          <div
            style={{
              fontSize: 9,
              color: 'var(--v2-text-dim)',
              fontFamily: 'var(--font-v2-mono, monospace)',
            }}
          >
            {weeksRaced}/{totalWeeks} wks
          </div>
        )}
      </div>

      {/* Points + wins */}
      <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 60 }}>
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
          {series.racesEntered}R · P{series.bestFinish} best
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
        <path d="M5 3l4 4-4 4" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ── Main preview component ────────────────────────────────

export function SeriesRowPreview({ customerId }: { customerId: number | null }) {
  const { data: activeSeries, isLoading } = useActiveSeries(customerId);
  const { data: driverData, setCustomerId } = useDriverData();
  const { races } = driverData;
  const { data: carAssets } = useCarAssets();

  useEffect(() => {
    if (customerId) setCustomerId(customerId);
  }, [customerId, setCustomerId]);

  if (!customerId) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--v2-text-muted)' }}>
        Enter a Customer ID to preview.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--v2-text-muted)' }}>
        Loading series…
      </div>
    );
  }

  const sectionLabel = (text: string) => (
    <div
      style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--v2-text-dim)',
        marginBottom: 10,
      }}
    >
      {text}
    </div>
  );

  return (
    <div style={{ padding: '32px 24px', maxWidth: 900 }}>
      <h1
        style={{
          fontFamily: 'var(--font-v2-sans, system-ui)',
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--v2-text)',
          marginBottom: 6,
          letterSpacing: '-0.01em',
        }}
      >
        Series Row Preview
      </h1>
      <p style={{ fontSize: 12, color: 'var(--v2-text-muted)', marginBottom: 32 }}>
        Left: current Season HQ design · Right: proposed enhanced design
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 32,
        }}
      >
        {/* Current design */}
        <div>
          {sectionLabel('Current')}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              background: 'var(--v2-surface)',
              borderRadius: 12,
              border: '1px solid var(--v2-border)',
              overflow: 'hidden',
            }}
          >
            {activeSeries.map((s) => {
              const asset = s.carId ? carAssets?.[s.carId.toString()] : undefined;
              const carImageUrl = getCarImageUrl(asset, 'small');
              return (
                <CurrentSeriesRow
                  key={s.seriesId}
                  series={s}
                  races={races}
                  carImageUrl={carImageUrl}
                />
              );
            })}
          </div>
        </div>

        {/* Proposed design */}
        <div>
          {sectionLabel('Proposed')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeSeries.map((s) => {
              const asset = s.carId ? carAssets?.[s.carId.toString()] : undefined;
              const carImageUrl = getCarImageUrl(asset, 'small');
              return (
                <ProposedSeriesRow
                  key={s.seriesId}
                  series={s}
                  races={races}
                  carImageUrl={carImageUrl}
                  customerId={customerId}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 40,
          padding: '16px 20px',
          background: 'var(--v2-surface)',
          borderRadius: 10,
          border: '1px solid var(--v2-border)',
        }}
      >
        <div
          style={{ fontSize: 11, fontWeight: 600, color: 'var(--v2-text-muted)', marginBottom: 8 }}
        >
          What&apos;s new in the proposed design
        </div>
        <ul
          style={{
            fontSize: 12,
            color: 'var(--v2-text-muted)',
            lineHeight: 1.8,
            paddingLeft: 16,
            margin: 0,
          }}
        >
          <li>
            <span style={{ color: 'var(--v2-accent)' }}>Now/Next badge</span> — shows active or
            upcoming week track inline on the row
          </li>
          <li>
            <span style={{ color: 'var(--v2-accent)' }}>Week progress</span> —{' '}
            <code
              style={{
                fontSize: 10,
                background: 'var(--v2-surface-2)',
                padding: '1px 4px',
                borderRadius: 3,
              }}
            >
              N/12 wks
            </code>{' '}
            below the sparkline
          </li>
          <li>
            <span style={{ color: 'var(--v2-accent)' }}>Best finish</span> — added alongside wins
            and race count
          </li>
          <li>Separated cards instead of a flush list (easier to scan)</li>
        </ul>
      </div>
    </div>
  );
}

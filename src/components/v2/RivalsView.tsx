'use client';

import { useEffect, useMemo, useState } from 'react';
import { useOpponents } from '@/hooks/useOpponents';
import { useDriverData } from '@/contexts/DriverDataContext';
import { Opponent, OpponentTag, getOpponentTag, setOpponentTag } from '@/lib/opponents';

// ── Types ─────────────────────────────────────────────────

interface OpponentStats extends Opponent {
  totalEnc: number;
  avgPos: number;
  maxIR: number;
  lastSeen: string;
  myWinRate: number; // fraction 0–1
  tag: OpponentTag | null;
  categories: string[];
}

// ── Helpers ───────────────────────────────────────────────

function computeStats(
  opponents: Opponent[],
  myRaces: { subsessionId: number; finishPositionInClass: number }[]
): OpponentStats[] {
  return opponents.map((d) => {
    const enc = d.encounters ?? [];

    const maxIR = Math.max(
      ...enc.map((e) => Math.max(e.iRBefore ?? 0, e.iRAfter ?? 0)),
      d.peakIR ?? 0
    );

    const sorted = enc.slice().sort((a, b) => b.date.localeCompare(a.date));
    const lastSeen = sorted[0]?.date ?? '';

    const avgPos = enc.length ? enc.reduce((s, e) => s + e.pos, 0) / enc.length : 0;

    let iAhead = 0;
    let shared = 0;
    enc.forEach((e) => {
      const myRace = myRaces.find((r) => String(r.subsessionId) === e.raceId);
      if (!myRace) return;
      shared++;
      if (myRace.finishPositionInClass < e.pos) iAhead++;
    });
    const myWinRate = shared > 0 ? iAhead / shared : 0;

    const categories = [...new Set(enc.map((e) => e.category))].filter(Boolean);

    return {
      ...d,
      totalEnc: enc.length,
      avgPos,
      maxIR,
      lastSeen,
      myWinRate,
      tag: getOpponentTag(d),
      categories,
    };
  });
}

function formatLastSeen(date: string): string {
  if (!date) return '—';
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

// ── Tag config ────────────────────────────────────────────

const TAG_STYLES: Record<
  OpponentTag,
  { label: string; color: string; border: string; bg: string }
> = {
  rival: {
    label: 'Rival',
    color: '#60A5FA',
    border: 'rgba(96,165,250,0.3)',
    bg: 'rgba(96,165,250,0.08)',
  },
  friendly: {
    label: 'Friendly',
    color: '#4ADE80',
    border: 'rgba(74,222,128,0.3)',
    bg: 'rgba(74,222,128,0.08)',
  },
  blocker: {
    label: 'Blocker',
    color: '#FB923C',
    border: 'rgba(251,146,60,0.3)',
    bg: 'rgba(251,146,60,0.08)',
  },
};

// ── Category dot ──────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  road: '#C5F131',
  sports_car: '#C5F131',
  formula: '#60A5FA',
  oval: '#FBBF24',
  dirt_oval: '#A78BFA',
  dirt_road: '#34D399',
};

const CAT_LABELS: Record<string, string> = {
  road: 'Road',
  sports_car: 'Road',
  formula: 'Formula',
  oval: 'Oval',
  dirt_oval: 'Dirt Oval',
  dirt_road: 'Dirt Road',
};

function CategoryPill({ category }: { category: string }) {
  const color = CAT_COLORS[category] ?? 'var(--v2-text-muted)';
  const label = CAT_LABELS[category] ?? category;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 7px',
        borderRadius: 99,
        border: `1px solid ${color}30`,
        background: `${color}10`,
        fontSize: 10,
        fontWeight: 600,
        color,
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }}
      />
      {label}
    </span>
  );
}

// ── Win rate bar ──────────────────────────────────────────

function WinRateBar({ rate, shared }: { rate: number; shared: number }) {
  const pct = Math.round(rate * 100);
  const color =
    pct >= 60 ? 'var(--v2-positive)' : pct >= 40 ? 'var(--v2-warning)' : 'var(--v2-negative)';

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: 'var(--v2-text-muted)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Win rate vs you
        </span>
        <span
          style={{
            fontFamily: 'var(--font-v2-mono, monospace)',
            fontSize: 12,
            fontWeight: 700,
            color,
          }}
        >
          {pct}%
        </span>
      </div>
      <div
        style={{
          height: 3,
          background: 'var(--v2-surface-3)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: color,
            borderRadius: 2,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
      {shared > 0 && (
        <div style={{ fontSize: 9, color: 'var(--v2-text-dim)', marginTop: 3 }}>
          {shared} shared race{shared !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

// ── Tag picker ────────────────────────────────────────────

function TagPicker({
  custId,
  opp,
  onChanged,
}: {
  custId: number;
  opp: OpponentStats;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const current = opp.tag;
  const style = current ? TAG_STYLES[current] : null;

  const options: (OpponentTag | null)[] = ['rival', 'friendly', 'blocker', null];

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 9px 3px 7px',
          borderRadius: 99,
          border: `1px solid ${style ? style.border : 'var(--v2-border-hi)'}`,
          background: style ? style.bg : 'transparent',
          color: style ? style.color : 'var(--v2-text-muted)',
          fontSize: 11,
          fontWeight: 600,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'border-color 0.12s',
        }}
      >
        {style ? style.label : 'Tag'}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor">
          <path d="M2 3.5l3 3 3-3" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            background: 'var(--v2-surface-2)',
            border: '1px solid var(--v2-border-hi)',
            borderRadius: 8,
            padding: 4,
            zIndex: 100,
            minWidth: 120,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          {options.map((opt) => {
            const s = opt ? TAG_STYLES[opt] : null;
            const isActive = opt === current;
            return (
              <button
                key={opt ?? 'none'}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpponentTag(custId, opp.iracingId, opt);
                  setOpen(false);
                  onChanged();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: 'none',
                  background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                  color: s ? s.color : 'var(--v2-text-muted)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background =
                    'rgba(255,255,255,0.06)')
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background = isActive
                    ? 'rgba(255,255,255,0.06)'
                    : 'transparent')
                }
              >
                {s && (
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: s.color,
                      flexShrink: 0,
                    }}
                  />
                )}
                {s ? s.label : 'Remove tag'}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Rival card ────────────────────────────────────────────

function RivalCard({
  opp,
  myIR,
  custId,
  myRaces,
  raceInfoMap,
  onChanged,
}: {
  opp: OpponentStats;
  myIR: number;
  custId: number;
  myRaces: { subsessionId: number; finishPositionInClass: number }[];
  raceInfoMap: Record<string, { seriesName: string; carName: string }>;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const irDiff = myIR > 0 && opp.maxIR > 0 ? opp.maxIR - myIR : null;
  const tagStyle = opp.tag ? TAG_STYLES[opp.tag] : null;

  // Recompute shared count for the bar label
  const shared = useMemo(() => {
    return opp.encounters.filter((e) => myRaces.some((r) => String(r.subsessionId) === e.raceId))
      .length;
  }, [opp.encounters, myRaces]);

  // Group encounters by series name, sorted by count desc
  const seriesBreakdown = useMemo(() => {
    const map: Record<
      string,
      { seriesName: string; carName: string; count: number; category: string }
    > = {};
    opp.encounters.forEach((e) => {
      const info = raceInfoMap[e.raceId];
      const seriesName = info?.seriesName || e.seriesName || e.category;
      const carName = info?.carName || e.carName || '';
      if (!map[seriesName]) {
        map[seriesName] = { seriesName, carName, count: 0, category: e.category };
      }
      map[seriesName].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [opp.encounters, raceInfoMap]);

  return (
    <div
      style={{
        background: 'var(--v2-surface)',
        borderRadius: 12,
        border: tagStyle ? `1px solid ${tagStyle.border}` : '1px solid var(--v2-border)',
        overflow: 'hidden',
        transition: 'border-color 0.12s',
      }}
    >
      {/* Main card body — clickable to expand */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setExpanded((v) => !v)}
        style={{
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          cursor: 'pointer',
        }}
      >
        {/* Name row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--v2-text)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {opp.name}
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-v2-mono, monospace)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--v2-accent)',
                  flexShrink: 0,
                }}
              >
                {opp.totalEnc}×
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 3 }}>
              <span
                style={{
                  fontFamily: 'var(--font-v2-mono, monospace)',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--v2-text-muted)',
                }}
              >
                {opp.maxIR > 0 ? opp.maxIR.toLocaleString() : '—'} iR
              </span>
              {irDiff !== null && (
                <span
                  style={{
                    fontFamily: 'var(--font-v2-mono, monospace)',
                    fontSize: 11,
                    fontWeight: 600,
                    color:
                      irDiff > 0
                        ? 'var(--v2-negative)'
                        : irDiff < 0
                          ? 'var(--v2-positive)'
                          : 'var(--v2-text-muted)',
                  }}
                >
                  {irDiff > 0 ? '+' : ''}
                  {irDiff.toLocaleString()}
                </span>
              )}
              <span style={{ fontSize: 10, color: 'var(--v2-text-dim)', marginLeft: 'auto' }}>
                {formatLastSeen(opp.lastSeen)}
              </span>
            </div>
          </div>
          {/* Chevron */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="var(--v2-text-dim)"
            style={{
              flexShrink: 0,
              marginTop: 2,
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          >
            <path d="M3 5l4 4 4-4" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Win rate bar */}
        <WinRateBar rate={opp.myWinRate} shared={shared} />

        {/* Categories + tag */}
        <div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
        >
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {opp.categories.map((cat) => (
              <CategoryPill key={cat} category={cat} />
            ))}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <TagPicker custId={custId} opp={opp} onChanged={onChanged} />
          </div>
        </div>
      </div>

      {/* Expanded series breakdown */}
      {expanded && (
        <div
          style={{
            borderTop: '1px solid var(--v2-border)',
            padding: '12px 18px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--v2-text-dim)',
              marginBottom: 4,
            }}
          >
            Series competed together
          </div>
          {seriesBreakdown.map((s) => (
            <div
              key={s.seriesName}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: CAT_COLORS[s.category] ?? 'var(--v2-text-muted)',
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--v2-text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.seriesName}
                </div>
                {s.carName && (
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--v2-text-muted)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {s.carName}
                  </div>
                )}
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-v2-mono, monospace)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--v2-accent)',
                  flexShrink: 0,
                }}
              >
                {s.count}×
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── All opponents table row ───────────────────────────────

function TableRow({
  opp,
  myIR,
  custId,
  raceInfoMap,
  onChanged,
}: {
  opp: OpponentStats;
  myIR: number;
  custId: number;
  raceInfoMap: Record<string, { seriesName: string; carName: string }>;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const irDiff = myIR > 0 && opp.maxIR > 0 ? opp.maxIR - myIR : null;
  const pct = Math.round(opp.myWinRate * 100);
  const winColor =
    pct >= 60 ? 'var(--v2-positive)' : pct >= 40 ? 'var(--v2-warning)' : 'var(--v2-negative)';

  const seriesBreakdown = useMemo(() => {
    const map: Record<
      string,
      { seriesName: string; carName: string; count: number; category: string }
    > = {};
    opp.encounters.forEach((e) => {
      const info = raceInfoMap[e.raceId];
      const seriesName = info?.seriesName || e.seriesName || e.category;
      const carName = info?.carName || e.carName || '';
      if (!map[seriesName]) {
        map[seriesName] = { seriesName, carName, count: 0, category: e.category };
      }
      map[seriesName].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [opp.encounters, raceInfoMap]);

  return (
    <div style={{ borderTop: '1px solid var(--v2-border)' }}>
      {/* Main row */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setExpanded((v) => !v)}
        className="v2-table-row"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 90px 80px 60px 80px',
          alignItems: 'center',
          gap: 12,
          padding: '10px 14px',
          cursor: 'pointer',
          transition: 'background 0.1s',
          background: expanded ? 'var(--v2-surface-2)' : 'transparent',
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLDivElement).style.background = 'var(--v2-surface-2)')
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLDivElement).style.background = expanded
            ? 'var(--v2-surface-2)'
            : 'transparent')
        }
      >
        {/* Name + races + categories */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--v2-text)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
              }}
            >
              {opp.name}
            </div>
            <span
              style={{
                fontFamily: 'var(--font-v2-mono, monospace)',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--v2-text-muted)',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {opp.totalEnc}×
            </span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="var(--v2-text-dim)"
              style={{
                flexShrink: 0,
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            >
              <path
                d="M2 4.5l4 3 4-3"
                strokeWidth={1.3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div style={{ display: 'flex', gap: 3, marginTop: 3, flexWrap: 'wrap' }}>
            {opp.categories.slice(0, 3).map((cat) => (
              <span
                key={cat}
                style={{
                  fontSize: 9,
                  color: CAT_COLORS[cat] ?? 'var(--v2-text-muted)',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                }}
              >
                {CAT_LABELS[cat] ?? cat}
              </span>
            ))}
          </div>
        </div>

        {/* iR + diff */}
        <div>
          <div
            style={{
              fontFamily: 'var(--font-v2-mono, monospace)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--v2-text)',
            }}
          >
            {opp.maxIR > 0 ? opp.maxIR.toLocaleString() : '—'}
          </div>
          {irDiff !== null && (
            <div
              style={{
                fontFamily: 'var(--font-v2-mono, monospace)',
                fontSize: 10,
                color:
                  irDiff > 0
                    ? 'var(--v2-negative)'
                    : irDiff < 0
                      ? 'var(--v2-positive)'
                      : 'var(--v2-text-dim)',
              }}
            >
              {irDiff > 0 ? '+' : ''}
              {irDiff.toLocaleString()}
            </div>
          )}
        </div>

        {/* Win rate bar */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div
              style={{
                flex: 1,
                height: 3,
                background: 'var(--v2-surface-3)',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{ height: '100%', width: `${pct}%`, background: winColor, borderRadius: 2 }}
              />
            </div>
            <span
              style={{
                fontFamily: 'var(--font-v2-mono, monospace)',
                fontSize: 10,
                fontWeight: 600,
                color: winColor,
                width: 26,
                textAlign: 'right',
                flexShrink: 0,
              }}
            >
              {pct}%
            </span>
          </div>
        </div>

        {/* Last seen */}
        <div
          className="v2-hide-mobile"
          style={{ fontSize: 10, color: 'var(--v2-text-muted)', textAlign: 'right' }}
        >
          {formatLastSeen(opp.lastSeen)}
        </div>

        {/* Tag picker */}
        <div
          className="v2-hide-mobile"
          style={{ display: 'flex', justifyContent: 'flex-end' }}
          onClick={(e) => e.stopPropagation()}
        >
          <TagPicker custId={custId} opp={opp} onChanged={onChanged} />
        </div>
      </div>

      {/* Expanded series breakdown */}
      {expanded && (
        <div
          style={{
            padding: '10px 14px 14px 36px',
            background: 'var(--v2-surface-2)',
            display: 'flex',
            flexDirection: 'column',
            gap: 7,
            borderTop: '1px solid var(--v2-border)',
          }}
        >
          {seriesBreakdown.map((s) => (
            <div key={s.seriesName} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: CAT_COLORS[s.category] ?? 'var(--v2-text-muted)',
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--v2-text)',
                    marginRight: 6,
                  }}
                >
                  {s.seriesName}
                </span>
                {s.carName && (
                  <span style={{ fontSize: 11, color: 'var(--v2-text-muted)' }}>· {s.carName}</span>
                )}
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-v2-mono, monospace)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--v2-accent)',
                  flexShrink: 0,
                }}
              >
                {s.count}×
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Table header ──────────────────────────────────────────

function TableHeader() {
  const cell = (label: string, align: 'left' | 'right' = 'left') => (
    <div
      style={{
        fontSize: 9,
        fontWeight: 700,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.1em',
        color: 'var(--v2-text-dim)',
        textAlign: align,
      }}
    >
      {label}
    </div>
  );
  return (
    <div
      className="v2-table-header"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 90px 80px 60px 80px',
        gap: 12,
        padding: '8px 14px',
        borderBottom: '1px solid var(--v2-border)',
      }}
    >
      {cell('Driver')}
      {cell('iRating')}
      {cell('Win rate')}
      <div className="v2-hide-mobile">{cell('Last seen', 'right')}</div>
      <div className="v2-hide-mobile">{cell('Tag', 'right')}</div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────

function EmptyState() {
  return (
    <div
      style={{
        padding: '60px 24px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--v2-surface-2)',
          border: '1px solid var(--v2-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width={24}
          height={24}
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--v2-text-dim)"
          strokeWidth={1.5}
        >
          <circle cx="9" cy="7" r="4" />
          <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
          <path d="M16 11l2 2 4-4" />
        </svg>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--v2-text)' }}>No opponents yet</div>
      <div style={{ fontSize: 13, color: 'var(--v2-text-muted)', maxWidth: 320, lineHeight: 1.6 }}>
        Opponent data builds up as you view race details. Open any race from the Race Log or Season
        HQ to start tracking who you raced against.
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────

const PAGE_SIZE = 30;

interface RivalsViewProps {
  customerId: number | null;
}

export function RivalsView({ customerId }: RivalsViewProps) {
  const { opponents, refresh } = useOpponents();
  const { data: driverData, setCustomerId } = useDriverData();
  const { races } = driverData;

  const [tab, setTab] = useState<'tagged' | 'all'>('tagged');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [crossSeriesOnly, setCrossSeriesOnly] = useState(false);

  useEffect(() => {
    if (customerId) setCustomerId(customerId);
  }, [customerId, setCustomerId]);

  const myRaces = useMemo(
    () =>
      races.map((r) => ({
        subsessionId: r.subsessionId,
        finishPositionInClass: r.finishPositionInClass,
      })),
    [races]
  );

  // Lookup map: subsessionId → { seriesName, carName } for enriching old encounters
  const raceInfoMap = useMemo(() => {
    const map: Record<string, { seriesName: string; carName: string }> = {};
    races.forEach((r) => {
      map[String(r.subsessionId)] = { seriesName: r.seriesName, carName: r.carName };
    });
    return map;
  }, [races]);

  // My current iRating — latest race with a valid new rating
  const myIR = useMemo(() => {
    const sorted = [...races]
      .filter((r) => r.newIRating > 0)
      .sort(
        (a, b) => new Date(b.sessionStartTime).getTime() - new Date(a.sessionStartTime).getTime()
      );
    return sorted[0]?.newIRating ?? 0;
  }, [races]);

  const allStats = useMemo(() => {
    if (!opponents.length) return [];
    return computeStats(opponents, myRaces).sort((a, b) => b.totalEnc - a.totalEnc);
  }, [opponents, myRaces]);

  const taggedStats = useMemo(() => allStats.filter((o) => o.tag !== null), [allStats]);

  const filteredAll = useMemo(() => {
    let base = allStats;
    if (crossSeriesOnly) {
      base = base.filter((o) => new Set(o.encounters.map((e) => e.category)).size > 1);
    }
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter((o) => o.name.toLowerCase().includes(q));
  }, [allStats, search, crossSeriesOnly]);

  const pageSlice = filteredAll.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filteredAll.length / PAGE_SIZE);

  // Header stats
  const crossSeries = allStats.filter((o) => {
    const cats = new Set(o.encounters.map((e) => e.category));
    return cats.size > 1;
  }).length;
  const highestIR = allStats.reduce((max, o) => Math.max(max, o.maxIR), 0);

  if (!customerId) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--v2-text-muted)' }}>
        Enter a Customer ID to view rivals.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* ── Page header ────────────────────────────────── */}
      <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid var(--v2-border)' }}>
        <h1
          style={{
            fontFamily: 'var(--font-v2-sans, system-ui)',
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--v2-text)',
            margin: '0 0 16px',
            letterSpacing: '-0.01em',
          }}
        >
          Rivals
        </h1>

        {/* Header stat chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div className="v2-stat-chip" style={{ minWidth: 80 }}>
            <span className="chip-label">Opponents</span>
            <span className="chip-value">{allStats.length}</span>
          </div>
          <div className="v2-stat-chip" style={{ minWidth: 80 }}>
            <span className="chip-label">Tagged</span>
            <span className="chip-value">{taggedStats.length}</span>
          </div>

          {/* Cross-series — clickable filter */}
          <button
            onClick={() => {
              const next = !crossSeriesOnly;
              setCrossSeriesOnly(next);
              if (next) {
                setTab('all');
                setPage(0);
                setSearch('');
              }
            }}
            className="v2-stat-chip"
            style={{
              minWidth: 80,
              cursor: 'pointer',
              border: crossSeriesOnly ? '1px solid var(--v2-accent)' : '1px solid var(--v2-border)',
              background: crossSeriesOnly ? 'var(--v2-accent-glow)' : 'var(--v2-surface)',
              textAlign: 'left',
            }}
            title={
              crossSeriesOnly ? 'Clear cross-series filter' : 'Show only cross-series opponents'
            }
          >
            <span
              className="chip-label"
              style={{ color: crossSeriesOnly ? 'var(--v2-accent)' : undefined }}
            >
              Cross-series
            </span>
            <span className={`chip-value${crossSeriesOnly ? ' accent' : ''}`}>{crossSeries}</span>
          </button>

          <div className="v2-stat-chip" style={{ minWidth: 80 }}>
            <span className="chip-label">Highest iR met</span>
            <span className="chip-value accent">
              {highestIR > 0 ? highestIR.toLocaleString() : '—'}
            </span>
          </div>
        </div>
      </div>

      {opponents.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* ── Tab pills ────────────────────────────────── */}
          <div style={{ padding: '16px 24px 0', display: 'flex', gap: 6 }}>
            {(
              [
                { key: 'tagged', label: `Tagged (${taggedStats.length})` },
                { key: 'all', label: `All (${allStats.length})` },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => {
                  setTab(key);
                  setPage(0);
                }}
                style={{
                  padding: '5px 14px',
                  borderRadius: 99,
                  border: tab === key ? '1px solid var(--v2-accent)' : '1px solid var(--v2-border)',
                  background: tab === key ? 'var(--v2-accent-glow)' : 'transparent',
                  color: tab === key ? 'var(--v2-accent)' : 'var(--v2-text-muted)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Tagged rivals grid ──────────────────────── */}
          {tab === 'tagged' && (
            <div style={{ padding: '20px 24px 32px' }}>
              {taggedStats.length === 0 ? (
                <div
                  style={{
                    padding: '40px 0',
                    textAlign: 'center',
                    color: 'var(--v2-text-muted)',
                    fontSize: 13,
                  }}
                >
                  No tagged opponents yet. Use the Tag button on any opponent in the All tab to add
                  them here.
                </div>
              ) : (
                <>
                  {/* Group by tag */}
                  {(['rival', 'friendly', 'blocker'] as OpponentTag[]).map((tagKey) => {
                    const group = taggedStats.filter((o) => o.tag === tagKey);
                    if (group.length === 0) return null;
                    const s = TAG_STYLES[tagKey];
                    return (
                      <div key={tagKey} style={{ marginBottom: 28 }}>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: s.color,
                            marginBottom: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 7,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: s.color,
                              display: 'inline-block',
                            }}
                          />
                          {s.label}s ({group.length})
                        </div>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: 12,
                          }}
                        >
                          {group.map((opp) => (
                            <RivalCard
                              key={opp.iracingId}
                              opp={opp}
                              myIR={myIR}
                              custId={customerId}
                              myRaces={myRaces}
                              raceInfoMap={raceInfoMap}
                              onChanged={refresh}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* ── All opponents table ─────────────────────── */}
          {tab === 'all' && (
            <div style={{ padding: '20px 24px 32px' }}>
              {/* Search */}
              <div style={{ marginBottom: 16 }}>
                <input
                  type="text"
                  placeholder="Search by name…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                  style={{
                    width: '100%',
                    maxWidth: 320,
                    padding: '8px 12px',
                    background: 'var(--v2-surface)',
                    border: '1px solid var(--v2-border)',
                    borderRadius: 8,
                    color: 'var(--v2-text)',
                    fontSize: 13,
                    outline: 'none',
                    transition: 'border-color 0.12s',
                  }}
                  onFocus={(e) =>
                    ((e.currentTarget as HTMLInputElement).style.borderColor =
                      'var(--v2-border-hi)')
                  }
                  onBlur={(e) =>
                    ((e.currentTarget as HTMLInputElement).style.borderColor = 'var(--v2-border)')
                  }
                />
                {search && (
                  <span style={{ marginLeft: 10, fontSize: 11, color: 'var(--v2-text-muted)' }}>
                    {filteredAll.length} result{filteredAll.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Table */}
              <div
                style={{
                  background: 'var(--v2-surface)',
                  borderRadius: 12,
                  border: '1px solid var(--v2-border)',
                  overflow: 'hidden',
                }}
              >
                <TableHeader />
                {pageSlice.map((opp) => (
                  <TableRow
                    key={opp.iracingId}
                    opp={opp}
                    myIR={myIR}
                    custId={customerId}
                    raceInfoMap={raceInfoMap}
                    onChanged={refresh}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginTop: 16,
                  }}
                >
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--v2-border)',
                      background: 'transparent',
                      color: page === 0 ? 'var(--v2-text-dim)' : 'var(--v2-text-muted)',
                      fontSize: 12,
                      cursor: page === 0 ? 'default' : 'pointer',
                    }}
                  >
                    ←
                  </button>
                  <span style={{ fontSize: 12, color: 'var(--v2-text-muted)' }}>
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--v2-border)',
                      background: 'transparent',
                      color: page >= totalPages - 1 ? 'var(--v2-text-dim)' : 'var(--v2-text-muted)',
                      fontSize: 12,
                      cursor: page >= totalPages - 1 ? 'default' : 'pointer',
                    }}
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

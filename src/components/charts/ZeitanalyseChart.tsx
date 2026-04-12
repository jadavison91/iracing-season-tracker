'use client';

import { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import { ZeitanalyseData } from '@/lib/mock-data';

type View = 'dayOfWeek' | 'hourOfDay';
type Metric = 'avgFinish' | 'avgIncidents' | 'winRate' | 'avgIRDelta';

const METRIC_LABELS: Record<Metric, string> = {
  avgFinish: 'Avg Finish',
  avgIncidents: 'Avg Incidents',
  winRate: 'Win %',
  avgIRDelta: 'iR Delta',
};

// Lower = better for finish and incidents; higher = better for win rate and iR delta
const METRIC_LOWER_IS_BETTER: Record<Metric, boolean> = {
  avgFinish: true,
  avgIncidents: true,
  winRate: false,
  avgIRDelta: false,
};

function metricColor(value: number, metric: Metric, allValues: number[]): string {
  const nonZero = allValues.filter((v) => v !== 0);
  if (nonZero.length === 0) return '#94a3b8';

  const min = Math.min(...nonZero);
  const max = Math.max(...nonZero);

  if (min === max) return '#94a3b8';

  const normalized = (value - min) / (max - min); // 0 = min, 1 = max
  const goodness = METRIC_LOWER_IS_BETTER[metric] ? 1 - normalized : normalized;

  if (goodness >= 0.6) return '#10b981'; // green
  if (goodness <= 0.35) return '#ef4444'; // red
  return '#f59e0b'; // amber
}

function formatValue(value: number, metric: Metric): string {
  if (value === 0) return '—';
  if (metric === 'avgIRDelta') return `${value > 0 ? '+' : ''}${value}`;
  if (metric === 'winRate') return `${value}%`;
  if (metric === 'avgFinish') return `P${value}`;
  return `${value}x`;
}

interface ZeitanalyseChartProps {
  data: ZeitanalyseData;
}

export function ZeitanalyseChart({ data }: ZeitanalyseChartProps) {
  const [view, setView] = useState<View>('dayOfWeek');
  const [metric, setMetric] = useState<Metric>('avgFinish');

  const points = view === 'dayOfWeek' ? data.byDayOfWeek : data.byHourOfDay;

  const allValues = points.map((p) => p[metric] as number);

  const chartData = points.map((p) => ({
    ...p,
    value: p.races > 0 ? (p[metric] as number) : null,
    color: p.races > 0 ? metricColor(p[metric] as number, metric, allValues) : '#e2e8f0',
  }));

  const hasData = points.some((p) => p.races > 0);
  const avgValue =
    points.filter((p) => p.races > 0).reduce((s, p) => s + (p[metric] as number), 0) /
    (points.filter((p) => p.races > 0).length || 1);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* View toggle */}
        <div className="flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-700">
          {(['dayOfWeek', 'hourOfDay'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                view === v
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              {v === 'dayOfWeek' ? 'Day of Week' : 'Time of Day'}
            </button>
          ))}
        </div>

        {/* Metric selector */}
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(METRIC_LABELS) as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                metric === m
                  ? 'bg-blue-600 text-white dark:bg-blue-500'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
              }`}
            >
              {METRIC_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="flex h-[220px] items-center justify-center text-sm text-zinc-400">
          No race data available
        </div>
      ) : (
        <>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-zinc-200 dark:stroke-zinc-700"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  className="text-zinc-500"
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="text-zinc-500"
                  tickFormatter={(v) =>
                    metric === 'avgFinish'
                      ? `P${v}`
                      : metric === 'winRate'
                        ? `${v}%`
                        : metric === 'avgIncidents'
                          ? `${v}x`
                          : `${v > 0 ? '+' : ''}${v}`
                  }
                  reversed={metric === 'avgFinish'}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as (typeof chartData)[0];
                    if (p.races === 0) return null;
                    return (
                      <div className="rounded-lg border bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                        <p className="font-medium">{p.label}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {p.races} race{p.races !== 1 ? 's' : ''}
                        </p>
                        <div className="mt-2 space-y-0.5 text-sm">
                          <p>
                            Avg Finish: <span className="font-medium">P{p.avgFinish}</span>
                          </p>
                          <p>
                            Avg Inc: <span className="font-medium">{p.avgIncidents}x</span>
                          </p>
                          <p>
                            Win Rate: <span className="font-medium">{p.winRate}%</span>
                          </p>
                          <p>
                            Avg iR Δ:{' '}
                            <span
                              className={`font-medium ${p.avgIRDelta >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}
                            >
                              {p.avgIRDelta > 0 ? '+' : ''}
                              {p.avgIRDelta}
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  }}
                />
                {metric !== 'avgFinish' && (
                  <ReferenceLine
                    y={avgValue}
                    stroke="#94a3b8"
                    strokeDasharray="5 5"
                    label={{
                      value: `Avg: ${formatValue(Math.round(avgValue * 10) / 10, metric)}`,
                      position: 'right',
                      fill: '#94a3b8',
                      fontSize: 10,
                    }}
                  />
                )}
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} fillOpacity={entry.races > 0 ? 0.85 : 0.2} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-500">
            Times are in UTC
          </p>
        </>
      )}
    </div>
  );
}

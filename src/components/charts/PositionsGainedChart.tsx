'use client';

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
import { PositionsGainedPoint } from '@/lib/mock-data';

interface PositionsGainedChartProps {
  data: PositionsGainedPoint[];
}

export function PositionsGainedChart({ data }: PositionsGainedChartProps) {
  const chartData = data.map((p) => ({
    ...p,
    dateLabel: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  const avg =
    data.length > 0
      ? Math.round((data.reduce((s, p) => s + p.gained, 0) / data.length) * 10) / 10
      : 0;

  return (
    <div className="h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
          <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} className="text-zinc-500" />
          <YAxis tick={{ fontSize: 11 }} className="text-zinc-500" />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as PositionsGainedPoint & { dateLabel: string };
              return (
                <div className="rounded-lg border bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                  <p className="font-medium">{p.dateLabel}</p>
                  <p className="max-w-[200px] truncate text-sm text-zinc-500">{p.trackName}</p>
                  <p className="mt-1 text-sm">
                    P{p.startPos} → P{p.finishPos}
                    <span
                      className={`ml-2 font-semibold ${p.gained > 0 ? 'text-green-600' : p.gained < 0 ? 'text-red-500' : 'text-zinc-400'}`}
                    >
                      {p.gained > 0 ? `+${p.gained}` : p.gained}
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500">{p.seriesName}</p>
                </div>
              );
            }}
          />
          <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
          {avg !== 0 && (
            <ReferenceLine
              y={avg}
              stroke="#94a3b8"
              strokeDasharray="5 5"
              label={{
                value: `Avg: ${avg > 0 ? '+' : ''}${avg}`,
                position: 'right',
                fill: '#94a3b8',
                fontSize: 11,
              }}
            />
          )}
          <Bar dataKey="gained" radius={[3, 3, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.gained > 0 ? '#10b981' : entry.gained < 0 ? '#ef4444' : '#94a3b8'}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { RecentRace } from '@/lib/iracing/types';

interface FinishPositionChartProps {
  races: RecentRace[];
}

interface ChartDataPoint {
  date: string;
  shortDate: string;
  track: string;
  finish: number;
  start: number;
  points: number;
  sof: number;
}

export function FinishPositionChart({ races }: FinishPositionChartProps) {
  const chartData = useMemo((): ChartDataPoint[] => {
    // Sort races by date (oldest first for the chart)
    const sortedRaces = [...races].sort(
      (a, b) => new Date(a.sessionStartTime).getTime() - new Date(b.sessionStartTime).getTime()
    );

    return sortedRaces.map((race) => {
      const date = new Date(race.sessionStartTime);
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        shortDate: date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
        track: race.trackName.split(' - ')[0], // Get just the track name, not config
        finish: race.finishPositionInClass,
        start: race.startPositionInClass,
        points: race.champPoints,
        sof: race.strengthOfField,
      };
    });
  }, [races]);

  // Calculate the Y-axis domain (inverted - 1 at top)
  const maxPosition = Math.max(...chartData.map((d) => Math.max(d.finish, d.start)));
  const yAxisMax = Math.min(Math.ceil(maxPosition / 5) * 5 + 5, maxPosition + 5);

  // Calculate average finish for reference line
  const avgFinish = chartData.reduce((sum, d) => sum + d.finish, 0) / chartData.length;

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-500">
        No race data available
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            className="text-zinc-600 dark:text-zinc-400"
          />
          <YAxis
            reversed
            domain={[1, yAxisMax]}
            tick={{ fontSize: 12 }}
            className="text-zinc-600 dark:text-zinc-400"
            label={{
              value: 'Position',
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fontSize: 12 },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={avgFinish}
            stroke="#9ca3af"
            strokeDasharray="5 5"
            label={{
              value: `Avg: ${avgFinish.toFixed(1)}`,
              position: 'right',
              fill: '#9ca3af',
              fontSize: 11,
            }}
          />
          <Line
            type="monotone"
            dataKey="start"
            stroke="#94a3b8"
            strokeWidth={1}
            strokeDasharray="4 4"
            dot={{ fill: '#94a3b8', r: 3 }}
            name="Start"
          />
          <Line
            type="monotone"
            dataKey="finish"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 4 }}
            activeDot={{ r: 6, fill: '#2563eb' }}
            name="Finish"
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-2 flex justify-center gap-6 text-xs">
        <div className="flex items-center gap-1">
          <div className="h-0.5 w-4 bg-blue-500" />
          <span className="text-zinc-600 dark:text-zinc-400">Finish</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-0.5 w-4 bg-zinc-400" style={{ borderTop: '2px dashed' }} />
          <span className="text-zinc-600 dark:text-zinc-400">Start</span>
        </div>
      </div>
    </div>
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    payload: ChartDataPoint;
  }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  const positionChange = data.start - data.finish;
  const changeColor =
    positionChange > 0 ? 'text-green-600' : positionChange < 0 ? 'text-red-600' : 'text-zinc-500';
  const changeText =
    positionChange > 0 ? `+${positionChange}` : positionChange < 0 ? `${positionChange}` : '±0';

  return (
    <div className="rounded-lg border bg-white p-3 shadow-lg dark:bg-zinc-800 dark:border-zinc-700">
      <p className="font-medium text-zinc-900 dark:text-zinc-100">{data.track}</p>
      <p className="text-xs text-zinc-500">{data.date}</p>
      <div className="mt-2 space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-zinc-500">Start:</span>
          <span>P{data.start}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-zinc-500">Finish:</span>
          <span className="font-medium">P{data.finish}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-zinc-500">Change:</span>
          <span className={changeColor}>{changeText}</span>
        </div>
        <div className="flex justify-between gap-4 border-t pt-1 dark:border-zinc-700">
          <span className="text-zinc-500">Points:</span>
          <span>{data.points}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-zinc-500">SoF:</span>
          <span>{data.sof.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

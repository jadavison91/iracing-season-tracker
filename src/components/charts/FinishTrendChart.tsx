'use client';

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface FinishData {
  date: string;
  seriesId: number;
  seriesName: string;
  finishPosition: number;
  rollingAvg: number;
  trackName: string;
}

interface FinishTrendChartProps {
  data: FinishData[];
}

export function FinishTrendChart({ data }: FinishTrendChartProps) {
  const chartData = data.map((point) => ({
    ...point,
    dateLabel: new Date(point.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }));

  const getFinishColor = (position: number) => {
    if (position === 1) return '#eab308';
    if (position <= 3) return '#10b981';
    if (position <= 5) return '#3b82f6';
    if (position <= 10) return '#6b7280';
    return '#94a3b8';
  };

  return (
    <div className="h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 11 }}
            className="text-zinc-500"
          />
          <YAxis
            reversed
            domain={[1, 'dataMax + 5']}
            tick={{ fontSize: 11 }}
            className="text-zinc-500"
            label={{
              value: 'Position',
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fill: '#71717a', fontSize: 11 },
            }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const point = payload[0].payload as FinishData & { dateLabel: string };

              return (
                <div className="rounded-lg border bg-white p-3 shadow-lg dark:bg-zinc-800 dark:border-zinc-700">
                  <p className="font-medium">{point.dateLabel}</p>
                  <p className="text-sm text-zinc-500 truncate max-w-[200px]">{point.trackName}</p>
                  <div className="mt-1 space-y-1">
                    <p className="text-sm">
                      Finish:{' '}
                      <span
                        className="font-semibold"
                        style={{ color: getFinishColor(point.finishPosition) }}
                      >
                        P{point.finishPosition}
                      </span>
                    </p>
                    <p className="text-sm text-zinc-500">
                      5-race avg: P{point.rollingAvg}
                    </p>
                  </div>
                </div>
              );
            }}
          />
          <Bar
            dataKey="finishPosition"
            fill="#94a3b8"
            radius={[4, 4, 0, 0]}
            maxBarSize={30}
          />
          <Line
            type="monotone"
            dataKey="rollingAvg"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="5-race avg"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

interface IncidentData {
  date: string;
  seriesId: number;
  seriesName: string;
  incidents: number;
  trackName: string;
}

interface IncidentTrendChartProps {
  data: IncidentData[];
}

export function IncidentTrendChart({ data }: IncidentTrendChartProps) {
  const chartData = data.map((point) => ({
    ...point,
    dateLabel: new Date(point.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }));

  const avgIncidents = data.length > 0
    ? Math.round((data.reduce((sum, d) => sum + d.incidents, 0) / data.length) * 10) / 10
    : 0;

  return (
    <div className="h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="incidentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 11 }}
            className="text-zinc-500"
          />
          <YAxis
            domain={[0, 'dataMax + 2']}
            tick={{ fontSize: 11 }}
            className="text-zinc-500"
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const point = payload[0].payload as IncidentData & { dateLabel: string };

              return (
                <div className="rounded-lg border bg-white p-3 shadow-lg dark:bg-zinc-800 dark:border-zinc-700">
                  <p className="font-medium">{point.dateLabel}</p>
                  <p className="text-sm text-zinc-500 truncate max-w-[200px]">{point.trackName}</p>
                  <p className="text-sm mt-1">
                    <span className={point.incidents === 0 ? 'text-green-600' : point.incidents >= 4 ? 'text-red-600' : 'text-yellow-600'}>
                      {point.incidents}x incidents
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500">{point.seriesName}</p>
                </div>
              );
            }}
          />
          <ReferenceLine
            y={avgIncidents}
            stroke="#94a3b8"
            strokeDasharray="5 5"
            label={{
              value: `Avg: ${avgIncidents}x`,
              position: 'right',
              fill: '#94a3b8',
              fontSize: 11,
            }}
          />
          <Area
            type="monotone"
            dataKey="incidents"
            stroke="#ef4444"
            strokeWidth={2}
            fill="url(#incidentGradient)"
            dot={(props) => {
              const { cx, cy, payload } = props;
              const color = payload.incidents === 0 ? '#10b981' : payload.incidents >= 4 ? '#ef4444' : '#f59e0b';
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill={color}
                  stroke="white"
                  strokeWidth={2}
                />
              );
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

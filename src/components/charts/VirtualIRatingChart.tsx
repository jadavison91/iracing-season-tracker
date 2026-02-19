'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface VirtualIRatingData {
  seriesId: number;
  seriesName: string;
  data: {
    date: string;
    trackName: string;
    virtualIRating: number;
    delta: number;
    baseline: number;
  }[];
}

interface VirtualIRatingChartProps {
  data: VirtualIRatingData[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function VirtualIRatingChart({ data }: VirtualIRatingChartProps) {
  // Combine all series data into a unified timeline
  const allDates = new Set<string>();
  data.forEach((series) => {
    series.data.forEach((point) => {
      allDates.add(point.date);
    });
  });

  const sortedDates = Array.from(allDates).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  // Create chart data with all series
  const chartData = sortedDates.map((date) => {
    const point: Record<string, number | string> = {
      date,
      dateLabel: new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    };

    data.forEach((series, idx) => {
      const seriesPoint = series.data.find((p) => p.date === date);
      if (seriesPoint) {
        point[`series_${idx}`] = seriesPoint.virtualIRating;
        point[`delta_${idx}`] = seriesPoint.delta;
        point[`track_${idx}`] = seriesPoint.trackName;
      }
    });

    return point;
  });

  // Fill in missing values with previous value (for continuous lines)
  data.forEach((_, idx) => {
    let lastValue: number | undefined;
    chartData.forEach((point) => {
      if (point[`series_${idx}`] !== undefined) {
        lastValue = point[`series_${idx}`] as number;
      } else if (lastValue !== undefined) {
        point[`series_${idx}`] = lastValue;
      }
    });
  });

  const formatSeriesName = (name: string) => {
    // Shorten series names for legend
    if (name.includes('Production Car')) return 'Production Car';
    if (name.includes('Spec Racer Ford')) return 'Spec Racer Ford';
    if (name.includes('Pro 2 Lite')) return 'Pro 2 Lite';
    if (name.includes('Mustang')) return 'Mustang';
    return name.split(' ').slice(0, 2).join(' ');
  };

  return (
    <div className="h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 12 }}
            className="text-zinc-500"
          />
          <YAxis
            domain={['dataMin - 50', 'dataMax + 50']}
            tick={{ fontSize: 12 }}
            className="text-zinc-500"
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;

              return (
                <div className="rounded-lg border bg-white p-3 shadow-lg dark:bg-zinc-800 dark:border-zinc-700">
                  <p className="font-medium mb-2">{label}</p>
                  {payload.map((entry, idx) => {
                    if (entry.value === undefined) return null;
                    const seriesIdx = parseInt(entry.dataKey?.toString().split('_')[1] || '0');
                    const seriesData = data[seriesIdx];
                    const delta = chartData.find((d) => d.dateLabel === label)?.[`delta_${seriesIdx}`];
                    const track = chartData.find((d) => d.dateLabel === label)?.[`track_${seriesIdx}`];

                    return (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="font-medium">{formatSeriesName(seriesData?.seriesName || '')}</span>
                        <span>{entry.value}</span>
                        {typeof delta === 'number' && delta !== 0 && (
                          <span className={delta > 0 ? 'text-green-600' : 'text-red-600'}>
                            ({delta > 0 ? '+' : ''}{delta})
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            }}
          />
          <Legend
            formatter={(value, entry) => {
              const idx = parseInt(value.split('_')[1]);
              return formatSeriesName(data[idx]?.seriesName || '');
            }}
          />
          {data.map((series, idx) => (
            <Line
              key={series.seriesId}
              type="monotone"
              dataKey={`series_${idx}`}
              name={`series_${idx}`}
              stroke={COLORS[idx % COLORS.length]}
              strokeWidth={2}
              dot={{ fill: COLORS[idx % COLORS.length], strokeWidth: 0, r: 4 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

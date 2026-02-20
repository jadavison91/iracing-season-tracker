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

interface VirtualIRatingDataPoint {
  date: string;
  weekNum: number;
  displayWeek: number;
  trackName: string;
  virtualIRating: number;
  delta: number;
  baseline: number;
}

interface VirtualIRatingData {
  seriesId: number;
  seriesName: string;
  data: VirtualIRatingDataPoint[];
}

interface VirtualIRatingChartProps {
  data: VirtualIRatingData[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function VirtualIRatingChart({ data }: VirtualIRatingChartProps) {
  // Get all unique weeks across all series
  const allWeeks = new Set<number>();
  data.forEach((series) => {
    series.data.forEach((point) => {
      allWeeks.add(point.displayWeek);
    });
  });

  // Create array of weeks 1-12 (full season)
  const weeks = Array.from({ length: 12 }, (_, i) => i + 1);

  // Create chart data with all series, one entry per week
  const chartData = weeks.map((week) => {
    const point: Record<string, number | string> = {
      week,
      weekLabel: `Week ${week}`,
    };

    data.forEach((series, idx) => {
      const seriesPoint = series.data.find((p) => p.displayWeek === week);
      if (seriesPoint) {
        point[`series_${idx}`] = seriesPoint.virtualIRating;
        point[`delta_${idx}`] = seriesPoint.delta;
        point[`track_${idx}`] = seriesPoint.trackName;
      }
    });

    return point;
  });

  // Fill in missing values with previous value (for continuous lines)
  // This ensures lines continue through weeks where a series didn't race
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

  // Show all 12 weeks - don't filter
  const chartDataFiltered = chartData;

  const formatSeriesName = (name: string) => {
    // Shorten series names for legend
    if (name.includes('Production Car')) return 'Production Car';
    if (name.includes('Spec Racer Ford')) return 'Spec Racer Ford';
    if (name.includes('Pro 2 Lite')) return 'Pro 2 Lite';
    if (name.includes('Mustang')) return 'Mustang';
    return name.split(' ').slice(0, 2).join(' ');
  };

  if (chartDataFiltered.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center text-zinc-500">
        No iRating data available
      </div>
    );
  }

  return (
    <div className="h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartDataFiltered} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
          <XAxis
            dataKey="weekLabel"
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

              const weekData = chartDataFiltered.find((d) => d.weekLabel === label);

              return (
                <div className="rounded-lg border bg-white p-3 shadow-lg dark:bg-zinc-800 dark:border-zinc-700">
                  <p className="font-medium mb-2">{label}</p>
                  {payload.map((entry, idx) => {
                    if (entry.value === undefined) return null;
                    const seriesIdx = parseInt(entry.dataKey?.toString().split('_')[1] || '0');
                    const seriesData = data[seriesIdx];
                    const delta = weekData?.[`delta_${seriesIdx}`];
                    const track = weekData?.[`track_${seriesIdx}`];

                    return (
                      <div key={idx} className="text-sm mb-1">
                        <div className="flex items-center gap-2">
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
                        {track && (
                          <div className="text-xs text-zinc-500 ml-5">{track}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            }}
          />
          <Legend
            formatter={(value) => {
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

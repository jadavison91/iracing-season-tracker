'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
} from 'recharts';

interface SoFData {
  bracket: string;
  count: number;
  avgFinish: number;
}

interface SoFDistributionChartProps {
  data: SoFData[];
}

const BRACKET_COLORS = [
  '#10b981', // < 1500 - Green (easier)
  '#22c55e', // 1500-1750
  '#84cc16', // 1750-2000
  '#eab308', // 2000-2250
  '#f97316', // 2250-2500
  '#ef4444', // 2500+ - Red (harder)
];

export function SoFDistributionChart({ data }: SoFDistributionChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count));

  return (
    <div className="space-y-4">
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
            <XAxis
              dataKey="bracket"
              tick={{ fontSize: 11 }}
              className="text-zinc-500"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              className="text-zinc-500"
              label={{
                value: 'Races',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#71717a', fontSize: 11 },
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const point = payload[0].payload as SoFData;

                return (
                  <div className="rounded-lg border bg-white p-3 shadow-lg dark:bg-zinc-800 dark:border-zinc-700">
                    <p className="font-medium">SoF: {point.bracket}</p>
                    <p className="text-sm mt-1">
                      {point.count} race{point.count !== 1 ? 's' : ''}
                    </p>
                    {point.count > 0 && (
                      <p className="text-sm text-zinc-500">
                        Avg finish: P{point.avgFinish}
                      </p>
                    )}
                  </div>
                );
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={BRACKET_COLORS[index % BRACKET_COLORS.length]}
                  opacity={entry.count > 0 ? 1 : 0.3}
                />
              ))}
              <LabelList
                dataKey="count"
                position="top"
                fill="#71717a"
                fontSize={12}
                formatter={(value) => (Number(value) > 0 ? value : '')}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Average finish by bracket legend */}
      <div className="flex flex-wrap justify-center gap-4 text-sm">
        {data
          .filter((d) => d.count > 0)
          .map((bracket, idx) => (
            <div key={bracket.bracket} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded"
                style={{ backgroundColor: BRACKET_COLORS[data.indexOf(bracket) % BRACKET_COLORS.length] }}
              />
              <span className="text-zinc-500">{bracket.bracket}:</span>
              <span className="font-medium">P{bracket.avgFinish} avg</span>
            </div>
          ))}
      </div>
    </div>
  );
}

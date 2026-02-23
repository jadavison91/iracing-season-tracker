'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { SeriesChampionshipPoints } from '@/lib/mock-data';

interface ChampionshipPointsChartProps {
  data: SeriesChampionshipPoints[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function ChampionshipPointsChart({ data }: ChampionshipPointsChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-zinc-500">
        No championship points data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bar Chart */}
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            layout="vertical"
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
            <XAxis type="number" tick={{ fontSize: 12 }} className="text-zinc-500" />
            <YAxis
              dataKey="shortName"
              type="category"
              width={120}
              tick={{ fontSize: 12 }}
              className="text-zinc-500"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const seriesData = payload[0].payload as SeriesChampionshipPoints;

                return (
                  <div className="rounded-lg border bg-white p-3 shadow-lg dark:bg-zinc-800 dark:border-zinc-700">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-medium">{seriesData.seriesName}</p>
                      {seriesData.carClassName && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                          {seriesData.carClassName}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-zinc-500">Counting Points:</span>
                        <span className="font-bold text-green-600 dark:text-green-400">
                          {seriesData.countingPoints}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-zinc-500">Total Points:</span>
                        <span>{seriesData.totalPoints}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-zinc-500">Weeks Raced:</span>
                        <span>{seriesData.weeksRaced}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-zinc-500">Races Entered:</span>
                        <span>{seriesData.racesEntered}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-zinc-500">Avg Pts/Race:</span>
                        <span>{seriesData.avgPointsPerRace}</span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Legend />
            <Bar
              dataKey="countingPoints"
              name="Counting Points (Best 8 Weeks)"
              fill="#10b981"
              radius={[0, 4, 4, 0]}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table Summary */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b dark:border-zinc-700">
              <th className="px-3 py-2 text-left font-medium text-zinc-500">Series</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500">Counting Pts</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500">Total Pts</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500">Weeks</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500">Races</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-500">Avg/Race</th>
            </tr>
          </thead>
          <tbody>
            {data.map((series, index) => (
              <tr
                key={`${series.seriesId}-${series.carClassName || 'all'}`}
                className="border-b dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium">{series.shortName}</span>
                    {series.carClassName && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                        {series.carClassName}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-bold text-green-600 dark:text-green-400">
                  {series.countingPoints}
                </td>
                <td className="px-3 py-2 text-right">{series.totalPoints}</td>
                <td className="px-3 py-2 text-right">{series.weeksRaced}</td>
                <td className="px-3 py-2 text-right">{series.racesEntered}</td>
                <td className="px-3 py-2 text-right">{series.avgPointsPerRace}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 dark:border-zinc-600 font-medium">
              <td className="px-3 py-2">Total</td>
              <td className="px-3 py-2 text-right text-green-600 dark:text-green-400">
                {data.reduce((sum, s) => sum + s.countingPoints, 0)}
              </td>
              <td className="px-3 py-2 text-right">
                {data.reduce((sum, s) => sum + s.totalPoints, 0)}
              </td>
              <td className="px-3 py-2 text-right">
                {data.reduce((sum, s) => sum + s.weeksRaced, 0)}
              </td>
              <td className="px-3 py-2 text-right">
                {data.reduce((sum, s) => sum + s.racesEntered, 0)}
              </td>
              <td className="px-3 py-2 text-right">
                {Math.round(data.reduce((sum, s) => sum + s.totalPoints, 0) / data.reduce((sum, s) => sum + s.racesEntered, 0)) || 0}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { RecentRace } from '@/lib/iracing/types';

// Discipline definitions matching iRacing's categories
export type Discipline = 'sports_car' | 'formula' | 'oval' | 'dirt_road' | 'dirt_oval';

export const DISCIPLINE_CONFIG: Record<Discipline, { label: string; color: string }> = {
  sports_car: { label: 'Sports Car', color: '#3b82f6' },
  formula: { label: 'Formula', color: '#8b5cf6' },
  oval: { label: 'Oval', color: '#f59e0b' },
  dirt_road: { label: 'Dirt Road', color: '#10b981' },
  dirt_oval: { label: 'Dirt Oval', color: '#ef4444' },
};

interface ChartDataPoint {
  date: string;
  displayDate: string;
  iRating: number;
  delta: number;
  seriesName: string;
  trackName: string;
}

interface IRatingByCategoryChartProps {
  racesByDiscipline: Record<string, RecentRace[]>;
  isLoading?: boolean;
}

/**
 * Determine the discipline for a race based on series name
 */
function getDiscipline(seriesName: string): Discipline {
  const name = seriesName.toLowerCase();

  if (name.includes('dirt') && name.includes('oval')) {
    return 'dirt_oval';
  }
  if (name.includes('dirt') || name.includes('off-road') || name.includes('offroad') ||
      name.includes('rallycross') || name.includes('pro 2') || name.includes('cross car')) {
    return 'dirt_road';
  }
  if (name.includes('oval') || name.includes('nascar') || name.includes('arca') || name.includes('truck')) {
    return 'oval';
  }
  if (name.includes('formula') || name.includes(' f1') || name.includes(' f2') ||
      name.includes(' f3') || name.includes('ir-04') || name.includes('usf') || name.includes('indy')) {
    return 'formula';
  }
  // Default road racing to sports_car
  return 'sports_car';
}

/**
 * Process races into chart data points by discipline
 */
function processRaceData(
  racesByDiscipline: Record<string, RecentRace[]>
): Record<Discipline, ChartDataPoint[]> {
  const result: Record<Discipline, ChartDataPoint[]> = {
    sports_car: [],
    formula: [],
    oval: [],
    dirt_road: [],
    dirt_oval: [],
  };

  (Object.keys(DISCIPLINE_CONFIG) as Discipline[]).forEach((discipline) => {
    const races = racesByDiscipline[discipline] || [];

    // Filter to races with valid iRating data and sort by date
    const validRaces = races
      .filter((r) => r.newIRating > 0)
      .sort((a, b) => new Date(a.sessionStartTime).getTime() - new Date(b.sessionStartTime).getTime());

    result[discipline] = validRaces.map((race) => {
      const date = new Date(race.sessionStartTime);
      return {
        date: race.sessionStartTime,
        displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        iRating: race.newIRating,
        delta: race.newIRating - race.oldIRating,
        seriesName: race.seriesName,
        trackName: race.trackName,
      };
    });
  });

  return result;
}

export function IRatingByCategoryChart({ racesByDiscipline, isLoading }: IRatingByCategoryChartProps) {
  const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline>('sports_car');

  const dataByDiscipline = useMemo(
    () => processRaceData(racesByDiscipline),
    [racesByDiscipline]
  );

  // Find disciplines that have data
  const disciplinesWithData = useMemo(() => {
    return (Object.keys(dataByDiscipline) as Discipline[]).filter(
      (d) => dataByDiscipline[d].length > 0
    );
  }, [dataByDiscipline]);

  // Auto-select first discipline with data if current has none
  const activeDiscipline = useMemo(() => {
    if (dataByDiscipline[selectedDiscipline].length > 0) {
      return selectedDiscipline;
    }
    return disciplinesWithData[0] || 'sports_car';
  }, [selectedDiscipline, dataByDiscipline, disciplinesWithData]);

  const chartData = dataByDiscipline[activeDiscipline];
  const config = DISCIPLINE_CONFIG[activeDiscipline];

  // Calculate starting iRating (from first race's oldIRating)
  const races = racesByDiscipline[activeDiscipline] || [];
  const validRaces = races.filter(r => r.newIRating > 0).sort(
    (a, b) => new Date(a.sessionStartTime).getTime() - new Date(b.sessionStartTime).getTime()
  );
  const startingIRating = validRaces.length > 0 ? validRaces[0].oldIRating : null;

  // Calculate total change
  const totalChange = chartData.length > 0 && startingIRating
    ? chartData[chartData.length - 1].iRating - startingIRating
    : 0;

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center text-zinc-500">
        Loading race data...
      </div>
    );
  }

  if (disciplinesWithData.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center text-zinc-500">
        No iRating data available. Race in official sessions to track your iRating progression.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Discipline Tabs */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(DISCIPLINE_CONFIG) as Discipline[]).map((discipline) => {
          const hasData = dataByDiscipline[discipline].length > 0;
          const isActive = activeDiscipline === discipline;
          const { label, color } = DISCIPLINE_CONFIG[discipline];

          return (
            <button
              key={discipline}
              onClick={() => hasData && setSelectedDiscipline(discipline)}
              disabled={!hasData}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'text-white'
                  : hasData
                    ? 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
              }`}
              style={isActive ? { backgroundColor: color } : undefined}
            >
              {label}
              {hasData && (
                <span className="ml-2 text-xs opacity-75">
                  ({dataByDiscipline[discipline].length})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Summary Stats */}
      {chartData.length > 0 && (
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-zinc-500">Starting:</span>{' '}
            <span className="font-medium">{startingIRating?.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-zinc-500">Current:</span>{' '}
            <span className="font-medium">{chartData[chartData.length - 1].iRating.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-zinc-500">Change:</span>{' '}
            <span className={`font-medium ${totalChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalChange >= 0 ? '+' : ''}{totalChange}
            </span>
          </div>
          <div>
            <span className="text-zinc-500">Races:</span>{' '}
            <span className="font-medium">{chartData.length}</span>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
            <XAxis
              dataKey="displayDate"
              tick={{ fontSize: 11 }}
              className="text-zinc-500"
              interval="preserveStartEnd"
            />
            <YAxis
              domain={['dataMin - 50', 'dataMax + 50']}
              tick={{ fontSize: 12 }}
              className="text-zinc-500"
              tickFormatter={(value) => value.toLocaleString()}
            />
            {startingIRating && (
              <ReferenceLine
                y={startingIRating}
                stroke="#9ca3af"
                strokeDasharray="5 5"
                label={{
                  value: 'Start',
                  position: 'right',
                  fill: '#9ca3af',
                  fontSize: 11,
                }}
              />
            )}
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const point = payload[0].payload as ChartDataPoint;

                return (
                  <div className="rounded-lg border bg-white p-3 shadow-lg dark:bg-zinc-800 dark:border-zinc-700">
                    <p className="font-medium">{point.displayDate}</p>
                    <p className="text-sm text-zinc-500 mb-1">{point.seriesName}</p>
                    <p className="text-xs text-zinc-400 mb-2">{point.trackName}</p>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: config.color }}
                      />
                      <span className="font-bold">{point.iRating.toLocaleString()}</span>
                      <span className={point.delta >= 0 ? 'text-green-600' : 'text-red-600'}>
                        ({point.delta >= 0 ? '+' : ''}{point.delta})
                      </span>
                    </div>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="iRating"
              stroke={config.color}
              strokeWidth={2}
              dot={{ fill: config.color, strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, stroke: config.color, strokeWidth: 2, fill: 'white' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

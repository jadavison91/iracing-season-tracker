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
  iRating: number | null;
  projection: number | null;
  delta: number;
  seriesName: string;
  trackName: string;
  isProjected: boolean;
}

const PROJECTION_RACES = 10;
const MILESTONES = [1000, 1500, 2000, 2500, 3000, 3500, 4000, 5000, 6000];

/** Simple least-squares linear regression. Returns slope (iR per race). */
function linearRegression(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  values.forEach((y, x) => {
    num += (x - xMean) * (y - yMean);
    den += (x - xMean) ** 2;
  });
  return den === 0 ? 0 : num / den;
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
  if (
    name.includes('dirt') ||
    name.includes('off-road') ||
    name.includes('offroad') ||
    name.includes('rallycross') ||
    name.includes('pro 2') ||
    name.includes('cross car')
  ) {
    return 'dirt_road';
  }
  if (
    name.includes('oval') ||
    name.includes('nascar') ||
    name.includes('arca') ||
    name.includes('truck')
  ) {
    return 'oval';
  }
  if (
    name.includes('formula') ||
    name.includes(' f1') ||
    name.includes(' f2') ||
    name.includes(' f3') ||
    name.includes('ir-04') ||
    name.includes('usf') ||
    name.includes('indy')
  ) {
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
      .sort(
        (a, b) => new Date(a.sessionStartTime).getTime() - new Date(b.sessionStartTime).getTime()
      );

    result[discipline] = validRaces.map((race) => {
      const date = new Date(race.sessionStartTime);
      return {
        date: race.sessionStartTime,
        displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        iRating: race.newIRating,
        projection: null,
        delta: race.newIRating - race.oldIRating,
        seriesName: race.seriesName,
        trackName: race.trackName,
        isProjected: false,
      };
    });
  });

  return result;
}

export function IRatingByCategoryChart({
  racesByDiscipline,
  isLoading,
}: IRatingByCategoryChartProps) {
  const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline>('sports_car');
  const [showProjection, setShowProjection] = useState(false);

  const dataByDiscipline = useMemo(() => processRaceData(racesByDiscipline), [racesByDiscipline]);

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

  const actualData = dataByDiscipline[activeDiscipline];
  const config = DISCIPLINE_CONFIG[activeDiscipline];

  // Calculate starting iRating (from first race's oldIRating)
  const races = racesByDiscipline[activeDiscipline] || [];
  const validRaces = races
    .filter((r) => r.newIRating > 0)
    .sort(
      (a, b) => new Date(a.sessionStartTime).getTime() - new Date(b.sessionStartTime).getTime()
    );
  const startingIRating = validRaces.length > 0 ? validRaces[0].oldIRating : null;

  // Build projection: linear regression over last 10 races → N projected points
  const projectionData = useMemo((): ChartDataPoint[] => {
    if (actualData.length < 3) return [];
    const window = actualData.slice(-10);
    const slope = linearRegression(window.map((p) => p.iRating as number));
    const lastIR = window[window.length - 1].iRating as number;
    return Array.from({ length: PROJECTION_RACES }, (_, i) => ({
      date: '',
      displayDate: `+${i + 1}`,
      iRating: null,
      projection: Math.round(lastIR + slope * (i + 1)),
      delta: 0,
      seriesName: '',
      trackName: '',
      isProjected: true,
    }));
  }, [actualData]);

  // Merge actual + projection for the chart; last actual point bridges both lines
  const chartData = useMemo((): ChartDataPoint[] => {
    if (!showProjection || projectionData.length === 0) return actualData;
    const last = actualData[actualData.length - 1];
    const bridge: ChartDataPoint = { ...last, projection: last.iRating as number };
    return [...actualData.slice(0, -1), bridge, ...projectionData];
  }, [actualData, projectionData, showProjection]);

  // Calculate total change
  const totalChange =
    actualData.length > 0 && startingIRating
      ? (actualData[actualData.length - 1].iRating as number) - startingIRating
      : 0;

  // Milestone reference lines: only those in visible iRating range
  const visibleMilestones = useMemo(() => {
    if (chartData.length === 0) return [];
    const allIR = chartData.map((p) => (p.iRating ?? p.projection) as number).filter((v) => v > 0);
    const minIR = Math.min(...allIR);
    const maxIR = Math.max(...allIR);
    return MILESTONES.filter((m) => m >= minIR - 50 && m <= maxIR + 200);
  }, [chartData]);

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

      {/* Summary Stats + projection toggle */}
      {actualData.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <div>
            <span className="text-zinc-500">Starting:</span>{' '}
            <span className="font-medium">{startingIRating?.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-zinc-500">Current:</span>{' '}
            <span className="font-medium">
              {(actualData[actualData.length - 1].iRating as number).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-zinc-500">Change:</span>{' '}
            <span className={`font-medium ${totalChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalChange >= 0 ? '+' : ''}
              {totalChange}
            </span>
          </div>
          <div>
            <span className="text-zinc-500">Races:</span>{' '}
            <span className="font-medium">{actualData.length}</span>
          </div>
          {actualData.length >= 3 && (
            <button
              onClick={() => setShowProjection((v) => !v)}
              className={`ml-auto rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                showProjection
                  ? 'border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'border-zinc-200 text-zinc-500 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500'
              }`}
            >
              {showProjection ? 'Hide projection' : 'Show projection'}
            </button>
          )}
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
            {visibleMilestones.map((m) => (
              <ReferenceLine
                key={m}
                y={m}
                stroke="#6b7280"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
                label={{
                  value: m.toLocaleString(),
                  position: 'right',
                  fill: '#9ca3af',
                  fontSize: 10,
                }}
              />
            ))}
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const point = payload[0].payload as ChartDataPoint;
                const ir = (point.iRating ?? point.projection) as number;

                return (
                  <div className="rounded-lg border bg-white p-3 shadow-lg dark:bg-zinc-800 dark:border-zinc-700">
                    <p className="font-medium">
                      {point.isProjected
                        ? `Projected race ${point.displayDate}`
                        : point.displayDate}
                    </p>
                    {!point.isProjected && (
                      <>
                        <p className="text-sm text-zinc-500 mb-1">{point.seriesName}</p>
                        <p className="text-xs text-zinc-400 mb-2">{point.trackName}</p>
                      </>
                    )}
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: config.color }}
                      />
                      <span className="font-bold">{ir.toLocaleString()}</span>
                      {!point.isProjected && (
                        <span className={point.delta >= 0 ? 'text-green-600' : 'text-red-600'}>
                          ({point.delta >= 0 ? '+' : ''}
                          {point.delta})
                        </span>
                      )}
                      {point.isProjected && (
                        <span className="text-xs text-zinc-400">(projected)</span>
                      )}
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
              connectNulls={false}
              name="Actual"
            />
            {showProjection && (
              <Line
                type="monotone"
                dataKey="projection"
                stroke={config.color}
                strokeWidth={2}
                strokeDasharray="6 4"
                strokeOpacity={0.6}
                dot={false}
                activeDot={{ r: 5, stroke: config.color, strokeWidth: 2, fill: 'white' }}
                connectNulls={false}
                name="Projection"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

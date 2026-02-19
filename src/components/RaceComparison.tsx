'use client';

import { RecentRace, formatLapTime } from '@/lib/iracing/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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

interface RaceComparisonProps {
  races: RecentRace[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function RaceComparison({ races, open, onOpenChange }: RaceComparisonProps) {
  if (races.length < 2) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Prepare data for charts
  const positionData = races.map((race, idx) => ({
    name: formatDate(race.sessionStartTime),
    track: race.trackName.split(' ').slice(0, 2).join(' '),
    start: race.startPosition,
    finish: race.finishPosition,
    color: COLORS[idx % COLORS.length],
  }));

  const performanceData = races.map((race, idx) => ({
    name: formatDate(race.sessionStartTime),
    track: race.trackName.split(' ').slice(0, 2).join(' '),
    points: race.champPoints,
    sof: Math.round(race.strengthOfField / 100) / 10, // Scale for visibility
    incidents: race.incidents,
    color: COLORS[idx % COLORS.length],
  }));

  // Calculate comparison stats
  const stats = {
    avgFinish: (races.reduce((sum, r) => sum + r.finishPosition, 0) / races.length).toFixed(1),
    avgStart: (races.reduce((sum, r) => sum + r.startPosition, 0) / races.length).toFixed(1),
    totalPoints: races.reduce((sum, r) => sum + r.champPoints, 0),
    avgIncidents: (races.reduce((sum, r) => sum + r.incidents, 0) / races.length).toFixed(1),
    bestFinish: Math.min(...races.map((r) => r.finishPosition)),
    worstFinish: Math.max(...races.map((r) => r.finishPosition)),
    avgSoF: Math.round(races.reduce((sum, r) => sum + r.strengthOfField, 0) / races.length),
    positionGained: races.reduce((sum, r) => sum + (r.startPosition - r.finishPosition), 0),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Race Comparison</DialogTitle>
          <DialogDescription>Comparing {races.length} selected races</DialogDescription>
        </DialogHeader>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 py-4 border-b">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.avgFinish}</div>
            <div className="text-xs text-zinc-500">Avg Finish</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.totalPoints}</div>
            <div className="text-xs text-zinc-500">Total Points</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">P{stats.bestFinish}</div>
            <div className="text-xs text-zinc-500">Best Finish</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${stats.positionGained >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.positionGained >= 0 ? '+' : ''}{stats.positionGained}
            </div>
            <div className="text-xs text-zinc-500">Positions Gained</div>
          </div>
        </div>

        {/* Position Chart */}
        <div className="py-4">
          <h4 className="text-sm font-semibold mb-2">Start vs Finish Position</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={positionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 'dataMax + 2']} reversed />
                <YAxis dataKey="track" type="category" width={80} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => [`P${value}`, '']}
                  labelFormatter={(label) => `Track: ${label}`}
                />
                <Legend />
                <Bar dataKey="start" name="Start" fill="#94a3b8" />
                <Bar dataKey="finish" name="Finish">
                  {positionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Individual Race Details */}
        <div className="py-4 border-t">
          <h4 className="text-sm font-semibold mb-3">Race Details</h4>
          <div className="space-y-3">
            {races.map((race, idx) => (
              <div
                key={race.subsessionId}
                className="flex items-center gap-4 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800"
              >
                <div
                  className="w-2 h-12 rounded"
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{race.trackName}</div>
                  <div className="text-sm text-zinc-500">{formatDate(race.sessionStartTime)}</div>
                </div>
                <div className="grid grid-cols-5 gap-4 text-center">
                  <div>
                    <div className="text-sm font-semibold">
                      P{race.startPosition} → P{race.finishPosition}
                    </div>
                    <div className="text-xs text-zinc-500">Position</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{race.champPoints}</div>
                    <div className="text-xs text-zinc-500">Points</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{race.incidents}x</div>
                    <div className="text-xs text-zinc-500">Inc</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{formatLapTime(race.bestLapTime)}</div>
                    <div className="text-xs text-zinc-500">Best Lap</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{race.strengthOfField.toLocaleString()}</div>
                    <div className="text-xs text-zinc-500">SoF</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

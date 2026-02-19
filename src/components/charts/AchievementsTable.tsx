'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SeriesAchievements } from '@/lib/mock-data';

interface AchievementsTableProps {
  data: SeriesAchievements[];
}

export function AchievementsTable({ data }: AchievementsTableProps) {
  const formatSeriesName = (name: string) => {
    if (name.includes('Production Car')) return 'Production Car Challenge';
    if (name.includes('Spec Racer Ford')) return 'Spec Racer Ford';
    if (name.includes('Pro 2 Lite')) return 'Pro 2 Lite';
    if (name.includes('Mustang')) return 'Mustang Challenge';
    return name;
  };

  // Calculate totals
  const totals = {
    poles: data.reduce((sum, d) => sum + d.poles, 0),
    wins: data.reduce((sum, d) => sum + d.wins, 0),
    podiums: data.reduce((sum, d) => sum + d.podiums, 0),
    top5s: data.reduce((sum, d) => sum + d.top5s, 0),
    racesStarted: data.reduce((sum, d) => sum + d.racesStarted, 0),
    cleanRaces: data.reduce((sum, d) => sum + d.cleanRaces, 0),
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Series</TableHead>
            <TableHead className="text-center">Races</TableHead>
            <TableHead className="text-center">Poles</TableHead>
            <TableHead className="text-center">Wins</TableHead>
            <TableHead className="text-center">Podiums</TableHead>
            <TableHead className="text-center">Top 5</TableHead>
            <TableHead className="text-center">Win %</TableHead>
            <TableHead className="text-center">Podium %</TableHead>
            <TableHead className="text-center">Avg Finish</TableHead>
            <TableHead className="text-center">Avg Inc</TableHead>
            <TableHead className="text-center">Clean</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((series) => (
            <TableRow key={series.seriesId}>
              <TableCell className="font-medium">
                {formatSeriesName(series.seriesName)}
              </TableCell>
              <TableCell className="text-center">{series.racesStarted}</TableCell>
              <TableCell className="text-center">
                {series.poles > 0 ? (
                  <span className="text-purple-600 font-semibold">{series.poles}</span>
                ) : (
                  <span className="text-zinc-400">0</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {series.wins > 0 ? (
                  <span className="text-yellow-600 font-bold">{series.wins}</span>
                ) : (
                  <span className="text-zinc-400">0</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {series.podiums > 0 ? (
                  <span className="text-green-600 font-semibold">{series.podiums}</span>
                ) : (
                  <span className="text-zinc-400">0</span>
                )}
              </TableCell>
              <TableCell className="text-center">{series.top5s}</TableCell>
              <TableCell className="text-center">
                {series.winRate > 0 ? (
                  <span className="text-yellow-600">{series.winRate}%</span>
                ) : (
                  <span className="text-zinc-400">0%</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {series.podiumRate > 0 ? (
                  <span className="text-green-600">{series.podiumRate}%</span>
                ) : (
                  <span className="text-zinc-400">0%</span>
                )}
              </TableCell>
              <TableCell className="text-center">{series.avgFinish}</TableCell>
              <TableCell className="text-center">
                <span
                  className={
                    series.avgIncidents >= 4
                      ? 'text-red-600'
                      : series.avgIncidents >= 2
                        ? 'text-yellow-600'
                        : 'text-green-600'
                  }
                >
                  {series.avgIncidents}x
                </span>
              </TableCell>
              <TableCell className="text-center">
                {series.cleanRaces > 0 ? (
                  <span className="text-green-600">{series.cleanRaces}</span>
                ) : (
                  <span className="text-zinc-400">0</span>
                )}
              </TableCell>
            </TableRow>
          ))}
          {/* Totals row */}
          <TableRow className="bg-zinc-50 dark:bg-zinc-800 font-semibold">
            <TableCell>Total</TableCell>
            <TableCell className="text-center">{totals.racesStarted}</TableCell>
            <TableCell className="text-center text-purple-600">{totals.poles}</TableCell>
            <TableCell className="text-center text-yellow-600">{totals.wins}</TableCell>
            <TableCell className="text-center text-green-600">{totals.podiums}</TableCell>
            <TableCell className="text-center">{totals.top5s}</TableCell>
            <TableCell className="text-center">
              {Math.round((totals.wins / totals.racesStarted) * 100)}%
            </TableCell>
            <TableCell className="text-center">
              {Math.round((totals.podiums / totals.racesStarted) * 100)}%
            </TableCell>
            <TableCell className="text-center">-</TableCell>
            <TableCell className="text-center">-</TableCell>
            <TableCell className="text-center text-green-600">{totals.cleanRaces}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

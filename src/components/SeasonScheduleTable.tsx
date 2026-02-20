'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { WeekResult, RecentRace, formatLapTime } from '@/lib/iracing/types';

interface SeasonScheduleTableProps {
  weekResults: WeekResult[];
  onRaceClick?: (subsessionId: number) => void;
}

export function SeasonScheduleTable({ weekResults, onRaceClick }: SeasonScheduleTableProps) {
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

  const toggleWeekExpansion = (weekNum: number) => {
    setExpandedWeek(expandedWeek === weekNum ? null : weekNum);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Week</TableHead>
            <TableHead>Track</TableHead>
            <TableHead className="w-24 text-center">Status</TableHead>
            <TableHead className="w-20 text-center">Result</TableHead>
            <TableHead className="w-20 text-center">Points</TableHead>
            <TableHead className="w-20 text-center">Attempts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {weekResults.map((week) => (
            <WeekRow
              key={week.weekNum}
              week={week}
              isExpanded={expandedWeek === week.weekNum}
              onToggle={() => toggleWeekExpansion(week.weekNum)}
              onRaceClick={onRaceClick}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface WeekRowProps {
  week: WeekResult;
  isExpanded: boolean;
  onToggle: () => void;
  onRaceClick?: (subsessionId: number) => void;
}

function WeekRow({ week, isExpanded, onToggle, onRaceClick }: WeekRowProps) {
  const { displayWeek, schedule, status, bestResult, totalAttempts, allResults, isCounting } = week;

  const statusConfig = getStatusConfig(status);
  const canExpand = totalAttempts > 1;

  // Determine row background color based on status and counting
  const getRowClassName = () => {
    const classes = [];

    if (status === 'active') {
      classes.push('bg-blue-50 dark:bg-blue-950/30');
    } else if (isCounting) {
      classes.push('bg-green-50 dark:bg-green-950/20');
    }

    if (canExpand) {
      classes.push('cursor-pointer');
      if (isCounting) {
        classes.push('hover:bg-green-100 dark:hover:bg-green-900/30');
      } else {
        classes.push('hover:bg-zinc-50 dark:hover:bg-zinc-800/50');
      }
    }

    return classes.join(' ');
  };

  return (
    <>
      <TableRow
        className={getRowClassName()}
        onClick={canExpand ? onToggle : undefined}
      >
        <TableCell className="font-medium">
          <div className="flex items-center gap-1">
            {canExpand && (
              <span className="text-zinc-400">
                {isExpanded ? (
                  <ChevronDownIcon className="h-4 w-4" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4" />
                )}
              </span>
            )}
            <span className={status === 'active' ? 'font-bold text-blue-600 dark:text-blue-400' : ''}>
              {displayWeek}
            </span>
            {status === 'active' && (
              <span className="ml-1 text-xs text-blue-500">LIVE</span>
            )}
          </div>
        </TableCell>
        <TableCell>
          <div>
            <span className="font-medium">{schedule.trackName}</span>
            {schedule.trackConfig && (
              <span className="ml-1 text-sm text-zinc-500">({schedule.trackConfig})</span>
            )}
          </div>
        </TableCell>
        <TableCell className="text-center">
          <StatusBadge status={status} />
        </TableCell>
        <TableCell className="text-center">
          {bestResult ? (
            <ResultDisplay race={bestResult} onClick={onRaceClick} />
          ) : (
            <span className="text-zinc-400">--</span>
          )}
        </TableCell>
        <TableCell className="text-center">
          {bestResult ? (
            <span className="font-medium">{bestResult.champPoints}</span>
          ) : (
            <span className="text-zinc-400">--</span>
          )}
        </TableCell>
        <TableCell className="text-center">
          {totalAttempts > 0 ? (
            <span className={totalAttempts > 1 ? 'font-medium text-blue-600 dark:text-blue-400' : ''}>
              {totalAttempts}
            </span>
          ) : (
            <span className="text-zinc-400">0</span>
          )}
        </TableCell>
      </TableRow>

      {/* Expanded view showing all attempts */}
      {isExpanded && totalAttempts > 1 && (
        <TableRow className="bg-zinc-50 dark:bg-zinc-900/50">
          <TableCell colSpan={6} className="p-0">
            <div className="px-4 py-2">
              <div className="text-xs font-medium text-zinc-500 mb-2">
                All Attempts (sorted by points)
              </div>
              <div className="space-y-1">
                {allResults.map((race, index) => (
                  <AttemptRow
                    key={race.subsessionId}
                    race={race}
                    rank={index + 1}
                    isBest={bestResult?.subsessionId === race.subsessionId}
                    onClick={onRaceClick}
                  />
                ))}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

interface AttemptRowProps {
  race: RecentRace;
  rank: number;
  isBest: boolean;
  onClick?: (subsessionId: number) => void;
}

function AttemptRow({ race, rank, isBest, onClick }: AttemptRowProps) {
  const date = new Date(race.sessionStartTime);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className={`
        flex items-center justify-between rounded px-3 py-1.5 text-sm
        ${isBest ? 'bg-green-100 dark:bg-green-900/30' : 'bg-white dark:bg-zinc-800'}
        ${onClick ? 'cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700' : ''}
      `}
      onClick={() => onClick?.(race.subsessionId)}
    >
      <div className="flex items-center gap-3">
        <span className="w-6 text-center text-zinc-500">#{rank}</span>
        <span className="text-zinc-500">{formattedDate}</span>
        {isBest && (
          <span className="rounded bg-green-200 dark:bg-green-800 px-1.5 py-0.5 text-xs font-medium text-green-800 dark:text-green-200">
            BEST
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span>
          P{race.finishPositionInClass}
          {race.finishPositionInClass !== race.finishPosition && (
            <span className="text-zinc-500 ml-1">(P{race.finishPosition})</span>
          )}
        </span>
        <span className="w-12 text-right">{race.champPoints} pts</span>
        <span className="w-16 text-right text-zinc-500">{race.incidents}x</span>
        {race.bestLapTime > 0 && (
          <span className="w-20 text-right font-mono text-xs text-zinc-500">
            {formatLapTime(race.bestLapTime)}
          </span>
        )}
      </div>
    </div>
  );
}

interface ResultDisplayProps {
  race: RecentRace;
  onClick?: (subsessionId: number) => void;
}

function ResultDisplay({ race, onClick }: ResultDisplayProps) {
  const position = race.finishPositionInClass;
  const isWin = position === 1;
  const isPodium = position <= 3;

  return (
    <button
      className={`
        inline-flex items-center font-bold
        ${isWin ? 'text-yellow-600 dark:text-yellow-400' : ''}
        ${isPodium && !isWin ? 'text-green-600 dark:text-green-400' : ''}
        ${onClick ? 'hover:underline' : ''}
      `}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(race.subsessionId);
      }}
    >
      P{position}
      {isWin && <span className="ml-1">&#127942;</span>}
    </button>
  );
}

function getStatusConfig(status: WeekResult['status']) {
  switch (status) {
    case 'completed':
      return { label: 'Completed', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
    case 'active':
      return { label: 'Active', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' };
    case 'upcoming':
      return { label: 'Upcoming', className: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' };
    case 'skipped':
      return { label: 'Skipped', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' };
  }
}

function StatusBadge({ status }: { status: WeekResult['status'] }) {
  const config = getStatusConfig(status);
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

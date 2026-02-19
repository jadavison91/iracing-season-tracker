'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RecentRace, formatLapTime } from '@/lib/iracing/types';

interface RaceResultsTableProps {
  races: RecentRace[];
  onRaceClick?: (subsessionId: number) => void;
  selectable?: boolean;
  selectedRaces?: number[];
  onSelectionChange?: (subsessionIds: number[]) => void;
}

type SortField = 'date' | 'track' | 'start' | 'finish' | 'points' | 'incidents' | 'sof';
type SortDirection = 'asc' | 'desc';

export function RaceResultsTable({
  races,
  onRaceClick,
  selectable = false,
  selectedRaces = [],
  onSelectionChange,
}: RaceResultsTableProps) {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSelectRace = (subsessionId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSelectionChange) return;

    if (selectedRaces.includes(subsessionId)) {
      onSelectionChange(selectedRaces.filter((id) => id !== subsessionId));
    } else {
      onSelectionChange([...selectedRaces, subsessionId]);
    }
  };

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    if (selectedRaces.length === races.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(races.map((r) => r.subsessionId));
    }
  };

  const sortedRaces = useMemo(() => {
    return [...races].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'date':
          comparison = new Date(a.sessionStartTime).getTime() - new Date(b.sessionStartTime).getTime();
          break;
        case 'track':
          comparison = a.trackName.localeCompare(b.trackName);
          break;
        case 'start':
          comparison = a.startPositionInClass - b.startPositionInClass;
          break;
        case 'finish':
          comparison = a.finishPositionInClass - b.finishPositionInClass;
          break;
        case 'points':
          comparison = a.champPoints - b.champPoints;
          break;
        case 'incidents':
          comparison = a.incidents - b.incidents;
          break;
        case 'sof':
          comparison = a.strengthOfField - b.strengthOfField;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [races, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'date' ? 'desc' : 'asc');
    }
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer select-none hover:bg-zinc-100 dark:hover:bg-zinc-800"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </TableHead>
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getPositionChangeDisplay = (start: number, finish: number) => {
    const change = start - finish;
    if (change > 0) return <span className="text-green-600">+{change}</span>;
    if (change < 0) return <span className="text-red-600">{change}</span>;
    return <span className="text-zinc-400">-</span>;
  };

  const getFinishColor = (position: number) => {
    if (position === 1) return 'text-yellow-600 font-bold';
    if (position <= 3) return 'text-green-600 font-semibold';
    if (position <= 5) return 'text-blue-600';
    return '';
  };

  // Check if this is a multi-class series (any race has different overall vs class position)
  const isMultiClass = races.some(
    (r) => r.finishPosition !== r.finishPositionInClass || r.startPosition !== r.startPositionInClass
  );

  // Format position display for multi-class races
  const formatPosition = (classPos: number, overallPos: number, isMulti: boolean) => {
    if (!isMulti || classPos === overallPos) {
      return <span>{classPos}</span>;
    }
    return (
      <span title={`P${classPos} in class, P${overallPos} overall`}>
        {classPos} <span className="text-xs text-zinc-400">({overallPos})</span>
      </span>
    );
  };

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={selectedRaces.length === races.length && races.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600"
                  />
                </TableHead>
              )}
              <SortableHeader field="date">Date</SortableHeader>
              <SortableHeader field="track">Track</SortableHeader>
              <SortableHeader field="start">Start</SortableHeader>
              <SortableHeader field="finish">Finish</SortableHeader>
              <TableHead>+/-</TableHead>
              <SortableHeader field="points">Pts</SortableHeader>
              <SortableHeader field="incidents">Inc</SortableHeader>
              <TableHead>Fastest</TableHead>
              <SortableHeader field="sof">SoF</SortableHeader>
              <TableHead>Winner</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRaces.map((race) => (
              <TableRow
                key={race.subsessionId}
                className={`${onRaceClick ? 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800' : ''} ${
                  selectedRaces.includes(race.subsessionId) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
                onClick={() => onRaceClick?.(race.subsessionId)}
              >
                {selectable && (
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedRaces.includes(race.subsessionId)}
                      onClick={(e) => handleSelectRace(race.subsessionId, e)}
                      onChange={() => {}}
                      className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600"
                    />
                  </TableCell>
                )}
                <TableCell className="whitespace-nowrap text-sm">
                  {formatDate(race.sessionStartTime)}
                </TableCell>
                <TableCell className="max-w-[200px] truncate" title={race.trackName}>
                  <div>
                    {race.trackName}
                    {isMultiClass && race.carClassShortName && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                        {race.carClassShortName}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {formatPosition(race.startPositionInClass, race.startPosition, isMultiClass)}
                </TableCell>
                <TableCell className={`text-center ${getFinishColor(race.finishPositionInClass)}`}>
                  {formatPosition(race.finishPositionInClass, race.finishPosition, isMultiClass)}
                </TableCell>
                <TableCell className="text-center">
                  {getPositionChangeDisplay(race.startPositionInClass, race.finishPositionInClass)}
                </TableCell>
                <TableCell className="text-center font-medium">{race.champPoints}</TableCell>
                <TableCell className="text-center">
                  <span className={race.incidents >= 8 ? 'text-red-600' : race.incidents >= 4 ? 'text-yellow-600' : ''}>
                    {race.incidents}x
                  </span>
                </TableCell>
                <TableCell className="text-sm tabular-nums">
                  {formatLapTime(race.bestLapTime)}
                </TableCell>
                <TableCell className="text-center text-sm">
                  {race.strengthOfField.toLocaleString()}
                </TableCell>
                <TableCell className="max-w-[120px] truncate text-sm text-zinc-500" title={race.winnerName}>
                  {race.winnerName}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {(['date', 'finish', 'points', 'sof'] as SortField[]).map((field) => (
            <Button
              key={field}
              variant={sortField === field ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort(field)}
              className="whitespace-nowrap"
            >
              {field.charAt(0).toUpperCase() + field.slice(1)}
              {sortField === field && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </Button>
          ))}
        </div>

        {sortedRaces.map((race) => (
          <RaceCard
            key={race.subsessionId}
            race={race}
            onClick={onRaceClick ? () => onRaceClick(race.subsessionId) : undefined}
            selectable={selectable}
            selected={selectedRaces.includes(race.subsessionId)}
            onSelect={(e) => handleSelectRace(race.subsessionId, e)}
          />
        ))}
      </div>
    </>
  );
}

interface RaceCardProps {
  race: RecentRace;
  onClick?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (e: React.MouseEvent) => void;
}

function RaceCard({ race, onClick, selectable, selected, onSelect }: RaceCardProps) {
  const date = new Date(race.sessionStartTime);
  const positionChange = race.startPositionInClass - race.finishPositionInClass;
  const isMultiClass = race.finishPosition !== race.finishPositionInClass;

  return (
    <div
      className={`rounded-lg border bg-white p-4 dark:bg-zinc-800 dark:border-zinc-700 ${
        onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
      } ${selected ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-3">
          {selectable && (
            <input
              type="checkbox"
              checked={selected}
              onClick={onSelect}
              onChange={() => {}}
              className="h-4 w-4 mt-1 rounded border-zinc-300 dark:border-zinc-600"
            />
          )}
          <div>
            <p className="font-medium">{race.trackName}</p>
            <p className="text-xs text-zinc-500">
              {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              {' · '}
              {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              {isMultiClass && race.carClassShortName && (
                <span className="ml-2 px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-700">
                  {race.carClassShortName}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className={`text-2xl font-bold ${
            race.finishPositionInClass === 1 ? 'text-yellow-600' :
            race.finishPositionInClass <= 3 ? 'text-green-600' :
            race.finishPositionInClass <= 5 ? 'text-blue-600' : ''
          }`}>
            P{race.finishPositionInClass}
          </span>
          {isMultiClass && (
            <p className="text-xs text-zinc-400">P{race.finishPosition} overall</p>
          )}
          <p className="text-xs">
            from P{race.startPositionInClass}
            {' '}
            {positionChange > 0 ? (
              <span className="text-green-600">+{positionChange}</span>
            ) : positionChange < 0 ? (
              <span className="text-red-600">{positionChange}</span>
            ) : null}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center text-sm">
        <div>
          <div className="font-medium">{race.champPoints}</div>
          <div className="text-xs text-zinc-500">Points</div>
        </div>
        <div>
          <div className={`font-medium ${
            race.incidents >= 8 ? 'text-red-600' : race.incidents >= 4 ? 'text-yellow-600' : ''
          }`}>
            {race.incidents}x
          </div>
          <div className="text-xs text-zinc-500">Inc</div>
        </div>
        <div>
          <div className="font-medium tabular-nums">{formatLapTime(race.bestLapTime)}</div>
          <div className="text-xs text-zinc-500">Best Lap</div>
        </div>
        <div>
          <div className="font-medium">{race.strengthOfField.toLocaleString()}</div>
          <div className="text-xs text-zinc-500">SoF</div>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t dark:border-zinc-700 text-xs text-zinc-500">
        Winner: {race.winnerName}
      </div>
    </div>
  );
}

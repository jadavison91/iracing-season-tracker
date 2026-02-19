'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface RaceFilters {
  search: string;
  finishPosition: 'all' | 'podium' | 'top5' | 'top10' | 'outside10';
  incidents: 'all' | 'clean' | 'low' | 'high';
  sortField: 'date' | 'finish' | 'points' | 'sof';
  sortDirection: 'asc' | 'desc';
}

interface RaceFiltersProps {
  filters: RaceFilters;
  onFiltersChange: (filters: RaceFilters) => void;
  totalRaces: number;
  filteredCount: number;
}

export const defaultFilters: RaceFilters = {
  search: '',
  finishPosition: 'all',
  incidents: 'all',
  sortField: 'date',
  sortDirection: 'desc',
};

export function RaceFiltersBar({
  filters,
  onFiltersChange,
  totalRaces,
  filteredCount,
}: RaceFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveFilters =
    filters.search ||
    filters.finishPosition !== 'all' ||
    filters.incidents !== 'all';

  const handleReset = () => {
    onFiltersChange(defaultFilters);
  };

  return (
    <div className="space-y-3">
      {/* Search and toggle row */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
          </svg>
          <Input
            type="text"
            placeholder="Search by track name..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-10"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className={hasActiveFilters ? 'border-blue-500 text-blue-600' : ''}
        >
          <svg
            className="h-4 w-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          Filters
          {hasActiveFilters && (
            <span className="ml-1 bg-blue-500 text-white text-xs rounded-full px-1.5">
              {(filters.finishPosition !== 'all' ? 1 : 0) +
                (filters.incidents !== 'all' ? 1 : 0)}
            </span>
          )}
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Clear
          </Button>
        )}
      </div>

      {/* Expanded filters */}
      {isExpanded && (
        <div className="flex flex-wrap gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-500">Finish Position</label>
            <Select
              value={filters.finishPosition}
              onValueChange={(value: RaceFilters['finishPosition']) =>
                onFiltersChange({ ...filters, finishPosition: value })
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Finishes</SelectItem>
                <SelectItem value="podium">Podium (1-3)</SelectItem>
                <SelectItem value="top5">Top 5</SelectItem>
                <SelectItem value="top10">Top 10</SelectItem>
                <SelectItem value="outside10">Outside Top 10</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-500">Incidents</label>
            <Select
              value={filters.incidents}
              onValueChange={(value: RaceFilters['incidents']) =>
                onFiltersChange({ ...filters, incidents: value })
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="clean">Clean (0x)</SelectItem>
                <SelectItem value="low">Low (1-3x)</SelectItem>
                <SelectItem value="high">High (4x+)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-500">Sort By</label>
            <Select
              value={filters.sortField}
              onValueChange={(value: RaceFilters['sortField']) =>
                onFiltersChange({ ...filters, sortField: value })
              }
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="finish">Finish</SelectItem>
                <SelectItem value="points">Points</SelectItem>
                <SelectItem value="sof">SoF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-500">Order</label>
            <Select
              value={filters.sortDirection}
              onValueChange={(value: RaceFilters['sortDirection']) =>
                onFiltersChange({ ...filters, sortDirection: value })
              }
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Descending</SelectItem>
                <SelectItem value="asc">Ascending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Results count */}
      {(hasActiveFilters || filters.search) && (
        <p className="text-sm text-zinc-500">
          Showing {filteredCount} of {totalRaces} races
        </p>
      )}
    </div>
  );
}

// Helper function to apply filters
export function applyRaceFilters<T extends {
  trackName: string;
  finishPosition: number;
  incidents: number;
  sessionStartTime: string;
  champPoints: number;
  strengthOfField: number;
}>(races: T[], filters: RaceFilters): T[] {
  let filtered = [...races];

  // Search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter((race) =>
      race.trackName.toLowerCase().includes(searchLower)
    );
  }

  // Position filter
  switch (filters.finishPosition) {
    case 'podium':
      filtered = filtered.filter((race) => race.finishPosition <= 3);
      break;
    case 'top5':
      filtered = filtered.filter((race) => race.finishPosition <= 5);
      break;
    case 'top10':
      filtered = filtered.filter((race) => race.finishPosition <= 10);
      break;
    case 'outside10':
      filtered = filtered.filter((race) => race.finishPosition > 10);
      break;
  }

  // Incidents filter
  switch (filters.incidents) {
    case 'clean':
      filtered = filtered.filter((race) => race.incidents === 0);
      break;
    case 'low':
      filtered = filtered.filter((race) => race.incidents >= 1 && race.incidents <= 3);
      break;
    case 'high':
      filtered = filtered.filter((race) => race.incidents >= 4);
      break;
  }

  // Sorting
  filtered.sort((a, b) => {
    let comparison = 0;
    switch (filters.sortField) {
      case 'date':
        comparison = new Date(a.sessionStartTime).getTime() - new Date(b.sessionStartTime).getTime();
        break;
      case 'finish':
        comparison = a.finishPosition - b.finishPosition;
        break;
      case 'points':
        comparison = a.champPoints - b.champPoints;
        break;
      case 'sof':
        comparison = a.strengthOfField - b.strengthOfField;
        break;
    }
    return filters.sortDirection === 'asc' ? comparison : -comparison;
  });

  return filtered;
}

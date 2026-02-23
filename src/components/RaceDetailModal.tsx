'use client';

import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { RecentRace, formatLapTime, formatIRating, formatSafetyRating } from '@/lib/iracing/types';
import { useSubsessionDetails, useTrackAssets, getTrackLogoUrl, getTrackMapUrl } from '@/hooks';

interface RaceDetailModalProps {
  race: RecentRace | null;
  customerId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RaceDetailModal({ race, customerId, open, onOpenChange }: RaceDetailModalProps) {
  // Fetch detailed subsession data when modal is open
  const { data: details, isLoading: isLoadingDetails } = useSubsessionDetails(
    open && race ? race.subsessionId : null,
    customerId
  );

  // Fetch track assets for images
  const { data: trackAssets } = useTrackAssets();

  if (!race) return null;

  // Get track asset for this race
  const trackAsset = trackAssets?.[race.trackId.toString()];
  const trackLogoUrl = getTrackLogoUrl(trackAsset);
  const trackMapUrl = getTrackMapUrl(trackAsset);

  // Use detailed data when available, otherwise fall back to race data
  const driverResult = details?.driverResult;

  const sessionDate = new Date(race.sessionStartTime);

  // Check if this is a multi-class race
  const isMultiClass = race.finishPosition !== race.finishPositionInClass ||
                       race.startPosition !== race.startPositionInClass;

  // Use class positions for display
  const startPos = race.startPositionInClass;
  const finishPos = race.finishPositionInClass;
  const positionChange = startPos - finishPos;

  // Use detailed rating data when available (they have actual values)
  const newIRating = driverResult?.newIRating ?? race.newIRating;
  const oldIRating = driverResult?.oldIRating ?? race.oldIRating;
  const newSafetyRating = driverResult?.newSafetyRating ?? race.newSafetyRating;
  const oldSafetyRating = driverResult?.oldSafetyRating ?? race.oldSafetyRating;
  const bestLapTime = driverResult?.bestLapTime ?? race.bestLapTime;
  const averageLap = driverResult?.averageLap ?? race.averageLap;

  const iRatingChange = newIRating - oldIRating;
  const srChange = newSafetyRating - oldSafetyRating;
  const hasDetailedData = driverResult !== undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {race.trackName}
            {isMultiClass && race.carClassShortName && (
              <span className="text-sm font-normal px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                {race.carClassShortName}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {race.seriesName}
            {isMultiClass && race.carName && (
              <span className="text-zinc-400"> · {race.carName}</span>
            )}
            <br />
            {sessionDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
            {' at '}
            {sessionDate.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Track Logo and Map */}
          {(trackLogoUrl || trackMapUrl) && (
            <div className="flex gap-3 rounded-lg overflow-hidden">
              {trackLogoUrl && (
                <div className="relative flex-1 h-24 min-w-0 flex items-center justify-center bg-white dark:bg-zinc-800 rounded-lg p-3">
                  <Image
                    src={trackLogoUrl}
                    alt={race.trackName}
                    fill
                    className="object-contain p-2"
                    sizes="300px"
                    priority
                  />
                </div>
              )}
              {trackMapUrl && (
                <div className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center bg-white dark:bg-zinc-900 rounded-lg">
                  <Image
                    src={trackMapUrl}
                    alt={`${race.trackName} track map`}
                    fill
                    className="object-contain p-2"
                    sizes="96px"
                    unoptimized
                  />
                </div>
              )}
            </div>
          )}

          {/* Main Result */}
          <div className="flex items-center justify-around rounded-lg bg-zinc-100 p-4 dark:bg-zinc-800">
            <div className="text-center">
              <div className="text-sm text-zinc-500">Start{isMultiClass ? ' (Class)' : ''}</div>
              <div className="text-3xl font-bold">P{startPos}</div>
              {isMultiClass && (
                <div className="text-xs text-zinc-400">P{race.startPosition} overall</div>
              )}
            </div>
            <div className="text-center">
              <svg className="h-8 w-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
            <div className="text-center">
              <div className="text-sm text-zinc-500">Finish{isMultiClass ? ' (Class)' : ''}</div>
              <div className={`text-3xl font-bold ${
                finishPos === 1 ? 'text-yellow-600' :
                finishPos <= 3 ? 'text-green-600' :
                finishPos <= 5 ? 'text-blue-600' : ''
              }`}>
                P{finishPos}
              </div>
              {isMultiClass && (
                <div className="text-xs text-zinc-400">P{race.finishPosition} overall</div>
              )}
            </div>
            <div className="text-center">
              <div className="text-sm text-zinc-500">Change</div>
              <div className={`text-2xl font-bold ${
                positionChange > 0 ? 'text-green-600' :
                positionChange < 0 ? 'text-red-600' : 'text-zinc-400'
              }`}>
                {positionChange > 0 ? `+${positionChange}` : positionChange < 0 ? positionChange : '-'}
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatItem label="Championship Points" value={race.champPoints} />
            <StatItem label="Club Points" value={race.clubPoints} />
            <StatItem
              label="Incidents"
              value={`${race.incidents}x`}
              highlight={race.incidents >= 8 ? 'red' : race.incidents >= 4 ? 'yellow' : undefined}
            />
            <StatItem label="Laps Completed" value={race.lapsComplete} />
            <StatItem
              label="Laps Led"
              value={race.lapsLed}
              highlight={race.lapsLed > 0 ? 'green' : undefined}
            />
            <StatItem label="Strength of Field" value={race.strengthOfField.toLocaleString()} />
          </div>

          {/* Lap Times */}
          <div className="rounded-lg border p-4 dark:border-zinc-700">
            <h4 className="mb-3 font-medium">Lap Times</h4>
            {isLoadingDetails && !hasDetailedData ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-zinc-500">Best Lap</div>
                  <Skeleton className="h-7 w-24" />
                </div>
                <div>
                  <div className="text-sm text-zinc-500">Average Lap</div>
                  <Skeleton className="h-7 w-24" />
                </div>
              </div>
            ) : bestLapTime > 0 || averageLap > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-zinc-500">Best Lap</div>
                  <div className="text-lg font-mono font-medium">{formatLapTime(bestLapTime)}</div>
                </div>
                <div>
                  <div className="text-sm text-zinc-500">Average Lap</div>
                  <div className="text-lg font-mono">{formatLapTime(averageLap)}</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-zinc-500">Lap time data not available</div>
            )}
          </div>

          {/* Rating Changes */}
          <div className="rounded-lg border p-4 dark:border-zinc-700">
            <h4 className="mb-3 font-medium">Rating Changes</h4>
            {isLoadingDetails && !hasDetailedData ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-zinc-500">iRating</div>
                  <Skeleton className="h-7 w-20 mb-1" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div>
                  <div className="text-sm text-zinc-500">Safety Rating</div>
                  <Skeleton className="h-7 w-16 mb-1" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
            ) : newIRating > 0 || newSafetyRating > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-zinc-500">iRating</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-medium">{formatIRating(newIRating)}</span>
                    <span className={`text-sm ${
                      iRatingChange > 0 ? 'text-green-600' :
                      iRatingChange < 0 ? 'text-red-600' : 'text-zinc-400'
                    }`}>
                      {iRatingChange > 0 ? `+${iRatingChange}` : iRatingChange}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500">from {formatIRating(oldIRating)}</div>
                </div>
                <div>
                  <div className="text-sm text-zinc-500">Safety Rating</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-medium">{formatSafetyRating(newSafetyRating)}</span>
                    <span className={`text-sm ${
                      srChange > 0 ? 'text-green-600' :
                      srChange < 0 ? 'text-red-600' : 'text-zinc-400'
                    }`}>
                      {srChange > 0 ? `+${(srChange / 100).toFixed(2)}` : (srChange / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500">from {formatSafetyRating(oldSafetyRating)}</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-zinc-500">Rating data not available</div>
            )}
          </div>

          {/* Winner */}
          <div className="text-center text-sm text-zinc-500">
            Race Winner: <span className="font-medium text-zinc-700 dark:text-zinc-300">{race.winnerName}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface StatItemProps {
  label: string;
  value: string | number;
  highlight?: 'green' | 'yellow' | 'red';
}

function StatItem({ label, value, highlight }: StatItemProps) {
  const highlightClass =
    highlight === 'green' ? 'text-green-600' :
    highlight === 'yellow' ? 'text-yellow-600' :
    highlight === 'red' ? 'text-red-600' : '';

  return (
    <div>
      <div className="text-sm text-zinc-500">{label}</div>
      <div className={`text-lg font-medium ${highlightClass}`}>{value}</div>
    </div>
  );
}

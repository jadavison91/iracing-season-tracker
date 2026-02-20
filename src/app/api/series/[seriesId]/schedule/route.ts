import { NextRequest, NextResponse } from 'next/server';
import { getSeriesSeasons, IRacingApiError, IRacingAuthError } from '@/lib/iracing';
import { SeasonScheduleData, WeekSchedule } from '@/lib/iracing/types';

/**
 * Transform raw iRacing schedule data to our format
 */
function transformSchedule(
  rawSeason: Record<string, unknown>,
  seriesId: number
): SeasonScheduleData | null {
  const schedules = rawSeason.schedules as Record<string, unknown>[] | undefined;
  if (!schedules || schedules.length === 0) {
    return null;
  }

  const now = new Date();

  // Transform each week
  const weeks: WeekSchedule[] = schedules.map((schedule) => {
    const track = schedule.track as Record<string, unknown> | undefined;
    const raceWeekNum = Number(schedule.race_week_num ?? 0);

    // Parse start date and calculate end date (each week is 7 days)
    const startDateStr = String(schedule.start_date ?? '');
    const startDate = startDateStr ? new Date(startDateStr) : new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    const isActive = now >= startDate && now < endDate;
    const isComplete = now >= endDate;

    return {
      raceWeekNum,
      displayWeek: raceWeekNum + 1,
      trackId: Number(track?.track_id ?? schedule.track_id ?? 0),
      trackName: String(track?.track_name ?? schedule.track_name ?? 'Unknown Track'),
      trackConfig: track?.config_name ? String(track.config_name) : undefined,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      isActive,
      isComplete,
    };
  });

  // Sort by week number
  weeks.sort((a, b) => a.raceWeekNum - b.raceWeekNum);

  // Extract season info
  const seasonYear = Number(rawSeason.season_year ?? new Date().getFullYear());
  const seasonQuarter = Number(rawSeason.season_quarter ?? 1);

  // Extract series name - prefer specific series name fields, fall back to season_name
  // season_name typically contains "Series Name - Year Season Q" so we split it
  let seriesName = String(rawSeason.series_name ?? rawSeason.series_short_name ?? '');
  if (!seriesName && rawSeason.season_name) {
    // season_name format: "Spec Racer Ford Challenge - 2026 Season 1"
    const seasonNameStr = String(rawSeason.season_name);
    const dashIndex = seasonNameStr.lastIndexOf(' - ');
    seriesName = dashIndex > 0 ? seasonNameStr.substring(0, dashIndex) : seasonNameStr;
  }
  if (!seriesName) {
    seriesName = 'Unknown Series';
  }

  return {
    seriesId,
    seriesName,
    seasonId: Number(rawSeason.season_id ?? 0),
    seasonYear,
    seasonQuarter,
    seasonName: `${seasonYear} Season ${seasonQuarter}`,
    weeks,
  };
}

/**
 * Get the current iRacing season quarter based on the date
 */
function getCurrentSeasonQuarter(): { year: number; quarter: number } {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const year = now.getFullYear();

  // Season 1: December-February (quarter 1)
  // Season 2: March-May (quarter 2)
  // Season 3: June-August (quarter 3)
  // Season 4: September-November (quarter 4)
  if (month === 11) {
    // December is next year's Season 1
    return { year: year + 1, quarter: 1 };
  } else if (month <= 1) {
    // January, February
    return { year, quarter: 1 };
  } else if (month <= 4) {
    // March, April, May
    return { year, quarter: 2 };
  } else if (month <= 7) {
    // June, July, August
    return { year, quarter: 3 };
  } else {
    // September, October, November
    return { year, quarter: 4 };
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string }> }
) {
  try {
    const { seriesId } = await params;
    const seriesIdNum = parseInt(seriesId, 10);

    if (isNaN(seriesIdNum) || seriesIdNum <= 0) {
      return NextResponse.json(
        { error: 'Invalid series ID. Must be a positive integer.' },
        { status: 400 }
      );
    }

    // Fetch all seasons for this series
    const seasonsData = await getSeriesSeasons(seriesIdNum);

    if (!Array.isArray(seasonsData) || seasonsData.length === 0) {
      return NextResponse.json(
        { error: 'No season data found for this series.' },
        { status: 404 }
      );
    }

    // Filter to only seasons matching the requested series_id
    // The iRacing API returns all series seasons, so we must filter client-side
    const seriesSeasons = seasonsData.filter((s) => Number(s.series_id) === seriesIdNum);

    if (seriesSeasons.length === 0) {
      return NextResponse.json(
        { error: `No season data found for series ${seriesIdNum}.` },
        { status: 404 }
      );
    }

    // Find the current season from the filtered list
    const { year, quarter } = getCurrentSeasonQuarter();

    // Look for current season first, then fall back to most recent
    let currentSeason = seriesSeasons.find((s) => {
      const seasonYear = Number(s.season_year);
      const seasonQuarter = Number(s.season_quarter);
      return seasonYear === year && seasonQuarter === quarter;
    });

    // If no exact match, find the most recent season
    if (!currentSeason) {
      currentSeason = seriesSeasons.reduce((latest, season) => {
        const seasonId = Number(season.season_id ?? 0);
        const latestId = Number(latest?.season_id ?? 0);
        return seasonId > latestId ? season : latest;
      }, seriesSeasons[0]);
    }

    if (!currentSeason) {
      return NextResponse.json(
        { error: 'Could not determine current season.' },
        { status: 404 }
      );
    }

    const schedule = transformSchedule(currentSeason, seriesIdNum);

    if (!schedule) {
      return NextResponse.json(
        { error: 'No schedule data found for current season.' },
        { status: 404 }
      );
    }

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error fetching series schedule:', error);

    if (error instanceof IRacingAuthError) {
      return NextResponse.json(
        { error: 'Authentication failed. Please check server credentials.' },
        { status: 401 }
      );
    }

    if (error instanceof IRacingApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { searchMemberResults, getSeriesSeasons, IRacingApiError, IRacingAuthError } from '@/lib/iracing';

// Cache the current season for 1 hour — it only changes 4 times a year
let cachedSeason: { seasonYear: number; seasonQuarter: number; expiresAt: number } | null = null;

/**
 * True when `now` falls inside one of this season row's race weeks. Each
 * week runs 7 days from its `start_date`, and the season's overall window
 * runs from the first week's start through the last week's end (12 racing
 * weeks + the "week 13" fun week).
 */
function isSeasonCurrent(season: Record<string, unknown>, now: Date): boolean {
  const schedules = season.schedules as Record<string, unknown>[] | undefined;
  if (!schedules || schedules.length === 0) return false;

  return schedules.some((week) => {
    const startDateStr = week.start_date as string | undefined;
    if (!startDateStr) return false;
    const start = new Date(startDateStr);
    if (isNaN(start.getTime())) return false;
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return now >= start && now < end;
  });
}

async function getActiveSeasonYearAndQuarter(): Promise<{ seasonYear: number; seasonQuarter: number }> {
  if (cachedSeason && Date.now() < cachedSeason.expiresAt) {
    return { seasonYear: cachedSeason.seasonYear, seasonQuarter: cachedSeason.seasonQuarter };
  }

  const seasons = await getSeriesSeasons();
  const now = new Date();

  // `active` on a season row means "this series is currently being run at
  // all" — it is not a reliable signal for "this row is the season
  // happening right now." A series can stay active: true across a season
  // rollover while its previous-quarter row is still sitting in the list,
  // which is what let the app get pinned to a stale season. The only
  // trustworthy signal for "which season are we in" is each row's own week
  // schedule: check it against today's date directly.
  const currentSeasons = seasons.filter((s) => isSeasonCurrent(s, now));

  if (currentSeasons.length === 0) {
    throw new Error('Could not determine the current iRacing season from any season schedule');
  }

  // All series share the same season calendar, so every matching row should
  // agree on season_year/season_quarter. If any don't (e.g. a schedule
  // published out of step), prefer the highest (year, quarter) pair, since
  // the current season is always the most recently started one.
  const active = currentSeasons.reduce((latest, s) => {
    const latestKey = Number(latest.season_year) * 10 + Number(latest.season_quarter);
    const key = Number(s.season_year) * 10 + Number(s.season_quarter);
    return key > latestKey ? s : latest;
  });

  const seasonYear = Number(active.season_year);
  const seasonQuarter = Number(active.season_quarter);

  cachedSeason = { seasonYear, seasonQuarter, expiresAt: Date.now() + 60 * 60 * 1000 };
  console.log(`[season-races] Current season: ${seasonYear} S${seasonQuarter}`);

  return { seasonYear, seasonQuarter };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId } = await params;
    const custId = parseInt(customerId, 10);

    if (isNaN(custId) || custId <= 0) {
      return NextResponse.json(
        { error: 'Invalid customer ID. Must be a positive integer.' },
        { status: 400 }
      );
    }

    const { seasonYear, seasonQuarter } = await getActiveSeasonYearAndQuarter();
    const result = await searchMemberResults(custId, seasonYear, seasonQuarter);

    // Debug log
    console.log('[API /season-races] Returning', result.results?.length || 0, 'races');

    // Return the resolved season alongside the races so callers can stamp it
    // onto each race directly instead of re-guessing the season from its
    // date client-side (see deriveSeasonLabel in season-utils.ts).
    return NextResponse.json({ races: result.results || [], seasonYear, seasonQuarter });
  } catch (error) {
    console.error('Error fetching season races:', error);

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

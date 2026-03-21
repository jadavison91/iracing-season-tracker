import { NextRequest, NextResponse } from 'next/server';
import { searchMemberResults, getSeriesSeasons, IRacingApiError, IRacingAuthError } from '@/lib/iracing';

// Cache active season for 1 hour — it only changes 4 times a year
let cachedSeason: { seasonYear: number; seasonQuarter: number; expiresAt: number } | null = null;

async function getActiveSeasonYearAndQuarter(): Promise<{ seasonYear: number; seasonQuarter: number }> {
  if (cachedSeason && Date.now() < cachedSeason.expiresAt) {
    return { seasonYear: cachedSeason.seasonYear, seasonQuarter: cachedSeason.seasonQuarter };
  }

  const seasons = await getSeriesSeasons();
  const active = seasons.find((s) => s.active === true);
  if (!active) throw new Error('No active iRacing season found');

  const seasonYear = Number(active.season_year);
  const seasonQuarter = Number(active.season_quarter);

  cachedSeason = { seasonYear, seasonQuarter, expiresAt: Date.now() + 60 * 60 * 1000 };
  console.log(`[season-races] Active season: ${seasonYear} S${seasonQuarter}`);

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

    // Return in a format the hook expects
    return NextResponse.json({ races: result.results || [] });
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

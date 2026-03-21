import { NextRequest, NextResponse } from 'next/server';
import { searchMemberResults, IRacingApiError, IRacingAuthError } from '@/lib/iracing';

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

    const searchParams = request.nextUrl.searchParams;
    const seasonYear = parseInt(searchParams.get('season_year') ?? '', 10);
    const seasonQuarter = parseInt(searchParams.get('season_quarter') ?? '', 10);

    if (isNaN(seasonYear) || isNaN(seasonQuarter) || seasonQuarter < 1 || seasonQuarter > 4) {
      return NextResponse.json(
        { error: 'season_year and season_quarter query parameters are required.' },
        { status: 400 }
      );
    }

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

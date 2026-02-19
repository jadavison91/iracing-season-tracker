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

    // Get query params for date range
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'start_date and end_date query parameters are required.' },
        { status: 400 }
      );
    }

    const result = await searchMemberResults(custId, startDate, endDate);

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

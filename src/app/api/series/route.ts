import { NextResponse } from 'next/server';
import { getSeries, IRacingApiError, IRacingAuthError } from '@/lib/iracing';

export async function GET() {
  try {
    const series = await getSeries();

    return NextResponse.json(series);
  } catch (error) {
    console.error('Error fetching series:', error);

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

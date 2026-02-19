import { NextRequest, NextResponse } from 'next/server';
import { getMemberRecentRaces, IRacingApiError, IRacingAuthError } from '@/lib/iracing';

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

    const result = await getMemberRecentRaces(custId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching recent races:', error);

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

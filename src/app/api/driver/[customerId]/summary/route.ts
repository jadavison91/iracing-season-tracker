import { NextRequest, NextResponse } from 'next/server';
import { getMemberSummary, IRacingApiError, IRacingAuthError } from '@/lib/iracing';

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

    const summary = await getMemberSummary(custId);

    // Debug log to see what the API returns
    console.log('[API /summary] Raw response from iRacing:', JSON.stringify(summary, null, 2));

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching member summary:', error);

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

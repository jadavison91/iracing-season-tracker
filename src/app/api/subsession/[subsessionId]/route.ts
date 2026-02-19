import { NextRequest, NextResponse } from 'next/server';
import { getSubsessionResults, IRacingApiError, IRacingAuthError } from '@/lib/iracing';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subsessionId: string }> }
) {
  try {
    const { subsessionId } = await params;
    const subsessionIdNum = parseInt(subsessionId, 10);

    if (isNaN(subsessionIdNum) || subsessionIdNum <= 0) {
      return NextResponse.json(
        { error: 'Invalid subsession ID. Must be a positive integer.' },
        { status: 400 }
      );
    }

    const result = await getSubsessionResults(subsessionIdNum);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching subsession results:', error);

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

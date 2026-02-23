import { NextResponse } from 'next/server';
import { getTrackAssets, IRacingApiError, IRacingAuthError } from '@/lib/iracing';

export async function GET() {
  try {
    const assets = await getTrackAssets();

    return NextResponse.json(assets);
  } catch (error) {
    console.error('Error fetching track assets:', error);

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

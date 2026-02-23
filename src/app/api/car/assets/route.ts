import { NextResponse } from 'next/server';
import { getCarAssets, IRacingApiError, IRacingAuthError } from '@/lib/iracing';

export async function GET() {
  try {
    const assets = await getCarAssets();

    return NextResponse.json(assets);
  } catch (error) {
    console.error('Error fetching car assets:', error);

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

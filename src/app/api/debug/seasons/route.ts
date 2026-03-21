import { NextResponse } from 'next/server';
import { getSeriesSeasons } from '@/lib/iracing';

export async function GET() {
  const seasons = await getSeriesSeasons();
  // Return first 2 records so we can see the full field structure
  return NextResponse.json(seasons.slice(0, 2));
}

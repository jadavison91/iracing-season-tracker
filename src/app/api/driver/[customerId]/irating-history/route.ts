import { NextRequest, NextResponse } from 'next/server';
import { getMemberChartData, IRacingApiError, IRacingAuthError } from '@/lib/iracing';

// iRacing category IDs for iRating chart data
// Note: iRacing uses these IDs for the /member/chart_data endpoint
const CATEGORY_IDS = {
  sports_car: 2,   // Sports Car (Road category)
  formula: 6,      // Formula Car (separate iRating from sports car)
  oval: 1,         // Oval
  dirt_road: 4,    // Dirt Road
  dirt_oval: 3,    // Dirt Oval
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId } = await params;
    const custId = parseInt(customerId, 10);

    if (isNaN(custId) || custId <= 0) {
      return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 });
    }

    // Fetch iRating history for all categories in parallel
    const results = await Promise.allSettled(
      Object.entries(CATEGORY_IDS).map(async ([category, categoryId]) => {
        const data = await getMemberChartData(custId, categoryId, 1); // 1 = iRating
        console.log(`[irating-history] ${category} (categoryId=${categoryId}): ${data.data?.length || 0} data points`);
        return { category, categoryId, data: data.data || [] };
      })
    );

    // Process results, filtering out failures
    const chartData: Record<string, { categoryId: number; data: Array<{ when: string; value: number }> }> = {};

    results.forEach((result, index) => {
      const category = Object.keys(CATEGORY_IDS)[index];
      if (result.status === 'fulfilled') {
        chartData[category] = {
          categoryId: result.value.categoryId,
          data: result.value.data,
        };
      } else {
        console.warn(`Failed to fetch iRating history for ${category}:`, result.reason);
        chartData[category] = {
          categoryId: Object.values(CATEGORY_IDS)[index],
          data: [],
        };
      }
    });

    return NextResponse.json(chartData);
  } catch (error) {
    console.error('Error fetching iRating history:', error);

    if (error instanceof IRacingAuthError) {
      return NextResponse.json(
        { error: 'Authentication failed. Please check server credentials.' },
        { status: 401 }
      );
    }

    if (error instanceof IRacingApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
    }

    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

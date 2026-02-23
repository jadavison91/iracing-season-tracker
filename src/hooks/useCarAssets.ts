'use client';

import { useQuery } from '@tanstack/react-query';

export interface CarAsset {
  car_id: number;
  detail_copy: string;
  detail_techspecs_copy: string;
  detail_screen_shot_images: string;
  large_image: string;
  small_image: string;
  logo: string;
  folder: string;
}

export type CarAssetsMap = Record<string, CarAsset>;

const IRACING_IMAGE_BASE = 'https://images-static.iracing.com';

async function fetchCarAssets(): Promise<CarAssetsMap> {
  const response = await fetch('/api/car/assets');
  if (!response.ok) {
    throw new Error(`Failed to fetch car assets: ${response.status}`);
  }
  return response.json();
}

/**
 * Get the full URL for a car image
 * Images are constructed from: base URL + folder + "/" + image filename
 */
export function getCarImageUrl(asset: CarAsset | undefined, size: 'large' | 'small' = 'small'): string | null {
  if (!asset) return null;
  const imageName = size === 'large' ? asset.large_image : asset.small_image;
  if (!imageName || !asset.folder) return null;
  return `${IRACING_IMAGE_BASE}${asset.folder}/${imageName}`;
}

/**
 * Get the full URL for a car brand logo
 */
export function getCarLogoUrl(asset: CarAsset | undefined): string | null {
  if (!asset?.logo) return null;
  return `${IRACING_IMAGE_BASE}${asset.logo}`;
}

/**
 * Hook to fetch and cache car assets
 * Assets are cached globally since they don't change per driver
 */
export function useCarAssets() {
  return useQuery({
    queryKey: ['carAssets'],
    queryFn: fetchCarAssets,
    staleTime: 1000 * 60 * 60, // 1 hour - assets rarely change
    gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
  });
}

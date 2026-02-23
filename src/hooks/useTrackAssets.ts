'use client';

import { useQuery } from '@tanstack/react-query';

export interface TrackAsset {
  track_id: number;
  detail_copy: string;
  large_image: string;
  small_image: string;
  gallery_images: string;
  gallery_prefix: string | null;
  logo: string;
  folder: string;
  track_map: string;
  track_map_layers: {
    background: string;
    inactive: string;
    active: string;
    pitroad: string;
    'start-finish': string;
    turns: string;
  };
  coordinates: string;
  north: string;
}

export type TrackAssetsMap = Record<string, TrackAsset>;

const IRACING_IMAGE_BASE = 'https://images-static.iracing.com';

async function fetchTrackAssets(): Promise<TrackAssetsMap> {
  const response = await fetch('/api/track/assets');
  if (!response.ok) {
    throw new Error(`Failed to fetch track assets: ${response.status}`);
  }
  return response.json();
}

/**
 * Get the full URL for a track image
 * Images are constructed from: base URL + folder + "/" + image filename
 */
export function getTrackImageUrl(asset: TrackAsset | undefined, size: 'large' | 'small' = 'large'): string | null {
  if (!asset) return null;
  const imageName = size === 'large' ? asset.large_image : asset.small_image;
  if (!imageName || !asset.folder) return null;
  return `${IRACING_IMAGE_BASE}${asset.folder}/${imageName}`;
}

/**
 * Get the full URL for a track map SVG
 * Track maps are already full URLs to members-assets.iracing.com
 * We append 'active.svg' to get the main track layout
 */
export function getTrackMapUrl(asset: TrackAsset | undefined): string | null {
  if (!asset?.track_map) return null;
  // track_map is already a full URL, append the active layer SVG
  return `${asset.track_map}active.svg`;
}

/**
 * Get the full URL for a track logo
 * Logos use absolute paths from images-static base
 */
export function getTrackLogoUrl(asset: TrackAsset | undefined): string | null {
  if (!asset?.logo) return null;
  return `${IRACING_IMAGE_BASE}${asset.logo}`;
}

/**
 * Hook to fetch and cache track assets
 * Assets are cached globally since they don't change per driver
 */
export function useTrackAssets() {
  return useQuery({
    queryKey: ['trackAssets'],
    queryFn: fetchTrackAssets,
    staleTime: 1000 * 60 * 60, // 1 hour - assets rarely change
    gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
  });
}

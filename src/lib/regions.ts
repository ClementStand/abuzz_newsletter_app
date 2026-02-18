/**
 * Shared region mapping — single source of truth for region-to-keyword resolution.
 * Used by server-side queries (page.tsx), client-side filtering (Sidebar.tsx), etc.
 */

import { APP_CONFIG, matchesRegion as matchRegionImpl } from '@/lib/config'

/**
 * Shared region mapping — single source of truth for region-to-keyword resolution.
 * Now delegated to central config.
 */
export const REGION_KEYWORDS = APP_CONFIG.regions

/**
 * Check if a competitor region string matches a selected region filter.
 */
export function matchesRegion(competitorRegion: string, selectedRegion: string): boolean {
  return matchRegionImpl(competitorRegion, selectedRegion)
}

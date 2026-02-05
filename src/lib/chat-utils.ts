// Utility functions for parsing and extracting entities from chat messages

import { subDays, subWeeks, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { ParsedQuery } from '@/components/chat/types';

// Region mapping
const REGION_PATTERNS = {
  MENA: /\b(dubai|uae|saudi|qatar|mena|middle east|arab|emirates|riyadh|doha)\b/i,
  APAC: /\b(thailand|singapore|australia|apac|asia|pacific|sydney|bangkok|tokyo|japan|china|india)\b/i,
  EUROPE: /\b(uk|britain|germany|france|europe|european|london|paris|berlin|spain|italy)\b/i,
  NORTH_AMERICA: /\b(us|usa|america|united states|canada|north america|toronto|new york|california)\b/i,
};

// Event type keywords
const EVENT_TYPE_PATTERNS = {
  'Investment/Funding Round': /\b(funding|investment|raised|round|series [a-z]|capital|venture|vc)\b/i,
  'Partnership/Acquisition': /\b(partnership|acquisition|merger|m&a|acquired|partner|collaboration|alliance)\b/i,
  'Product Launch': /\b(product|launch|feature|release|announced|unveil|debut|new version)\b/i,
  'Award/Recognition': /\b(award|recognition|winner|prize|honored|best|achievement)\b/i,
  'Market Expansion': /\b(expansion|expand|market|new region|entering|growth|international)\b/i,
  'Leadership Change': /\b(ceo|executive|leadership|appointed|hire|joined|director|chief)\b/i,
  'Technical Innovation': /\b(technology|innovation|patent|ai|machine learning|breakthrough|research)\b/i,
  'New Project/Installation': /\b(project|installation|contract|deployment|client|customer|site)\b/i,
  'Financial Performance': /\b(revenue|earnings|profit|quarterly|annual|ipo|financial|results)\b/i,
};

// Threat level keywords
const THREAT_LEVEL_PATTERNS = {
  high: /\b(high threat|major threat|critical|serious|level [45]|threat level [45])\b/i,
  medium: /\b(medium threat|moderate|level 3|threat level 3)\b/i,
  low: /\b(low threat|minor|routine|level [12]|threat level [12])\b/i,
};

/**
 * Parse date expressions from text
 */
export function parseDateRange(text: string): { start: Date; end: Date } | undefined {
  const now = new Date();
  const lowerText = text.toLowerCase();

  // Last X days
  if (lowerText.includes('today')) {
    return { start: now, end: now };
  }
  if (lowerText.includes('yesterday')) {
    const yesterday = subDays(now, 1);
    return { start: yesterday, end: yesterday };
  }
  if (lowerText.includes('last week') || lowerText.includes('past week')) {
    return { start: subWeeks(now, 1), end: now };
  }
  if (lowerText.includes('last 7 days') || lowerText.includes('past 7 days')) {
    return { start: subDays(now, 7), end: now };
  }
  if (lowerText.includes('last month') || lowerText.includes('past month')) {
    return { start: subMonths(now, 1), end: now };
  }
  if (lowerText.includes('last 30 days') || lowerText.includes('past 30 days')) {
    return { start: subDays(now, 30), end: now };
  }
  if (lowerText.includes('this week')) {
    return { start: subDays(now, 7), end: now };
  }
  if (lowerText.includes('this month')) {
    return { start: startOfMonth(now), end: endOfMonth(now) };
  }
  if (lowerText.includes('this year')) {
    return { start: startOfYear(now), end: endOfYear(now) };
  }

  // Quarter detection (Q1, Q2, Q3, Q4)
  const quarterMatch = text.match(/q([1-4])\s*(?:20)?(\d{2})/i);
  if (quarterMatch) {
    const quarter = parseInt(quarterMatch[1]);
    const year = parseInt(quarterMatch[2]) + (quarterMatch[2].length === 2 ? 2000 : 0);
    const startMonth = (quarter - 1) * 3;
    return {
      start: new Date(year, startMonth, 1),
      end: new Date(year, startMonth + 3, 0),
    };
  }

  // Month names
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                      'july', 'august', 'september', 'october', 'november', 'december'];
  for (let i = 0; i < monthNames.length; i++) {
    if (lowerText.includes(monthNames[i])) {
      const currentYear = now.getFullYear();
      return {
        start: new Date(currentYear, i, 1),
        end: new Date(currentYear, i + 1, 0),
      };
    }
  }

  // Default: last 30 days if no specific date found but query seems time-related
  if (lowerText.includes('recent') || lowerText.includes('latest') || lowerText.includes('new')) {
    return { start: subDays(now, 30), end: now };
  }

  return undefined;
}

/**
 * Extract competitor names from text
 * Note: This should be called with actual competitor list from database
 */
export function extractCompetitors(text: string, competitorList: { id: string; name: string }[]): string[] {
  const lowerText = text.toLowerCase();
  const matched: string[] = [];

  for (const competitor of competitorList) {
    const competitorName = competitor.name.toLowerCase();
    // Check for exact match or fuzzy match (without spaces)
    if (
      lowerText.includes(competitorName) ||
      lowerText.includes(competitorName.replace(/\s+/g, ''))
    ) {
      matched.push(competitor.id);
    }
  }

  return matched;
}

/**
 * Extract regions from text
 */
export function extractRegions(text: string): string[] {
  const regions: string[] = [];

  for (const [region, pattern] of Object.entries(REGION_PATTERNS)) {
    if (pattern.test(text)) {
      regions.push(region);
    }
  }

  return regions;
}

/**
 * Extract event types from text
 */
export function extractEventTypes(text: string): string[] {
  const eventTypes: string[] = [];

  for (const [eventType, pattern] of Object.entries(EVENT_TYPE_PATTERNS)) {
    if (pattern.test(text)) {
      eventTypes.push(eventType);
    }
  }

  return eventTypes;
}

/**
 * Extract threat level from text
 */
export function extractThreatLevel(text: string): number | undefined {
  if (THREAT_LEVEL_PATTERNS.high.test(text)) {
    return 4;
  }
  if (THREAT_LEVEL_PATTERNS.medium.test(text)) {
    return 3;
  }
  if (THREAT_LEVEL_PATTERNS.low.test(text)) {
    return 2;
  }
  return undefined;
}

/**
 * Parse a user query and extract all entities
 */
export async function parseQuery(
  query: string,
  competitorList: { id: string; name: string }[]
): Promise<ParsedQuery> {
  return {
    competitors: extractCompetitors(query, competitorList),
    dateRange: parseDateRange(query),
    regions: extractRegions(query),
    eventTypes: extractEventTypes(query),
    threatLevel: extractThreatLevel(query),
  };
}

/**
 * Format date for display
 */
export function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return past.toLocaleDateString();
}

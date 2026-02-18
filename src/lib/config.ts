export const APP_CONFIG = {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'Market Analyser',
    description: process.env.NEXT_PUBLIC_APP_DESCRIPTION || 'Competitor Intelligence Platform',

    // Default Tenant/User configuration (will be replaced by DB data in Phase 2)
    company: {
        name: process.env.NEXT_PUBLIC_COMPANY_NAME || 'My Company',
        industry: process.env.NEXT_PUBLIC_INDUSTRY || 'Technology',
        keywords: (process.env.NEXT_PUBLIC_INDUSTRY_KEYWORDS || '').split(',').filter(Boolean),
    },

    // Region settings
    regions: {
        'North America': ['north america', 'us', 'usa', 'canada', 'america'],
        'Europe': [
            'europe', 'uk', 'germany', 'france', 'spain', 'italy', 'netherlands',
            'sweden', 'denmark', 'ireland', 'switzerland', 'belgium', 'austria',
            'poland', 'norway', 'finland',
        ],
        'MENA': [
            'mena', 'middle east', 'uae', 'saudi', 'qatar', 'dubai',
            'abu dhabi', 'israel', 'turkey', 'egypt',
        ],
        'APAC': [
            'apac', 'asia', 'china', 'japan', 'korea', 'india',
            'singapore', 'australia', 'pacific',
        ],
        'Global': ['global'],
    } as Record<string, string[]>
}

export function matchesRegion(competitorRegion: string, selectedRegion: string): boolean {
    const r = competitorRegion.toLowerCase()
    const keywords = APP_CONFIG.regions[selectedRegion]
    if (!keywords) return r.includes(selectedRegion.toLowerCase())
    return keywords.some(k => r.includes(k))
}

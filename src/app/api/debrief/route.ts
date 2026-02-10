import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'

// Extend Vercel serverless timeout (default is 10s, this allows up to 60s)
export const maxDuration = 60

const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { mode, startDate, endDate } = body

        // Build query filters
        const where: any = {}
        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            }
        }

        // If mode is count, just return the count
        if (mode === 'count') {
            const count = await prisma.competitorNews.count({ where })
            return NextResponse.json({ count })
        }

        // Fetch news items with competitors
        const newsItems = await prisma.competitorNews.findMany({
            where,
            orderBy: { threatLevel: 'desc' },
            take: 50, // Limit to avoid token overflow
            include: {
                competitor: true,
            },
        })

        if (newsItems.length === 0) {
            return NextResponse.json({
                response: 'No intelligence data found for the selected period.',
                itemCount: 0,
            })
        }

        // Format news for Claude
        const formattedNews = newsItems.map((item, i) => {
            return `${i + 1}. [${item.competitor.name}] ${item.title}
   Date: ${new Date(item.date).toLocaleDateString()}
   Threat Level: ${item.threatLevel}/5
   Type: ${item.eventType}
   Region: ${item.region || 'Global'}
   Summary: ${item.summary}
   Source: ${item.sourceUrl}
`
        }).join('\n')

        const systemPrompt = `You are a strategic intelligence analyst for Abuzz, a 3D wayfinding and kiosk solutions company based in UAE/Australia.

Generate a comprehensive weekly intelligence debrief based on competitor activities.

Key Context:
- Primary Markets: UAE, Saudi Arabia, Qatar (malls, airports, hospitals)
- Main Competitors: Mappedin, 22Miles, Pointr, ViaDirect, MapsPeople
- Threat Levels: 1 (routine) to 5 (major threat in MENA)

Structure your debrief with:
1. **Executive Summary** (2-3 sentences on key trends)
2. **High-Priority Threats** (threat level 4-5 items)
3. **Regional Analysis** (MENA focus, then other regions)
4. **Competitor Movements** (grouped by company)
5. **Strategic Recommendations** (actionable insights)

Use clear markdown formatting with headers, bullet points, and emphasis.
Be concise but actionable.`

        const userPrompt = `Analyze these ${newsItems.length} intelligence items from the past week and generate a strategic debrief:

${formattedNews}

Generate a comprehensive weekly intelligence debrief following the structure outlined.`

        // Call Claude API
        const message = await client.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 4000,
            system: systemPrompt,
            messages: [
                {
                    role: 'user',
                    content: userPrompt,
                },
            ],
        })

        const response = message.content[0].type === 'text' ? message.content[0].text : ''

        return NextResponse.json({
            response,
            itemCount: newsItems.length,
        })
    } catch (error: any) {
        console.error('Debrief generation error:', error)
        return NextResponse.json(
            { error: 'Failed to generate debrief', details: error.message },
            { status: 500 }
        )
    }
}

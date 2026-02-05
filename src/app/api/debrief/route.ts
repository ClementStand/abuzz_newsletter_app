import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

// Initialize Anthropic client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || ''
})

export async function POST(request: Request) {
    try {
        const { startDate, endDate, mode = 'generate' } = await request.json()

        // 1. Fetch News
        let news = await prisma.competitorNews.findMany({
            include: { competitor: true },
            orderBy: { threatLevel: 'desc' }
        })

        // Filter in Memory (SQLite stores dates as TEXT)
        if (startDate && endDate) {
            const start = new Date(startDate)
            const end = new Date(endDate)

            news = news.filter((n: any) => {
                const itemDate = new Date(n.date)
                const itemTime = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate()).getTime()
                const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
                const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime()
                return itemTime >= startTime && itemTime <= endTime
            })
        }

        // Count Mode
        if (mode === 'count') {
            return NextResponse.json({ count: news.length })
        }

        if (news.length === 0) {
            return NextResponse.json({
                debrief: "No intelligence data found for this period. Please fetch new data or select a different date range."
            })
        }

        // 2. Format News for Prompt
        const newsFormatted = news.map((n: any) => `
- [${n.date.toISOString().split('T')[0]}] **${n.competitor.name}** (Threat Level: ${n.threatLevel})
  ${n.title}
  Summary: ${n.summary}
  Region: ${n.region || 'Global'}
  Event Type: ${n.eventType}
`).join('\n')

        // 3. Build Prompt
        const prompt = `You are a competitive intelligence analyst for Abuzz, a 3D wayfinding and kiosk solutions company based in UAE/Australia. 

Generate a weekly intelligence debrief based on the following ${news.length} news items collected this week:

${newsFormatted}

Our key markets are:
- Primary: UAE, Saudi Arabia, Qatar (malls, airports, hospitals)
- Secondary: Europe (UK, Germany, France), Australia
- Competitors to watch closely: Mappedin, 22Miles, Pointr, ViaDirect

Please generate a comprehensive debrief with these sections:

## Executive Summary
(2-3 paragraphs overview of the week's competitive landscape. Highlight the biggest moves.)

## 🚨 Top Threats This Week
(Top 3-5 highest priority items with brief analysis of why they matter to Abuzz)

## Competitor Activity
(Group by competitor, summarize their moves. Focus on direct competitors.)

## Regional Highlights
### MENA Region
(Specific focus on UAE, Saudi, Qatar. If no news, state that.)
### Europe
### North America
### APAC

## Market Trends
(Common themes, emerging technologies, M&A activity)

## Recommended Actions for Abuzz
(2-3 specific, actionable recommendations based on this intel)

Format the response in clean Markdown. Be concise but insightful. Focus on strategic implications, not just news recaps.`

        // 4. Generate with Claude
        const message = await anthropic.messages.create({
            model: "claude-3-haiku-20240307",
            max_tokens: 4000,
            messages: [
                { role: "user", content: prompt }
            ]
        })

        const debrief = message.content[0].type === 'text'
            ? message.content[0].text
            : 'Failed to generate debrief'

        return NextResponse.json({ debrief, generatedAt: new Date().toISOString() })

    } catch (error) {
        console.error('Debrief error:', error)
        return NextResponse.json({
            error: 'Failed to generate debrief',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 })
    }
}

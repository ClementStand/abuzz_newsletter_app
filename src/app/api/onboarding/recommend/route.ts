
import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from "@google/generative-ai"

export async function POST(req: Request) {
    try {
        const { website, industry, orgName, regions, keywords, existingCompetitors } = await req.json()

        // Mock response if no API key is set, or for speed during dev
        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({
                recommendations: [
                    { name: "Mock Competitor 1", website: "https://example.com/1", reason: "Found via industry keyword match" },
                    { name: "Mock Competitor 2", website: "https://example.com/2", reason: "Operates in similar region" },
                    { name: "Mock Competitor 3", website: "https://example.com/3", reason: "Similar product offering" },
                ]
            })
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

        const knownContext = existingCompetitors && existingCompetitors.length > 0
            ? `Known Competitors they already track: ${existingCompetitors.map((c: any) => c.name).join(', ')}.`
            : ''

        const regionContext = regions && regions.length > 0 ? `Target Regions: ${regions.join(', ')}` : 'Global Market'
        const keywordContext = keywords && keywords.length > 0 ? `Focus Keywords: ${keywords.join(', ')}` : ''

        const prompt = `I am a business called "${orgName}" in the "${industry}" industry. My website is "${website}".
        ${regionContext}. ${keywordContext}.
        ${knownContext}
        
        Using the above context (esp. known competitors as a guide for similarity), recommend 10 NEW top competitors for me. 
        Do not list the ones I already track.
        
        For each, provide:
        1. Name
        2. Website URL (Must be valid)
        3. A brief 1-line reason why they are a competitor.

        Return strictly valid JSON:
        {
            "recommendations": [
                { "name": "Name", "website": "URL", "reason": "Reason" }
            ]
        }`

        const result = await model.generateContent(prompt)
        const response = result.response
        const text = response.text()

        // Cleanup JSON markdown block if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim()
        const data = JSON.parse(jsonStr)

        return NextResponse.json(data)
    } catch (error) {
        console.error('Recommendation API Error:', error)
        return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 })
    }
}

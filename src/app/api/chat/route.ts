import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { anthropic, CHAT_CONFIG } from '@/lib/anthropic';
import { parseQuery } from '@/lib/chat-utils';
import { ChatRequest, ChatResponse, NewsSource } from '@/components/chat/types';
import { subDays } from 'date-fns';

export async function POST(request: Request) {
  try {
    const body = await request.json() as ChatRequest;
    const { message, conversationHistory = [] } = body;

    // Validate input
    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (message.length > 500) {
      return NextResponse.json(
        { error: 'Message too long (max 500 characters)' },
        { status: 400 }
      );
    }

    // 1. Get all competitors for entity extraction
    const competitors = await prisma.competitor.findMany({
      where: { status: 'active' },
      select: { id: true, name: true },
    });

    // 2. Parse query to extract entities
    const parsedQuery = await parseQuery(message, competitors);

    // 3. Build database query with filters
    const where: any = {};

    // Apply competitor filter
    if (parsedQuery.competitors.length > 0) {
      where.competitorId = { in: parsedQuery.competitors };
    }

    // Apply region filter
    if (parsedQuery.regions.length > 0) {
      where.region = { in: parsedQuery.regions };
    }

    // Apply event type filter
    if (parsedQuery.eventTypes.length > 0) {
      where.eventType = { in: parsedQuery.eventTypes };
    }

    // Apply threat level filter
    if (parsedQuery.threatLevel) {
      where.threatLevel = { gte: parsedQuery.threatLevel };
    }

    // 4. Fetch news items (will filter by date in memory due to SQLite TEXT date storage)
    let newsItems = await prisma.competitorNews.findMany({
      where,
      include: { competitor: true },
      orderBy: [
        { threatLevel: 'desc' },
        { date: 'desc' },
      ],
    });

    // Filter by date range in memory (SQLite stores dates as TEXT)
    const dateRange = parsedQuery.dateRange || {
      start: subDays(new Date(), 30),
      end: new Date(),
    };

    newsItems = newsItems.filter((item) => {
      const itemDate = new Date(item.date);
      return itemDate >= dateRange.start && itemDate <= dateRange.end;
    });

    // Limit to 30 most relevant items
    newsItems = newsItems.slice(0, 30);

    // 5. Handle no results
    if (newsItems.length === 0) {
      return NextResponse.json<ChatResponse>({
        response: "I couldn't find any relevant intelligence matching your query. Try broadening your search by:\n- Expanding the time range\n- Removing specific filters\n- Asking about different competitors or regions",
        sources: [],
      });
    }

    // 6. Format news items for prompt
    const newsFormatted = newsItems.map((item) => {
      let details = '';
      try {
        const detailsObj = JSON.parse(item.details || '{}');
        if (detailsObj.location) details += `\n  Location: ${detailsObj.location}`;
        if (detailsObj.financial_value) details += `\n  Value: ${detailsObj.financial_value}`;
        if (detailsObj.partners?.length) details += `\n  Partners: ${detailsObj.partners.join(', ')}`;
        if (detailsObj.products?.length) details += `\n  Products: ${detailsObj.products.join(', ')}`;
      } catch (e) {
        // Ignore parsing errors
      }

      return `
[${item.date.toISOString().split('T')[0]}] ${item.competitor.name} (Threat: ${item.threatLevel}/5)
Event: ${item.eventType} | Region: ${item.region || 'Global'}
Title: ${item.title}
Summary: ${item.summary}${details}
---`;
    }).join('\n');

    // 7. Build conversation history for context
    const conversationContext = conversationHistory
      .slice(-10) // Last 10 messages for context
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');

    // 8. Build Claude prompt
    const systemPrompt = `You are an AI assistant for Abuzz, a 3D wayfinding and kiosk solutions company based in UAE/Australia.

Your role is to help analyze competitive intelligence about rivals in the indoor mapping and digital signage industry.

Key Context:
- Primary Markets: UAE, Saudi Arabia, Qatar (malls, airports, hospitals)
- Main Competitors: Mappedin, 22Miles, Pointr, ViaDirect, MapsPeople
- Threat Levels: 1 (routine) to 5 (major threat in MENA)

Instructions:
- Provide concise, actionable insights (2-3 paragraphs max)
- Cite specific news items when making claims (use competitor names and dates)
- Highlight threats to Abuzz's MENA market position
- Suggest strategic responses when appropriate
- Use markdown formatting for clarity
- Be conversational and helpful

Current Date: ${new Date().toISOString().split('T')[0]}

${conversationContext ? `Previous Conversation:\n${conversationContext}\n` : ''}

Available Intelligence (${newsItems.length} items):
${newsFormatted}

User Question: ${message}`;

    // 9. Call Claude API
    const claudeResponse = await anthropic.messages.create({
      model: CHAT_CONFIG.model,
      max_tokens: CHAT_CONFIG.maxTokens,
      messages: [
        { role: 'user', content: systemPrompt },
      ],
    });

    const responseText = claudeResponse.content[0].type === 'text'
      ? claudeResponse.content[0].text
      : 'Sorry, I encountered an error processing your request.';

    // 10. Extract sources from news items
    const sources: NewsSource[] = newsItems.slice(0, 10).map((item) => ({
      id: item.id,
      competitorName: item.competitor.name,
      title: item.title,
      date: item.date.toISOString().split('T')[0],
      url: item.sourceUrl,
    }));

    // 11. Return response
    return NextResponse.json<ChatResponse>({
      response: responseText,
      sources,
    });

  } catch (error) {
    console.error('Chat API error:', error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'AI service configuration error. Please contact support.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to process chat request',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

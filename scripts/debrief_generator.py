"""
Debrief Generator for Abuzz Competitor Intelligence
Generates weekly intelligence debrief using Claude AI and saves to database.
Run locally: ./.venv/bin/python scripts/debrief_generator.py
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import datetime
import json
import os
import uuid
import anthropic
from dotenv import load_dotenv

# Load .env.local first, then .env as fallback
load_dotenv('.env.local')
load_dotenv()

# Configure
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
_raw_db_url = os.getenv("DATABASE_URL") or os.getenv("DIRECT_URL")
DATABASE_URL = _raw_db_url.split('?')[0] if _raw_db_url else None

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


def generate_cuid():
    return 'c' + uuid.uuid4().hex[:24]


def get_db_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


SYSTEM_PROMPT = """You are a strategic intelligence analyst for Abuzz, a 3D wayfinding and kiosk solutions company based in UAE/Australia.

Generate a comprehensive weekly intelligence debrief based on the provided competitor news items.

**Key Context:**
- **Your Role:** Provide actionable competitive intelligence, NOT to critique the data collection method.
- **Primary Markets:** UAE, Saudi Arabia, Qatar (malls, airports, hospitals).
- **Key Competitors:** Mappedin, 22Miles, Pointr, ViaDirect, MapsPeople.

**Instructions:**
1. **Focus on the Data:** Analyze ONLY the provided news items. Do not hallucinate missing info.
2. **Handle Missing Key Players:** If Mappedin, 22Miles, or other key competitors have NO news items in the list, explicitly state: "No significant public activity detected for [Name] this period." Do NOT say "data collection failed" or "methodology needs recalibration".
3. **Analyze What Exists:** If the only news is from secondary competitors (e.g. Joseph Group, Desert River), treat it as valid market intelligence. Analyze their moves (e.g. "Joseph Group is expanding into X") and explain why it matters to Abuzz (e.g. "potential partnership opportunity" or "indirect competition in signage").
4. **Tone:** Professional, concise, forward-looking.

**Structure:**
1. **Executive Summary** (2-3 sentences). **CRITICAL:** Summarize the actual events found in the news. specific details (e.g. "Joseph Group secured a major healthcare contract..."). Do NOT start with "Activity was low" or "No news from key players". Even if the news is from secondary players, summarize IT.
2. **High-Priority Threats** (Review items with Threat Level 4-5).
3. **Competitor Movements** (Group by company).
4. **Market Trends & Insights** (Synthesize the available news into trends).
5. **Strategic Recommendations** (Based on the ACTUAL news found).

Use clear markdown formatting."""


def fetch_recent_news(days=14):
    """Fetch news from the last N days"""
    conn = get_db_connection()
    cursor = conn.cursor()

    end = datetime.datetime.now(datetime.timezone.utc)
    start = end - datetime.timedelta(days=days)

    cursor.execute("""
        SELECT cn.*, c.name as competitor_name
        FROM "CompetitorNews" cn
        JOIN "Competitor" c ON cn."competitorId" = c.id
        WHERE cn.date >= %s AND cn.date <= %s
        ORDER BY cn."threatLevel" DESC
        LIMIT 50
    """, (start.isoformat(), end.isoformat()))

    news = cursor.fetchall()
    conn.close()
    return news, start, end


def format_news(news_items):
    """Format news items for Claude"""
    lines = []
    for i, item in enumerate(news_items, 1):
        lines.append(f"""{i}. [{item['competitor_name']}] {item['title']}
   Date: {item['date']}
   Threat Level: {item['threatLevel']}/5
   Type: {item['eventType']}
   Region: {item.get('region') or 'Global'}
   Summary: {item['summary']}
   Source: {item['sourceUrl']}
""")
    return '\n'.join(lines)


def generate_debrief(news_items):
    """Generate debrief using Claude"""
    formatted = format_news(news_items)

    user_prompt = f"""Analyze these {len(news_items)} intelligence items from the past week and generate a strategic debrief:

{formatted}

Generate a comprehensive weekly intelligence debrief following the structure outlined."""

    print("  Calling Claude API...")
    message = client.messages.create(
        model="claude-sonnet-4-5-20250929",
        max_tokens=4000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}]
    )

    return message.content[0].text


def save_debrief(content, period_start, period_end, item_count):
    """Save debrief to database"""
    conn = get_db_connection()
    cursor = conn.cursor()

    debrief_id = generate_cuid()
    now = datetime.datetime.now(datetime.timezone.utc)

    cursor.execute("""
        INSERT INTO "Debrief" (id, content, "periodStart", "periodEnd", "itemCount", "generatedAt")
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (
        debrief_id,
        content,
        period_start.strftime('%Y-%m-%dT%H:%M:%S.000Z'),
        period_end.strftime('%Y-%m-%dT%H:%M:%S.000Z'),
        item_count,
        now.strftime('%Y-%m-%dT%H:%M:%S.000Z')
    ))

    conn.commit()
    conn.close()
    return debrief_id


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Generate intelligence debrief')
    parser.add_argument('--days', type=int, default=14, help='Number of days to look back (default: 14)')
    args = parser.parse_args()
    
    # Pass args to main (refactor main to accept args or set global)
    # Since main() is simple, I'll just modify it to use args.days
    
    print("=" * 60)
    print("📊 WEEKLY INTELLIGENCE DEBRIEF GENERATOR")
    print("=" * 60)

    if not ANTHROPIC_API_KEY:
        print("\n❌ ERROR: ANTHROPIC_API_KEY not found")
        exit(1)

    if not DATABASE_URL:
        print("\n❌ ERROR: DATABASE_URL not found")
        exit(1)

    # Fetch news
    print(f"\n📋 Fetching recent news (last {args.days} days)...")
    news, start, end = fetch_recent_news(days=args.days)
    print(f"   Found {len(news)} items from {start.strftime('%b %d')} to {end.strftime('%b %d, %Y')}")

    if len(news) == 0:
        print("\n⚠️  No news found. Nothing to generate.")
        exit(0)

    # Generate debrief
    print("\n🤖 Generating debrief with Claude...")
    content = generate_debrief(news)
    print(f"   Generated {len(content)} characters")

    # Save to database
    print("\n💾 Saving to database...")
    debrief_id = save_debrief(content, start, end, len(news))
    print(f"   Saved with ID: {debrief_id}")

    print("\n" + "=" * 60)
    print("✅ DEBRIEF GENERATED AND SAVED")
    print("   View at: localhost:3000/debrief or intel.navpro.io/debrief")
    print("=" * 60)

import { Prisma, Competitor, CompetitorNews } from '@prisma/client'

/** A news item with its competitor relation included */
export type NewsWithCompetitor = CompetitorNews & {
  competitor: Competitor
}

/** Parsed details object from the JSON string stored in CompetitorNews.details */
export interface NewsDetails {
  location?: string
  financial_value?: string
  partners?: string[]
  products?: string[]
  category?: string
}

export type { Competitor, CompetitorNews }

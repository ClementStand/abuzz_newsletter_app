'use client'

import NewsCard from './ui/NewsCard'
import type { NewsWithCompetitor } from '@/lib/types'

export default function NewsFeed({ initialNews = [] }: { initialNews?: NewsWithCompetitor[] }) {

  if (initialNews.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
        <p className="text-gray-400">No recent intelligence found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {initialNews.map((item) => (
        <NewsCard key={item.id} item={item} />
      ))}
    </div>
  )
}

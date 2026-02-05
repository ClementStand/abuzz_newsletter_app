'use client'
import { useState, useEffect, Suspense } from 'react'
import { format, subDays } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import { Sidebar } from '@/components/Sidebar'

export default function WeeklyDebrief() {
    const [debrief, setDebrief] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [refreshing, setRefreshing] = useState(false)
    const [refreshStatus, setRefreshStatus] = useState<any>(null)
    const [showRefreshWarning, setShowRefreshWarning] = useState(false)
    const [itemCount, setItemCount] = useState<number | null>(null)

    // Range Options
    const [rangeType] = useState<'7d'>('7d')

    // Calculate dates based on range type
    const getDates = () => {
        const end = new Date()
        const start = subDays(end, 7)
        return { start, end }
    }

    // Fetch Count
    const checkCount = async () => {
        const { start, end } = getDates()

        const payload: any = { mode: 'count' }
        if (start) {
            payload.startDate = start.toISOString()
            payload.endDate = end.toISOString()
        }

        try {
            const res = await fetch('/api/debrief', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            const data = await res.json()
            setItemCount(data.count)
        } catch (e) {
            console.error(e)
        }
    }

    useEffect(() => {
        checkCount()
    }, [rangeType])


    const handleRefreshClick = () => {
        setShowRefreshWarning(true)
    }

    // Polling Logic
    useEffect(() => {
        let interval: NodeJS.Timeout

        if (refreshing) {
            interval = setInterval(async () => {
                try {
                    const res = await fetch('/api/refresh/status')
                    const status = await res.json()

                    if (status.status === 'processing') {
                        setRefreshStatus(status)
                    } else if (status.status === 'complete' && refreshStatus?.status === 'processing') {
                        // Finished
                        setRefreshing(false)
                        setRefreshStatus(null)
                        checkCount() // Refresh data
                    }
                } catch (e) {
                    console.error("Polling error", e)
                }
            }, 2000)
        }

        return () => clearInterval(interval)
    }, [refreshing])

    const confirmRefresh = async () => {
        setShowRefreshWarning(false)
        setRefreshing(true)
        try {
            await fetch('/api/refresh', { method: 'POST' })
            // Polling effect handles the rest
        } catch (error) {
            console.error("Refresh failed", error)
            setRefreshing(false)
        }
    }


    const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null)

    // Load from LocalStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('abuzz_weekly_debrief')
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                setDebrief(parsed.content)
                setLastGeneratedAt(parsed.generatedAt)
            } catch (e) {
                console.error("Failed to parse saved debrief", e)
            }
        }
    }, [])

    const generateDebrief = async () => {
        setLoading(true)
        setDebrief(null)
        const { start, end } = getDates()

        const payload: any = { mode: 'generate' }
        if (start) {
            payload.startDate = start.toISOString()
            payload.endDate = end.toISOString()
        }

        try {
            const res = await fetch('/api/debrief', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            const data = await res.json()
            setDebrief(data.debrief)

            // Save to LocalStorage
            const now = new Date().toISOString()
            setLastGeneratedAt(now)
            localStorage.setItem('abuzz_weekly_debrief', JSON.stringify({
                content: data.debrief,
                generatedAt: now
            }))

        } catch (error) {
            console.error('Failed to generate debrief:', error)
            setDebrief('Error generating debrief. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    // Handle printing
    const handlePrint = () => {
        window.print()
    }

    const { start, end } = getDates()

    return (
        <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
            <div className="print:hidden">
                <Suspense fallback={<div className="w-64 bg-slate-950 border-r border-slate-800 h-screen" />}>
                    <Sidebar />
                </Suspense>
            </div>

            <main className="flex-1 ml-64 p-12 print:ml-0 print:p-0">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="flex items-end justify-between mb-12 border-b border-slate-800 pb-6 print:border-b-2 print:border-black">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2 print:text-black">Weekly Intelligence Debrief</h1>
                            <div className="flex items-center gap-4 text-slate-400 print:text-slate-600">
                                {/* Range Selector Removed - Weekly Only */}
                                <span className="print:block">
                                    {`${format(start!, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`}
                                </span>

                                {/* Item Count Badge */}
                                {itemCount !== null && (
                                    <span className={`text-xs px-2 py-1 rounded-full border ${itemCount > 0 ? 'bg-cyan-950/30 text-cyan-400 border-cyan-900/50' : 'bg-red-950/30 text-red-400 border-red-900/50'}`}>
                                        {itemCount} signals found
                                    </span>
                                )}

                                {/* Last Generated Timestamp */}
                                {lastGeneratedAt && (
                                    <span className="text-xs text-slate-500 border-l border-slate-800 pl-4 ml-2">
                                        Generated: {format(new Date(lastGeneratedAt), 'MMM d, h:mm a')}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-3 print:hidden">
                            <button
                                onClick={handlePrint}
                                disabled={!debrief}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Print / Save PDF
                            </button>
                            <button
                                onClick={handleRefreshClick}
                                disabled={refreshing || loading}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {refreshing ? <div className="w-4 h-4 border-2 border-slate-400 border-t-white rounded-full animate-spin" /> : "🔄"}
                                Refresh Data
                            </button>
                            <button
                                onClick={generateDebrief}
                                disabled={loading || itemCount === 0}
                                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-md transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-900/20"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <span>✨</span> Generate Report
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="py-20 text-center animate-pulse">
                            <div className="w-16 h-16 bg-slate-800 rounded-full mx-auto mb-6 flex items-center justify-center">
                                <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
                            </div>
                            <h2 className="text-xl font-medium text-slate-300">Analyzing Market Intelligence...</h2>
                            <p className="text-slate-500 mt-2">Processing {itemCount} news items for strategic insights.</p>
                        </div>
                    )}

                    {/* Report Content */}
                    {debrief && (
                        <div className="prose prose-invert prose-slate max-w-none print:prose-black">
                            <style jsx global>{`
                .prose h2 { color: #22d3ee; margin-top: 2em; border-bottom: 1px solid #1e293b; padding-bottom: 0.5em; }
                .prose h3 { color: #cbd5e1; margin-top: 1.5em; }
                .prose strong { color: #fff; }
                .print\\:prose-black h2 { color: #000; border-bottom-color: #ddd; }
                .print\\:prose-black strong { color: #000; }
              `}</style>
                            <ReactMarkdown>{debrief}</ReactMarkdown>
                        </div>
                    )}

                    {/* Empty State */}
                    {!debrief && !loading && (
                        <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/50">
                            <p className="text-slate-500">
                                {itemCount === 0
                                    ? "No new intelligence found in this period."
                                    : "Ready to generate. Click 'Generate Report' to analyze " + itemCount + " items."}
                            </p>
                        </div>
                    )}

                    {/* Live Progress Modal */}
                    {refreshing && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                            <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                                    Refreshing Intelligence...
                                </h3>

                                {refreshStatus ? (
                                    <div className="space-y-4">
                                        <div className="flex justify-between text-sm text-slate-400">
                                            <span>Processing competitor {refreshStatus.current} of {refreshStatus.total}</span>
                                            <span>{Math.round((refreshStatus.current / refreshStatus.total) * 100)}%</span>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-cyan-500 transition-all duration-500 ease-out"
                                                style={{ width: `${(refreshStatus.current / refreshStatus.total) * 100}%` }}
                                            />
                                        </div>

                                        <div className="flex justify-between items-end">
                                            <div className="text-xs text-slate-500">
                                                Est. remaining time:
                                            </div>
                                            <div className="text-xl font-mono text-cyan-400 font-bold">
                                                {refreshStatus.remaining_seconds ?
                                                    `${Math.floor(refreshStatus.remaining_seconds / 60)}m ${refreshStatus.remaining_seconds % 60}s`
                                                    : 'Calculating...'}
                                            </div>
                                        </div>

                                        <p className="text-xs text-slate-600 mt-2 text-center">
                                            Please do not close this tab.
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-slate-400">Starting process...</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Refresh Warning Modal (Initial Confirmation) */}
                    {showRefreshWarning && !refreshing && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
                                <h3 className="text-xl font-bold text-white mb-2">Refresh Intelligence?</h3>
                                <p className="text-slate-400 text-sm mb-6">
                                    This will fetch the latest data from all sources and run AI analysis.
                                    <br /><br />
                                    <span className="text-amber-400 font-medium">This process typically takes about 2 minutes.</span>
                                </p>
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowRefreshWarning(false)}
                                        className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmRefresh}
                                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium shadow-lg shadow-cyan-900/20"
                                    >
                                        Start Refresh
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

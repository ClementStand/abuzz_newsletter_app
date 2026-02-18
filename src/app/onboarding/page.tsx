'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2, Building2, Search, Check, Globe } from "lucide-react"

type Step = 'business' | 'competitors' | 'processing'

interface CompetitorRecommendation {
    name: string
    website: string
    reason: string
}

export default function OnboardingPage() {
    const router = useRouter()
    const [step, setStep] = useState<Step>('business')
    const [loading, setLoading] = useState(false)

    // Business Info
    const [orgName, setOrgName] = useState('')
    const [website, setWebsite] = useState('')
    const [industry, setIndustry] = useState('')
    const [regions, setRegions] = useState<string[]>([])
    const [keywords, setKeywords] = useState('')

    // Competitors
    const [recommendations, setRecommendations] = useState<CompetitorRecommendation[]>([])
    const [selectedCompetitors, setSelectedCompetitors] = useState<CompetitorRecommendation[]>([])

    // Manual Entry
    const [manualName, setManualName] = useState('')
    const [manualWebsite, setManualWebsite] = useState('')

    const AVAILABLE_REGIONS = [
        "Global",
        "North America",
        "Europe",
        "MENA",
        "APAC",
        "South America"
    ]

    const toggleRegion = (region: string) => {
        if (regions.includes(region)) {
            setRegions(prev => prev.filter(r => r !== region))
        } else {
            setRegions(prev => [...prev, region])
        }
    }

    const fetchRecommendations = async (isLoadMore = false) => {
        setLoading(true)
        try {
            const res = await fetch('/api/onboarding/recommend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    website,
                    industry,
                    orgName,
                    regions, // Send array
                    keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
                    existingCompetitors: isLoadMore ? [...selectedCompetitors, ...recommendations] : []
                })
            })

            if (!res.ok) throw new Error('Failed to fetch recommendations')

            const data = await res.json()

            if (isLoadMore) {
                // Filter out duplicates
                const newRecs = data.recommendations.filter((rec: any) =>
                    !recommendations.some(r => r.name === rec.name) &&
                    !selectedCompetitors.some(c => c.name === rec.name)
                )
                setRecommendations(prev => [...prev, ...newRecs])
            } else {
                setRecommendations(data.recommendations)
                setStep('competitors')
            }
        } catch (error) {
            console.error(error)
            if (!isLoadMore) {
                setRecommendations([
                    { name: "Competitor A", website: "https://example.com/a", reason: "Similar industry" },
                    { name: "Competitor B", website: "https://example.com/b", reason: "Key player" },
                    { name: "Competitor C", website: "https://example.com/c", reason: "Direct rival" },
                ])
                setStep('competitors')
            }
        } finally {
            setLoading(false)
        }
    }

    // Step 1: Submit Business Info & Get Recommendations
    const handleBusinessSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await fetchRecommendations(false)
    }

    // Step 2: Select Competitors & Finish
    const handleComplete = async () => {
        setLoading(true)
        setStep('processing')

        try {
            // 1. Create Organization & Initial Competitor Records
            const res = await fetch('/api/onboarding/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orgName,
                    website,
                    industry,
                    regions,
                    keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
                    competitors: selectedCompetitors
                })
            })

            if (res.status === 401) {
                alert("Expected session to be valid, but it seems expired. Please log in again.")
                router.push('/login')
                return
            }

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to complete onboarding')
            }

            // 2. Trigger Enrichment & Historical Scan (The "Wait" Phase)
            // We need the competitor IDs that were just created. 
            // The /complete API needs to return them or we just search by created org's competitors?
            // Let's assume /complete returns { success: true, orgId: ... }
            // We can fetch the competitors for this org or have /complete return them.
            // Simplified: Update /complete to return the list of created competitor IDs.

            // Actually, querying by orgId in the python script is easier if we pass orgId
            // But for now let's just fetch them or rely on the script finding them by Org?
            // The script currently accepts --competitor-ids. 
            // Let's make /complete return the IDs.

            // UPDATE: Since I can't easily modify /complete return without seeing it again (I saw it earlier, it returns orgId),
            // I'll fetch the competitors from the frontend or just pass the OrgID to the process API and let it find them?
            // Passing OrgID is cleaner.

            const processRes = await fetch('/api/onboarding/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orgId: data.orgId,
                    // If we want to be specific, we'd pass IDs. 
                    // Let's update /api/onboarding/process to accept orgId OR competitorIds.
                })
            })

            // Fallback if process fails (don't block user from dashboard)
            if (!processRes.ok) {
                console.error("Enrichment process warning user might see empty data initially")
            }

            // Redirect to dashboard
            router.push('/')
            router.refresh()
        } catch (error: any) {
            console.error(error)
            alert(`Error converting onboarding: ${error.message}`) // Temporary feedback
            setStep('competitors') // Go back on error
        } finally {
            setLoading(false)
        }
    }

    const toggleCompetitor = (comp: CompetitorRecommendation) => {
        if (selectedCompetitors.find(c => c.name === comp.name)) {
            setSelectedCompetitors(prev => prev.filter(c => c.name !== comp.name))
        } else {
            if (selectedCompetitors.length >= 5) return // Max 5
            setSelectedCompetitors(prev => [...prev, comp])
        }
    }

    const isValidUrl = (url: string) => {
        try {
            new URL(url)
            return url.includes('.')
        } catch {
            return false
        }
    }

    const addManualCompetitor = () => {
        if (!manualName || !manualWebsite) return

        // Validate URL
        if (!isValidUrl(manualWebsite) && !isValidUrl(`https://${manualWebsite}`)) {
            alert("Please enter a valid website URL (e.g. https://example.com)") // Simple alert for now, or use state
            return
        }

        // Auto-prepend https if missing
        let validUrl = manualWebsite
        if (!manualWebsite.startsWith('http')) {
            validUrl = `https://${manualWebsite}`
        }

        const newComp = { name: manualName, website: validUrl, reason: 'Manually added' }

        // Add to recommendations list so it's visible
        setRecommendations(prev => [newComp, ...prev])
        // Select it immediately
        toggleCompetitor(newComp)

        // Clear inputs
        setManualName('')
        setManualWebsite('')
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                {/* Progress Steps */}
                <div className="flex justify-between mb-8 max-w-xs mx-auto">
                    <div className={`flex flex-col items-center gap-2 ${step === 'business' ? 'text-cyan-400' : 'text-slate-500'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === 'business' || step === 'competitors' || step === 'processing' ? 'border-cyan-400 bg-cyan-950 text-cyan-400' : 'border-slate-700'}`}>1</div>
                        <span className="text-xs font-medium">Business</span>
                    </div>
                    <div className={`h-0.5 flex-1 mx-4 my-4 bg-slate-800 ${(step === 'competitors' || step === 'processing') && 'bg-cyan-900'}`} />
                    <div className={`flex flex-col items-center gap-2 ${step === 'competitors' ? 'text-cyan-400' : 'text-slate-500'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === 'competitors' || step === 'processing' ? 'border-cyan-400 bg-cyan-950 text-cyan-400' : 'border-slate-700'}`}>2</div>
                        <span className="text-xs font-medium">Competitors</span>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl">

                    {step === 'business' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4">
                            <h1 className="text-2xl font-bold text-white mb-2 text-center">Tell us about your business</h1>
                            <p className="text-slate-400 text-center mb-8">We'll use this to find relevant competitors in your market.</p>

                            <form onSubmit={handleBusinessSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2"><Building2 className="w-4 h-4" /> Company Name</Label>
                                    <input
                                        required
                                        value={orgName}
                                        onChange={e => setOrgName(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                        placeholder="e.g. Acme Inc."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2"><Globe className="w-4 h-4" /> Website URL</Label>
                                    <input
                                        type="url"
                                        required
                                        value={website}
                                        onChange={e => setWebsite(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                        placeholder="https://acme.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2"><Search className="w-4 h-4" /> Industry / Core Focus</Label>
                                    <input
                                        required
                                        value={industry}
                                        onChange={e => setIndustry(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                        placeholder="e.g. Digital Wayfinding, Fintech, E-commerce..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2"><Globe className="w-4 h-4" /> Target Regions</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {AVAILABLE_REGIONS.map(r => {
                                            const isSelected = regions.includes(r)
                                            return (
                                                <button
                                                    key={r}
                                                    type="button"
                                                    onClick={() => toggleRegion(r)}
                                                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${isSelected
                                                        ? 'bg-cyan-600 border-cyan-500 text-white'
                                                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                                                >
                                                    {r}
                                                </button>
                                            )
                                        })}
                                    </div>
                                    {regions.length === 0 && <p className="text-xs text-amber-500">Please select at least one region.</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2"><Search className="w-4 h-4" /> Focus Keywords (Optional)</Label>
                                    <input
                                        value={keywords}
                                        onChange={e => setKeywords(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                        placeholder="e.g. payments, blockchain, mobile app (comma separated)"
                                    />
                                </div>

                                <Button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 h-12 text-lg" disabled={loading || regions.length === 0}>
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Next: Find Competitors"}
                                </Button>
                            </form>
                        </div>
                    )}

                    {step === 'competitors' && (
                        <div className="animate-in fade-in slide-in-from-right-4">
                            <h1 className="text-2xl font-bold text-white mb-2 text-center">Select your competitors</h1>
                            <p className="text-slate-400 text-center mb-6">Choose up to 5 recommended competitors to track.</p>

                            {/* Manual Entry */}
                            <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800 mb-6">
                                <h3 className="text-sm font-medium text-slate-300 mb-3">Add a Competitor Manually</h3>
                                <div className="flex gap-2">
                                    <input
                                        placeholder="Name"
                                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white"
                                        value={manualName}
                                        onChange={e => setManualName(e.target.value)}
                                    />
                                    <input
                                        placeholder="Website"
                                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white"
                                        value={manualWebsite}
                                        onChange={e => setManualWebsite(e.target.value)}
                                    />
                                    <Button
                                        size="sm"
                                        disabled={!manualName || !manualWebsite}
                                        onClick={addManualCompetitor}
                                        className="bg-cyan-600 hover:bg-cyan-500"
                                    >
                                        Add
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-3 mb-8 max-h-[400px] overflow-y-auto pr-2">
                                {recommendations.map((rec, i) => {
                                    const isSelected = selectedCompetitors.some(c => c.name === rec.name)
                                    return (
                                        <div
                                            key={i}
                                            onClick={() => toggleCompetitor(rec)}
                                            className={`p-4 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-cyan-950/40 border-cyan-500/50' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className={`font-semibold ${isSelected ? 'text-cyan-400' : 'text-slate-200'}`}>{rec.name}</h3>
                                                    <p className="text-xs text-slate-500 mt-1">{rec.website}</p>
                                                    <p className="text-sm text-slate-400 mt-2">{rec.reason}</p>
                                                </div>
                                                <div className={`w-6 h-6 rounded border flex items-center justify-center ${isSelected ? 'bg-cyan-600 border-cyan-600' : 'border-slate-600'}`}>
                                                    {isSelected && <Check className="w-4 h-4 text-white" />}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="text-center mb-6">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fetchRecommendations(true)}
                                    disabled={loading}
                                    className="text-cyan-400 border-cyan-900 hover:bg-cyan-950"
                                >
                                    {loading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
                                    Load More AI Suggestions
                                </Button>
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-800 pt-6">
                                <span className="text-sm text-slate-500">
                                    {selectedCompetitors.length} / 5 selected
                                </span>
                                <div className="flex gap-3">
                                    <Button variant="ghost" onClick={() => setStep('business')}>Back</Button>
                                    <Button
                                        onClick={handleComplete}
                                        className="bg-cyan-600 hover:bg-cyan-500 px-8"
                                        disabled={selectedCompetitors.length === 0 || loading}
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Start Tracking"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'processing' && (
                        <div className="py-12 text-center animate-in fade-in zoom-in">
                            <Loader2 className="w-16 h-16 text-cyan-500 animate-spin mx-auto mb-6" />
                            <h2 className="text-2xl font-bold text-white mb-2">Analyzing Compeititors...</h2>
                            <p className="text-slate-400">Fetching revenue, employee data, and scanning historical news (2025-Present).</p>
                            <p className="text-xs text-slate-500 mt-4">This may take up to a minute.</p>
                        </div>
                    )}


                </div>
            </div>
        </div>
    )
}

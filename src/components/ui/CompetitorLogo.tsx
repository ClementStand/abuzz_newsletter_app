'use client'

import { useState } from 'react'
import { cn } from "@/lib/utils"

interface CompetitorLogoProps {
    name: string
    website?: string | null
    className?: string
}

export function CompetitorLogo({ name, website, className }: CompetitorLogoProps) {
    // 0 = Clearbit, 1 = Google Favicon, 2 = Initials
    const [fallbackStage, setFallbackStage] = useState(0)

    const getLogoUrl = (url: string | null | undefined, stage: number) => {
        if (!url) return null
        try {
            const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname

            if (stage === 0) {
                return `https://logo.clearbit.com/${domain}`
            } else if (stage === 1) {
                return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
            }
            return null
        } catch {
            return null
        }
    }

    const handleError = () => {
        setFallbackStage((prev) => prev + 1)
    }

    const logoUrl = getLogoUrl(website, fallbackStage)

    if (!logoUrl || fallbackStage >= 2) {
        return (
            <div className={cn("bg-slate-100 flex items-center justify-center font-bold text-slate-500 overflow-hidden", className)}>
                {name.substring(0, 2).toUpperCase()}
            </div>
        )
    }

    return (
        <img
            key={logoUrl}
            src={logoUrl}
            alt={name}
            className={cn("object-contain bg-white", className)}
            onError={handleError}
        />
    )
}

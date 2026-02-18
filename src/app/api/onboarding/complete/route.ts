
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: Request) {
    try {
        const supabase = createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
            console.log('[API] Onboarding Complete - Unauthorized', { error, user: !!user })
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { orgName, website, industry, competitors, regions, keywords } = await req.json()

        // Transaction to ensure atomic setup
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Organization
            const org = await tx.organization.create({
                data: {
                    name: orgName,
                    industry,
                    regions,
                    keywords: keywords // String array
                }
            })

            // 2. Create User Profile linked to Auth ID and Org
            // We use the auth user's email as well
            await tx.userProfile.create({
                data: {
                    email: user.email!, // Assumes email is present
                    organizationId: org.id,
                    // Store the Supabase Auth ID somewhere?
                    // Currently UserProfile ID is cuid. 
                    // Ideally we should link UserProfile to Supabase Auth ID via a field 'authId'
                    // but for now let's reuse email as unique key or just rely on session -> email -> profile lookup
                    // Or add 'details' column to UserProfile
                }
            })

            // 3. Create Competitors
            if (competitors && competitors.length > 0) {
                await tx.competitor.createMany({
                    data: competitors.map((c: any) => ({
                        name: c.name,
                        website: c.website,
                        status: 'active',
                        organizationId: org.id,
                        industry: industry // Inherit industry for now
                    }))
                })
            }

            return org
        })

        return NextResponse.json({ success: true, orgId: result.id })

    } catch (error) {
        console.error('Onboarding Complete API Error:', error)
        return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 })
    }
}

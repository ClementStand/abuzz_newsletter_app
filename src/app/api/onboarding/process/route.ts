
import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

export async function POST(req: Request) {
    try {
        const { competitorIds, orgId } = await req.json()

        if ((!competitorIds || competitorIds.length === 0) && !orgId) {
            return NextResponse.json({ error: 'Must provide competitorIds or orgId' }, { status: 400 })
        }

        // Spawn Python script
        // Note: For production, this should be a background job (BullMQ, Celery, etc.)
        // For MVP, we'll spawn and stream or just wait if it's fast enough. 
        // User asked to "wait while you fetch", so we can await it here, but Vercel has timeout limits (10s-60s).
        // The script might take longer.

        // Strategy: Spawn detached? or use a long-running request? 
        // Local dev: await is fine.
        // Let's try await for now, as it provides immediate feedback.

        const scriptPath = path.join(process.cwd(), 'scripts', 'onboarding_agent.py')
        const args = [scriptPath]

        if (competitorIds && competitorIds.length > 0) {
            args.push('--competitor-ids', competitorIds.join(','))
        } else if (orgId) {
            args.push('--org-id', orgId)
        }

        // Use venv python if available
        let pythonCmd = 'python3'
        const venvPython = path.join(process.cwd(), '.venv/bin/python')
        if (fs.existsSync(venvPython)) {
            pythonCmd = venvPython
        }

        console.log(`Starting onboarding agent using ${pythonCmd}... Args: ${args.slice(1).join(' ')}`)

        return new Promise((resolve, reject) => {
            const python = spawn(pythonCmd, args)

            let output = ''
            let error = ''

            python.stdout.on('data', (data) => {
                const text = data.toString()
                console.log(`[Onboarding Agent] ${text}`)
                output += text
            })

            python.stderr.on('data', (data) => {
                const text = data.toString()
                console.error(`[Onboarding Agent Error] ${text}`)
                error += text
            })

            python.on('close', (code) => {
                if (code !== 0) {
                    console.error(`Onboarding agent exited with code ${code}`)
                    resolve(NextResponse.json({ error: 'Agent failed', details: error }, { status: 500 }))
                } else {
                    console.log('Onboarding agent completed successfully')
                    resolve(NextResponse.json({ success: true, logs: output }))
                }
            })
        })

    } catch (error) {
        console.error('Onboarding Process API Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

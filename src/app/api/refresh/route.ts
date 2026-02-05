import { spawn } from 'child_process'
import path from 'path'
import { NextResponse } from 'next/server'

// Prevent Vercel/Next from killing the process (works best locally)
export const dynamic = 'force-dynamic'

export async function POST() {
    try {
        const scriptPath = path.join(process.cwd(), 'scripts', 'news_fetcher.py')
        const pythonCommand = './venv/bin/python' // Adjust if needed

        console.log('Spawning background news fetcher...')

        const child = spawn(pythonCommand, [scriptPath], {
            detached: true,
            stdio: 'ignore', // Ignore stdio to allow detaching
            cwd: process.cwd()
        })

        child.unref()

        return NextResponse.json({ success: true, message: "Refresh started in background" })
    } catch (error: any) {
        console.error(`Spawn error: ${error}`)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

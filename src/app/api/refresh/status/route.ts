import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const statusPath = path.join(process.cwd(), 'public', 'refresh_status.json')

        if (!fs.existsSync(statusPath)) {
            return NextResponse.json({ status: 'idle', message: "No active refresh process found." })
        }

        const data = fs.readFileSync(statusPath, 'utf8')
        const json = JSON.parse(data)

        return NextResponse.json(json)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to read status' }, { status: 500 })
    }
}

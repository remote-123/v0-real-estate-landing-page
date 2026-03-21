import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
    const { passcode } = await req.json()

    if (!passcode || passcode !== process.env.ADMIN_PASSCODE) {
        return NextResponse.json({ error: 'Invalid passcode' }, { status: 401 })
    }

    const cookieStore = await cookies()
    cookieStore.set('admin_auth', passcode, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 8, // 8 hours
        path: '/',
    })

    return NextResponse.json({ success: true })
}

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { auth } from '@/auth'
import AdminShell from '@/components/admin/admin-shell'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase())

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    // Allow authenticated admin emails through without passcode
    const session = await auth()
    if (session?.user?.email && ADMIN_EMAILS.includes(session.user.email.toLowerCase())) {
        return <AdminShell>{children}</AdminShell>
    }

    // Fallback: passcode cookie
    const cookieStore = await cookies()
    const passcode = cookieStore.get('admin_auth')?.value
    if (!passcode || passcode !== process.env.ADMIN_PASSCODE) {
        redirect('/admin/login')
    }

    return <AdminShell>{children}</AdminShell>
}

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import AdminShell from '@/components/admin/admin-shell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies()
    const auth = cookieStore.get('admin_auth')?.value

    if (!auth || auth !== process.env.ADMIN_PASSCODE) {
        redirect('/admin/login')
    }

    return <AdminShell>{children}</AdminShell>
}

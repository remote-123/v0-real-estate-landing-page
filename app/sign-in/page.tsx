import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { SignInForm } from "@/components/auth/sign-in-form"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sign In | North Capital DXB",
  description: "Sign in to unlock full access to Dubai real estate intelligence.",
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const session = await auth()
  const params = await searchParams
  if (session) {
    redirect(params.callbackUrl ?? "/terminal/communities")
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <SignInForm callbackUrl={params.callbackUrl ?? "/terminal/communities"} />
    </div>
  )
}

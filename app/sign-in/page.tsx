import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { SignInForm } from "@/components/auth/sign-in-form"
import { CityRegistryTheme } from "@/components/city-registry-theme"
import { headers } from "next/headers"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sign In | The City Registry",
  description: "Sign in to unlock full access to Dubai real estate intelligence.",
  robots: { index: false, follow: false },
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

  const headersList = await headers()
  const isCityRegistry = (headersList.get("x-site") ?? "northcapital") === "cityregistry"

  return (
    <div className={`min-h-screen bg-background flex items-center justify-center px-4${isCityRegistry ? ' cityregistry' : ''}`}>
      <CityRegistryTheme enabled={isCityRegistry} />
      <SignInForm callbackUrl={params.callbackUrl ?? "/terminal/communities"} isCityRegistry={isCityRegistry} />
    </div>
  )
}

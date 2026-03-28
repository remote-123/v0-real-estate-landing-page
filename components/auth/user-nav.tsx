"use client"

import { useSession, signOut } from "next-auth/react"
import { usePathname } from "next/navigation"
import { LogIn, LogOut, User } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export function UserNav() {
  const { data: session, status } = useSession()
  const pathname = usePathname()

  if (status === "loading") {
    return <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
  }

  if (!session) {
    return (
      <Button asChild variant="outline" size="sm" className="gap-2 border-accent/20 hover:bg-accent/10 hover:text-accent">
        <Link href={`/sign-in?callbackUrl=${encodeURIComponent(pathname)}`}>
          <LogIn className="h-3 w-3" />
          <span className="hidden sm:inline">Sign In</span>
        </Link>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative h-8 w-8 rounded-full overflow-hidden border border-border/50 hover:border-accent/50 transition-colors focus:outline-none">
          {session.user?.image ? (
            <Image src={session.user.image} alt="Avatar" fill className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-accent/20">
              <User className="h-4 w-4 text-accent" />
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium leading-none">{session.user?.name ?? "User"}</p>
            <p className="text-xs leading-none text-muted-foreground truncate">{session.user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: "/terminal/communities" })}
          className="text-red-400 focus:text-red-400 cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

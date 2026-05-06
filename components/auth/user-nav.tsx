"use client"

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
import { useSession, signOut } from "next-auth/react"

export function UserNav() {
  const { data: session, status } = useSession()
  const pathname = usePathname()

  if (status === "loading") {
    return <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
  }

  if (!session) {
    return (
      <Button asChild size="sm" className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
        <Link href={`/sign-in?callbackUrl=${encodeURIComponent(pathname)}`}>
          <LogIn className="h-3.5 w-3.5" />
          Sign In
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
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-red-400 focus:text-red-400 cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

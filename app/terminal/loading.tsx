import Image from "next/image"

export default function TerminalLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="relative animate-pulse">
        <Image
          src="/images/North capital logo.svg"
          alt="North Capital"
          width={48}
          height={54}
          className="dark:invert opacity-80"
          priority
        />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-1 w-1 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.3s]" />
        <span className="h-1 w-1 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.15s]" />
        <span className="h-1 w-1 rounded-full bg-muted-foreground/40 animate-bounce" />
      </div>
    </div>
  )
}

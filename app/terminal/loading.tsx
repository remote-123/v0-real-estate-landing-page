export default function TerminalLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="flex items-center gap-1.5">
        <span className="h-1 w-1 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.3s]" />
        <span className="h-1 w-1 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.15s]" />
        <span className="h-1 w-1 rounded-full bg-muted-foreground/40 animate-bounce" />
      </div>
    </div>
  )
}

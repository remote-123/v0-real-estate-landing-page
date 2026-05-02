import { ArrowUpRight, ArrowDownRight, Minus, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
    label: string
    value: string
    trend?: string
    trendDir?: "up" | "down" | "neutral"
    icon?: LucideIcon
    className?: string
    description?: string
    onClick?: () => void
    isActive?: boolean
}

export function StatCard({
    label,
    value,
    trend,
    trendDir = "neutral",
    icon: Icon,
    className,
    description,
    onClick,
    isActive
}: StatCardProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "group relative overflow-hidden rounded-md border border-border/40 bg-card/40 p-3 transition-all",
                onClick && "cursor-pointer hover:bg-card hover:shadow-sm",
                isActive && "border-accent/60 bg-accent/5 shadow-inner ring-1 ring-accent/20",
                className
            )}
        >
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <p className={cn(
                        "text-[10px] font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5",
                        isActive ? "text-accent" : "text-muted-foreground/70 group-hover:text-muted-foreground"
                    )}>
                        {Icon && <Icon className="h-3 w-3" />}
                        {label}
                    </p>
                    <div className="flex items-baseline gap-2">
                        <h4 className="text-lg font-bold tracking-tight">{value}</h4>
                        {trend && (
                            <span className={cn(
                                "flex items-center text-[10px] font-medium",
                                trendDir === "up" ? "text-accent" :
                                    trendDir === "down" ? "text-red-500" :
                                        "text-muted-foreground"
                            )}>
                                {trendDir === "up" && <ArrowUpRight className="h-2 w-2 mr-0.5" />}
                                {trendDir === "down" && <ArrowDownRight className="h-2 w-2 mr-0.5" />}
                                {trendDir === "neutral" && <Minus className="h-2 w-2 mr-0.5" />}
                                {trend}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {description && (
                <div className={cn(
                    "mt-2 text-[9px] leading-tight transition-opacity",
                    isActive ? "text-muted-foreground opacity-100" : "text-muted-foreground/50 opacity-100 group-hover:text-muted-foreground"
                )}>
                    {description}
                </div>
            )}
        </div>
    )
}

import {
    TrendingUp,
    Users,
    Building2,
    Plane,
    Briefcase,
    GraduationCap,
    Zap,
    Database,
    Globe,
    Truck,
    Ship,
    Hotel,
    ChevronRight,
    ArrowLeft,
    BarChart3,
    Calendar,
    ShieldCheck
} from "lucide-react"

export const TERMINAL_ICONS: Record<string, any> = {
    TrendingUp,
    Users,
    Building2,
    Plane,
    Briefcase,
    GraduationCap,
    Zap,
    Database,
    Globe,
    Truck,
    Ship,
    Hotel,
    ChevronRight,
    ArrowLeft,
    BarChart3,
    Calendar,
    ShieldCheck
}

export interface SanityMetric {
    label: string
    value: string
    trend?: string
    trendDir?: "up" | "down" | "neutral"
    description: string
    historicalData?: { year: string, value: number }[]
}

export interface SanityTerminalCategory {
    _id: string
    title: string
    slug: { current: string }
    icon: string
    order: number
    description: string
    strategicVerdict: {
        title: string
        content: string
    }
    metrics: SanityMetric[]
}

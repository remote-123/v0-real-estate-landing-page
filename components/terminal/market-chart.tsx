"use client"

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from "recharts"

interface MarketChartProps {
    data: any[]
    type?: "line" | "area"
    height?: number
    accentColor?: string
}

export function MarketChart({
    data,
    type = "area",
    height = 300,
    accentColor = "var(--accent)"
}: MarketChartProps) {
    const gradientId = `colorValue-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <div style={{ width: '100%', height }} className="text-foreground">
            <ResponsiveContainer width="100%" height="100%">
                {type === "area" ? (
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.9} />
                                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.3} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.9, fontWeight: 600 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.9, fontWeight: 600 }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                fontSize: '11px',
                                color: 'hsl(var(--foreground))',
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                            }}
                            itemStyle={{ color: 'var(--accent)', fontWeight: 'bold' }}
                            cursor={{ stroke: 'var(--accent)', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="var(--accent)"
                            fillOpacity={1}
                            fill={`url(#${gradientId})`}
                            strokeWidth={4}
                        />
                    </AreaChart>
                ) : (
                    <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.9, fontWeight: 600 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.9, fontWeight: 600 }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                fontSize: '11px',
                                color: 'hsl(var(--foreground))',
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke="var(--accent)"
                            strokeWidth={4}
                            dot={{ r: 5, fill: "var(--accent)", strokeWidth: 0 }}
                            activeDot={{ r: 7, strokeWidth: 0 }}
                        />
                    </LineChart>
                )}
            </ResponsiveContainer>
        </div>
    )
}

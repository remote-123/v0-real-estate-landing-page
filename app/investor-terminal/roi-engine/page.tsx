import { ROICalculator } from "@/components/roi-calculator"

export default function ROIEnginePage() {
    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h2 className="font-serif text-3xl font-bold tracking-tight">ROI Engine</h2>
                <p className="text-muted-foreground">Advanced yield modeling for Dubai real estate assets.</p>
            </div>

            <div className="grid gap-8 lg:grid-cols-12">
                <div className="lg:col-span-7">
                    <ROICalculator />
                </div>

                <div className="lg:col-span-5 space-y-6">
                    <div className="rounded-xl border border-border/50 bg-card p-6">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-accent mb-4">Investment Strategy</h3>
                        <div className="space-y-4 text-sm text-muted-foreground">
                            <p>
                                A net ROI of <span className="text-foreground font-medium">7% or higher</span> is considered institutional-grade in the current Dubai market.
                            </p>
                            <div className="p-3 border-l-2 border-accent bg-accent/5">
                                <p className="italic">
                                    "Yield compression is expected in prime areas like Downtown. Focus on high-density secondary hubs for maximum rental growth."
                                </p>
                            </div>
                            <ul className="list-disc list-inside space-y-2">
                                <li>Optimize for 1BR volatility</li>
                                <li>Factoring in 15% maintenance buffer</li>
                                <li>Secondary market exit strategy ready</li>
                            </ul>
                        </div>
                    </div>

                    <div className="rounded-xl border border-border/50 bg-card p-6">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-accent mb-4">Tax Optimization</h3>
                        <p className="text-sm text-muted-foreground">
                            Dubai offers 0% personal income tax on rental yields. Corporate tax may apply for institutional holders (9% above AED 375k threshold).
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

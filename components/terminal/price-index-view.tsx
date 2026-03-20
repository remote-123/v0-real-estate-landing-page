"use client"

import { useState } from "react"
import { PriceIndexChart, type PriceIndexRow } from "./price-index-chart"

interface PriceIndexViewProps {
  data: PriceIndexRow[]
}

export function PriceIndexView({ data }: PriceIndexViewProps) {
  const [range, setRange] = useState<"1Y" | "3Y" | "5Y" | "All">("All")

  return (
    <PriceIndexChart data={data} range={range} onRangeChange={setRange} />
  )
}

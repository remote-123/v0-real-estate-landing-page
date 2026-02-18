"use client"

import React, { useState, useEffect } from "react"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

export function ROICalculator() {
  const [price, setPrice] = useState(1500000)
  const [rent, setRent] = useState(120000)
  const [serviceChargeRate, setServiceChargeRate] = useState(15) // AED per sqft
  const [size, setSize] = useState(1000) // sqft

  // Calculations
  const serviceCharge = size * serviceChargeRate
  const netIncome = rent - serviceCharge
  const roi = (netIncome / price) * 100

  return (
    <Card className="border-accent/20 bg-secondary/50 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="font-serif text-xl">ROI Estimator</CardTitle>
          <Badge variant="outline" className="border-accent text-accent">Live Calc</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Purchase Price Input */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label>Purchase Price (AED)</Label>
            <span className="font-bold text-accent">{price.toLocaleString()}</span>
          </div>
          <Slider 
            defaultValue={[price]} 
            max={5000000} 
            min={500000} 
            step={50000} 
            onValueChange={(val) => setPrice(val[0])}
            className="cursor-pointer"
          />
        </div>

        {/* Annual Rent Input */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label>projected Annual Rent (AED)</Label>
            <span className="font-bold text-accent">{rent.toLocaleString()}</span>
          </div>
          <Slider 
            defaultValue={[rent]} 
            max={400000} 
            min={40000} 
            step={5000} 
            onValueChange={(val) => setRent(val[0])}
            className="cursor-pointer"
          />
        </div>

        {/* Size Input (Hidden simple slider for Service Charge calc) */}
        <div className="space-y-3">
           <div className="flex justify-between text-xs text-muted-foreground">
            <Label>Unit Size (Sq. Ft)</Label>
            <span>{size} sq.ft</span>
          </div>
           <Slider 
            defaultValue={[size]} 
            max={3000} 
            min={400} 
            step={50} 
            onValueChange={(val) => setSize(val[0])}
          />
        </div>

        {/* Results Box */}
        <div className="mt-6 rounded-lg border border-border bg-card p-4">
          <div className="mb-2 flex justify-between text-sm text-muted-foreground">
            <span>Gross Yield:</span>
            <span>{((rent / price) * 100).toFixed(1)}%</span>
          </div>
          <div className="mb-4 flex justify-between text-sm text-red-400">
            <span>Service Charges (~{serviceChargeRate}/sf):</span>
            <span>- {serviceCharge.toLocaleString()} AED</span>
          </div>
          <div className="border-t border-border pt-3 flex justify-between items-center">
            <span className="font-bold text-foreground">Net ROI</span>
            <span className="text-2xl font-bold text-accent">{roi.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between items-center mt-1">
             <span className="text-xs text-muted-foreground">Annual Net Income</span>
             <span className="text-sm font-semibold text-foreground">{netIncome.toLocaleString()} AED</span>
          </div>
        </div>
        
        <p className="text-[10px] text-muted-foreground text-center">
          *Estimates only. Service charges vary by project.
        </p>

      </CardContent>
    </Card>
  )
}
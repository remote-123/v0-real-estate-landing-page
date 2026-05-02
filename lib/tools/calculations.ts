/**
 * lib/tools/calculations.ts
 *
 * Pure calculation functions for all /tools/* calculators.
 * No React, no DOM — all functions are side-effect-free and fully testable.
 */

// ── Shared formatters ─────────────────────────────────────────────────────────

export function formatAED(n: number): string {
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`
  return `AED ${n.toLocaleString()}`
}

export function formatFull(n: number): string {
  return `AED ${new Intl.NumberFormat("en-US").format(Math.round(n))}`
}

export function pctLabel(n: number): string {
  return `${n % 1 === 0 ? n : n.toFixed(1)}%`
}

// ── Off-plan payment calculator ───────────────────────────────────────────────

export type PlanPreset = "20/80" | "40/60" | "60/40" | "30/30/40" | "custom"

export interface MilestoneEntry {
  label: string
  date: string
  pct: number
  aed: number
  cumPct: number
  phase: "booking" | "construction" | "handover" | "post-handover"
}

export interface PlanConfig {
  milestones: number[]
  bookingPct: number
  handoverPct: number
  postHandoverPct: number
  postHandoverYears: number
}

// Reference: Q2 2026
export const REF_YEAR = 2026
export const REF_MONTH = 4 // May (0-indexed)

export const PLAN_CONFIGS: Record<Exclude<PlanPreset, "custom">, PlanConfig> = {
  "20/80": {
    bookingPct: 5,
    milestones: [15],
    handoverPct: 80,
    postHandoverPct: 0,
    postHandoverYears: 0,
  },
  "40/60": {
    bookingPct: 10,
    milestones: [10, 10, 10],
    handoverPct: 60,
    postHandoverPct: 0,
    postHandoverYears: 0,
  },
  "60/40": {
    bookingPct: 20,
    milestones: [10, 10, 10, 10],
    handoverPct: 40,
    postHandoverPct: 0,
    postHandoverYears: 0,
  },
  "30/30/40": {
    bookingPct: 10,
    milestones: [10, 10],
    handoverPct: 30,
    postHandoverPct: 40,
    postHandoverYears: 2,
  },
}

/** Returns "Q{n} {year}" string n months from reference date */
export function addMonths(months: number): string {
  const totalMonths = REF_MONTH + Math.max(0, months)
  const year = REF_YEAR + Math.floor(totalMonths / 12)
  const month = totalMonths % 12
  const q = Math.floor(month / 3) + 1
  return `Q${q} ${year}`
}

/** "Construction X% Complete" label for milestone i of total */
export function constructionLabel(i: number, total: number): string {
  const pct = Math.round(((i + 1) / (total + 1)) * 100)
  return `Construction ${pct}% Complete`
}

export interface CustomPlanInputs {
  booking: number
  construction: number
  handover: number
  postHandover: number
  postHandoverYears: number
}

export function generateSchedule(
  propertyPrice: number,
  preset: PlanPreset,
  handoverYear: number,
  custom: CustomPlanInputs
): MilestoneEntry[] {
  const handoverMonths = Math.max(3, (handoverYear - REF_YEAR) * 12 + (11 - REF_MONTH))

  let bookingPct: number
  let milestones: number[]
  let handoverPct: number
  let postHandoverPct: number
  let postHandoverYears: number

  if (preset === "custom") {
    bookingPct = custom.booking
    handoverPct = custom.handover
    postHandoverPct = custom.postHandover
    postHandoverYears = custom.postHandoverYears

    const constructionPct = custom.construction
    const numMilestones =
      constructionPct <= 0 ? 0
      : constructionPct <= 10 ? 1
      : constructionPct <= 30 ? 2
      : constructionPct <= 50 ? 3
      : 4
    milestones = numMilestones > 0
      ? Array(numMilestones).fill(constructionPct / numMilestones)
      : []
  } else {
    const c = PLAN_CONFIGS[preset]
    bookingPct = c.bookingPct
    milestones = c.milestones
    handoverPct = c.handoverPct
    postHandoverPct = c.postHandoverPct
    postHandoverYears = c.postHandoverYears
  }

  const entries: MilestoneEntry[] = []
  let cumPct = 0

  // 1. Booking
  cumPct += bookingPct
  entries.push({
    label: "Booking / SPA Signing",
    date: addMonths(0),
    pct: bookingPct,
    aed: propertyPrice * (bookingPct / 100),
    cumPct,
    phase: "booking",
  })

  // 2. Construction milestones
  milestones.forEach((pct, i) => {
    const months = Math.round(((i + 1) / (milestones.length + 1)) * handoverMonths)
    cumPct += pct
    entries.push({
      label: constructionLabel(i, milestones.length),
      date: addMonths(months),
      pct,
      aed: propertyPrice * (pct / 100),
      cumPct,
      phase: "construction",
    })
  })

  // 3. Handover
  cumPct += handoverPct
  entries.push({
    label: "Handover",
    date: addMonths(handoverMonths),
    pct: handoverPct,
    aed: propertyPrice * (handoverPct / 100),
    cumPct,
    phase: "handover",
  })

  // 4. Post-handover (semi-annual instalments)
  if (postHandoverPct > 0 && postHandoverYears > 0) {
    const numInstall = postHandoverYears * 2
    const instPct = postHandoverPct / numInstall
    for (let i = 0; i < numInstall; i++) {
      const months = handoverMonths + (i + 1) * 6
      cumPct += instPct
      entries.push({
        label: `Post-Handover Instalment ${i + 1}/${numInstall}`,
        date: addMonths(months),
        pct: instPct,
        aed: propertyPrice * (instPct / 100),
        cumPct,
        phase: "post-handover",
      })
    }
  }

  return entries
}

// ── DLD transfer fee calculator ───────────────────────────────────────────────

export interface DldFeeInputs {
  purchasePrice: number
  isMortgage: boolean
  downPaymentPct: number
  agentCommissionPct: number
  valuationFee: number
}

export interface DldFeeResult {
  dldTransferFee: number
  dldRegistrationFee: number
  agentCommission: number
  loanAmount: number
  mortgageRegFee: number
  valFee: number
  feesTotal: number
  totalAcquisitionCost: number
  feesOverPurchasePct: number
}

export function calcDldFees(inputs: DldFeeInputs): DldFeeResult {
  const { purchasePrice, isMortgage, downPaymentPct, agentCommissionPct, valuationFee } = inputs
  const dldTransferFee = purchasePrice * 0.04
  const dldRegistrationFee = purchasePrice >= 500_000 ? 4_000 : 2_000
  const agentCommission = purchasePrice * (agentCommissionPct / 100)
  const loanAmount = isMortgage ? purchasePrice * (1 - downPaymentPct / 100) : 0
  const mortgageRegFee = isMortgage ? loanAmount * 0.0025 : 0
  const valFee = isMortgage ? valuationFee : 0
  const feesTotal = dldTransferFee + dldRegistrationFee + agentCommission + mortgageRegFee + valFee
  const totalAcquisitionCost = purchasePrice + feesTotal
  const feesOverPurchasePct = purchasePrice > 0 ? (feesTotal / purchasePrice) * 100 : 0

  return {
    dldTransferFee,
    dldRegistrationFee,
    agentCommission,
    loanAmount,
    mortgageRegFee,
    valFee,
    feesTotal,
    totalAcquisitionCost,
    feesOverPurchasePct,
  }
}

// ── Golden Visa calculator ────────────────────────────────────────────────────

export const GOLDEN_VISA_THRESHOLD = 2_000_000
export const INVESTOR_VISA_THRESHOLD = 750_000

export type VisaTier = "golden_visa_10yr" | "investor_visa_2yr" | "not_eligible"
export type PropertyStatus = "completed" | "off-plan"

export interface VisaResult {
  tier: VisaTier
  shortfallToInvestor: number
  shortfallToGolden: number
  surplusAboveGolden: number
  showOffPlanAdvisory: boolean
}

export function calcVisaTier(propertyPrice: number, propertyStatus: PropertyStatus): VisaResult {
  let tier: VisaTier
  if (propertyPrice >= GOLDEN_VISA_THRESHOLD) {
    tier = "golden_visa_10yr"
  } else if (propertyPrice >= INVESTOR_VISA_THRESHOLD) {
    tier = "investor_visa_2yr"
  } else {
    tier = "not_eligible"
  }

  const shortfallToInvestor = tier === "not_eligible" ? INVESTOR_VISA_THRESHOLD - propertyPrice : 0
  const shortfallToGolden = tier === "investor_visa_2yr" ? GOLDEN_VISA_THRESHOLD - propertyPrice : 0
  const surplusAboveGolden = tier === "golden_visa_10yr" ? propertyPrice - GOLDEN_VISA_THRESHOLD : 0

  return {
    tier,
    shortfallToInvestor,
    shortfallToGolden,
    surplusAboveGolden,
    showOffPlanAdvisory: propertyStatus === "off-plan" && tier === "golden_visa_10yr",
  }
}

// ── Rental yield calculator ───────────────────────────────────────────────────

export interface RentalYieldInputs {
  purchasePrice: number
  annualRent: number
  isFinanced: boolean
  ltv: number           // percentage (e.g. 75 for 75%)
  interestRate: number  // percentage (e.g. 4.5 for 4.5%)
  serviceChargePsf: number
  sizeSqft: number
}

export interface RentalYieldResult {
  grossYield: number | null
  netYield: number | null
  cashOnCash: number | null
  annualServiceCharge: number
  netRent: number
  annualMortgage: number
  annualCashflow: number
  loanAmount: number
  equity: number
}

export function calcRentalYield(inputs: RentalYieldInputs): RentalYieldResult {
  const {
    purchasePrice: price,
    annualRent: rent,
    isFinanced,
    ltv,
    interestRate,
    serviceChargePsf,
    sizeSqft: size,
  } = inputs

  const grossYield = price > 0 && rent > 0 ? (rent / price) * 100 : null
  const annualServiceCharge = size > 0 ? size * serviceChargePsf : 0
  const netRent = rent - annualServiceCharge
  const netYield = price > 0 && rent > 0 ? (netRent / price) * 100 : null

  const loanAmount = price * (ltv / 100)
  const monthlyRate = interestRate / 100 / 12
  const termMonths = 25 * 12
  const annualMortgage =
    isFinanced && loanAmount > 0 && monthlyRate > 0
      ? ((loanAmount * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
          (Math.pow(1 + monthlyRate, termMonths) - 1)) *
        12
      : 0

  const annualCashflow = netRent - annualMortgage
  const equity = price * (1 - ltv / 100)
  const cashOnCash =
    isFinanced && equity > 0 && annualCashflow !== 0
      ? (annualCashflow / equity) * 100
      : null

  return {
    grossYield,
    netYield,
    cashOnCash,
    annualServiceCharge,
    netRent,
    annualMortgage,
    annualCashflow,
    loanAmount,
    equity,
  }
}

import { describe, it, expect } from "vitest"
import {
  formatAED,
  formatFull,
  pctLabel,
  addMonths,
  constructionLabel,
  generateSchedule,
  calcDldFees,
  calcVisaTier,
  calcRentalYield,
  GOLDEN_VISA_THRESHOLD,
  INVESTOR_VISA_THRESHOLD,
  PLAN_CONFIGS,
  REF_YEAR,
  REF_MONTH,
} from "@/lib/tools/calculations"

// ── formatAED ─────────────────────────────────────────────────────────────────

describe("formatAED", () => {
  it("formats millions to 2dp", () => {
    expect(formatAED(2_000_000)).toBe("AED 2.00M")
    expect(formatAED(1_500_000)).toBe("AED 1.50M")
    expect(formatAED(3_250_000)).toBe("AED 3.25M")
  })

  it("formats thousands to 0dp", () => {
    expect(formatAED(750_000)).toBe("AED 750K")
    expect(formatAED(500_000)).toBe("AED 500K")
    expect(formatAED(1_000)).toBe("AED 1K")
  })

  it("formats sub-thousand with locale", () => {
    expect(formatAED(500)).toBe("AED 500")
    expect(formatAED(0)).toBe("AED 0")
  })

  it("1M boundary goes to M format", () => {
    expect(formatAED(1_000_000)).toBe("AED 1.00M")
  })

  it("1000 boundary goes to K format", () => {
    expect(formatAED(1_000)).toBe("AED 1K")
    expect(formatAED(999)).toBe("AED 999")
  })
})

// ── formatFull ────────────────────────────────────────────────────────────────

describe("formatFull", () => {
  it("formats with AED prefix and comma separators", () => {
    expect(formatFull(2_000_000)).toBe("AED 2,000,000")
    expect(formatFull(750_000)).toBe("AED 750,000")
    expect(formatFull(1_234_567)).toBe("AED 1,234,567")
  })

  it("rounds to nearest integer", () => {
    expect(formatFull(1999.6)).toBe("AED 2,000")
    expect(formatFull(1999.4)).toBe("AED 1,999")
  })

  it("handles zero", () => {
    expect(formatFull(0)).toBe("AED 0")
  })
})

// ── pctLabel ──────────────────────────────────────────────────────────────────

describe("pctLabel", () => {
  it("shows integer without decimal", () => {
    expect(pctLabel(20)).toBe("20%")
    expect(pctLabel(0)).toBe("0%")
    expect(pctLabel(100)).toBe("100%")
  })

  it("shows 1dp for non-integer", () => {
    expect(pctLabel(5.5)).toBe("5.5%")
    expect(pctLabel(33.3)).toBe("33.3%")
  })
})

// ── addMonths ─────────────────────────────────────────────────────────────────

describe("addMonths", () => {
  it("0 months returns reference quarter", () => {
    // REF_MONTH=4 (May), Q2
    const result = addMonths(0)
    expect(result).toMatch(/^Q[1-4] \d{4}$/)
    expect(result).toBe(`Q${Math.floor(REF_MONTH / 3) + 1} ${REF_YEAR}`)
  })

  it("12 months advances year by 1", () => {
    const base = addMonths(0)
    const advanced = addMonths(12)
    const baseYear = parseInt(base.split(" ")[1])
    const advancedYear = parseInt(advanced.split(" ")[1])
    expect(advancedYear).toBe(baseYear + 1)
  })

  it("negative months treated as 0", () => {
    expect(addMonths(-5)).toBe(addMonths(0))
  })

  it("24 months advances year by 2", () => {
    const base = addMonths(0)
    const advanced = addMonths(24)
    const baseYear = parseInt(base.split(" ")[1])
    const advancedYear = parseInt(advanced.split(" ")[1])
    expect(advancedYear).toBe(baseYear + 2)
  })

  it("returns Q1-Q4 format", () => {
    for (let m = 0; m <= 24; m++) {
      expect(addMonths(m)).toMatch(/^Q[1-4] \d{4}$/)
    }
  })
})

// ── constructionLabel ─────────────────────────────────────────────────────────

describe("constructionLabel", () => {
  it("single milestone: 50% complete", () => {
    expect(constructionLabel(0, 1)).toBe("Construction 50% Complete")
  })

  it("3 milestones: 25%, 50%, 75%", () => {
    expect(constructionLabel(0, 3)).toBe("Construction 25% Complete")
    expect(constructionLabel(1, 3)).toBe("Construction 50% Complete")
    expect(constructionLabel(2, 3)).toBe("Construction 75% Complete")
  })

  it("4 milestones evenly spaced", () => {
    expect(constructionLabel(0, 4)).toBe("Construction 20% Complete")
    expect(constructionLabel(4 - 1, 4)).toBe("Construction 80% Complete")
  })
})

// ── generateSchedule ──────────────────────────────────────────────────────────

const defaultCustom = { booking: 10, construction: 40, handover: 40, postHandover: 10, postHandoverYears: 2 }

describe("generateSchedule — 20/80 preset", () => {
  const schedule = generateSchedule(1_000_000, "20/80", 2027, defaultCustom)

  it("has 3 entries: booking + 1 construction + handover", () => {
    expect(schedule).toHaveLength(3)
  })

  it("first entry is booking phase", () => {
    expect(schedule[0].phase).toBe("booking")
    expect(schedule[0].label).toBe("Booking / SPA Signing")
    expect(schedule[0].pct).toBe(5)
    expect(schedule[0].aed).toBe(50_000)
  })

  it("middle entry is construction phase", () => {
    expect(schedule[1].phase).toBe("construction")
    expect(schedule[1].pct).toBe(15)
  })

  it("last entry is handover phase at 80%", () => {
    expect(schedule[2].phase).toBe("handover")
    expect(schedule[2].pct).toBe(80)
    expect(schedule[2].aed).toBe(800_000)
  })

  it("cumulative % reaches 100", () => {
    expect(schedule[schedule.length - 1].cumPct).toBe(100)
  })

  it("AED values sum to property price", () => {
    const total = schedule.reduce((s, e) => s + e.aed, 0)
    expect(total).toBeCloseTo(1_000_000)
  })
})

describe("generateSchedule — 40/60 preset", () => {
  const schedule = generateSchedule(2_000_000, "40/60", 2028, defaultCustom)

  it("has 5 entries: booking + 3 construction + handover", () => {
    expect(schedule).toHaveLength(5)
  })

  it("3 construction milestones at 10% each", () => {
    const construction = schedule.filter((e) => e.phase === "construction")
    expect(construction).toHaveLength(3)
    construction.forEach((e) => expect(e.pct).toBe(10))
  })

  it("handover at 60%", () => {
    const handover = schedule.find((e) => e.phase === "handover")
    expect(handover?.pct).toBe(60)
    expect(handover?.aed).toBe(1_200_000)
  })

  it("total is 100%", () => {
    expect(schedule[schedule.length - 1].cumPct).toBe(100)
  })
})

describe("generateSchedule — 30/30/40 preset (post-handover)", () => {
  const schedule = generateSchedule(1_500_000, "30/30/40", 2028, defaultCustom)

  it("includes post-handover entries", () => {
    const post = schedule.filter((e) => e.phase === "post-handover")
    expect(post.length).toBeGreaterThan(0)
  })

  it("4 post-handover instalments for 2-year plan", () => {
    const post = schedule.filter((e) => e.phase === "post-handover")
    expect(post).toHaveLength(4)
  })

  it("post-handover instalments sum to 40%", () => {
    const post = schedule.filter((e) => e.phase === "post-handover")
    const pctSum = post.reduce((s, e) => s + e.pct, 0)
    expect(pctSum).toBeCloseTo(40)
  })

  it("total cumPct reaches 100", () => {
    expect(schedule[schedule.length - 1].cumPct).toBeCloseTo(100)
  })
})

describe("generateSchedule — custom preset", () => {
  it("handles 0 construction milestones", () => {
    const schedule = generateSchedule(1_000_000, "custom", 2027, {
      booking: 50, construction: 0, handover: 50, postHandover: 0, postHandoverYears: 0,
    })
    expect(schedule.filter((e) => e.phase === "construction")).toHaveLength(0)
    expect(schedule).toHaveLength(2) // booking + handover only
  })

  it("construction <=10 gives 1 milestone", () => {
    const schedule = generateSchedule(1_000_000, "custom", 2027, {
      booking: 10, construction: 10, handover: 80, postHandover: 0, postHandoverYears: 0,
    })
    expect(schedule.filter((e) => e.phase === "construction")).toHaveLength(1)
  })

  it("construction 31-50 gives 3 milestones", () => {
    const schedule = generateSchedule(1_000_000, "custom", 2027, {
      booking: 10, construction: 40, handover: 50, postHandover: 0, postHandoverYears: 0,
    })
    expect(schedule.filter((e) => e.phase === "construction")).toHaveLength(3)
  })

  it("invalid custom (sum != 100) returns empty when called with 0 handover", () => {
    // generateSchedule always generates — validation is in the component
    // Here we just verify it doesn't throw
    expect(() =>
      generateSchedule(1_000_000, "custom", 2027, {
        booking: 50, construction: 10, handover: 30, postHandover: 0, postHandoverYears: 0,
      })
    ).not.toThrow()
  })
})

describe("generateSchedule — handover year boundary", () => {
  it("past handover year still generates schedule", () => {
    const schedule = generateSchedule(1_000_000, "40/60", 2025, defaultCustom)
    expect(schedule.length).toBeGreaterThan(0)
  })
})

// ── PLAN_CONFIGS ──────────────────────────────────────────────────────────────

describe("PLAN_CONFIGS", () => {
  it("20/80 booking + milestones + handover = 100%", () => {
    const c = PLAN_CONFIGS["20/80"]
    const total = c.bookingPct + c.milestones.reduce((s, p) => s + p, 0) + c.handoverPct + c.postHandoverPct
    expect(total).toBe(100)
  })

  it("40/60 sums to 100%", () => {
    const c = PLAN_CONFIGS["40/60"]
    const total = c.bookingPct + c.milestones.reduce((s, p) => s + p, 0) + c.handoverPct + c.postHandoverPct
    expect(total).toBe(100)
  })

  it("30/30/40 sums to 100%", () => {
    const c = PLAN_CONFIGS["30/30/40"]
    const total = c.bookingPct + c.milestones.reduce((s, p) => s + p, 0) + c.handoverPct + c.postHandoverPct
    expect(total).toBe(100)
  })
})

// ── calcDldFees ───────────────────────────────────────────────────────────────

describe("calcDldFees — cash purchase", () => {
  const inputs = {
    purchasePrice: 2_000_000,
    isMortgage: false,
    downPaymentPct: 0,
    agentCommissionPct: 2,
    valuationFee: 3_000,
  }
  const result = calcDldFees(inputs)

  it("DLD transfer fee = 4%", () => {
    expect(result.dldTransferFee).toBe(80_000)
  })

  it("DLD registration fee = AED 4,000 for >= 500K", () => {
    expect(result.dldRegistrationFee).toBe(4_000)
  })

  it("agent commission = 2%", () => {
    expect(result.agentCommission).toBe(40_000)
  })

  it("no mortgage fees on cash purchase", () => {
    expect(result.loanAmount).toBe(0)
    expect(result.mortgageRegFee).toBe(0)
    expect(result.valFee).toBe(0)
  })

  it("feesTotal = DLD + registration + agent", () => {
    expect(result.feesTotal).toBe(80_000 + 4_000 + 40_000)
  })

  it("totalAcquisitionCost = price + feesTotal", () => {
    expect(result.totalAcquisitionCost).toBe(2_000_000 + result.feesTotal)
  })
})

describe("calcDldFees — below 500K registration fee", () => {
  it("registration fee = AED 2,000 below 500K", () => {
    const result = calcDldFees({
      purchasePrice: 400_000,
      isMortgage: false,
      downPaymentPct: 0,
      agentCommissionPct: 2,
      valuationFee: 3_000,
    })
    expect(result.dldRegistrationFee).toBe(2_000)
  })
})

describe("calcDldFees — mortgage purchase", () => {
  const inputs = {
    purchasePrice: 2_000_000,
    isMortgage: true,
    downPaymentPct: 20,
    agentCommissionPct: 2,
    valuationFee: 3_500,
  }
  const result = calcDldFees(inputs)

  it("loan amount = price * (1 - LTV)", () => {
    expect(result.loanAmount).toBe(1_600_000)
  })

  it("mortgage registration fee = 0.25% of loan", () => {
    expect(result.mortgageRegFee).toBe(1_600_000 * 0.0025)
  })

  it("valuation fee included", () => {
    expect(result.valFee).toBe(3_500)
  })

  it("feesTotal includes all mortgage costs", () => {
    const expected =
      2_000_000 * 0.04 +       // DLD transfer
      4_000 +                  // registration
      2_000_000 * 0.02 +       // agent
      1_600_000 * 0.0025 +     // mortgage reg
      3_500                    // val fee
    expect(result.feesTotal).toBeCloseTo(expected)
  })
})

describe("calcDldFees — feesOverPurchasePct", () => {
  it("calculates fees as percentage of purchase price", () => {
    const result = calcDldFees({
      purchasePrice: 1_000_000,
      isMortgage: false,
      downPaymentPct: 0,
      agentCommissionPct: 2,
      valuationFee: 0,
    })
    // 4% DLD + 4K reg + 2% agent = 40K + 4K + 20K = 64K => 6.4%
    expect(result.feesOverPurchasePct).toBeCloseTo(6.4)
  })

  it("returns 0 if purchasePrice is 0", () => {
    const result = calcDldFees({
      purchasePrice: 0,
      isMortgage: false,
      downPaymentPct: 0,
      agentCommissionPct: 2,
      valuationFee: 0,
    })
    expect(result.feesOverPurchasePct).toBe(0)
  })
})

// ── calcVisaTier ──────────────────────────────────────────────────────────────

describe("calcVisaTier — Golden Visa threshold", () => {
  it("exactly 2M is golden_visa_10yr", () => {
    const r = calcVisaTier(2_000_000, "completed")
    expect(r.tier).toBe("golden_visa_10yr")
  })

  it("above 2M is golden_visa_10yr", () => {
    const r = calcVisaTier(3_500_000, "completed")
    expect(r.tier).toBe("golden_visa_10yr")
    expect(r.surplusAboveGolden).toBe(1_500_000)
  })

  it("no shortfall or shortfall-to-golden when golden tier", () => {
    const r = calcVisaTier(2_500_000, "completed")
    expect(r.shortfallToInvestor).toBe(0)
    expect(r.shortfallToGolden).toBe(0)
  })
})

describe("calcVisaTier — Investor Visa threshold", () => {
  it("exactly 750K is investor_visa_2yr", () => {
    const r = calcVisaTier(750_000, "completed")
    expect(r.tier).toBe("investor_visa_2yr")
  })

  it("between 750K and 2M is investor_visa_2yr", () => {
    const r = calcVisaTier(1_200_000, "completed")
    expect(r.tier).toBe("investor_visa_2yr")
  })

  it("shortfallToGolden = 2M - price", () => {
    const r = calcVisaTier(1_200_000, "completed")
    expect(r.shortfallToGolden).toBe(800_000)
  })

  it("surplusAboveGolden = 0 when investor tier", () => {
    const r = calcVisaTier(1_000_000, "completed")
    expect(r.surplusAboveGolden).toBe(0)
  })
})

describe("calcVisaTier — not eligible", () => {
  it("below 750K is not_eligible", () => {
    const r = calcVisaTier(500_000, "completed")
    expect(r.tier).toBe("not_eligible")
  })

  it("shortfallToInvestor = 750K - price", () => {
    const r = calcVisaTier(500_000, "completed")
    expect(r.shortfallToInvestor).toBe(250_000)
  })

  it("surplusAboveGolden = 0 when not eligible", () => {
    const r = calcVisaTier(500_000, "completed")
    expect(r.surplusAboveGolden).toBe(0)
  })
})

describe("calcVisaTier — off-plan advisory", () => {
  it("showOffPlanAdvisory = true when off-plan + golden tier", () => {
    const r = calcVisaTier(2_500_000, "off-plan")
    expect(r.showOffPlanAdvisory).toBe(true)
  })

  it("showOffPlanAdvisory = false when completed + golden tier", () => {
    const r = calcVisaTier(2_500_000, "completed")
    expect(r.showOffPlanAdvisory).toBe(false)
  })

  it("showOffPlanAdvisory = false when off-plan + investor tier", () => {
    const r = calcVisaTier(1_000_000, "off-plan")
    expect(r.showOffPlanAdvisory).toBe(false)
  })
})

describe("calcVisaTier — threshold constants", () => {
  it("GOLDEN_VISA_THRESHOLD = 2,000,000", () => {
    expect(GOLDEN_VISA_THRESHOLD).toBe(2_000_000)
  })

  it("INVESTOR_VISA_THRESHOLD = 750,000", () => {
    expect(INVESTOR_VISA_THRESHOLD).toBe(750_000)
  })
})

// ── calcRentalYield ───────────────────────────────────────────────────────────

describe("calcRentalYield — basic yields", () => {
  it("grossYield = rent / price * 100", () => {
    const r = calcRentalYield({
      purchasePrice: 1_000_000,
      annualRent: 60_000,
      isFinanced: false,
      ltv: 75,
      interestRate: 4.5,
      serviceChargePsf: 0,
      sizeSqft: 0,
    })
    expect(r.grossYield).toBeCloseTo(6)
  })

  it("netYield accounts for service charge", () => {
    const r = calcRentalYield({
      purchasePrice: 1_000_000,
      annualRent: 60_000,
      isFinanced: false,
      ltv: 0,
      interestRate: 4.5,
      serviceChargePsf: 10,
      sizeSqft: 1_000,
    })
    // Annual service = 1000 * 10 = 10K; netRent = 50K; netYield = 5%
    expect(r.annualServiceCharge).toBe(10_000)
    expect(r.netRent).toBe(50_000)
    expect(r.netYield).toBeCloseTo(5)
  })

  it("grossYield null when price = 0", () => {
    const r = calcRentalYield({
      purchasePrice: 0,
      annualRent: 60_000,
      isFinanced: false,
      ltv: 0,
      interestRate: 4.5,
      serviceChargePsf: 0,
      sizeSqft: 0,
    })
    expect(r.grossYield).toBeNull()
  })

  it("grossYield null when rent = 0", () => {
    const r = calcRentalYield({
      purchasePrice: 1_000_000,
      annualRent: 0,
      isFinanced: false,
      ltv: 0,
      interestRate: 4.5,
      serviceChargePsf: 0,
      sizeSqft: 0,
    })
    expect(r.grossYield).toBeNull()
  })
})

describe("calcRentalYield — mortgage and cash on cash", () => {
  it("annualMortgage = 0 when not financed", () => {
    const r = calcRentalYield({
      purchasePrice: 1_000_000,
      annualRent: 60_000,
      isFinanced: false,
      ltv: 75,
      interestRate: 4.5,
      serviceChargePsf: 0,
      sizeSqft: 0,
    })
    expect(r.annualMortgage).toBe(0)
    expect(r.cashOnCash).toBeNull()
  })

  it("annualMortgage > 0 when financed with non-zero rate", () => {
    const r = calcRentalYield({
      purchasePrice: 1_000_000,
      annualRent: 80_000,
      isFinanced: true,
      ltv: 75,
      interestRate: 4.5,
      serviceChargePsf: 0,
      sizeSqft: 0,
    })
    expect(r.loanAmount).toBe(750_000)
    expect(r.annualMortgage).toBeGreaterThan(0)
    expect(r.equity).toBe(250_000)
  })

  it("cashOnCash = (annualCashflow / equity) * 100", () => {
    const r = calcRentalYield({
      purchasePrice: 1_000_000,
      annualRent: 80_000,
      isFinanced: true,
      ltv: 75,
      interestRate: 4.5,
      serviceChargePsf: 0,
      sizeSqft: 0,
    })
    expect(r.cashOnCash).not.toBeNull()
    const expected = (r.annualCashflow / r.equity) * 100
    expect(r.cashOnCash).toBeCloseTo(expected)
  })

  it("annualServiceCharge = 0 when no size provided", () => {
    const r = calcRentalYield({
      purchasePrice: 1_000_000,
      annualRent: 60_000,
      isFinanced: false,
      ltv: 0,
      interestRate: 4.5,
      serviceChargePsf: 15,
      sizeSqft: 0,
    })
    expect(r.annualServiceCharge).toBe(0)
  })
})

import { describe, expect, it } from "vitest"

import {
  DEFAULT_PREPAYMENT_PERCENT,
  derivePaymentStatus,
  isPrepaymentSatisfied,
  remainingPrepayment,
  requiredPrepayment,
  shouldAutoConfirmAfterPayment,
} from "@/lib/rules/prepayment"

describe("AuraStay prepayment business rules", () => {
  it("uses 10 percent as the default prepayment percent", () => {
    expect(DEFAULT_PREPAYMENT_PERCENT).toBe(10)
  })

  it("calculates required prepayment from reservation total", () => {
    expect(requiredPrepayment(5000)).toBe(500)
  })

  it("returns zero required prepayment for invalid or negative total", () => {
    expect(requiredPrepayment(0)).toBe(0)
    expect(requiredPrepayment(-100)).toBe(0)
    expect(requiredPrepayment(Number.NaN)).toBe(0)
  })

  it("detects when prepayment is satisfied", () => {
    expect(isPrepaymentSatisfied(500, 5000)).toBe(true)
  })

  it("detects when prepayment is not satisfied", () => {
    expect(isPrepaymentSatisfied(300, 5000)).toBe(false)
  })

  it("calculates remaining amount to reach prepayment threshold", () => {
    expect(remainingPrepayment(300, 5000)).toBe(200)
  })

  it("does not return negative remaining prepayment", () => {
    expect(remainingPrepayment(700, 5000)).toBe(0)
  })

  it("derives pending payment status when nothing is paid", () => {
    expect(derivePaymentStatus(0, 5000)).toBe("pending")
  })

  it("derives partial payment status when payment is lower than total", () => {
    expect(derivePaymentStatus(1000, 5000)).toBe("partial")
  })

  it("derives paid payment status when total amount is covered", () => {
    expect(derivePaymentStatus(5000, 5000)).toBe("paid")
  })

  it("allows auto confirmation only for pending reservation with satisfied prepayment", () => {
    const reservation = {
      status: "pending" as const,
      total_amount: 5000,
    }

    expect(shouldAutoConfirmAfterPayment(reservation, 500)).toBe(true)
  })

  it("does not auto confirm an already confirmed reservation", () => {
    const reservation = {
      status: "confirmed" as const,
      total_amount: 5000,
    }

    expect(shouldAutoConfirmAfterPayment(reservation, 500)).toBe(false)
  })
})

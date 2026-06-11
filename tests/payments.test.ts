import { describe, expect, it } from "vitest"

import {
  paymentFinancialSummary,
  settledPaymentTotal,
  signedSettledPaymentAmount,
} from "@/lib/rules/payments"

describe("settled payment totals", () => {
  it("does not count a pending IBAN transfer as received money", () => {
    expect(signedSettledPaymentAmount({ amount: 500, payment_status: "pending" })).toBe(0)
  })

  it("counts only settled payments and subtracts refunds", () => {
    expect(
      settledPaymentTotal([
        { amount: 500, payment_status: "pending" },
        { amount: 1000, payment_status: "paid" },
        { amount: 200, payment_status: "refunded" },
        { amount: 300, payment_status: "failed" },
      ]),
    ).toBe(800)
  })

  it("does not subtract a pending or failed refund", () => {
    expect(
      settledPaymentTotal([
        { amount: 2200, payment_status: "paid", transaction_type: "payment" },
        { amount: 330, payment_status: "pending", transaction_type: "refund" },
        { amount: 100, payment_status: "failed", transaction_type: "refund" },
      ]),
    ).toBe(2200)
  })

  it("keeps payment and refund totals separate", () => {
    expect(
      paymentFinancialSummary([
        { amount: 2200, payment_status: "paid", transaction_type: "payment" },
        { amount: 330, payment_status: "pending", transaction_type: "refund" },
        { amount: 100, payment_status: "refunded", transaction_type: "refund" },
      ]),
    ).toEqual({
      paidPayments: 2200,
      completedRefunds: 100,
      pendingPayments: 0,
      pendingRefunds: 330,
      netPaid: 2100,
    })
  })
})

export type PaymentAmountInput = {
  amount: number | string | null | undefined
  payment_status?: string | null
  transaction_type?: string | null
}

export function signedSettledPaymentAmount(payment: PaymentAmountInput): number {
  const amount = Number(payment.amount ?? 0)
  const transactionType =
    payment.transaction_type ?? (payment.payment_status === "refunded" ? "refund" : "payment")

  if (!Number.isFinite(amount)) return 0
  if (transactionType === "refund") {
    if (payment.payment_status !== "refunded") return 0
    return -Math.abs(amount)
  }
  if (payment.payment_status !== "paid" && payment.payment_status !== "partial") {
    return 0
  }

  return amount
}

export function settledPaymentTotal(payments: PaymentAmountInput[]): number {
  return Math.round(
    payments.reduce((sum, payment) => sum + signedSettledPaymentAmount(payment), 0) * 100,
  ) / 100
}

export function paymentFinancialSummary(payments: PaymentAmountInput[]) {
  let paidPayments = 0
  let completedRefunds = 0
  let pendingPayments = 0
  let pendingRefunds = 0

  for (const payment of payments) {
    const amount = Number(payment.amount ?? 0)
    if (!Number.isFinite(amount)) continue

    const transactionType =
      payment.transaction_type ?? (payment.payment_status === "refunded" ? "refund" : "payment")

    if (transactionType === "refund") {
      if (payment.payment_status === "refunded") completedRefunds += Math.abs(amount)
      if (payment.payment_status === "pending") pendingRefunds += Math.abs(amount)
      continue
    }

    if (payment.payment_status === "paid" || payment.payment_status === "partial") {
      paidPayments += amount
    }
    if (payment.payment_status === "pending") pendingPayments += amount
  }

  return {
    paidPayments: Math.round(paidPayments * 100) / 100,
    completedRefunds: Math.round(completedRefunds * 100) / 100,
    pendingPayments: Math.round(pendingPayments * 100) / 100,
    pendingRefunds: Math.round(pendingRefunds * 100) / 100,
    netPaid: Math.round((paidPayments - completedRefunds) * 100) / 100,
  }
}

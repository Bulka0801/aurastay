/**
 * Перевірка й розрахунок правила передплати.
 * За замовчуванням — 10% від total_amount, якщо інше не задано у hotel_settings.
 */

import type { Reservation } from "@/lib/types"

export const DEFAULT_PREPAYMENT_PERCENT = 10

/** Розрахувати мінімальну суму передплати. */
export function requiredPrepayment(total: number, percent = DEFAULT_PREPAYMENT_PERCENT): number {
  if (!Number.isFinite(total) || total <= 0) return 0
  return Math.round(total * (percent / 100) * 100) / 100
}

/** Чи досягнуто порогу передплати (або сплачено повністю). */
export function isPrepaymentSatisfied(paid: number, total: number, percent = DEFAULT_PREPAYMENT_PERCENT): boolean {
  if (total <= 0) return true
  return paid >= requiredPrepayment(total, percent) - 0.01
}

/** Скільки ще треба сплатити до порогу передплати. */
export function remainingPrepayment(paid: number, total: number, percent = DEFAULT_PREPAYMENT_PERCENT): number {
  const need = requiredPrepayment(total, percent)
  return Math.max(0, Math.round((need - paid) * 100) / 100)
}

/**
 * Визначити новий payment_status на основі сум.
 *   paid <= 0          → pending
 *   paid >= total      → paid
 *   інакше             → partial
 */
export function derivePaymentStatus(paid: number, total: number): "pending" | "partial" | "paid" {
  if (paid <= 0.01) return "pending"
  if (paid + 0.01 >= total) return "paid"
  return "partial"
}

/**
 * Чи має перейти reservation з pending у confirmed після нового платежу.
 * Викликається після вставки payment: якщо раніше було pending і тепер
 * паіd ≥ порога — так.
 */
export function shouldAutoConfirmAfterPayment(
  reservation: Pick<Reservation, "status" | "total_amount">,
  newPaidAmount: number,
  percent = DEFAULT_PREPAYMENT_PERCENT,
): boolean {
  return reservation.status === "pending" && isPrepaymentSatisfied(newPaidAmount, reservation.total_amount, percent)
}

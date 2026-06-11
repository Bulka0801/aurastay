import { describe, expect, it } from "vitest"

import {
  formatCurrency,
  formatDate,
  formatPaymentMethod,
  formatPaymentStatus,
  formatPriority,
  formatReservationStatus,
  formatRole,
  formatRoomStatus,
  formatTaskType,
  pluralGuests,
} from "@/lib/localization"

describe("AuraStay localization helpers", () => {
  it("formats a known user role into Ukrainian label", () => {
    expect(formatRole("system_administrator")).toBe("Системний адміністратор")
  })

  it("returns dash for empty role", () => {
    expect(formatRole(null)).toBe("—")
  })

  it("formats room status into Ukrainian label", () => {
    expect(formatRoomStatus("dirty")).toBe("Потребує прибирання")
  })

  it("formats reservation status into Ukrainian label", () => {
    expect(formatReservationStatus("checked_in")).toBe("Заселено")
  })

  it("formats payment status into Ukrainian label", () => {
    expect(formatPaymentStatus("partial")).toBe("Частково оплачено")
  })

  it("formats payment method into Ukrainian label", () => {
    expect(formatPaymentMethod("cash")).toBe("Готівка")
  })

  it("formats priority into Ukrainian label", () => {
    expect(formatPriority("urgent")).toBe("Терміновий")
  })

  it("formats housekeeping task type into Ukrainian label", () => {
    expect(formatTaskType("checkout_cleaning")).toBe("Прибирання після виселення")
  })

  it("formats turndown task type into Ukrainian label", () => {
    expect(formatTaskType("turndown")).toBe("Вечірнє обслуговування")
  })

  it("formats guests without children", () => {
    expect(pluralGuests(2, 0)).toBe("2 дорослих")
  })

  it("formats guests with children", () => {
    expect(pluralGuests(2, 1)).toBe("2 дорослих, 1 дитина")
  })

  it("formats date according to Ukrainian locale", () => {
    const result = formatDate("2026-05-15")

    expect(result).toContain("15")
    expect(result).toContain("05")
    expect(result).toContain("2026")
  })

  it("formats currency in UAH", () => {
    expect(formatCurrency(1500)).toBe("1 500,00 грн")
  })
})

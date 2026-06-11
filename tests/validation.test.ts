import { describe, expect, it } from "vitest"

import {
  formatEmail,
  formatUkrainianIdCardNumber,
  formatUkrainianPassportNumber,
  formatPersonName,
  formatUaPhone,
  generateStrongPassword,
  getUaPhoneNationalDigits,
  isValidEmail,
  isValidOptionalUaPhone,
  isValidPersonName,
  isValidUaPhone,
  isValidUkrainianIdCardNumber,
  isValidUkrainianPassportNumber,
  validatePassword,
} from "@/lib/validation"

describe("AuraStay validation helpers", () => {
  describe("person name validation", () => {
    it("accepts valid Ukrainian and Latin names", () => {
      expect(isValidPersonName("Олена")).toBe(true)
      expect(isValidPersonName("Марія-Анна")).toBe(true)
      expect(isValidPersonName("O'Connor")).toBe(true)
    })

    it("rejects names that are too short or contain numbers", () => {
      expect(isValidPersonName("А")).toBe(false)
      expect(isValidPersonName("Олена123")).toBe(false)
    })

    it("removes unsupported characters from a person name", () => {
      expect(formatPersonName("Олена123!")).toBe("Олена")
    })
  })

  describe("email validation", () => {
    it("accepts a valid email", () => {
      expect(isValidEmail("user@example.com")).toBe(true)
    })

    it("rejects an invalid email", () => {
      expect(isValidEmail("user-example.com")).toBe(false)
    })

    it("allows empty email when the field is optional", () => {
      expect(isValidEmail("")).toBe(true)
    })

    it("removes unsupported characters from email", () => {
      expect(formatEmail(" user!@example.com ")).toBe("user@example.com")
    })
  })

  describe("Ukrainian phone validation", () => {
    it("accepts a valid Ukrainian phone number", () => {
      expect(isValidUaPhone("+380671234567")).toBe(true)
      expect(isValidUaPhone("0671234567")).toBe(true)
    })

    it("rejects a phone number with too few digits", () => {
      expect(isValidUaPhone("+38067123456")).toBe(false)
    })

    it("accepts empty value for optional phone field", () => {
      expect(isValidOptionalUaPhone("")).toBe(true)
    })

    it("extracts national digits from Ukrainian phone number", () => {
      expect(getUaPhoneNationalDigits("+380671234567")).toBe("671234567")
    })

    it("formats Ukrainian phone number for UI display", () => {
      expect(formatUaPhone("+380671234567")).toBe("+380 (67) 123-45-67")
    })
  })

  describe("Ukrainian identification documents", () => {
    it("formats and validates a nine-digit ID card number", () => {
      expect(formatUkrainianIdCardNumber("123 456-7890")).toBe("123456789")
      expect(isValidUkrainianIdCardNumber("123456789")).toBe(true)
      expect(isValidUkrainianIdCardNumber("12345678")).toBe(false)
    })

    it("formats and validates a passport series and number", () => {
      expect(formatUkrainianPassportNumber("кк 1234567")).toBe("КК123456")
      expect(formatUkrainianPassportNumber("AB-123456")).toBe("АВ123456")
      expect(isValidUkrainianPassportNumber("КК123456")).toBe(true)
      expect(isValidUkrainianPassportNumber("KK123456")).toBe(false)
      expect(isValidUkrainianPassportNumber("К123456")).toBe(false)
    })
  })

  describe("password validation", () => {
    it("rejects a weak password and returns validation errors", () => {
      const result = validatePassword("12345")

      expect(result.isValid).toBe(false)
      expect(result.score).toBeLessThan(5)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it("accepts a strong password", () => {
      const result = validatePassword("StrongPass1!")

      expect(result.isValid).toBe(true)
      expect(result.score).toBe(5)
      expect(result.errors).toHaveLength(0)
      expect(result.label).toBe("Сильний пароль")
    })

    it("generates a strong password that passes validation", () => {
      const password = generateStrongPassword()
      const result = validatePassword(password)

      expect(password.length).toBeGreaterThanOrEqual(12)
      expect(result.isValid).toBe(true)
    })
  })
})

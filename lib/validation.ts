export const UA_PHONE_PREFIX = "+380"
export const UA_PHONE_NATIONAL_LENGTH = 9
export const EMAIL_DOMAIN_SUGGESTIONS = ["gmail.com", "icloud.com", "outlook.com", "ukr.net", "i.ua", "yahoo.com"]

const EMAIL_ALLOWED_CHARS_RE = /[^A-Za-z0-9._%+\-@]/g
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
const PERSON_NAME_ALLOWED_CHARS_RE = /[^A-Za-zА-Яа-яІіЇїЄєҐґ'ʼ -]/g
const PERSON_NAME_RE = /^[A-Za-zА-Яа-яІіЇїЄєҐґ'ʼ -]{2,}$/
const UKRAINIAN_PASSPORT_NUMBER_RE = /^[А-ЯІЇЄҐ]{2}\d{6}$/
const UKRAINIAN_ID_CARD_NUMBER_RE = /^\d{9}$/
const LATIN_TO_CYRILLIC_PASSPORT_LETTERS: Record<string, string> = {
  A: "А",
  B: "В",
  C: "С",
  E: "Е",
  H: "Н",
  I: "І",
  K: "К",
  M: "М",
  O: "О",
  P: "Р",
  T: "Т",
  X: "Х",
}
const PASSWORD_SPECIAL_CHARS = "!@#$%"

export function getUaPhoneNationalDigits(value: string) {
  const digits = value.replace(/\D/g, "")

  if (digits.startsWith("380")) {
    return digits.slice(3, 3 + UA_PHONE_NATIONAL_LENGTH)
  }

  if (digits.startsWith("0")) {
    return digits.slice(1, 1 + UA_PHONE_NATIONAL_LENGTH)
  }

  return digits.slice(0, UA_PHONE_NATIONAL_LENGTH)
}

export function formatUaPhone(value: string) {
  const nationalDigits = getUaPhoneNationalDigits(value)
  const operatorCode = nationalDigits.slice(0, 2)
  const firstPart = nationalDigits.slice(2, 5)
  const secondPart = nationalDigits.slice(5, 7)
  const thirdPart = nationalDigits.slice(7, 9)

  let formatted = `${UA_PHONE_PREFIX} (`

  if (operatorCode) formatted += operatorCode
  if (operatorCode.length === 2) formatted += ") "
  if (firstPart) formatted += firstPart
  if (firstPart.length === 3) formatted += "-"
  if (secondPart) formatted += secondPart
  if (secondPart.length === 2) formatted += "-"
  if (thirdPart) formatted += thirdPart

  return formatted
}

export function isValidUaPhone(value: string) {
  return getUaPhoneNationalDigits(value).length === UA_PHONE_NATIONAL_LENGTH
}

export function isValidOptionalUaPhone(value: string) {
  return !value || isValidUaPhone(value)
}

export function formatPersonName(value: string) {
  return value.replace(PERSON_NAME_ALLOWED_CHARS_RE, "").replace(/\s{2,}/g, " ")
}

export function isValidPersonName(value: string) {
  return PERSON_NAME_RE.test(value.trim())
}

export function isValidEmail(value: string) {
  return !value || EMAIL_RE.test(value)
}

export function formatEmail(value: string) {
  const sanitized = value.trim().replace(EMAIL_ALLOWED_CHARS_RE, "")
  const [localPart, ...domainParts] = sanitized.split("@")
  const domainPart = domainParts.join("")

  return domainParts.length > 0 ? `${localPart}@${domainPart}` : localPart
}

export function formatUkrainianIdCardNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 9)
}

export function isValidUkrainianIdCardNumber(value: string) {
  return UKRAINIAN_ID_CARD_NUMBER_RE.test(value)
}

export function formatUkrainianPassportNumber(value: string) {
  const normalized = value
    .toUpperCase()
    .split("")
    .map((character) => LATIN_TO_CYRILLIC_PASSPORT_LETTERS[character] ?? character)
    .join("")
  const series = normalized.replace(/[^А-ЯІЇЄҐ]/g, "").slice(0, 2)
  const number = normalized.replace(/\D/g, "").slice(0, 6)

  return `${series}${number}`
}

export function isValidUkrainianPassportNumber(value: string) {
  return UKRAINIAN_PASSPORT_NUMBER_RE.test(value)
}

export type PasswordValidation = {
  isValid: boolean
  score: number
  label: string
  errors: string[]
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = []
  let score = 0

  if (password.length >= 8) score += 1
  else errors.push("Мінімум 8 символів.")

  if (/[a-zа-яіїєґ]/.test(password)) score += 1
  else errors.push("Додайте малу літеру.")

  if (/[A-ZА-ЯІЇЄҐ]/.test(password)) score += 1
  else errors.push("Додайте велику літеру.")

  if (/\d/.test(password)) score += 1
  else errors.push("Додайте цифру.")

  if (/[!@#$%]/.test(password)) score += 1
  else errors.push("Додайте спецсимвол: ! @ # $ %.")

  return {
    isValid: errors.length === 0,
    score,
    label: score <= 2 ? "Слабкий пароль" : score <= 4 ? "Середній пароль" : "Сильний пароль",
    errors,
  }
}

export function generateStrongPassword(length = 12) {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const lowercase = "abcdefghijklmnopqrstuvwxyz"
  const numbers = "0123456789"
  const requiredChars = [
    randomChar(uppercase),
    randomChar(lowercase),
    randomChar(numbers),
    randomChar(PASSWORD_SPECIAL_CHARS),
  ]
  const allChars = `${uppercase}${lowercase}${numbers}${PASSWORD_SPECIAL_CHARS}`

  while (requiredChars.length < length) {
    requiredChars.push(randomChar(allChars))
  }

  return shuffle(requiredChars).join("")
}

function randomChar(chars: string) {
  return chars.charAt(Math.floor(Math.random() * chars.length))
}

function shuffle(chars: string[]) {
  return chars
    .map((char) => ({ char, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ char }) => char)
}

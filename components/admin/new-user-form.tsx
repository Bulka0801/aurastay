"use client"
import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createUserAction } from "@/app/dashboard/admin/users/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import {
  UA_PHONE_PREFIX,
  formatEmail,
  formatPersonName,
  formatUaPhone,
  generateStrongPassword,
  getUaPhoneNationalDigits,
  isValidEmail,
  isValidOptionalUaPhone,
  isValidPersonName,
  validatePassword,
} from "@/lib/validation"

const roles = [
  { value: "system_administrator", label: "Системний адміністратор" },
  { value: "general_manager", label: "Генеральний менеджер" },
  { value: "front_desk_manager", label: "Менеджер рецепції" },
  { value: "front_desk_agent", label: "Адміністратор рецепції" },
  { value: "reservations_manager", label: "Менеджер бронювань" },
  { value: "housekeeping_supervisor", label: "Супервайзер господарської служби" },
  { value: "housekeeping_staff", label: "Покоївка" },
  { value: "revenue_manager", label: "Менеджер доходу" },
  { value: "sales_manager", label: "Менеджер продажів" },
  { value: "accountant", label: "Бухгалтер" },
  { value: "maintenance_manager", label: "Керівник технічної служби" },
  { value: "maintenance_staff", label: "Технік" },
  { value: "fb_manager", label: "Менеджер ресторану" },
]

function getCreateUserErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return "Не вдалося створити користувача. Спробуйте ще раз."
}

export function NewUserForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "front_desk_agent",
    department: "",
    password: "",
    isActive: true,
  })
  const firstNameIsInvalid = Boolean(formData.firstName && !isValidPersonName(formData.firstName))
  const lastNameIsInvalid = Boolean(formData.lastName && !isValidPersonName(formData.lastName))
  const emailIsInvalid = Boolean(formData.email && !isValidEmail(formData.email))
  const phoneDigitsCount = getUaPhoneNationalDigits(formData.phone).length
  const phoneIsInvalid = Boolean(phoneDigitsCount > 0 && !isValidOptionalUaPhone(formData.phone))
  const passwordValidation = validatePassword(formData.password)

  const generatePassword = () => {
    setFormData({ ...formData, password: generateStrongPassword() })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmedFirstName = formData.firstName.trim()
    const trimmedLastName = formData.lastName.trim()
    const trimmedEmail = formData.email.trim()
    const trimmedPhone = formData.phone.trim()

    if (!isValidPersonName(trimmedFirstName) || !isValidPersonName(trimmedLastName)) {
      setError("Імʼя та прізвище мають містити мінімум 2 літери без цифр і спецсимволів.")
      return
    }

    if (!isValidEmail(trimmedEmail)) {
      setError("Введіть коректну електронну пошту.")
      return
    }

    if (!isValidOptionalUaPhone(trimmedPhone)) {
      setError("Телефон має бути у форматі +380 (##) ###-##-##.")
      return
    }

    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors.join(" "))
      return
    }

    setIsLoading(true)

    try {
      const result = await createUserAction({
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        email: trimmedEmail,
        phone: trimmedPhone,
        role: formData.role,
        department: formData.department,
        password: formData.password,
        isActive: formData.isActive,
      })

      if (!result.success) {
        throw new Error(result.error ?? "Не вдалося створити користувача. Спробуйте ще раз.")
      }

      router.push("/dashboard/admin/users")
      router.refresh()
    } catch (error) {
      setError(getCreateUserErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">Ім’я користувача *</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: formatPersonName(e.target.value) })}
            maxLength={50}
            aria-invalid={firstNameIsInvalid}
            required
          />
          {firstNameIsInvalid ? (
            <p className="text-xs text-destructive">Мінімум 2 літери, без цифр і спецсимволів.</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Можна українські або англійські літери, дефіс і апостроф.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Прізвище *</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: formatPersonName(e.target.value) })}
            maxLength={50}
            aria-invalid={lastNameIsInvalid}
            required
          />
          {lastNameIsInvalid ? (
            <p className="text-xs text-destructive">Мінімум 2 літери, без цифр і спецсимволів.</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Можна українські або англійські літери, дефіс і апостроф.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Електронна пошта *</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: formatEmail(e.target.value) })}
            aria-invalid={emailIsInvalid}
            required
          />
          {emailIsInvalid && <p className="text-xs text-destructive">Введіть коректну електронну пошту.</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Номер телефону</Label>
          <Input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={formData.phone}
            onFocus={() => {
              if (!formData.phone) setFormData({ ...formData, phone: `${UA_PHONE_PREFIX} (` })
            }}
            onBlur={() => {
              if (formData.phone && getUaPhoneNationalDigits(formData.phone).length === 0) {
                setFormData({ ...formData, phone: "" })
              }
            }}
            onChange={(e) => setFormData({ ...formData, phone: formatUaPhone(e.target.value) })}
            placeholder="+380 (##) ###-##-##"
            maxLength={19}
            aria-invalid={phoneIsInvalid}
          />
          {phoneDigitsCount > 0 && phoneIsInvalid && (
            <p className="text-xs text-destructive">Введіть 9 цифр після +380.</p>
          )}
          {phoneDigitsCount === 0 && (
            <p className="text-xs text-muted-foreground">Український номер у форматі +380 (##) ###-##-##.</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label>ID працівника</Label>
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Код буде згенеровано автоматично (наприклад: EMP007)
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="department">Відділ</Label>
          <Input
            id="department"
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Роль *</Label>
        <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Оберіть роль" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Пароль *</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              aria-invalid={Boolean(formData.password && !passwordValidation.isValid)}
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <Button type="button" variant="outline" onClick={generatePassword}>
            Задати автоматично
          </Button>
        </div>
        {formData.password ? (
          <p className={passwordValidation.isValid ? "text-xs text-muted-foreground" : "text-xs text-destructive"}>
            {passwordValidation.isValid ? passwordValidation.label : passwordValidation.errors.join(" ")}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Мінімум 8 символів: велика й мала літера, цифра та спецсимвол ! @ # $ %.
          </p>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
        />
        <div className="space-y-1">
          <Label htmlFor="isActive">Активний користувач</Label>
          <p className="text-xs text-muted-foreground">
            Неактивний користувач зберігається у системі, але не може відкрити dashboard.
          </p>
        </div>
      </div>

      {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Скасувати
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Створення...
            </>
          ) : (
            "Створити нового користувача"
          )}
        </Button>
      </div>
    </form>
  )
}

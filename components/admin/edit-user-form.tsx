"use client"

import type React from "react"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { KeyRound, Loader2, Mail, Save } from "lucide-react"

import { sendPasswordResetAction, updateUserAction } from "@/app/dashboard/admin/users/actions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { Profile, UserRole } from "@/lib/types"
import { roleLabels } from "@/lib/localization"
import {
  UA_PHONE_PREFIX,
  formatEmail,
  formatPersonName,
  formatUaPhone,
  getUaPhoneNationalDigits,
  isValidEmail,
  isValidOptionalUaPhone,
  isValidPersonName,
} from "@/lib/validation"

type EditUserFormProps = {
  user: Profile
  currentUserId: string
}

const roles = Object.entries(roleLabels)

function getInitialFormData(user: Profile) {
  return {
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    phone: user.phone ?? "",
    role: user.role,
    employeeId: user.employee_id ?? "",
    department: user.department ?? "",
    isActive: user.is_active,
  }
}

function normalizeFormData(data: ReturnType<typeof getInitialFormData>) {
  return {
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    email: data.email.trim().toLowerCase(),
    phone: data.phone.trim(),
    role: data.role,
    employeeId: data.employeeId.trim(),
    department: data.department.trim(),
    isActive: data.isActive,
  }
}

export function EditUserForm({ user, currentUserId }: EditUserFormProps) {
  const router = useRouter()
  const isOwnProfile = user.id === currentUserId
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [securityMessage, setSecurityMessage] = useState<string | null>(null)
  const [securityError, setSecurityError] = useState<string | null>(null)
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [formData, setFormData] = useState(() => getInitialFormData(user))
  const [savedData, setSavedData] = useState(() => normalizeFormData(getInitialFormData(user)))

  const firstNameIsInvalid = Boolean(formData.firstName && !isValidPersonName(formData.firstName))
  const lastNameIsInvalid = Boolean(formData.lastName && !isValidPersonName(formData.lastName))
  const emailIsInvalid = Boolean(formData.email && !isValidEmail(formData.email))
  const phoneDigitsCount = getUaPhoneNationalDigits(formData.phone).length
  const phoneIsInvalid = Boolean(phoneDigitsCount > 0 && !isValidOptionalUaPhone(formData.phone))
  const normalizedFormData = useMemo(() => normalizeFormData(formData), [formData])
  const hasChanges = useMemo(
    () => JSON.stringify(normalizedFormData) !== JSON.stringify(savedData),
    [normalizedFormData, savedData],
  )
  const hasRequiredFields = Boolean(
    normalizedFormData.firstName && normalizedFormData.lastName && normalizedFormData.email && normalizedFormData.role,
  )
  const hasValidationErrors = firstNameIsInvalid || lastNameIsInvalid || emailIsInvalid || phoneIsInvalid
  const canSave = hasChanges && hasRequiredFields && !hasValidationErrors && !isSaving

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)
    setError(null)

    if (!hasChanges) {
      return
    }

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

    setIsSaving(true)

    const result = await updateUserAction({
      id: user.id,
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      email: trimmedEmail,
      phone: trimmedPhone,
      role: formData.role,
      employeeId: formData.employeeId,
      department: formData.department,
      isActive: formData.isActive,
    })

    setIsSaving(false)

    if (!result.success) {
      setError(result.error ?? "Не вдалося зберегти користувача.")
      return
    }

    setSavedData(normalizedFormData)
    setFormData({
      firstName: normalizedFormData.firstName,
      lastName: normalizedFormData.lastName,
      email: normalizedFormData.email,
      phone: normalizedFormData.phone,
      role: normalizedFormData.role,
      employeeId: normalizedFormData.employeeId,
      department: normalizedFormData.department,
      isActive: normalizedFormData.isActive,
    })
    setMessage("Зміни збережено.")
    router.refresh()
  }

  const handleSendPasswordReset = async () => {
    setSecurityMessage(null)
    setSecurityError(null)
    setIsSendingReset(true)

    const result = await sendPasswordResetAction(user.id)

    setIsSendingReset(false)

    if (!result.success) {
      setSecurityError(result.error ?? "Не вдалося надіслати лист для скидання пароля.")
      return
    }

    setSecurityMessage("Лист для скидання пароля надіслано на email користувача.")
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Основні дані</CardTitle>
            <CardDescription>Імʼя, контакти та службова інформація профілю.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Імʼя *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(event) => setFormData({ ...formData, firstName: formatPersonName(event.target.value) })}
                  maxLength={50}
                  aria-invalid={firstNameIsInvalid}
                  required
                />
                {firstNameIsInvalid && (
                  <p className="text-xs text-destructive">Мінімум 2 літери, без цифр і спецсимволів.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Прізвище *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(event) => setFormData({ ...formData, lastName: formatPersonName(event.target.value) })}
                  maxLength={50}
                  aria-invalid={lastNameIsInvalid}
                  required
                />
                {lastNameIsInvalid && (
                  <p className="text-xs text-destructive">Мінімум 2 літери, без цифр і спецсимволів.</p>
                )}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email для входу *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(event) => setFormData({ ...formData, email: formatEmail(event.target.value) })}
                  aria-invalid={emailIsInvalid}
                  required
                />
                {emailIsInvalid && <p className="text-xs text-destructive">Введіть коректну електронну пошту.</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  value={formData.phone}
                  onFocus={() => {
                    if (!formData.phone) setFormData({ ...formData, phone: `${UA_PHONE_PREFIX} (` })
                  }}
                  onBlur={() => {
                    if (formData.phone && getUaPhoneNationalDigits(formData.phone).length === 0) {
                      setFormData({ ...formData, phone: "" })
                    }
                  }}
                  onChange={(event) => setFormData({ ...formData, phone: formatUaPhone(event.target.value) })}
                  placeholder="+380 (##) ###-##-##"
                  maxLength={19}
                  aria-invalid={phoneIsInvalid}
                />
                {phoneDigitsCount > 0 && phoneIsInvalid && (
                  <p className="text-xs text-destructive">Введіть 9 цифр після +380.</p>
                )}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="employeeId">ID працівника</Label>
                <Input
                  id="employeeId"
                  value={formData.employeeId}
                  readOnly
                  className="bg-muted/50"
                />
                <p className="text-xs text-muted-foreground">
                  ID створюється автоматично і не редагується вручну.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Відділ</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(event) => setFormData({ ...formData, department: event.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Доступ і роль</CardTitle>
            <CardDescription>Роль визначає доступні розділи, статус визначає можливість увійти в dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="role">Роль *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
                disabled={isOwnProfile}
              >
                <SelectTrigger id="role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isOwnProfile && (
                <p className="text-xs text-muted-foreground">
                  Власну роль не можна змінити з цієї сторінки, щоб не втратити адмін-доступ.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 rounded-md border p-4">
              <div className="space-y-1">
                <Label htmlFor="isActive">Активний користувач</Label>
                <p className="text-sm text-muted-foreground">Неактивний користувач не може відкрити dashboard.</p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                disabled={isOwnProfile}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Безпека</CardTitle>
            <CardDescription>Адміністратор не бачить і не задає поточний пароль користувача.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <p className="flex items-center gap-2 font-medium">
                    <KeyRound className="h-4 w-4" />
                    Скидання пароля
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Користувач отримає лист і самостійно задасть новий пароль через безпечне посилання.
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={handleSendPasswordReset} disabled={isSendingReset}>
                  {isSendingReset ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  Надіслати лист
                </Button>
              </div>
              {securityMessage && (
                <Alert className="mt-4">
                  <AlertDescription>{securityMessage}</AlertDescription>
                </Alert>
              )}
              {securityError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>{securityError}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Збереження</CardTitle>
            <CardDescription>Зміни синхронізуються з Auth-користувачем і профілем.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && (
              <Alert>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={!canSave}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Збереження...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {hasChanges ? "Зберегти зміни" : "Немає змін"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}

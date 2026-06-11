"use client"

import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DataTable } from "@/components/data-table"
import { createClient } from "@/lib/supabase/client"
import {
  Archive,
  Plus,
  Loader2,
  User,
  Star,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit2,
  Eye,
  Building2,
  Globe,
  CreditCard,
  Users,
  Crown,
  History,
  RotateCcw,
} from "lucide-react"
import type { Profile } from "@/lib/types"
import useSWR from "swr"
import { formatCurrency, formatDate, formatReservationStatus, pluralGuests } from "@/lib/localization"
import { pluralizeGuests } from "@/lib/i18n/uk"
import {
  UA_PHONE_PREFIX,
  formatEmail,
  formatPersonName,
  formatUaPhone,
  formatUkrainianIdCardNumber,
  formatUkrainianPassportNumber,
  getUaPhoneNationalDigits,
  isValidEmail,
  isValidPersonName,
  isValidUaPhone,
  isValidUkrainianIdCardNumber,
  isValidUkrainianPassportNumber,
} from "@/lib/validation"

interface Guest {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  date_of_birth: string | null
  passport_number: string | null
  id_number: string | null
  nationality: string | null
  country: string | null
  city: string | null
  address: string | null
  postal_code: string | null
  company: string | null
  loyalty_tier: string | null
  preferences: string | null
  notes: string | null
  is_vip: boolean
  is_active?: boolean | null
  created_at: string
  updated_at: string
}

interface GuestReservation {
  id: string
  reservation_number: string
  check_in_date: string
  check_out_date: string
  status: string
  total_amount: number
  adults: number
  children: number
}

const loyaltyColors: Record<string, string> = {
  bronze: "bg-orange-100 text-orange-800 border-orange-300",
  silver: "bg-slate-100 text-slate-800 border-slate-300",
  gold: "bg-amber-100 text-amber-800 border-amber-300",
  platinum: "bg-indigo-100 text-indigo-800 border-indigo-300",
}

const loyaltyTierLabels: Record<string, string> = {
  bronze: "Бронзовий",
  silver: "Срібний",
  gold: "Золотий",
  platinum: "Платиновий",
}

const vipFilterLabels = {
  true: "VIP",
  false: "Звичайні",
}

const loyaltyTierFilterMeta = Object.fromEntries(
  Object.entries(loyaltyColors).map(([tier, colorClassName]) => [tier, { colorClassName }])
)

const emptyGuestForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  date_of_birth: "",
  passport_number: "",
  id_number: "",
  nationality: "",
  country: "",
  city: "",
  address: "",
  postal_code: "",
  company: "",
  loyalty_tier: "",
  preferences: "",
  notes: "",
  is_vip: false,
}

type GuestForm = typeof emptyGuestForm
type GuestFormErrors = Partial<Record<keyof GuestForm | "form", string>>
type GuestFormTouched = Partial<Record<keyof GuestForm, boolean>>

function normalizeGuestForm(form: GuestForm) {
  return {
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    email: form.email.trim().toLowerCase(),
    phone: form.phone.trim(),
    date_of_birth: form.date_of_birth,
    passport_number: form.passport_number.trim(),
    id_number: form.id_number.trim(),
    nationality: form.nationality.trim(),
    country: form.country.trim(),
    city: form.city.trim(),
    address: form.address.trim(),
    postal_code: form.postal_code.trim(),
    company: form.company.trim(),
    loyalty_tier: form.loyalty_tier,
    preferences: form.preferences.trim(),
    notes: form.notes.trim(),
    is_vip: form.is_vip,
  }
}

function getGuestErrorMessage(message?: string) {
  const normalized = (message ?? "").toLowerCase()

  if (normalized.includes("duplicate") || normalized.includes("unique")) {
    return "Гість із такими контактами або документами вже існує."
  }

  if (normalized.includes("column") && normalized.includes("is_active")) {
    return "Архівування потребує міграції guests.is_active. Запустіть SQL-міграцію для архіву гостей."
  }

  return "Не вдалося зберегти гостя. Спробуйте ще раз."
}

function validateGuestForm(form: GuestForm, guests: Guest[], currentGuestId?: string): GuestFormErrors {
  const errors: GuestFormErrors = {}
  const normalizedForm = normalizeGuestForm(form)
  const email = normalizedForm.email
  const phone = form.phone.trim()
  const birthDate = form.date_of_birth ? new Date(`${form.date_of_birth}T00:00:00`) : null
  const passport = normalizedForm.passport_number
  const idNumber = normalizedForm.id_number
  const sameGuest = (guest: Guest) => guest.id === currentGuestId

  if (!isValidPersonName(normalizedForm.first_name)) errors.first_name = "Мінімум 2 літери, без цифр і спецсимволів."
  if (!isValidPersonName(normalizedForm.last_name)) errors.last_name = "Мінімум 2 літери, без цифр і спецсимволів."
  if (email && !isValidEmail(email)) errors.email = "Введіть коректну електронну пошту."
  if (!phone || !isValidUaPhone(phone)) errors.phone = "Телефон обовʼязковий у форматі +380 (##) ###-##-##."
  if (birthDate && birthDate > new Date()) errors.date_of_birth = "Дата народження не може бути в майбутньому."
  if (!passport && !idNumber) {
    errors.passport_number = "Вкажіть номер паспорта або ID-картки."
    errors.id_number = "Вкажіть номер ID-картки або паспорта."
  }
  if (passport && !isValidUkrainianPassportNumber(passport)) {
    errors.passport_number = "Формат: 2 українські літери серії та 6 цифр, наприклад КК123456."
  }
  if (idNumber && !isValidUkrainianIdCardNumber(idNumber)) {
    errors.id_number = "Номер ID-картки має містити рівно 9 цифр."
  }
  if (form.postal_code.trim().length > 20) errors.postal_code = "Поштовий індекс не може бути довшим за 20 символів."
  if (form.loyalty_tier && !loyaltyTierLabels[form.loyalty_tier]) errors.loyalty_tier = "Оберіть коректний рівень лояльності."
  if (form.preferences.trim().length > 1000) errors.preferences = "Побажання не можуть бути довшими за 1000 символів."
  if (form.notes.trim().length > 1000) errors.notes = "Нотатки не можуть бути довшими за 1000 символів."

  const duplicate = guests.find((guest) => {
    if (sameGuest(guest)) return false
    return Boolean(
      (email && guest.email?.toLowerCase() === email) ||
        (phone && guest.phone === phone) ||
        (passport && guest.passport_number === passport) ||
        (idNumber && guest.id_number === idNumber)
    )
  })

  if (duplicate) {
    const status = duplicate.is_active === false ? "архіві" : "списку гостей"
    errors.form = `Можливий дублікат: ${duplicate.first_name} ${duplicate.last_name} вже є в ${status}. Перевірте email, телефон або документи.`
  }

  return errors
}

function formatLoyaltyTier(tier?: string | null) {
  if (!tier) return ""
  return loyaltyTierLabels[tier] ?? tier
}

async function fetchGuests() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("guests")
    .select("*")
    .order("updated_at", { ascending: false })
  if (error) console.log("[v0] fetchGuests error:", error)
  return (data || []) as Guest[]
}

export function GuestsClient({ profile }: { profile: Profile }) {
  const { data: guests, mutate, isLoading } = useSWR("guests-list", fetchGuests, {
    refreshInterval: 30000,
  })

  const canManage = [
    "system_administrator", "general_manager", "front_desk_manager", "front_desk_agent", "reservations_manager",
  ].includes(profile.role)

  const [saving, setSaving] = useState(false)
  const [formErrors, setFormErrors] = useState<GuestFormErrors>({})

  // New / Edit guest dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editGuest, setEditGuest] = useState<Guest | null>(null)
  const [form, setForm] = useState<GuestForm>(emptyGuestForm)
  const [initialForm, setInitialForm] = useState<GuestForm>(emptyGuestForm)
  const [touchedFields, setTouchedFields] = useState<GuestFormTouched>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)

  // View guest dialog
  const [viewOpen, setViewOpen] = useState(false)
  const [viewGuest, setViewGuest] = useState<Guest | null>(null)
  const [guestReservations, setGuestReservations] = useState<GuestReservation[]>([])
  const [loadingReservations, setLoadingReservations] = useState(false)
  const [archiveConfirmGuest, setArchiveConfirmGuest] = useState<Guest | null>(null)

  const allGuests = guests || []
  const activeGuests = allGuests.filter((guest) => guest.is_active !== false)
  const archivedGuests = allGuests.filter((guest) => guest.is_active === false)
  const [showArchived, setShowArchived] = useState(false)
  const visibleGuests = showArchived ? archivedGuests : activeGuests

  const vipCount = activeGuests.filter((g) => g.is_vip).length
  const totalGuests = activeGuests.length
  const currentMonth = new Date().getMonth()
  const birthdaysThisMonth = activeGuests.filter((guest) => {
    if (!guest.date_of_birth) return false
    const birthDate = new Date(guest.date_of_birth)
    return !Number.isNaN(birthDate.getTime()) && birthDate.getMonth() === currentMonth
  }).length
  const validationErrors = useMemo(
    () => validateGuestForm(form, allGuests, editGuest?.id),
    [allGuests, editGuest?.id, form],
  )
  const normalizedForm = useMemo(() => normalizeGuestForm(form), [form])
  const normalizedInitialForm = useMemo(() => normalizeGuestForm(initialForm), [initialForm])
  const hasChanges = JSON.stringify(normalizedForm) !== JSON.stringify(normalizedInitialForm)
  const hasValidationErrors = Object.keys(validationErrors).length > 0
  const shouldShowFieldError = (field: keyof GuestForm) => submitAttempted || Boolean(touchedFields[field])
  const fieldError = (field: keyof GuestForm) =>
    shouldShowFieldError(field) ? formErrors[field] ?? validationErrors[field] : undefined
  const markTouched = (field: keyof GuestForm) => {
    setTouchedFields((current) => ({ ...current, [field]: true }))
  }

  const guestColumns = useMemo<ColumnDef<Guest>[]>(
    () => [
      {
        id: "guest",
        accessorFn: (row) => `${row.first_name} ${row.last_name}`,
        header: "Гість",
        cell: ({ row }) => {
          const guest = row.original
          return (
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  guest.is_vip ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"
                }`}
              >
                {guest.first_name[0]}
                {guest.last_name[0]}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold">
                    {guest.first_name} {guest.last_name}
                  </span>
                  {guest.is_active === false && (
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                      Архів
                    </Badge>
                  )}
                  {guest.is_vip && (
                    <Badge className="border border-amber-300 bg-amber-100 px-1.5 py-0 text-[10px] text-amber-800">
                      <Star className="mr-0.5 h-2.5 w-2.5" />
                      VIP
                    </Badge>
                  )}
                  {guest.loyalty_tier && (
                    <Badge variant="outline" className={`px-1.5 py-0 text-[10px] capitalize ${loyaltyColors[guest.loyalty_tier] || ""}`}>
                      {formatLoyaltyTier(guest.loyalty_tier)}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {guest.nationality || guest.country || "—"}
                </p>
              </div>
            </div>
          )
        },
        meta: {
          sortable: true,
          filterable: true,
          filterType: "search",
          searchable: true,
          dataType: "text",
          searchPlaceholder: "Ім’я або прізвище гостя",
          filterHelpText: "Пошук працює окремо по імені та прізвищу.",
          sortLabel: {
            asc: "Гості А-Я",
            desc: "Гості Я-А",
          },
          minWidth: 240,
        },
      },
      {
        id: "contact",
        accessorFn: (row) => [row.email, row.phone].filter(Boolean).join(" "),
        header: "Контакти",
        cell: ({ row }) => {
          const guest = row.original
          return (
            <div className="space-y-1 text-sm">
              {guest.email ? (
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{guest.email}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
              {guest.phone && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{guest.phone}</span>
                </div>
              )}
            </div>
          )
        },
        meta: {
          sortable: true,
          filterable: true,
          filterType: "search",
          searchable: true,
          dataType: "text",
          searchPlaceholder: "Email або телефон",
          filterHelpText: "Пошук працює по email і телефону.",
          sortLabel: {
            asc: "Контакти А-Я",
            desc: "Контакти Я-А",
          },
          minWidth: 220,
        },
      },
      {
        id: "documents",
        accessorFn: (row) => [row.passport_number, row.id_number].filter(Boolean).join(" "),
        header: "Документи",
        cell: ({ row }) => {
          const guest = row.original
          if (!guest.passport_number && !guest.id_number) return <span className="text-muted-foreground">—</span>

          return (
            <div className="space-y-1 text-sm">
              {guest.passport_number && <p>Номер паспорта: {guest.passport_number}</p>}
              {guest.id_number && <p className="text-xs text-muted-foreground">ID-картка: {guest.id_number}</p>}
            </div>
          )
        },
        meta: {
          sortable: true,
          filterable: true,
          filterType: "search",
          searchable: true,
          dataType: "text",
          searchPlaceholder: "Паспорт або ID-картка",
          filterHelpText: "Пошук працює за номером паспорта та ID-картки.",
          sortLabel: {
            asc: "Документи А-Я",
            desc: "Документи Я-А",
          },
          minWidth: 180,
        },
      },
      {
        accessorFn: (row) => row.date_of_birth ?? "",
        id: "date_of_birth",
        header: "Дата народження",
        cell: ({ row }) => (
          <span className="text-sm font-medium text-foreground">
            {formatDate(row.original.date_of_birth)}
          </span>
        ),
        sortingFn: (rowA, rowB, columnId) => {
          const valueA = String(rowA.getValue(columnId) ?? "").trim()
          const valueB = String(rowB.getValue(columnId) ?? "").trim()

          if (!valueA && !valueB) return 0
          if (!valueA) return 1
          if (!valueB) return -1

          return valueA.localeCompare(valueB)
        },
        meta: {
          sortable: true,
          filterable: true,
          filterType: "dateRange",
          searchable: false,
          dataType: "date",
          datePresets: [
            { value: "today", label: "Сьогодні" },
            { value: "thisMonth", label: "Цього місяця" },
          ],
          sortLabel: {
            asc: "Найстарші гості спочатку",
            desc: "Наймолодші гості спочатку",
          },
          minWidth: 150,
        },
      },
      {
        accessorKey: "preferences",
        header: "Побажання",
        cell: ({ row }) =>
          row.original.preferences ? (
            <p className="max-w-[280px] whitespace-normal break-words text-sm text-muted-foreground">
              {row.original.preferences}
            </p>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
        meta: {
          sortable: true,
          filterable: true,
          filterType: "search",
          searchable: true,
          dataType: "text",
          searchPlaceholder: "Побажання гостя",
          filterHelpText: "Пошук працює по побажаннях і примітках про проживання.",
          sortLabel: {
            asc: "Побажання А-Я",
            desc: "Побажання Я-А",
          },
          minWidth: 260,
        },
      },
      {
        accessorKey: "notes",
        header: "Нотатки",
        cell: ({ row }) =>
          row.original.notes ? (
            <p className="max-w-[280px] whitespace-normal break-words text-sm text-muted-foreground">
              {row.original.notes}
            </p>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
        meta: {
          sortable: true,
          filterable: true,
          filterType: "search",
          searchable: true,
          dataType: "text",
          searchPlaceholder: "Внутрішні нотатки",
          filterHelpText: "Шукати можна по внутрішніх нотатках персоналу.",
          sortLabel: {
            asc: "Нотатки А-Я",
            desc: "Нотатки Я-А",
          },
          minWidth: 260,
        },
      },
      {
        id: "location",
        accessorFn: (row) => [row.country, row.city, row.company].filter(Boolean).join(" "),
        header: "Локація",
        cell: ({ row }) => {
          const guest = row.original
          return (
            <div className="space-y-1 text-sm">
              <p>{guest.country || "—"}</p>
              <p className="text-xs text-muted-foreground">
                {guest.city || "—"}
                {guest.company ? ` • ${guest.company}` : ""}
              </p>
            </div>
          )
        },
        meta: {
          sortable: true,
          filterable: true,
          filterType: "search",
          searchable: true,
          dataType: "text",
          searchPlaceholder: "Країна, місто або компанія",
          filterHelpText: "Пошук працює по країні, місту та компанії.",
          sortLabel: {
            asc: "Локації А-Я",
            desc: "Локації Я-А",
          },
          minWidth: 220,
        },
      },
      {
        accessorKey: "is_vip",
        header: "VIP",
        cell: ({ row }) =>
          row.original.is_vip ? (
            <Badge className="bg-amber-100 text-amber-800">VIP</Badge>
          ) : (
            <Badge variant="outline">
              Звичайний
            </Badge>
          ),
        meta: {
          sortable: true,
          filterable: true,
          filterType: "checkbox",
          searchable: false,
          dataType: "enum",
          filterOptions: ["true", "false"],
          filterLabels: vipFilterLabels,
          preserveFilterOptionOrder: true,
          minWidth: 120,
        },
      },
      {
        accessorKey: "loyalty_tier",
        header: "Лояльність",
        cell: ({ row }) =>
          row.original.loyalty_tier ? (
            <Badge
              variant="outline"
              className={`capitalize ${loyaltyColors[row.original.loyalty_tier] || ""}`}
            >
              {formatLoyaltyTier(row.original.loyalty_tier)}
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
        meta: {
          sortable: true,
          filterable: true,
          filterType: "checkbox",
          searchable: false,
          dataType: "enum",
          filterOptions: ["platinum", "gold", "silver", "bronze"],
          filterLabels: loyaltyTierLabels,
          filterOptionMeta: loyaltyTierFilterMeta,
          preserveFilterOptionOrder: true,
          minWidth: 140,
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex shrink-0 gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={(event) => {
                event.stopPropagation()
                openViewGuest(row.original)
              }}
            >
              <Eye className="h-4 w-4" />
              <span className="sr-only">Швидкий перегляд</span>
            </Button>
            {canManage && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={(event) => {
                    event.stopPropagation()
                    openEditGuest(row.original)
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                  <span className="sr-only">Редагувати</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  disabled={saving}
                  onClick={(event) => {
                    event.stopPropagation()
                    if (row.original.is_active === false) {
                      archiveGuest(row.original, true)
                    } else {
                      setArchiveConfirmGuest(row.original)
                    }
                  }}
                >
                  {row.original.is_active === false ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                  <span className="sr-only">{row.original.is_active === false ? "Повернути з архіву" : "Архівувати"}</span>
                </Button>
              </>
            )}
          </div>
        ),
        meta: {
          sortable: false,
          filterable: false,
          filterType: false,
          searchable: false,
          dataType: "text",
          minWidth: 120,
        },
      },
    ],
    [canManage, saving],
  )

  const openNewGuest = () => {
    setEditGuest(null)
    setForm(emptyGuestForm)
    setInitialForm(emptyGuestForm)
    setFormErrors({})
    setTouchedFields({})
    setSubmitAttempted(false)
    setEditOpen(true)
  }

  const openEditGuest = (g: Guest) => {
    setEditGuest(g)
    const nextForm = {
      first_name: g.first_name || "",
      last_name: g.last_name || "",
      email: g.email || "",
      phone: g.phone || "",
      date_of_birth: g.date_of_birth || "",
      passport_number: g.passport_number || "",
      id_number: g.id_number || "",
      nationality: g.nationality || "",
      country: g.country || "",
      city: g.city || "",
      address: g.address || "",
      postal_code: g.postal_code || "",
      company: g.company || "",
      loyalty_tier: g.loyalty_tier || "",
      preferences: g.preferences || "",
      notes: g.notes || "",
      is_vip: g.is_vip,
    }
    setForm(nextForm)
    setInitialForm(nextForm)
    setFormErrors({})
    setTouchedFields({})
    setSubmitAttempted(false)
    setEditOpen(true)
  }

  const openViewGuest = async (g: Guest) => {
    setViewGuest(g)
    setViewOpen(true)
    setLoadingReservations(true)
    const supabase = createClient()
    const { data } = await supabase
      .from("reservations")
      .select("id, reservation_number, check_in_date, check_out_date, status, total_amount, adults, children")
      .eq("guest_id", g.id)
      .order("check_in_date", { ascending: false })
    setGuestReservations((data || []) as GuestReservation[])
    setLoadingReservations(false)
  }

  const handleSave = async () => {
    setSubmitAttempted(true)
    if (hasValidationErrors) {
      setFormErrors(validationErrors)
      return
    }

    setSaving(true)
    const supabase = createClient()
    const payload = {
      first_name: normalizedForm.first_name,
      last_name: normalizedForm.last_name,
      email: normalizedForm.email || null,
      phone: normalizedForm.phone || null,
      date_of_birth: normalizedForm.date_of_birth || null,
      passport_number: normalizedForm.passport_number || null,
      id_number: normalizedForm.id_number || null,
      nationality: normalizedForm.nationality || null,
      country: normalizedForm.country || null,
      city: normalizedForm.city || null,
      address: normalizedForm.address || null,
      postal_code: normalizedForm.postal_code || null,
      company: normalizedForm.company || null,
      loyalty_tier: normalizedForm.loyalty_tier || null,
      preferences: normalizedForm.preferences || null,
      notes: normalizedForm.notes || null,
      is_vip: normalizedForm.is_vip,
      is_active: editGuest?.is_active === false ? false : true,
      updated_at: new Date().toISOString(),
    }

    try {
      const { error } = editGuest
        ? await supabase.from("guests").update(payload).eq("id", editGuest.id)
        : await supabase.from("guests").insert(payload)

      if (error) {
        setFormErrors({ form: getGuestErrorMessage(error.message) })
        return
      }

      setFormErrors({})
      setEditOpen(false)
      mutate()
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: keyof GuestForm, value: string | boolean) => {
    const nextValue =
      typeof value === "string"
        ? field === "first_name" || field === "last_name" || field === "nationality" || field === "city" || field === "country"
          ? formatPersonName(value)
          : field === "email"
            ? formatEmail(value)
            : field === "phone"
              ? formatUaPhone(value)
              : field === "passport_number"
                ? formatUkrainianPassportNumber(value)
                : field === "id_number"
                  ? formatUkrainianIdCardNumber(value)
                : value
        : value

    setForm((prev) => ({ ...prev, [field]: nextValue }))
    setFormErrors((prev) => {
      if (!prev[field] && !prev.form) return prev
      const next = { ...prev }
      delete next[field]
      delete next.form
      return next
    })
  }

  const archiveGuest = async (guest: Guest, nextActiveState: boolean) => {
    setSaving(true)
    setFormErrors({})
    const supabase = createClient()
    const { error } = await supabase
      .from("guests")
      .update({ is_active: nextActiveState, updated_at: new Date().toISOString() })
      .eq("id", guest.id)

    if (error) {
      setFormErrors({ form: getGuestErrorMessage(error.message) })
    } else {
      mutate()
      if (viewGuest?.id === guest.id) {
        setViewGuest({ ...guest, is_active: nextActiveState })
      }
    }
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-balance">Управління гостями</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">{pluralizeGuests(totalGuests)}</span> всього гостів
            {vipCount > 0 && (
              <>
                <span className="mx-1.5 text-border">|</span>
                <span className="font-medium text-amber-600">{vipCount} VIP</span>
              </>
            )}
            {archivedGuests.length > 0 && (
              <>
                <span className="mx-1.5 text-border">|</span>
                <span className="font-medium text-muted-foreground">{archivedGuests.length} в архіві</span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {archivedGuests.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => setShowArchived((current) => !current)}>
              {showArchived ? "Показати активних" : "Показати архів"}
            </Button>
          )}
          {canManage && (
            <Button size="sm" onClick={openNewGuest}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Додати гостя
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalGuests}</p>
              <p className="text-xs font-medium text-muted-foreground">Усього гостей</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100">
              <Crown className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700">{vipCount}</p>
              <p className="text-xs font-medium text-amber-600">VIP гості</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
              <Globe className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-700">
                {new Set(activeGuests.map((g) => g.country).filter(Boolean)).size}
              </p>
              <p className="text-xs font-medium text-emerald-600">Країни</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">
                {birthdaysThisMonth}
              </p>
              <p className="text-xs font-medium text-blue-600">Дні народження цього місяця</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Guests List */}
      <DataTable
        columns={guestColumns}
        data={visibleGuests}
        searchPlaceholder="Пошук за гостем, контактами або документами..."
        enableMultiSort
        onRowClick={(row) => openViewGuest(row.original)}
      />

      {/* New / Edit Guest Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editGuest ? "Редагувати гостя" : "Додати нового гостя"}</DialogTitle>
            <DialogDescription>
              {editGuest ? "Оновіть інформацію про гостя." : "Введіть дані гостя нижче."}
            </DialogDescription>
          </DialogHeader>
          {formErrors.form && (
            <Alert variant="destructive">
              <AlertDescription>
                {formErrors.form}
              </AlertDescription>
            </Alert>
          )}
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="personal">Особисте</TabsTrigger>
              <TabsTrigger value="contact">Контакти та адреса</TabsTrigger>
              <TabsTrigger value="hotel">Інфо готелю</TabsTrigger>
            </TabsList>
            <TabsContent value="personal" className="flex flex-col gap-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label>Імʼя *</Label>
                  <Input
                    value={form.first_name}
                    onChange={(e) => updateField("first_name", e.target.value)}
                    onBlur={() => markTouched("first_name")}
                    placeholder="Іван"
                    aria-invalid={Boolean(fieldError("first_name"))}
                  />
                  {fieldError("first_name") && <p className="text-xs text-destructive">{fieldError("first_name")}</p>}
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Прізвище *</Label>
                  <Input
                    value={form.last_name}
                    onChange={(e) => updateField("last_name", e.target.value)}
                    onBlur={() => markTouched("last_name")}
                    placeholder="Петренко"
                    aria-invalid={Boolean(fieldError("last_name"))}
                  />
                  {fieldError("last_name") && <p className="text-xs text-destructive">{fieldError("last_name")}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label>Дата народження</Label>
                  <Input
                    type="date"
                    value={form.date_of_birth}
                    onChange={(e) => updateField("date_of_birth", e.target.value)}
                    onBlur={() => markTouched("date_of_birth")}
                    aria-invalid={Boolean(fieldError("date_of_birth"))}
                  />
                  {fieldError("date_of_birth") && <p className="text-xs text-destructive">{fieldError("date_of_birth")}</p>}
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Національність</Label>
                  <Input value={form.nationality} onChange={(e) => updateField("nationality", e.target.value)} placeholder="наприклад, українець" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label>Номер паспорта</Label>
                  <Input
                    value={form.passport_number}
                    onChange={(e) => updateField("passport_number", e.target.value)}
                    onBlur={() => markTouched("passport_number")}
                    maxLength={8}
                    placeholder="КК123456"
                    aria-invalid={Boolean(fieldError("passport_number"))}
                  />
                  {fieldError("passport_number") && <p className="text-xs text-destructive">{fieldError("passport_number")}</p>}
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Номер ID-картки</Label>
                  <Input
                    value={form.id_number}
                    onChange={(e) => updateField("id_number", e.target.value)}
                    onBlur={() => markTouched("id_number")}
                    inputMode="numeric"
                    maxLength={9}
                    placeholder="123456789"
                    aria-invalid={Boolean(fieldError("id_number"))}
                  />
                  {fieldError("id_number") && <p className="text-xs text-destructive">{fieldError("id_number")}</p>}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="contact" className="flex flex-col gap-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    onBlur={() => markTouched("email")}
                    placeholder="john@example.com"
                    aria-invalid={Boolean(fieldError("email"))}
                  />
                  {fieldError("email") && <p className="text-xs text-destructive">{fieldError("email")}</p>}
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Телефон *</Label>
                  <Input
                    value={form.phone}
                    onFocus={() => {
                      if (!form.phone) updateField("phone", `${UA_PHONE_PREFIX} (`)
                    }}
                    onBlur={() => {
                      markTouched("phone")
                      if (form.phone && getUaPhoneNationalDigits(form.phone).length === 0) updateField("phone", "")
                    }}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="+380 (##) ###-##-##"
                    maxLength={19}
                    aria-invalid={Boolean(fieldError("phone"))}
                  />
                  {fieldError("phone") && <p className="text-xs text-destructive">{fieldError("phone")}</p>}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Адреса</Label>
                <Input value={form.address} onChange={(e) => updateField("address", e.target.value)} placeholder="вул. Хрещатик, 1" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-2">
                  <Label>Місто</Label>
                  <Input value={form.city} onChange={(e) => updateField("city", e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Країна</Label>
                  <Input value={form.country} onChange={(e) => updateField("country", e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Поштовий індекс</Label>
                  <Input
                    value={form.postal_code}
                    onChange={(e) => updateField("postal_code", e.target.value)}
                    onBlur={() => markTouched("postal_code")}
                    aria-invalid={Boolean(fieldError("postal_code"))}
                  />
                  {fieldError("postal_code") && <p className="text-xs text-destructive">{fieldError("postal_code")}</p>}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Компанія</Label>
                <Input value={form.company} onChange={(e) => updateField("company", e.target.value)} placeholder="Назва компанії" />
              </div>
            </TabsContent>
            <TabsContent value="hotel" className="flex flex-col gap-4 pt-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label className="text-base font-medium">VIP гість</Label>
                  <p className="text-sm text-muted-foreground">Позначте гостя як VIP для особливого обслуговування</p>
                </div>
                <Switch checked={form.is_vip} onCheckedChange={(v) => updateField("is_vip", v)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Рівень лояльності</Label>
                <Select value={form.loyalty_tier || "none"} onValueChange={(v) => updateField("loyalty_tier", v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Без рівня" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Без рівня</SelectItem>
                    <SelectItem value="bronze">Бронзовий</SelectItem>
                    <SelectItem value="silver">Срібний</SelectItem>
                    <SelectItem value="gold">Золотий</SelectItem>
                    <SelectItem value="platinum">Платиновий</SelectItem>
                  </SelectContent>
                </Select>
                {fieldError("loyalty_tier") && <p className="text-xs text-destructive">{fieldError("loyalty_tier")}</p>}
              </div>
              <div className="flex flex-col gap-2">
                <Label>Побажання</Label>
                <Textarea
                  value={form.preferences}
                  onChange={(e) => updateField("preferences", e.target.value)}
                  onBlur={() => markTouched("preferences")}
                  placeholder="Бажаний тип номера, подушка, дієтичні обмеження..."
                  rows={2}
                />
                {fieldError("preferences") && <p className="text-xs text-destructive">{fieldError("preferences")}</p>}
              </div>
              <div className="flex flex-col gap-2">
                <Label>Внутрішні нотатки</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  onBlur={() => markTouched("notes")}
                  placeholder="Нотатки для персоналу про гостя..."
                  rows={2}
                />
                {fieldError("notes") && <p className="text-xs text-destructive">{fieldError("notes")}</p>}
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Скасувати</Button>
            <Button onClick={handleSave} disabled={!hasChanges || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editGuest ? "Зберегти зміни" : "Додати гостя"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Guest Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {viewGuest?.first_name} {viewGuest?.last_name}
              {viewGuest?.is_active === false && (
                <Badge variant="secondary">Архів</Badge>
              )}
              {viewGuest?.is_vip && (
                <Badge className="bg-amber-100 text-amber-800 border border-amber-300">
                  <Star className="mr-0.5 h-3 w-3" /> VIP
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewGuest && (
            <div className="flex flex-col gap-4">
              {canManage && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={saving}
                    onClick={() => {
                      if (viewGuest.is_active === false) {
                        archiveGuest(viewGuest, true)
                      } else {
                        setArchiveConfirmGuest(viewGuest)
                      }
                    }}
                  >
                    {viewGuest.is_active === false ? (
                      <>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Повернути з архіву
                      </>
                    ) : (
                      <>
                        <Archive className="mr-2 h-4 w-4" />
                        Архівувати гостя
                      </>
                    )}
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {viewGuest.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{viewGuest.email}</span>
                  </div>
                )}
                {viewGuest.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{viewGuest.phone}</span>
                  </div>
                )}
                {viewGuest.country && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span>{viewGuest.nationality ? `${viewGuest.nationality} / ` : ""}{viewGuest.country}</span>
                  </div>
                )}
                {viewGuest.company && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{viewGuest.company}</span>
                  </div>
                )}
                {viewGuest.date_of_birth && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(viewGuest.date_of_birth)}</span>
                  </div>
                )}
                {viewGuest.passport_number && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span>Номер паспорта: {viewGuest.passport_number}</span>
                  </div>
                )}
                {viewGuest.id_number && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span>ID-картка: {viewGuest.id_number}</span>
                  </div>
                )}
              </div>

              {(viewGuest.address || viewGuest.city) && (
                <>
                  <Separator />
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <span>
                      {[viewGuest.address, viewGuest.city, viewGuest.postal_code, viewGuest.country].filter(Boolean).join(", ")}
                    </span>
                  </div>
                </>
              )}

              {viewGuest.loyalty_tier && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-600" />
                    <Badge variant="outline" className={`capitalize ${loyaltyColors[viewGuest.loyalty_tier] || ""}`}>
                      {formatLoyaltyTier(viewGuest.loyalty_tier)}
                    </Badge>
                  </div>
                </>
              )}

              {viewGuest.preferences && (
                <>
                  <Separator />
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Побажання</p>
                    <p className="text-sm">{viewGuest.preferences}</p>
                  </div>
                </>
              )}

              {viewGuest.notes && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Нотатки для персоналу</p>
                  <p className="text-sm text-muted-foreground italic">{viewGuest.notes}</p>
                </div>
              )}

              <Separator />
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-semibold">Історія бронювань</p>
                </div>
                {loadingReservations ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : guestReservations.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">Бронювань не знайдено</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {guestReservations.map((res) => (
                      <div key={res.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                        <div>
                          <span className="font-mono text-xs text-muted-foreground">{res.reservation_number}</span>
                          <p className="font-medium">
                            {formatDate(res.check_in_date)} - {formatDate(res.check_out_date)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {pluralGuests(res.adults, res.children)}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={res.status === "checked_out" ? "default" : res.status === "checked_in" ? "secondary" : "outline"} className="text-[10px]">
                            {formatReservationStatus(res.status)}
                          </Badge>
                          <p className="mt-0.5 font-semibold">{formatCurrency(res.total_amount)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(archiveConfirmGuest)} onOpenChange={(open) => !open && setArchiveConfirmGuest(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Архівувати гостя?</DialogTitle>
            <DialogDescription>
              Гість «{archiveConfirmGuest?.first_name} {archiveConfirmGuest?.last_name}» буде прихований з активного
              списку. Історія бронювань залишиться доступною.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveConfirmGuest(null)}>
              Скасувати
            </Button>
            <Button
              variant="destructive"
              disabled={saving || !archiveConfirmGuest}
              onClick={async () => {
                if (!archiveConfirmGuest) return
                await archiveGuest(archiveConfirmGuest, false)
                setArchiveConfirmGuest(null)
              }}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Архівувати
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

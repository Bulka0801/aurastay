"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { format } from "date-fns"
import { uk } from "date-fns/locale"
import { CalendarIcon, Loader2, Search, UserPlus, X, AlertCircle, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import useSWR from "swr"
import { requiredPrepayment, DEFAULT_PREPAYMENT_PERCENT } from "@/lib/rules/prepayment"

interface RoomType {
  id: string
  name: string
  code: string
  base_rate: number
  base_occupancy: number
  max_occupancy: number
}

interface RatePlan {
  id: string
  name: string
  code: string
  discount_percentage: number
}

interface AvailableRoom {
  id: string
  room_number: string
  floor: number
  status: string
}

interface GuestMatch {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  country: string | null
  passport_number: string | null
  is_vip: boolean
}

interface NewReservationFormProps {
  roomTypes: RoomType[]
  ratePlans: RatePlan[]
}

const currencyFmt = new Intl.NumberFormat("uk-UA", {
  style: "currency",
  currency: "UAH",
  maximumFractionDigits: 0,
})

// Statuses that physically block selling the room for the whole period.
// Note: "occupied"/"dirty"/"cleaning"/"inspecting" reflect CURRENT state only,
// so they must not exclude a room from FUTURE availability — only the
// overlap check against other reservations determines that.
const BLOCKING_ROOM_STATUSES = new Set(["maintenance", "blocked", "out_of_order"])

// Reservation statuses that reserve inventory for the overlap check.
const BLOCKING_RESERVATION_STATUSES = ["pending", "confirmed", "checked_in"] as const

export function NewReservationForm({ roomTypes, ratePlans }: NewReservationFormProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1)

  // Step 1 — dates & guests
  const [checkInDate, setCheckInDate] = useState<Date>()
  const [checkOutDate, setCheckOutDate] = useState<Date>()
  const [adults, setAdults] = useState("2")
  const [children, setChildren] = useState("0")

  // Step 2 — room & rate
  const [selectedRoomType, setSelectedRoomType] = useState("")
  const [selectedRatePlan, setSelectedRatePlan] = useState("")
  const [selectedRoomId, setSelectedRoomId] = useState("")

  // Step 3 — guest
  const [guestSearch, setGuestSearch] = useState("")
  const [selectedGuest, setSelectedGuest] = useState<GuestMatch | null>(null)
  const [showNewGuestForm, setShowNewGuestForm] = useState(false)
  const [newGuestData, setNewGuestData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "",
    passport: "",
  })
  const [specialRequests, setSpecialRequests] = useState("")

  const checkInIso = checkInDate ? format(checkInDate, "yyyy-MM-dd") : null
  const checkOutIso = checkOutDate ? format(checkOutDate, "yyyy-MM-dd") : null
  const nights =
    checkInDate && checkOutDate
      ? Math.max(0, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)))
      : 0

  const roomType = roomTypes.find((rt) => rt.id === selectedRoomType)
  const ratePlan = ratePlans.find((rp) => rp.id === selectedRatePlan)

  const totalAdults = Number.parseInt(adults || "0", 10)
  const totalChildren = Number.parseInt(children || "0", 10)
  const totalGuests = totalAdults + totalChildren
  const capacityExceeded = roomType ? totalGuests > roomType.max_occupancy : false

  const baseAmount = roomType ? roomType.base_rate * nights : 0
  const discount = ratePlan ? (baseAmount * ratePlan.discount_percentage) / 100 : 0
  const totalAmount = baseAmount - discount
  const prepaymentDue = requiredPrepayment(totalAmount)

  // --- Available rooms for the chosen type AND period ---
  const availabilityKey =
    selectedRoomType && checkInIso && checkOutIso
      ? ["available-rooms", selectedRoomType, checkInIso, checkOutIso]
      : null

  const { data: availableRooms, isLoading: isLoadingRooms } = useSWR<AvailableRoom[]>(
    availabilityKey,
    async () => {
      // 1) All rooms of the requested type, excluding hard-blocked.
      const { data: rooms, error: roomsErr } = await supabase
        .from("rooms")
        .select("id, room_number, floor, status")
        .eq("room_type_id", selectedRoomType!)
        .order("room_number", { ascending: true })

      if (roomsErr) {
        console.log("[v0] rooms fetch error:", roomsErr.message)
        throw roomsErr
      }

      const sellable = (rooms || []).filter((r) => !BLOCKING_ROOM_STATUSES.has(r.status))

      // 2) Find reservations that overlap [checkIn, checkOut) and are still
      //    holding inventory (pending/confirmed/checked_in).
      const { data: overlapping, error: overlapErr } = await supabase
        .from("reservations")
        .select("id, status, check_in_date, check_out_date, reservation_rooms(room_id)")
        .in("status", BLOCKING_RESERVATION_STATUSES as unknown as string[])
        .lt("check_in_date", checkOutIso!)
        .gt("check_out_date", checkInIso!)

      if (overlapErr) {
        console.log("[v0] overlap fetch error:", overlapErr.message)
        throw overlapErr
      }

      const conflictRoomIds = new Set<string>()
      for (const res of overlapping || []) {
        for (const rr of (res as any).reservation_rooms || []) {
          if (rr.room_id) conflictRoomIds.add(rr.room_id)
        }
      }

      return sellable.filter((r) => !conflictRoomIds.has(r.id))
    },
    { revalidateOnFocus: false },
  )

  // Reset room selection whenever the available pool no longer contains it
  // (e.g. user changed dates or room type). This is pure state reconciliation
  // based on already-fetched data — no network call, so useEffect is fine.
  const availableRoomIds = (availableRooms || []).map((r) => r.id).join(",")
  useEffect(() => {
    if (selectedRoomId && !availableRoomIds.split(",").includes(selectedRoomId)) {
      setSelectedRoomId("")
    }
  }, [availableRoomIds, selectedRoomId])

  // --- Guest search (debounced via SWR dedup) ---
  const trimmedSearch = guestSearch.trim()
  const guestSearchKey = trimmedSearch.length >= 2 ? ["guest-search", trimmedSearch] : null

  const { data: guestMatches, isLoading: isSearchingGuests } = useSWR<GuestMatch[]>(
    guestSearchKey,
    async () => {
      const q = trimmedSearch
      // Search across name, email and phone. OR-filter in PostgREST syntax.
      const like = `%${q.replace(/[,()]/g, "")}%`
      const { data, error: err } = await supabase
        .from("guests")
        .select("id, first_name, last_name, email, phone, country, passport_number, is_vip")
        .or(
          [
            `first_name.ilike.${like}`,
            `last_name.ilike.${like}`,
            `email.ilike.${like}`,
            `phone.ilike.${like}`,
          ].join(","),
        )
        .limit(8)

      if (err) {
        console.log("[v0] guest search error:", err.message)
        return []
      }
      return (data || []) as GuestMatch[]
    },
    { revalidateOnFocus: false, dedupingInterval: 400 },
  )

  // --- Validation helpers ---
  const canGoToStep2 = Boolean(checkInDate && checkOutDate && nights >= 1 && totalAdults >= 1)
  const canGoToStep3 = Boolean(selectedRoomType && selectedRatePlan && selectedRoomId && !capacityExceeded)
  const canSubmit = Boolean(
    canGoToStep3 &&
      (selectedGuest ||
        (showNewGuestForm && newGuestData.firstName.trim() && newGuestData.lastName.trim() && newGuestData.phone.trim())),
  )

  // --- Submit ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!canSubmit || !checkInIso || !checkOutIso || !roomType || !ratePlan) return

    setIsLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Сесія недійсна. Увійдіть ще раз.")

      // 1) Re-check availability of the chosen room right before insert
      //    to minimise the race window.
      const { data: stillConflict, error: conflictErr } = await supabase
        .from("reservations")
        .select("id, reservation_rooms!inner(room_id)")
        .in("status", BLOCKING_RESERVATION_STATUSES as unknown as string[])
        .lt("check_in_date", checkOutIso)
        .gt("check_out_date", checkInIso)
        .eq("reservation_rooms.room_id", selectedRoomId)
        .limit(1)

      if (conflictErr) throw conflictErr
      if (stillConflict && stillConflict.length > 0) {
        throw new Error("Обраний номер щойно став недоступним на ці дати. Оберіть інший номер.")
      }

      // 2) Resolve guest: reuse existing or create new (with a last-chance
      //    duplicate check by phone/email for the new-guest branch).
      let guestId: string
      if (selectedGuest) {
        guestId = selectedGuest.id
      } else {
        const email = newGuestData.email.trim().toLowerCase() || null
        const phone = newGuestData.phone.trim() || null

        // Last-chance duplicate lookup so we never create the same person twice.
        if (email || phone) {
          const orClauses: string[] = []
          if (email) orClauses.push(`email.eq.${email}`)
          if (phone) orClauses.push(`phone.eq.${phone}`)
          const { data: dup } = await supabase
            .from("guests")
            .select("id")
            .or(orClauses.join(","))
            .limit(1)
            .maybeSingle()
          if (dup?.id) {
            guestId = dup.id
          } else {
            const { data: created, error: guestErr } = await supabase
              .from("guests")
              .insert({
                first_name: newGuestData.firstName.trim(),
                last_name: newGuestData.lastName.trim(),
                email,
                phone,
                country: newGuestData.country.trim() || null,
                passport_number: newGuestData.passport.trim() || null,
              })
              .select("id")
              .single()
            if (guestErr) throw guestErr
            guestId = created.id
          }
        } else {
          const { data: created, error: guestErr } = await supabase
            .from("guests")
            .insert({
              first_name: newGuestData.firstName.trim(),
              last_name: newGuestData.lastName.trim(),
              email: null,
              phone: null,
              country: newGuestData.country.trim() || null,
              passport_number: newGuestData.passport.trim() || null,
            })
            .select("id")
            .single()
          if (guestErr) throw guestErr
          guestId = created.id
        }
      }

      // 3) Create reservation in `pending` — confirmation happens only after
      //    prepayment is registered (see lib/rules/prepayment.ts).
      const reservationNumber = `RES${Date.now().toString().slice(-8)}`
      const { data: reservation, error: reservationError } = await supabase
        .from("reservations")
        .insert({
          reservation_number: reservationNumber,
          guest_id: guestId,
          check_in_date: checkInIso,
          check_out_date: checkOutIso,
          adults: totalAdults,
          children: totalChildren,
          status: "pending",
          rate_plan_id: selectedRatePlan,
          total_amount: Math.round(totalAmount * 100) / 100,
          paid_amount: 0,
          special_requests: specialRequests.trim() || null,
          channel: "Direct",
          created_by: user.id,
        })
        .select("id")
        .single()
      if (reservationError) throw reservationError

      // 4) Link the specific room (not just "first available").
      const { error: rrErr } = await supabase.from("reservation_rooms").insert({
        reservation_id: reservation.id,
        room_id: selectedRoomId,
        room_type_id: selectedRoomType,
        rate: roomType.base_rate,
      })
      if (rrErr) throw rrErr

      router.push(`/dashboard/reservations/${reservation.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Сталася помилка при створенні бронювання")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Steps header */}
      <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {[
          { n: 1, label: "Дати та гості" },
          { n: 2, label: "Номер і тариф" },
          { n: 3, label: "Гість і підтвердження" },
        ].map((s, i) => (
          <li key={s.n} className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold",
                step === s.n
                  ? "border-primary bg-primary text-primary-foreground"
                  : step > s.n
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-background",
              )}
            >
              {s.n}
            </span>
            <span className={cn(step === s.n && "font-medium text-foreground")}>{s.label}</span>
            {i < 2 && <span className="mx-1 text-border">/</span>}
          </li>
        ))}
      </ol>

      {/* ---------- STEP 1 ---------- */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Дата заїзду *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !checkInDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkInDate ? format(checkInDate, "d MMMM yyyy", { locale: uk }) : <span>Оберіть дату</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={checkInDate}
                    onSelect={setCheckInDate}
                    initialFocus
                    disabled={(date) => {
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      return date < today
                    }}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">Дата заїзду має бути не раніше сьогоднішнього дня.</p>
            </div>

            <div className="space-y-2">
              <Label>Дата виїзду *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !checkOutDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkOutDate ? format(checkOutDate, "d MMMM yyyy", { locale: uk }) : <span>Оберіть дату</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={checkOutDate}
                    onSelect={setCheckOutDate}
                    initialFocus
                    disabled={(date) => !checkInDate || date <= checkInDate}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">Дата виїзду має бути пізніше дати заїзду.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="adults">Дорослі *</Label>
              <Input
                id="adults"
                type="number"
                min="1"
                value={adults}
                onChange={(e) => setAdults(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="children">Діти</Label>
              <Input
                id="children"
                type="number"
                min="0"
                value={children}
                onChange={(e) => setChildren(e.target.value)}
              />
            </div>
          </div>

          {nights > 0 && (
            <p className="text-sm text-muted-foreground">
              Загалом ночей: <span className="font-medium text-foreground">{nights}</span>
            </p>
          )}

          <div className="flex justify-end">
            <Button type="button" onClick={() => setStep(2)} disabled={!canGoToStep2}>
              Далі: обрати номер
            </Button>
          </div>
        </div>
      )}

      {/* ---------- STEP 2 ---------- */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Тип номера *</Label>
              <Select
                value={selectedRoomType}
                onValueChange={(v) => {
                  setSelectedRoomType(v)
                  setSelectedRoomId("")
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Оберіть тип номера" />
                </SelectTrigger>
                <SelectContent>
                  {roomTypes.map((rt) => (
                    <SelectItem key={rt.id} value={rt.id}>
                      {rt.name} — {currencyFmt.format(rt.base_rate)}/ніч · до {rt.max_occupancy} гостей
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Тарифний план *</Label>
              <Select value={selectedRatePlan} onValueChange={setSelectedRatePlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Оберіть тариф" />
                </SelectTrigger>
                <SelectContent>
                  {ratePlans.map((rp) => (
                    <SelectItem key={rp.id} value={rp.id}>
                      {rp.name} {rp.discount_percentage > 0 ? `(знижка ${rp.discount_percentage}%)` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {capacityExceeded && roomType && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                Кількість гостей ({totalGuests}) перевищує місткість номера «{roomType.name}» (макс.{" "}
                {roomType.max_occupancy}). Оберіть інший тип або змініть кількість гостей.
              </div>
            </div>
          )}

          {/* Room picker */}
          {selectedRoomType && (
            <div className="space-y-2">
              <Label>Конкретний номер *</Label>
              <p className="text-xs text-muted-foreground">
                Система показує лише номери, вільні на період {checkInIso} — {checkOutIso} та не заблоковані
                технічно.
              </p>
              <div className="rounded-lg border bg-card">
                {isLoadingRooms ? (
                  <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Перевіряємо доступність…
                  </div>
                ) : !availableRooms || availableRooms.length === 0 ? (
                  <div className="flex items-start gap-2 p-4 text-sm text-muted-foreground">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    <div>
                      На вибрані дати немає вільних номерів цього типу. Спробуйте інші дати або інший тип номера.
                    </div>
                  </div>
                ) : (
                  <RadioGroup
                    value={selectedRoomId}
                    onValueChange={setSelectedRoomId}
                    className="grid gap-2 p-3 sm:grid-cols-2 md:grid-cols-3"
                  >
                    {availableRooms.map((room) => (
                      <Label
                        key={room.id}
                        htmlFor={`room-${room.id}`}
                        className={cn(
                          "flex cursor-pointer items-center justify-between gap-2 rounded-md border bg-background p-3 text-sm transition-colors",
                          selectedRoomId === room.id
                            ? "border-primary ring-2 ring-primary/20"
                            : "hover:border-primary/40",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem id={`room-${room.id}`} value={room.id} />
                          <div>
                            <div className="font-medium text-foreground">№ {room.room_number}</div>
                            <div className="text-xs text-muted-foreground">Поверх {room.floor}</div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Доступний
                        </Badge>
                      </Label>
                    ))}
                  </RadioGroup>
                )}
              </div>
            </div>
          )}

          {/* Price summary */}
          {roomType && ratePlan && nights > 0 && (
            <div className="rounded-lg border bg-muted/40 p-4">
              <h4 className="mb-2 font-semibold">Підсумок вартості</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Ночей:</span>
                  <span>{nights}</span>
                </div>
                <div className="flex justify-between">
                  <span>Базова вартість:</span>
                  <span>{currencyFmt.format(baseAmount)}</span>
                </div>
                {ratePlan.discount_percentage > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Знижка ({ratePlan.discount_percentage}%):</span>
                    <span>−{currencyFmt.format(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 font-semibold text-foreground">
                  <span>Разом:</span>
                  <span>{currencyFmt.format(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Передплата для підтвердження ({DEFAULT_PREPAYMENT_PERCENT}%):</span>
                  <span>{currencyFmt.format(prepaymentDue)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Назад
            </Button>
            <Button type="button" onClick={() => setStep(3)} disabled={!canGoToStep3}>
              Далі: гість
            </Button>
          </div>
        </div>
      )}

      {/* ---------- STEP 3 ---------- */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Guest search */}
          <div className="space-y-2">
            <Label htmlFor="guest-search">Пошук гостя</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="guest-search"
                value={guestSearch}
                onChange={(e) => {
                  setGuestSearch(e.target.value)
                  setSelectedGuest(null)
                }}
                placeholder="Прізвище, телефон або email…"
                className="pl-9"
                disabled={Boolean(selectedGuest)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Спочатку шукайте гостя в базі, щоб не створити дублікат і зберегти історію проживань.
            </p>
          </div>

          {selectedGuest ? (
            <div className="flex items-start justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {selectedGuest.first_name[0]}
                  {selectedGuest.last_name[0]}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {selectedGuest.first_name} {selectedGuest.last_name}
                    </span>
                    {selectedGuest.is_vip && (
                      <Badge variant="secondary" className="text-xs">
                        VIP
                      </Badge>
                    )}
                    <Badge variant="outline" className="gap-1 text-xs">
                      <Check className="h-3 w-3" /> Повторний гість
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedGuest.email || "—"} · {selectedGuest.phone || "—"}
                  </div>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedGuest(null)
                  setGuestSearch("")
                }}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Скинути вибір гостя</span>
              </Button>
            </div>
          ) : (
            <>
              {trimmedSearch.length >= 2 && (
                <div className="rounded-lg border bg-card">
                  {isSearchingGuests ? (
                    <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Пошук гостя…
                    </div>
                  ) : guestMatches && guestMatches.length > 0 ? (
                    <ul className="divide-y">
                      {guestMatches.map((g) => (
                        <li key={g.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedGuest(g)
                              setShowNewGuestForm(false)
                            }}
                            className="flex w-full items-center justify-between gap-3 p-3 text-left text-sm hover:bg-muted/50"
                          >
                            <div>
                              <div className="font-medium">
                                {g.first_name} {g.last_name}
                                {g.is_vip && (
                                  <Badge variant="secondary" className="ml-2 text-xs">
                                    VIP
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {g.email || "—"} · {g.phone || "—"}
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              Обрати
                            </Badge>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-3 text-sm text-muted-foreground">
                      Збігів не знайдено. Ви можете створити нового гостя нижче.
                    </div>
                  )}
                </div>
              )}

              <div>
                <Button
                  type="button"
                  variant={showNewGuestForm ? "secondary" : "outline"}
                  onClick={() => setShowNewGuestForm((v) => !v)}
                  className="gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  {showNewGuestForm ? "Сховати форму нового гостя" : "Створити нового гостя"}
                </Button>
              </div>

              {showNewGuestForm && (
                <div className="space-y-4 rounded-lg border bg-card p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Імʼя *</Label>
                      <Input
                        id="firstName"
                        value={newGuestData.firstName}
                        onChange={(e) => setNewGuestData({ ...newGuestData, firstName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Прізвище *</Label>
                      <Input
                        id="lastName"
                        value={newGuestData.lastName}
                        onChange={(e) => setNewGuestData({ ...newGuestData, lastName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Телефон *</Label>
                      <Input
                        id="phone"
                        value={newGuestData.phone}
                        onChange={(e) => setNewGuestData({ ...newGuestData, phone: e.target.value })}
                        placeholder="+380…"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newGuestData.email}
                        onChange={(e) => setNewGuestData({ ...newGuestData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="country">Країна</Label>
                      <Input
                        id="country"
                        value={newGuestData.country}
                        onChange={(e) => setNewGuestData({ ...newGuestData, country: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="passport">Паспорт / ID</Label>
                      <Input
                        id="passport"
                        value={newGuestData.passport}
                        onChange={(e) => setNewGuestData({ ...newGuestData, passport: e.target.value })}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Перед створенням система ще раз перевірить збіг за email і телефоном — щоб не було дублікатів.
                  </p>
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="specialRequests">Особливі побажання</Label>
            <Textarea
              id="specialRequests"
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="Тихий номер, дитяче ліжечко, алергії, пізній заїзд…"
              rows={3}
            />
          </div>

          {/* Reservation summary */}
          <div className="rounded-lg border bg-muted/40 p-4 text-sm">
            <h4 className="mb-2 font-semibold">Підсумок бронювання</h4>
            <dl className="grid gap-1 md:grid-cols-2">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Період:</dt>
                <dd>
                  {checkInDate ? format(checkInDate, "d MMM yyyy", { locale: uk }) : "—"} →{" "}
                  {checkOutDate ? format(checkOutDate, "d MMM yyyy", { locale: uk }) : "—"} ({nights} ноч.)
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Гостей:</dt>
                <dd>
                  {totalAdults} дор. {totalChildren > 0 ? `+ ${totalChildren} діт.` : ""}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Номер:</dt>
                <dd>
                  {roomType?.name || "—"}
                  {selectedRoomId &&
                    availableRooms &&
                    ` · № ${availableRooms.find((r) => r.id === selectedRoomId)?.room_number}`}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Тариф:</dt>
                <dd>{ratePlan?.name || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Разом:</dt>
                <dd className="font-semibold">{currencyFmt.format(totalAmount)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Передплата:</dt>
                <dd>{currencyFmt.format(prepaymentDue)}</dd>
              </div>
            </dl>
            <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Бронювання буде створене зі статусом «Очікує передплату». Підтвердження відбудеться автоматично після
                внесення {DEFAULT_PREPAYMENT_PERCENT}% передплати.
              </span>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>{error}</div>
            </div>
          )}

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(2)}>
              Назад
            </Button>
            <Button type="submit" disabled={!canSubmit || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Створюємо…
                </>
              ) : (
                "Створити бронювання"
              )}
            </Button>
          </div>
        </div>
      )}
    </form>
  )
}

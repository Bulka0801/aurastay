"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle, Loader2, LockKeyhole } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { formatMoney, nightsBetween } from "@/lib/format"
import { normalizeHotelSettings, type HotelSettings } from "@/lib/hotel-settings"
import {
  isPrepaymentSatisfied,
  remainingPrepayment,
  requiredPrepayment,
} from "@/lib/rules/prepayment"
import { settledPaymentTotal } from "@/lib/rules/payments"
import { canTransitionReservation } from "@/lib/rules/transitions"
import {
  getRoomStateAvailabilityReason,
  isRoomStateReadyForCheckIn,
} from "@/lib/rooms/availability"
import {
  formatRoomHousekeepingStatus,
  formatRoomOccupancyStatus,
  formatRoomOperationalStatus,
} from "@/lib/localization"
import { PAYMENT_METHOD_UK, RESERVATION_STATUS_UK, ROOM_STATUS_UK } from "@/lib/i18n/uk"
import type { PaymentMethod } from "@/lib/types"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { RoomMoveNote } from "@/components/reservations/room-move-note"

const ON_SITE_PAYMENT_METHODS: PaymentMethod[] = ["cash", "card_terminal"]

interface CheckInFormProps {
  reservation: any
  availableRooms: any[]
  hotelSettings?: HotelSettings | null
}

function getErrorMessage(err: unknown, fallback = "Сталася помилка") {
  if (err instanceof Error) return err.message
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message
  }
  return fallback
}

function isReservationRoomsPeriodError(err: unknown) {
  const code = err && typeof err === "object" && "code" in err && typeof err.code === "string" ? err.code : ""
  const message = getErrorMessage(err, "").toLowerCase()

  return code === "P0001" && message.includes("reservation_rooms period")
}

function isMissingColumnError(err: unknown, columnName: string) {
  const message = getErrorMessage(err, "").toLowerCase()

  return message.includes(columnName.toLowerCase()) && message.includes("schema cache")
}

function todayDateKey() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function dateLabel(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("uk-UA")
}

function appendReservationNote(existing: string | null | undefined, note: string) {
  return `${existing ? `${existing}\n` : ""}${note}`
}

function roomStatusLabel(status: string): string {
  return ROOM_STATUS_UK[status as keyof typeof ROOM_STATUS_UK] ?? status
}

function roomStateLabel(room: any): string {
  if (!room?.occupancy_status || !room?.housekeeping_status || !room?.operational_status) {
    return roomStatusLabel(room?.status ?? "")
  }
  if (room.operational_status !== "operational") {
    return formatRoomOperationalStatus(room.operational_status)
  }
  if (room.occupancy_status === "occupied") {
    return formatRoomOccupancyStatus(room.occupancy_status)
  }
  return formatRoomHousekeepingStatus(room.housekeeping_status)
}

export function CheckInForm({ reservation, availableRooms, hotelSettings: hotelSettingsInput }: CheckInFormProps) {
  const router = useRouter()
  const hotelSettings = useMemo(() => normalizeHotelSettings(hotelSettingsInput), [hotelSettingsInput])

  const assignedRoom = reservation.reservation_rooms?.[0]?.rooms ?? null
  const hasAssignedRoom = Boolean(reservation.reservation_rooms?.[0]?.room_id)

  // ---- Підсумки оплат ----------------------------------------------------
  // За новою схемою payments прив'язані напряму до reservation_id.
  const payments: Array<{ amount: number; payment_status?: string }> = reservation.payments ?? []
  const totalPaid = settledPaymentTotal(payments)
  const total = Number(reservation.total_amount || 0)
  const prepaymentRequired = hotelSettings.prepayment_required
  const needPrepayment = prepaymentRequired ? requiredPrepayment(total, hotelSettings.prepayment_percent) : 0
  const remaining = prepaymentRequired ? remainingPrepayment(totalPaid, total, hotelSettings.prepayment_percent) : 0
  const prepaymentOK = !prepaymentRequired || isPrepaymentSatisfied(totalPaid, total, hotelSettings.prepayment_percent)
  const balance = Math.max(0, total - totalPaid)
  const paidPercent = total > 0 ? Math.min(100, (totalPaid / total) * 100) : 100
  const prepaymentPercentOfNeed = needPrepayment > 0 ? Math.min(100, (totalPaid / needPrepayment) * 100) : 100

  // ---- Стейт форми -------------------------------------------------------
  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    hasAssignedRoom ? reservation.reservation_rooms[0].room_id : "",
  )
  // Сума передплати, що вноситься зараз (щоб дозаплатити до налаштованого порогу).
  const [prepayAmount, setPrepayAmount] = useState<string>(
    prepaymentOK ? "" : remaining.toFixed(2),
  )
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash")
  const [notes, setNotes] = useState<string>("")
  const [earlyCheckInConfirmed, setEarlyCheckInConfirmed] = useState(false)
  const [earlyCheckInReason, setEarlyCheckInReason] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ---- Валідації, які робимо перед сабмітом -----------------------------
  const transitionAllowed = canTransitionReservation(reservation.status, "checked_in")
  const todayKey = todayDateKey()
  const plannedCheckInKey = String(reservation.check_in_date).slice(0, 10)
  const plannedCheckOutKey = String(reservation.check_out_date).slice(0, 10)
  const isEarlyCheckIn = todayKey < plannedCheckInKey
  const reservationPeriodExpired = todayKey >= plannedCheckOutKey

  const effectivePrepayAfterInput = useMemo(() => {
    const extra = Number.parseFloat(prepayAmount || "0")
    return totalPaid + (Number.isFinite(extra) ? Math.max(0, extra) : 0)
  }, [prepayAmount, totalPaid])
  const effectivePrepayNow = useMemo(() => {
    const extra = Number.parseFloat(prepayAmount || "0")
    return Number.isFinite(extra) ? Math.max(0, extra) : 0
  }, [prepayAmount])
  const overpayAmount = Math.max(0, effectivePrepayNow - balance)
  const paymentTooHigh = overpayAmount > 0.01

  const willSatisfyPrepayment =
    !prepaymentRequired || isPrepaymentSatisfied(effectivePrepayAfterInput, total, hotelSettings.prepayment_percent)
  const paymentInputLabel = prepaymentOK ? "Внести оплату" : "Внести передплату"

  const room = hasAssignedRoom
    ? assignedRoom
    : availableRooms.find((r) => r.id === selectedRoomId) ?? null

  const roomReady = room ? isRoomStateReadyForCheckIn(room) : false
  const roomCanBeUsed = roomReady

  const canSubmit =
    !isLoading &&
    transitionAllowed &&
    !reservationPeriodExpired &&
    Boolean(room) &&
    roomCanBeUsed &&
    willSatisfyPrepayment &&
    !paymentTooHigh &&
    (!isEarlyCheckIn || earlyCheckInConfirmed)

  const blockReasons: string[] = []
  if (!transitionAllowed) {
    blockReasons.push(
      `Бронювання у статусі «${RESERVATION_STATUS_UK[reservation.status as keyof typeof RESERVATION_STATUS_UK] ?? reservation.status}» не можна заселити. Спочатку внесіть передплату, щоб отримати статус «Підтверджено».`,
    )
  }
  if (reservationPeriodExpired) {
    blockReasons.push(
      `Період бронювання вже минув (${dateLabel(plannedCheckInKey)} - ${dateLabel(plannedCheckOutKey)}). Створіть нове бронювання або змініть дати перед заселенням.`,
    )
  }
  if (!room) {
    blockReasons.push("Оберіть номер для заселення.")
  } else if (!roomReady) {
    blockReasons.push(
      `Номер ${room.room_number} не готовий до заселення: ${getRoomStateAvailabilityReason(room)} Оберіть інший номер або дочекайтесь оновлення стану.`,
    )
  }
  if (prepaymentRequired && !willSatisfyPrepayment) {
    blockReasons.push(
      `Потрібна передплата ${hotelSettings.prepayment_percent}% (${formatMoney(needPrepayment, hotelSettings)}). Зараз сплачено ${formatMoney(totalPaid, hotelSettings)}.`,
    )
  }
  if (paymentTooHigh) {
    blockReasons.push(`Сума оплати завелика: максимум можна внести ${formatMoney(balance, hotelSettings)}.`)
  }
  if (isEarlyCheckIn && !earlyCheckInConfirmed) {
    blockReasons.push(
      `Ранній заїзд раніше планової дати ${dateLabel(plannedCheckInKey)} можливий тільки у крайній необхідності після підтвердження.`,
    )
  }

  // ---- Submit ------------------------------------------------------------
  const handleCheckIn = async () => {
    setError(null)

    if (!room) {
      setError("Оберіть номер.")
      return
    }
    if (!transitionAllowed) {
      setError("Поточний статус бронювання не дозволяє check-in.")
      return
    }
    if (reservationPeriodExpired) {
      setError("Не можна заселити гостя після завершення періоду бронювання.")
      return
    }
    if (!roomCanBeUsed) {
      setError(
        `Заселення заблоковано: номер ${room.room_number} не готовий. ${getRoomStateAvailabilityReason(room)}`,
      )
      return
    }
    if (isEarlyCheckIn && !earlyCheckInConfirmed) {
      setError("Підтвердіть ранній заїзд перед заселенням.")
      return
    }
    if (paymentTooHigh) {
      setError(`Сума оплати перевищує залишок ${formatMoney(balance, hotelSettings)}.`)
      return
    }

    setIsLoading(true)
    try {
      const supabase = createClient()
      const nowIso = new Date().toISOString()

      // Крок 1. Перевіряємо актуальний стан номера (anti-race).
      const { data: freshRoom, error: roomFetchErr } = await supabase
        .from("rooms")
        .select(
          "id, status, room_number, occupancy_status, housekeeping_status, operational_status",
        )
        .eq("id", room.id)
        .single()
      if (roomFetchErr || !freshRoom) {
        throw new Error("Не вдалося перевірити стан номера.")
      }
      const freshRoomReady = isRoomStateReadyForCheckIn(freshRoom)
      if (!freshRoomReady) {
        throw new Error(
          `Номер ${freshRoom.room_number} більше не готовий до заселення. ${getRoomStateAvailabilityReason(freshRoom)}`,
        )
      }

      // Крок 2. Якщо це ранній заїзд, спочатку розширюємо період бронювання,
      // щоб actual_check_in не конфліктував з reservation_rooms trigger.
      const earlyCheckInNote = isEarlyCheckIn
        ? `[Early check-in] Початкова дата заїзду: ${plannedCheckInKey}; нова дата заїзду: ${todayKey}; фактичний час: ${nowIso}; причина: ${
            earlyCheckInReason.trim() || "Причину не вказано"
          }`
        : null

      if (isEarlyCheckIn) {
        const { error: dateUpdateErr } = await supabase
          .from("reservations")
          .update({
            check_in_date: todayKey,
            notes: appendReservationNote(reservation.notes, earlyCheckInNote!),
          })
          .eq("id", reservation.id)
        if (dateUpdateErr) throw dateUpdateErr
      }

      // Крок 3. Прив'язка номера до бронювання (якщо ще немає).
      const perNight = total / (nightsBetween(reservation.check_in_date, reservation.check_out_date) || 1)
      const effectiveCheckInKey = isEarlyCheckIn ? todayKey : plannedCheckInKey
      const reservationRoomPeriod = {
        check_in_time: `${effectiveCheckInKey}T${hotelSettings.default_checkin_time}:00`,
        check_out_time: `${plannedCheckOutKey}T${hotelSettings.default_checkout_time}:00`,
      }
      const recreateReservationRoom = async () => {
        const { error: deleteErr } = await supabase
          .from("reservation_rooms")
          .delete()
          .eq("reservation_id", reservation.id)
          .eq("room_id", room.id)
        if (deleteErr) throw deleteErr

        const { error: insertErr } = await supabase.from("reservation_rooms").insert({
          reservation_id: reservation.id,
          room_id: room.id,
          room_type_id: room.room_type_id,
          rate: perNight,
          ...reservationRoomPeriod,
          actual_check_in: nowIso,
        })
        if (insertErr) throw insertErr
      }

      if (!hasAssignedRoom) {
        const { error: rrErr } = await supabase.from("reservation_rooms").insert({
          reservation_id: reservation.id,
          room_id: room.id,
          room_type_id: room.room_type_id,
          rate: perNight,
          ...reservationRoomPeriod,
          actual_check_in: nowIso,
        })
        if (rrErr) throw rrErr
      } else {
        const { error: periodErr } = await supabase
          .from("reservation_rooms")
          .update(reservationRoomPeriod)
          .eq("reservation_id", reservation.id)
          .eq("room_id", room.id)
        if (periodErr) {
          if (!isReservationRoomsPeriodError(periodErr)) throw periodErr
          await recreateReservationRoom()
        } else {
          const { error: rrErr } = await supabase
            .from("reservation_rooms")
            .update({ actual_check_in: nowIso })
            .eq("reservation_id", reservation.id)
            .eq("room_id", room.id)
          if (rrErr) {
            if (!isReservationRoomsPeriodError(rrErr)) throw rrErr
            await recreateReservationRoom()
          }
        }
      }

      // Крок 4. Якщо вноситься передплата — зберегти payment після успішної перевірки дат/номера.
      const extra = Number.parseFloat(prepayAmount || "0")
      if (Number.isFinite(extra) && extra > balance + 0.01) {
        throw new Error(`Сума оплати перевищує залишок ${formatMoney(balance, hotelSettings)}.`)
      }
      if (Number.isFinite(extra) && extra > 0) {
        const { error: payErr } = await supabase.from("payments").insert({
          reservation_id: reservation.id,
          amount: extra,
          payment_method: paymentMethod,
          payment_status: "paid",
          notes: "Передплата при check-in",
        })
        if (payErr) throw payErr
      }

      // Крок 5. Перерахуємо суми та перевіримо поріг передплати по свіжих даних.
      const { data: freshPayments, error: payFetchErr } = await supabase
        .from("payments")
        .select("amount, payment_status")
        .eq("reservation_id", reservation.id)
      if (payFetchErr) throw payFetchErr
      const freshPaid = settledPaymentTotal(freshPayments || [])
      if (prepaymentRequired && !isPrepaymentSatisfied(freshPaid, total, hotelSettings.prepayment_percent)) {
        throw new Error(
          `Недостатньо передплати: ${formatMoney(freshPaid, hotelSettings)} із ${formatMoney(needPrepayment, hotelSettings)}.`,
        )
      }

      // Крок 6. Оновити бронювання → checked_in.
      const checkInNotes = notes ? `[Check-in] ${notes}` : ""
      const reservationUpdate: Record<string, string | null> = {
        status: "checked_in",
        room_id: room.id,
        special_requests: checkInNotes
          ? `${reservation.special_requests ? reservation.special_requests + "\n" : ""}${checkInNotes}`
          : reservation.special_requests,
      }

      if (isEarlyCheckIn) {
        reservationUpdate.check_in_date = todayKey
      }

      const { error: resErr } = await supabase
        .from("reservations")
        .update(reservationUpdate)
        .eq("id", reservation.id)
      if (resErr) {
        if (!isMissingColumnError(resErr, "room_id")) throw resErr

        const { room_id: _roomId, ...reservationUpdateWithoutRoomId } = reservationUpdate
        const { error: fallbackResErr } = await supabase
          .from("reservations")
          .update(reservationUpdateWithoutRoomId)
          .eq("id", reservation.id)
        if (fallbackResErr) throw fallbackResErr
      }

      router.push("/dashboard/front-desk")
      router.refresh()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  // ---- Рендер ------------------------------------------------------------
  const nights = nightsBetween(reservation.check_in_date, reservation.check_out_date) || 1

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Деталі бронювання</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Номер броні:</span>
            <span className="font-medium">{reservation.reservation_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Статус:</span>
            <Badge variant={reservation.status === "confirmed" ? "default" : "secondary"}>
              {RESERVATION_STATUS_UK[reservation.status as keyof typeof RESERVATION_STATUS_UK] ?? reservation.status}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Гість:</span>
            <span className="font-medium">
              {reservation.guests?.first_name} {reservation.guests?.last_name}
            </span>
          </div>
          {reservation.guests?.email && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email:</span>
              <span>{reservation.guests.email}</span>
            </div>
          )}
          {reservation.guests?.phone && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Телефон:</span>
              <span>{reservation.guests.phone}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Заїзд:</span>
            <span>{new Date(reservation.check_in_date).toLocaleDateString("uk-UA")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Виїзд:</span>
            <span>{new Date(reservation.check_out_date).toLocaleDateString("uk-UA")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ночей:</span>
            <span>{nights}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Гостей:</span>
            <span>
              {reservation.adults} дорослих
              {reservation.children > 0 && `, ${reservation.children} дітей`}
            </span>
          </div>

          <Separator className="my-3" />

          <div className="space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Загальна вартість</span>
                <span className="font-semibold tabular-nums">{formatMoney(total, hotelSettings)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">
                  {prepaymentRequired ? `Передплата (${hotelSettings.prepayment_percent}%)` : "Передплата"}
                </span>
                <span className="font-semibold tabular-nums">
                  {prepaymentRequired ? formatMoney(needPrepayment, hotelSettings) : "Не вимагається"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Сплачено</span>
                <span className={`font-semibold tabular-nums ${prepaymentOK ? "text-emerald-700" : "text-amber-700"}`}>
                  {formatMoney(totalPaid, hotelSettings)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Залишок до сплати</span>
                <span className={`font-semibold tabular-nums ${balance > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                  {formatMoney(balance, hotelSettings)}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Прогрес оплати</span>
                <span>{Math.round(paidPercent)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${paidPercent}%` }} />
              </div>
            </div>

            {prepaymentRequired && (
              <div className={`text-sm ${prepaymentOK ? "text-emerald-700" : "text-amber-700"}`}>
                {prepaymentOK
                  ? `Передплату внесено: ${Math.round(prepaymentPercentOfNeed)}% від потрібної суми.`
                  : `До передплати залишилось ${formatMoney(remaining, hotelSettings)}.`}
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Заселення</h2>
        <div className="space-y-4">
          {!transitionAllowed && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Check-in недоступний</AlertTitle>
              <AlertDescription>
                Бронювання у статусі «{RESERVATION_STATUS_UK[reservation.status as keyof typeof RESERVATION_STATUS_UK] ?? reservation.status}». Заселити можна лише підтверджене бронювання.
              </AlertDescription>
            </Alert>
          )}

          {hasAssignedRoom ? (
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="mb-1 text-sm text-muted-foreground">Призначений номер</p>
              <div className="flex items-center justify-between gap-3">
                <p className="text-lg font-semibold">
                  № {assignedRoom?.room_number} — {assignedRoom?.room_type?.name}
                </p>
                <Badge variant={roomReady ? "default" : "destructive"}>
                  {roomStateLabel(assignedRoom)}
                </Badge>
              </div>
              <RoomMoveNote
                previousRoomNumber={reservation.reservation_rooms?.[0]?.moved_from_room?.room_number}
                currentRoomNumber={assignedRoom?.room_number}
                className="mt-3"
              />
              {!roomReady && (
                <Alert variant="destructive" className="mt-3">
                  <LockKeyhole className="h-4 w-4" />
                  <AlertTitle>Заселення заблоковано</AlertTitle>
                  <AlertDescription>
                    Номер {assignedRoom?.room_number}: {getRoomStateAvailabilityReason(assignedRoom)}
                    Дочекайтесь завершення перевірки та статусу «Готовий».
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Оберіть номер *</Label>
              {availableRooms.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Немає номерів без конфлікту з іншими активними бронюваннями або поза ремонтом/блокуванням.
                  </AlertDescription>
                </Alert>
              ) : (
                <RadioGroup
                  value={selectedRoomId}
                  onValueChange={setSelectedRoomId}
                  className="grid max-h-72 gap-2 overflow-y-auto pr-1"
                >
                  {availableRooms.map((r) => (
                    <Label
                      key={r.id}
                      htmlFor={`room-${r.id}`}
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-md border p-3 hover:bg-slate-50 ${
                        !r.is_ready_for_check_in ? "border-amber-200 bg-amber-50/40" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem id={`room-${r.id}`} value={r.id} />
                        <div>
                          <div className="font-medium">
                            № {r.room_number} — {r.room_type?.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Поверх {r.floor} · {formatMoney(r.room_type?.base_rate ?? 0, hotelSettings)}/ніч
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {!r.is_requested_type && <Badge variant="secondary">Інший тип</Badge>}
                        <Badge variant={r.is_ready_for_check_in ? "outline" : "destructive"}>
                          {roomStateLabel(r)}
                        </Badge>
                      </div>
                    </Label>
                  ))}
                </RadioGroup>
              )}
              {availableRooms.some((r) => !r.is_requested_type) && (
                <p className="text-xs text-muted-foreground">
                  Номери іншого типу показані як оперативна заміна, якщо потрібний тип недоступний.
                </p>
              )}
            </div>
          )}

          <Separator />

          {isEarlyCheckIn && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Ранній заїзд</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>
                  Планова дата заїзду: {dateLabel(plannedCheckInKey)}. Заселення раніше цієї дати дозволене
                  тільки у крайній необхідності.
                </p>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="early-check-in-confirmed"
                    checked={earlyCheckInConfirmed}
                    onCheckedChange={(checked) => setEarlyCheckInConfirmed(checked === true)}
                  />
                  <Label htmlFor="early-check-in-confirmed" className="text-sm font-normal leading-snug">
                    Підтверджую ранній заїзд і розумію, що фактичний час буде записано в історію бронювання.
                  </Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="early-check-in-reason">Причина (за можливості)</Label>
                  <Textarea
                    id="early-check-in-reason"
                    placeholder="Наприклад: медична потреба, зміна рейсу, службове погодження…"
                    value={earlyCheckInReason}
                    onChange={(e) => setEarlyCheckInReason(e.target.value)}
                    rows={2}
                  />
                </div>
              </AlertDescription>
            </Alert>
          )}

          {balance > 0 ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="prepay">
                    {paymentInputLabel}{" "}
                    {prepaymentRequired && !prepaymentOK && (
                      <span className="text-xs font-normal text-amber-600">
                        (потрібно ще {formatMoney(remaining, hotelSettings)})
                      </span>
                    )}
                  </Label>
                  {prepaymentOK && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle className="h-3.5 w-3.5" /> Передплата є
                    </span>
                  )}
                </div>
                <Input
                  id="prepay"
                  type="number"
                  min="0"
                  max={balance.toFixed(2)}
                  step="0.01"
                  placeholder="0,00"
                  value={prepayAmount}
                  onChange={(e) => setPrepayAmount(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  {!prepaymentOK && remaining > 0 && (
                    <Button type="button" size="sm" variant="outline" onClick={() => setPrepayAmount(remaining.toFixed(2))}>
                      До передплати {formatMoney(remaining, hotelSettings)}
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="outline" onClick={() => setPrepayAmount(balance.toFixed(2))}>
                    Залишок {formatMoney(balance, hotelSettings)}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setPrepayAmount("")}>
                    Без додаткової оплати
                  </Button>
                </div>
                {paymentTooHigh && (
                  <p className="text-xs text-red-600">
                    Забагато: максимум можна внести {formatMoney(balance, hotelSettings)}.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Спосіб оплати</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ON_SITE_PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {PAYMENT_METHOD_UK[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <CheckCircle className="h-4 w-4" />
              Передплата і баланс закриті, додаткова оплата не потрібна.
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Примітки (необов'язково)</Label>
            <Textarea
              id="notes"
              placeholder="Особливі побажання, час прибуття, документи тощо…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {blockReasons.length > 0 && canSubmit === false && !error && (
            <Alert variant="destructive">
              <LockKeyhole className="h-4 w-4" />
              <AlertTitle>Заселення заблоковане</AlertTitle>
              <AlertDescription>
                <ul className="ml-4 list-disc space-y-1">
                  {blockReasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button onClick={handleCheckIn} disabled={!canSubmit} className="w-full" size="lg">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Обробляємо…
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Підтвердити заселення
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  )
}

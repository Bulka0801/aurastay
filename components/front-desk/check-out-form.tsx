"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AlertCircle, LockKeyhole, Loader2, LogOut, Wallet } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { formatMoney, nightsBetween } from "@/lib/format"
import { normalizeHotelSettings, type HotelSettings } from "@/lib/hotel-settings"
import { canTransitionReservation } from "@/lib/rules/transitions"
import { settledPaymentTotal } from "@/lib/rules/payments"
import { PAYMENT_METHOD_UK, RESERVATION_STATUS_UK } from "@/lib/i18n/uk"
import type { PaymentMethod } from "@/lib/types"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { RoomMoveNote } from "@/components/reservations/room-move-note"
import { Textarea } from "@/components/ui/textarea"

const ON_SITE_PAYMENT_METHODS: PaymentMethod[] = ["cash", "card_terminal"]

interface CheckOutFormProps {
  reservation: any
  hotelSettings?: HotelSettings | null
}

function getErrorMessage(err: unknown, fallback = "Сталася помилка") {
  if (err instanceof Error) return err.message
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message
  }
  return fallback
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

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function netPaidAmount(
  payments: Array<{
    amount: number | string
    payment_status?: string | null
    transaction_type?: string | null
  }>,
) {
  return settledPaymentTotal(payments)
}

export function CheckOutForm({ reservation, hotelSettings: hotelSettingsInput }: CheckOutFormProps) {
  const router = useRouter()
  const hotelSettings = useMemo(() => normalizeHotelSettings(hotelSettingsInput), [hotelSettingsInput])
  const money = (amount: number | string | null | undefined) => formatMoney(amount, hotelSettings)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState<string>("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash")
  const [earlyCheckOutConfirmed, setEarlyCheckOutConfirmed] = useState(false)
  const [earlyCheckOutReason, setEarlyCheckOutReason] = useState("")

  // ---- Підсумки оплат (payments.reservation_id) -------------------------
  const payments: Array<{
    amount: number | string
    payment_status?: string | null
    transaction_type?: string | null
  }> = reservation.payments ?? []
  const totalPaid = netPaidAmount(payments)

  const originalTotal = Number(reservation.total_amount || 0)
  const reservationRoom = reservation.reservation_rooms?.[0]
  const assignedRoom = reservationRoom?.rooms
  const plannedNights = nightsBetween(reservation.check_in_date, reservation.check_out_date) || 1
  const todayKey = todayDateKey()
  const plannedCheckOutKey = String(reservation.check_out_date).slice(0, 10)
  const isEarlyCheckOut = todayKey < plannedCheckOutKey
  const actualStayNights = isEarlyCheckOut ? nightsBetween(reservation.check_in_date, todayKey) || 1 : plannedNights
  const nightlyRate = Number(reservationRoom?.rate || 0) || originalTotal / plannedNights
  const recalculatedTotal = roundMoney(nightlyRate * actualStayNights)
  const checkoutTotal = isEarlyCheckOut ? Math.min(originalTotal, recalculatedTotal) : originalTotal
  const baseBalance = Math.max(0, roundMoney(checkoutTotal - totalPaid))
  const overpaidAmount = Math.max(0, roundMoney(totalPaid - checkoutTotal))
  const needsRefund = overpaidAmount > 0.01

  const effectivePayNow = useMemo(() => {
    const v = Number.parseFloat(paymentAmount || "0")
    return Number.isFinite(v) ? Math.max(0, v) : 0
  }, [paymentAmount])

  const projectedBalance = Math.max(0, baseBalance - effectivePayNow)
  const overpayAmount = Math.max(0, roundMoney(effectivePayNow - baseBalance))
  const paymentTooHigh = overpayAmount > 0.01
  const transitionAllowed = canTransitionReservation(reservation.status, "checked_out")
  const earlyCheckOutReasonProvided = earlyCheckOutReason.trim().length > 0
  const paidInFull = projectedBalance <= 0.01
  const canSubmit =
    !isLoading &&
    transitionAllowed &&
    paidInFull &&
    !paymentTooHigh &&
    !needsRefund &&
    (!isEarlyCheckOut || (earlyCheckOutConfirmed && earlyCheckOutReasonProvided))

  const blockReasons: string[] = []
  if (!transitionAllowed) {
    blockReasons.push(
      `Бронювання у статусі «${RESERVATION_STATUS_UK[reservation.status as keyof typeof RESERVATION_STATUS_UK] ?? reservation.status}» не можна виселити. Виселення доступне лише для заселених гостей.`,
    )
  }
  if (!paidInFull) {
    blockReasons.push(
      `Заборона виїзду із заборгованістю. Залишок: ${money(projectedBalance)}. Введіть суму доплати або прийміть повний баланс.`,
    )
  }
  if (paymentTooHigh) {
    blockReasons.push(`Сума доплати завелика: максимум можна внести ${money(baseBalance)}.`)
  }
  if (isEarlyCheckOut && !earlyCheckOutConfirmed) {
    blockReasons.push(
      `Достроковий виїзд до планової дати ${dateLabel(plannedCheckOutKey)} можливий тільки у крайній необхідності після підтвердження.`,
    )
  }
  if (isEarlyCheckOut && earlyCheckOutConfirmed && !earlyCheckOutReasonProvided) {
    blockReasons.push("Для дострокового виїзду потрібно вказати причину.")
  }
  if (needsRefund) {
    blockReasons.push(`Спочатку оформіть і підтвердьте повернення гостю ${money(overpaidAmount)} у folio.`)
  }

  const handleCheckOut = async () => {
    setError(null)

    if (!transitionAllowed) {
      setError("Поточний статус бронювання не дозволяє виконати check-out.")
      return
    }
    if (!paidInFull) {
      setError("Не можна виселити гостя із непогашеним балансом.")
      return
    }
    if (isEarlyCheckOut && !earlyCheckOutConfirmed) {
      setError("Підтвердіть достроковий виїзд перед виселенням.")
      return
    }
    if (isEarlyCheckOut && !earlyCheckOutReasonProvided) {
      setError("Вкажіть причину дострокового виїзду.")
      return
    }
    if (needsRefund) {
      setError("Спочатку оформіть і підтвердьте повернення переплати у folio бронювання.")
      return
    }
    if (paymentTooHigh) {
      setError(`Сума доплати перевищує залишок ${money(baseBalance)}.`)
      return
    }

    setIsLoading(true)
    try {
      const supabase = createClient()

      // Крок 1. Якщо вводиться доплата — зберегти payment.
      if (effectivePayNow > 0) {
        if (effectivePayNow > baseBalance + 0.01) {
          throw new Error(`Сума доплати перевищує залишок ${money(baseBalance)}.`)
        }
        const { error: payErr } = await supabase.from("payments").insert({
          reservation_id: reservation.id,
          amount: effectivePayNow,
          payment_method: paymentMethod,
          payment_status: "paid",
          notes: "Доплата при check-out",
        })
        if (payErr) throw payErr
      }

      // Крок 2. Перерахунок по свіжих даних — anti-race перед самим check-out.
      const { data: freshPayments, error: payFetchErr } = await supabase
        .from("payments")
        .select("amount, payment_status, transaction_type")
        .eq("reservation_id", reservation.id)
      if (payFetchErr) throw payFetchErr
      const freshPaidBeforeRefund = netPaidAmount(freshPayments || [])
      const freshOverpaid = Math.max(0, roundMoney(freshPaidBeforeRefund - checkoutTotal))
      if (freshOverpaid > 0.01) {
        throw new Error(
          `Є переплата ${money(freshOverpaid)}. Оформіть і підтвердьте повернення у folio перед check-out.`,
        )
      }

      const { data: paymentsAfterRefund, error: paymentsAfterRefundErr } = await supabase
        .from("payments")
        .select("amount, payment_status, transaction_type")
        .eq("reservation_id", reservation.id)
      if (paymentsAfterRefundErr) throw paymentsAfterRefundErr

      const freshPaidAfterRefund = netPaidAmount(paymentsAfterRefund || [])
      const freshBalance = roundMoney(checkoutTotal - freshPaidAfterRefund)
      if (freshBalance > 0.01) {
        throw new Error(
          `Залишок ${money(freshBalance)} не погашено. Check-out неможливий до повної оплати.`,
        )
      }
      const freshOverpaidAfterRefund = Math.max(0, roundMoney(freshPaidAfterRefund - checkoutTotal))
      if (freshOverpaidAfterRefund > 0.01) {
        throw new Error(`Залишилась сума до повернення ${money(freshOverpaidAfterRefund)}. Оформіть повернення перед check-out.`)
      }

      // Крок 3. Для дострокового виїзду спочатку звужуємо період рядків номера,
      // щоб reservation_rooms не виходили за межі нового reservation.check_out_date.
      const nowIso = new Date().toISOString()
      if (isEarlyCheckOut) {
        const { error: rrPeriodErr } = await supabase
          .from("reservation_rooms")
          .update({ check_out_time: `${todayKey}T00:00:00` })
          .eq("reservation_id", reservation.id)
        if (rrPeriodErr) throw rrPeriodErr
      }

      // Крок 4. Оновити бронювання → checked_out.
      const { error: resErr } = await supabase
        .from("reservations")
        .update(
          isEarlyCheckOut
            ? {
                status: "checked_out",
                check_out_date: todayKey,
                total_amount: checkoutTotal,
                notes: appendReservationNote(
                  reservation.notes,
                  `[Достроковий виїзд] Початкова дата виїзду: ${plannedCheckOutKey}; нова дата виїзду: ${todayKey}; фактичний час: ${nowIso}; причина: ${earlyCheckOutReason.trim()}; фактичних ночей: ${actualStayNights}; перерахована сума: ${checkoutTotal.toFixed(2)}.`,
                ),
              }
            : { status: "checked_out" },
        )
        .eq("id", reservation.id)
      if (resErr) throw resErr

      router.push("/dashboard/front-desk")
      router.refresh()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Підсумок бронювання</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Номер броні:</span>
            <span className="font-medium">{reservation.reservation_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Статус:</span>
            <Badge>
              {RESERVATION_STATUS_UK[reservation.status as keyof typeof RESERVATION_STATUS_UK] ?? reservation.status}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Гість:</span>
            <span className="font-medium">
              {reservation.guests?.first_name} {reservation.guests?.last_name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Номер:</span>
            <span>
              {assignedRoom ? `№ ${assignedRoom.room_number} — ${assignedRoom.room_type?.name}` : "—"}
            </span>
          </div>
          <RoomMoveNote
            previousRoomNumber={reservationRoom?.moved_from_room?.room_number}
            currentRoomNumber={assignedRoom?.room_number}
          />
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
            <span>{plannedNights}</span>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Оплата</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            {isEarlyCheckOut && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Початкова сума:</span>
                  <span className="font-medium line-through decoration-red-500/70">{money(originalTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Фактичне проживання:</span>
                  <span className="font-medium">
                    {actualStayNights} ноч. × {money(nightlyRate)}
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {isEarlyCheckOut ? "Нараховано після перерахунку:" : "Нараховано:"}
              </span>
              <span className="font-medium">{money(checkoutTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Сплачено:</span>
              <span className="font-medium text-emerald-600">{money(totalPaid)}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="font-semibold">Залишок:</span>
              <span
                className={`text-lg font-bold ${baseBalance > 0 ? "text-red-600" : "text-emerald-600"}`}
              >
                {money(baseBalance)}
              </span>
            </div>
            {overpaidAmount > 0.01 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">До повернення гостю:</span>
                <span className="font-medium text-amber-700">{money(overpaidAmount)}</span>
              </div>
            )}
            {needsRefund && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
                <p className="text-amber-900">
                  Повернення більше не позначається виконаним автоматично. Створіть refund у folio та
                  підтвердьте його після фактичного перерахування коштів.
                </p>
                <Button asChild size="sm" variant="outline" className="mt-3 bg-background">
                  <Link href={`/dashboard/reservations/${reservation.id}#folio`}>
                    Відкрити folio
                  </Link>
                </Button>
              </div>
            )}
            {effectivePayNow > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Після доплати:</span>
                <span className={`font-medium ${projectedBalance > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {money(projectedBalance)}
                </span>
              </div>
            )}
          </div>

          {baseBalance > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="payment">Сума до сплати *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="payment"
                      type="number"
                      min="0"
                      max={baseBalance.toFixed(2)}
                      step="0.01"
                      placeholder={baseBalance.toFixed(2)}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPaymentAmount(baseBalance.toFixed(2))}
                    >
                      <Wallet className="mr-1 h-4 w-4" />
                      Повний залишок
                    </Button>
                  </div>
                  {paymentTooHigh && (
                    <p className="text-xs text-red-600">
                      Забагато: максимум можна внести {money(baseBalance)}.
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
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Під час виселення доступні лише способи з миттєвим підтвердженням оплати.
                    IBAN-переказ потрібно спочатку зареєструвати й підтвердити за банківською випискою
                    на{" "}
                    <Link
                      href={`/dashboard/reservations/${reservation.id}`}
                      className="font-medium text-foreground underline underline-offset-2"
                    >
                      сторінці бронювання
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </>
          )}

          {isEarlyCheckOut && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Достроковий виїзд</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>
                  Планова дата виїзду: {dateLabel(plannedCheckOutKey)}. Виселення до цієї дати дозволене
                  тільки у крайній необхідності.
                </p>
                <p>
                  Суму перераховано за фактичне проживання: {actualStayNights} ноч. × {money(nightlyRate)} ={" "}
                  {money(checkoutTotal)}.
                </p>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="early-check-out-confirmed"
                    checked={earlyCheckOutConfirmed}
                    onCheckedChange={(checked) => setEarlyCheckOutConfirmed(checked === true)}
                  />
                  <Label htmlFor="early-check-out-confirmed" className="text-sm font-normal leading-snug">
                    Підтверджую достроковий виїзд і розумію, що фактичний час буде записано в історію бронювання.
                  </Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="early-check-out-reason">Причина дострокового виїзду *</Label>
                  <Textarea
                    id="early-check-out-reason"
                    placeholder="Наприклад: терміновий від'їзд, зміна рейсу, службове погодження…"
                    value={earlyCheckOutReason}
                    onChange={(e) => setEarlyCheckOutReason(e.target.value)}
                    rows={2}
                  />
                </div>
              </AlertDescription>
            </Alert>
          )}

          {blockReasons.length > 0 && !canSubmit && !error && (
            <Alert variant="destructive">
              <LockKeyhole className="h-4 w-4" />
              <AlertTitle>Check-out заблоковано</AlertTitle>
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

          <Button onClick={handleCheckOut} disabled={!canSubmit} className="w-full" size="lg">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Обробляємо…
              </>
            ) : (
              <>
                <LogOut className="mr-2 h-4 w-4" />
                Підтвердити виселення
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  )
}

"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle, Loader2, LockKeyhole } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { formatUAH, nightsBetween } from "@/lib/format"
import {
  DEFAULT_PREPAYMENT_PERCENT,
  isPrepaymentSatisfied,
  remainingPrepayment,
  requiredPrepayment,
} from "@/lib/rules/prepayment"
import { canTransitionReservation, isRoomReadyForCheckIn, roomStatusAfterCheckIn } from "@/lib/rules/transitions"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"

interface CheckInFormProps {
  reservation: any
  availableRooms: any[]
}

type PaymentMethod = "cash" | "credit_card" | "debit_card" | "bank_transfer"

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Готівка",
  credit_card: "Кредитна картка",
  debit_card: "Дебетова картка",
  bank_transfer: "Банківський переказ",
}

const READY_ROOM_STATUSES = new Set<string>(["available", "inspecting"])

function roomStatusLabel(status: string): string {
  switch (status) {
    case "available":
      return "Готовий"
    case "inspecting":
      return "На інспекції"
    case "dirty":
      return "Брудний"
    case "cleaning":
      return "Прибирається"
    case "maintenance":
      return "На ремонті"
    case "out_of_order":
      return "Несправний"
    case "blocked":
      return "Заблокований"
    case "occupied":
      return "Зайнятий"
    default:
      return status
  }
}

export function CheckInForm({ reservation, availableRooms }: CheckInFormProps) {
  const router = useRouter()

  const assignedRoom = reservation.reservation_rooms?.[0]?.rooms ?? null
  const hasAssignedRoom = Boolean(reservation.reservation_rooms?.[0]?.room_id)

  // ---- Підсумки оплат ----------------------------------------------------
  // За новою схемою payments прив'язані напряму до reservation_id.
  const payments: Array<{ amount: number; payment_status?: string }> = reservation.payments ?? []
  const totalPaid = payments
    .filter((p) => p.payment_status !== "refunded" && p.payment_status !== "failed")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const total = Number(reservation.total_amount || 0)
  const needPrepayment = requiredPrepayment(total, DEFAULT_PREPAYMENT_PERCENT)
  const remaining = remainingPrepayment(totalPaid, total, DEFAULT_PREPAYMENT_PERCENT)
  const prepaymentOK = isPrepaymentSatisfied(totalPaid, total, DEFAULT_PREPAYMENT_PERCENT)
  const balance = Math.max(0, total - totalPaid)

  // ---- Стейт форми -------------------------------------------------------
  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    hasAssignedRoom ? reservation.reservation_rooms[0].room_id : "",
  )
  // Сума передплати, що вноситься зараз (щоб дозаплатити до 10%+).
  const [prepayAmount, setPrepayAmount] = useState<string>(
    prepaymentOK ? "" : remaining.toFixed(2),
  )
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash")
  const [notes, setNotes] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ---- Валідації, які робимо перед сабмітом -----------------------------
  const transitionAllowed = canTransitionReservation(reservation.status, "checked_in")

  const effectivePrepayAfterInput = useMemo(() => {
    const extra = Number.parseFloat(prepayAmount || "0")
    return totalPaid + (Number.isFinite(extra) ? Math.max(0, extra) : 0)
  }, [prepayAmount, totalPaid])

  const willSatisfyPrepayment = isPrepaymentSatisfied(effectivePrepayAfterInput, total, DEFAULT_PREPAYMENT_PERCENT)

  const room = hasAssignedRoom
    ? assignedRoom
    : availableRooms.find((r) => r.id === selectedRoomId) ?? null

  const roomReady = room ? isRoomReadyForCheckIn(room.status) : false

  const canSubmit =
    !isLoading &&
    transitionAllowed &&
    Boolean(room) &&
    roomReady &&
    willSatisfyPrepayment

  const blockReasons: string[] = []
  if (!transitionAllowed) {
    blockReasons.push(
      `Бронювання у статусі «${reservation.status}» не можна перевести у «checked_in». Спочатку підтвердіть бронювання.`,
    )
  }
  if (!room) {
    blockReasons.push("Оберіть номер для заселення.")
  } else if (!roomReady) {
    blockReasons.push(
      `Номер ${room.room_number} у статусі «${roomStatusLabel(room.status)}» — заселення заборонено. Дочекайтесь статусу «Готовий».`,
    )
  }
  if (!willSatisfyPrepayment) {
    blockReasons.push(
      `Потрібна передплата ${DEFAULT_PREPAYMENT_PERCENT}% (${formatUAH(needPrepayment)}). Зараз сплачено ${formatUAH(totalPaid)}.`,
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
    if (!roomReady) {
      setError(`Номер ${room.room_number} не готовий для заселення (${roomStatusLabel(room.status)}).`)
      return
    }

    setIsLoading(true)
    try {
      const supabase = createClient()

      // Крок 1. Перевіряємо актуальний стан номера (anti-race).
      const { data: freshRoom, error: roomFetchErr } = await supabase
        .from("rooms")
        .select("id, status, room_number")
        .eq("id", room.id)
        .single()
      if (roomFetchErr || !freshRoom) {
        throw new Error("Не вдалося перевірити стан номера.")
      }
      if (!READY_ROOM_STATUSES.has(freshRoom.status)) {
        throw new Error(
          `Номер ${freshRoom.room_number} тепер у статусі «${roomStatusLabel(freshRoom.status)}» — заселення неможливе.`,
        )
      }

      // Крок 2. Якщо вноситься передплата — зберегти payment.
      const extra = Number.parseFloat(prepayAmount || "0")
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

      // Крок 3. Перерахуємо суми та перевіримо поріг передплати по свіжих даних.
      const { data: freshPayments, error: payFetchErr } = await supabase
        .from("payments")
        .select("amount, payment_status")
        .eq("reservation_id", reservation.id)
      if (payFetchErr) throw payFetchErr
      const freshPaid = (freshPayments || [])
        .filter((p) => p.payment_status !== "refunded" && p.payment_status !== "failed")
        .reduce((s, p) => s + Number(p.amount || 0), 0)
      if (!isPrepaymentSatisfied(freshPaid, total, DEFAULT_PREPAYMENT_PERCENT)) {
        throw new Error(
          `Недостатньо передплати: ${formatUAH(freshPaid)} із ${formatUAH(needPrepayment)}.`,
        )
      }

      // Крок 4. Прив'язка номера до бронювання (якщо ще немає).
      if (!hasAssignedRoom) {
        const nights = nightsBetween(reservation.check_in_date, reservation.check_out_date) || 1
        const perNight = total / nights
        const { error: rrErr } = await supabase.from("reservation_rooms").insert({
          reservation_id: reservation.id,
          room_id: room.id,
          room_type_id: room.room_type_id,
          rate: perNight,
          actual_check_in: new Date().toISOString(),
        })
        if (rrErr) throw rrErr
      } else {
        await supabase
          .from("reservation_rooms")
          .update({ actual_check_in: new Date().toISOString() })
          .eq("reservation_id", reservation.id)
          .eq("room_id", room.id)
      }

      // Крок 5. Оновити бронювання → checked_in.
      const { error: resErr } = await supabase
        .from("reservations")
        .update({
          status: "checked_in",
          actual_check_in: new Date().toISOString(),
          special_requests: notes
            ? `${reservation.special_requests ? reservation.special_requests + "\n" : ""}[Check-in] ${notes}`
            : reservation.special_requests,
        })
        .eq("id", reservation.id)
      if (resErr) throw resErr

      // Крок 6. Оновити стан номера через state-machine (available/inspecting → occupied).
      const nextRoomStatus = roomStatusAfterCheckIn()
      const { error: roomUpdErr } = await supabase
        .from("rooms")
        .update({ status: nextRoomStatus })
        .eq("id", room.id)
      if (roomUpdErr) throw roomUpdErr

      router.push("/dashboard/front-desk")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Сталася помилка")
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
              {reservation.status}
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

          <div className="flex justify-between">
            <span className="text-muted-foreground">Повна сума:</span>
            <span className="font-medium">{formatUAH(total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Потрібна передплата ({DEFAULT_PREPAYMENT_PERCENT}%):</span>
            <span className="font-medium">{formatUAH(needPrepayment)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Уже сплачено:</span>
            <span className={`font-semibold ${prepaymentOK ? "text-emerald-600" : "text-amber-600"}`}>
              {formatUAH(totalPaid)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Баланс:</span>
            <span className={`font-bold ${balance > 0 ? "text-amber-700" : "text-emerald-600"}`}>
              {formatUAH(balance)}
            </span>
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
                Бронювання у статусі «{reservation.status}». Заселити можна лише підтверджене (confirmed) бронювання.
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
                  {roomStatusLabel(assignedRoom?.status ?? "available")}
                </Badge>
              </div>
              {!roomReady && (
                <p className="mt-2 text-xs text-red-600">
                  Заселення неможливе, поки номер не перейде у «Готовий» або «На інспекції».
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Оберіть номер *</Label>
              {availableRooms.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Немає вільних готових номерів. Зверніться до housekeeping.</AlertDescription>
                </Alert>
              ) : (
                <RadioGroup value={selectedRoomId} onValueChange={setSelectedRoomId} className="grid gap-2">
                  {availableRooms.map((r) => (
                    <Label
                      key={r.id}
                      htmlFor={`room-${r.id}`}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-md border p-3 hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem id={`room-${r.id}`} value={r.id} />
                        <div>
                          <div className="font-medium">
                            № {r.room_number} — {r.room_type?.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Поверх {r.floor} · {formatUAH(r.room_type?.base_rate ?? 0)}/ніч
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline">{roomStatusLabel(r.status)}</Badge>
                    </Label>
                  ))}
                </RadioGroup>
              )}
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="prepay">
                Внести передплату{" "}
                {!prepaymentOK && (
                  <span className="text-xs font-normal text-amber-600">
                    (потрібно ще {formatUAH(remaining)})
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
              step="0.01"
              placeholder="0,00"
              value={prepayAmount}
              onChange={(e) => setPrepayAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Спосіб оплати</Label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
                  <SelectItem key={m} value={m}>
                    {PAYMENT_METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

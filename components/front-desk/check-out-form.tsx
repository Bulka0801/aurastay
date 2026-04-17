"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, LockKeyhole, Loader2, LogOut, Wallet } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { formatUAH, nightsBetween } from "@/lib/format"
import { canTransitionReservation, roomStatusAfterCheckOut } from "@/lib/rules/transitions"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

interface CheckOutFormProps {
  reservation: any
}

type PaymentMethod = "cash" | "credit_card" | "debit_card" | "bank_transfer"

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Готівка",
  credit_card: "Кредитна картка",
  debit_card: "Дебетова картка",
  bank_transfer: "Банківський переказ",
}

export function CheckOutForm({ reservation }: CheckOutFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState<string>("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash")

  // ---- Підсумки оплат (payments.reservation_id) -------------------------
  const payments: Array<{ amount: number; payment_status?: string }> = reservation.payments ?? []
  const totalPaid = payments
    .filter((p) => p.payment_status !== "refunded" && p.payment_status !== "failed")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0)

  const total = Number(reservation.total_amount || 0)
  const baseBalance = Math.max(0, total - totalPaid)

  const effectivePayNow = useMemo(() => {
    const v = Number.parseFloat(paymentAmount || "0")
    return Number.isFinite(v) ? Math.max(0, v) : 0
  }, [paymentAmount])

  const projectedBalance = Math.max(0, baseBalance - effectivePayNow)
  const transitionAllowed = canTransitionReservation(reservation.status, "checked_out")
  const paidInFull = projectedBalance <= 0.01
  const canSubmit = !isLoading && transitionAllowed && paidInFull

  const blockReasons: string[] = []
  if (!transitionAllowed) {
    blockReasons.push(
      `Бронювання у статусі «${reservation.status}» не можна перевести у «checked_out». Check-out доступний лише для гостей, що заселені.`,
    )
  }
  if (!paidInFull) {
    blockReasons.push(
      `Заборона виїзду із заборгованістю. Залишок: ${formatUAH(projectedBalance)}. Введіть суму доплати або прийміть повний баланс.`,
    )
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

    setIsLoading(true)
    try {
      const supabase = createClient()

      // Крок 1. Якщо вводиться доплата — зберегти payment.
      if (effectivePayNow > 0) {
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
        .select("amount, payment_status")
        .eq("reservation_id", reservation.id)
      if (payFetchErr) throw payFetchErr
      const freshPaid = (freshPayments || [])
        .filter((p) => p.payment_status !== "refunded" && p.payment_status !== "failed")
        .reduce((s, p) => s + Number(p.amount || 0), 0)
      const freshBalance = Math.round((total - freshPaid) * 100) / 100
      if (freshBalance > 0.01) {
        throw new Error(
          `Залишок ${formatUAH(freshBalance)} не погашено. Check-out неможливий до повної оплати.`,
        )
      }

      // Крок 3. Оновити бронювання → checked_out.
      const nowIso = new Date().toISOString()
      const { error: resErr } = await supabase
        .from("reservations")
        .update({
          status: "checked_out",
          actual_check_out: nowIso,
          payment_status: "paid",
        })
        .eq("id", reservation.id)
      if (resErr) throw resErr

      // Крок 4. Оновити стан номера → dirty (state-machine),
      // проставити actual_check_out у reservation_rooms і створити HK task.
      const rr = reservation.reservation_rooms?.[0]
      if (rr?.room_id) {
        const nextRoomStatus = roomStatusAfterCheckOut()
        await supabase.from("rooms").update({ status: nextRoomStatus }).eq("id", rr.room_id)

        await supabase
          .from("reservation_rooms")
          .update({ actual_check_out: nowIso })
          .eq("reservation_id", reservation.id)
          .eq("room_id", rr.room_id)

        await supabase.from("housekeeping_tasks").insert({
          room_id: rr.room_id,
          task_type: "checkout_cleaning",
          status: "pending",
          priority: "high",
          scheduled_date: new Date().toISOString().slice(0, 10),
          notes: `Прибирання після виїзду ${reservation.guests?.first_name ?? ""} ${
            reservation.guests?.last_name ?? ""
          }`.trim(),
        })
      }

      // Крок 5. Закрити folio (якщо існує).
      const folio = reservation.folios?.[0]
      if (folio?.id) {
        await supabase.from("folios").update({ status: "paid" }).eq("id", folio.id)
      }

      router.push("/dashboard/front-desk")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Сталася помилка")
    } finally {
      setIsLoading(false)
    }
  }

  const nights = nightsBetween(reservation.check_in_date, reservation.check_out_date) || 1
  const assignedRoom = reservation.reservation_rooms?.[0]?.rooms

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
            <Badge>{reservation.status}</Badge>
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
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Оплата</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Нараховано:</span>
              <span className="font-medium">{formatUAH(total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Сплачено:</span>
              <span className="font-medium text-emerald-600">{formatUAH(totalPaid)}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="font-semibold">Залишок:</span>
              <span
                className={`text-lg font-bold ${baseBalance > 0 ? "text-red-600" : "text-emerald-600"}`}
              >
                {formatUAH(baseBalance)}
              </span>
            </div>
            {effectivePayNow > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Після доплати:</span>
                <span className={`font-medium ${projectedBalance > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {formatUAH(projectedBalance)}
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
              </div>
            </>
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

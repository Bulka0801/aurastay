"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Edit,
  Loader2,
  LogIn,
  LogOut,
  Wallet,
} from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { formatUAH } from "@/lib/format"
import {
  DEFAULT_PREPAYMENT_PERCENT,
  isPrepaymentSatisfied,
  remainingPrepayment,
  requiredPrepayment,
  shouldAutoConfirmAfterPayment,
} from "@/lib/rules/prepayment"
import { canCancelReservation, canTransitionReservation } from "@/lib/rules/transitions"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"

type PaymentMethod = "cash" | "credit_card" | "debit_card" | "bank_transfer"

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Готівка",
  credit_card: "Кредитна картка",
  debit_card: "Дебетова картка",
  bank_transfer: "Банківський переказ",
}

interface ReservationActionsProps {
  reservation: {
    id: string
    status: string
    total_amount: number | string
    paid_amount?: number | string | null
    balance?: number | string | null
    payments?: Array<{ amount: number | string; payment_status?: string | null }>
  }
}

export function ReservationActions({ reservation }: ReservationActionsProps) {
  const router = useRouter()
  const [payOpen, setPayOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState<PaymentMethod>("cash")
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Компьютинг сум на основі payments, якщо вони є (точніше за paid_amount)
  const totalPaid = useMemo(() => {
    const payments = reservation.payments ?? []
    if (payments.length > 0) {
      return payments
        .filter((p) => p.payment_status !== "refunded" && p.payment_status !== "failed")
        .reduce((s, p) => s + Number(p.amount || 0), 0)
    }
    return Number(reservation.paid_amount || 0)
  }, [reservation])

  const total = Number(reservation.total_amount || 0)
  const balance = Math.max(0, total - totalPaid)
  const needPrepay = requiredPrepayment(total, DEFAULT_PREPAYMENT_PERCENT)
  const remaining = remainingPrepayment(totalPaid, total, DEFAULT_PREPAYMENT_PERCENT)
  const prepaymentSatisfied = isPrepaymentSatisfied(totalPaid, total, DEFAULT_PREPAYMENT_PERCENT)

  const status = reservation.status as any
  const canCancel = canCancelReservation(status)

  const openPayDialog = () => {
    setError(null)
    setAmount(remaining > 0 ? remaining.toFixed(2) : balance.toFixed(2))
    setMethod("cash")
    setPayOpen(true)
  }

  const openCancelDialog = () => {
    setError(null)
    setReason("")
    setCancelOpen(true)
  }

  const handlePay = async () => {
    setError(null)
    const value = Number.parseFloat(amount || "0")
    if (!Number.isFinite(value) || value <= 0) {
      setError("Введіть суму більшу за 0.")
      return
    }
    if (value > balance + 0.01) {
      setError(`Сума перевищує залишок ${formatUAH(balance)}.`)
      return
    }
    setBusy(true)
    try {
      const supabase = createClient()
      const { error: payErr } = await supabase.from("payments").insert({
        reservation_id: reservation.id,
        amount: value,
        payment_method: method,
        payment_status: "paid",
        notes: "Передплата / оплата броні",
      })
      if (payErr) throw payErr

      // Перевіряємо актуальну суму оплат після вставки
      const { data: fresh } = await supabase
        .from("payments")
        .select("amount, payment_status")
        .eq("reservation_id", reservation.id)
      const paidNow = (fresh || [])
        .filter((p) => p.payment_status !== "refunded" && p.payment_status !== "failed")
        .reduce((s, p) => s + Number(p.amount || 0), 0)

      // Auto-confirm pending → confirmed якщо досягнуто 10%
      if (shouldAutoConfirmAfterPayment({ status, total_amount: total }, paidNow)) {
        if (canTransitionReservation(status, "confirmed")) {
          await supabase.from("reservations").update({ status: "confirmed" }).eq("id", reservation.id)
        }
      }

      setPayOpen(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося зберегти платіж")
    } finally {
      setBusy(false)
    }
  }

  const handleCancel = async () => {
    setError(null)
    if (!canCancel) {
      setError("Поточний статус не дозволяє скасування.")
      return
    }
    setBusy(true)
    try {
      const supabase = createClient()
      const { error: updErr } = await supabase
        .from("reservations")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason.trim() || null,
        })
        .eq("id", reservation.id)
      if (updErr) throw updErr
      setCancelOpen(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося скасувати бронювання")
    } finally {
      setBusy(false)
    }
  }

  const isTerminal = ["checked_out", "cancelled", "no_show"].includes(status)
  const canEdit = status === "pending" || status === "confirmed"

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {balance > 0 && !isTerminal && (
          <Button onClick={openPayDialog} variant={prepaymentSatisfied ? "outline" : "default"}>
            <Wallet className="mr-2 h-4 w-4" />
            {prepaymentSatisfied ? "Внести оплату" : "Внести передплату"}
          </Button>
        )}
        {canEdit && (
          <Button variant="outline" asChild>
            <Link href={`/dashboard/reservations/${reservation.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Редагувати
            </Link>
          </Button>
        )}
        {status === "confirmed" && (
          <Button asChild variant="default">
            <Link href={`/dashboard/front-desk/check-in/${reservation.id}`}>
              <LogIn className="mr-2 h-4 w-4" />
              Заселити
            </Link>
          </Button>
        )}
        {status === "checked_in" && (
          <Button asChild>
            <Link href={`/dashboard/front-desk/check-out/${reservation.id}`}>
              <LogOut className="mr-2 h-4 w-4" />
              Виселити
            </Link>
          </Button>
        )}
        {canCancel && (
          <Button variant="outline" onClick={openCancelDialog} className="text-destructive">
            <Ban className="mr-2 h-4 w-4" />
            Скасувати
          </Button>
        )}
      </div>

      {/* --- Prepayment / Payment Dialog --- */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {prepaymentSatisfied ? "Внести оплату" : "Внести передплату"}
            </DialogTitle>
            <DialogDescription>
              {prepaymentSatisfied
                ? "Додайте часткову або повну оплату до броні."
                : `Мінімальна передплата ${DEFAULT_PREPAYMENT_PERCENT}% — ${formatUAH(needPrepay)}. Після досягнення цієї суми бронювання автоматично стане «Підтверджено».`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-2 rounded-lg border p-3 text-sm">
              <div>
                <p className="text-muted-foreground">Загальна</p>
                <p className="font-semibold">{formatUAH(total)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Сплачено</p>
                <p className="font-semibold text-emerald-600">{formatUAH(totalPaid)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Залишок</p>
                <p className="font-semibold text-amber-600">{formatUAH(balance)}</p>
              </div>
            </div>

            {!prepaymentSatisfied && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  До порогу передплати залишилось <strong>{formatUAH(remaining)}</strong>.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="amount">Сума *</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="flex gap-2">
                {remaining > 0 && (
                  <Button type="button" size="sm" variant="outline" onClick={() => setAmount(remaining.toFixed(2))}>
                    Передплата {formatUAH(remaining)}
                  </Button>
                )}
                <Button type="button" size="sm" variant="outline" onClick={() => setAmount(balance.toFixed(2))}>
                  Повний залишок {formatUAH(balance)}
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Спосіб оплати</Label>
              <RadioGroup value={method} onValueChange={(v) => setMethod(v as PaymentMethod)} className="grid grid-cols-2 gap-2">
                {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => (
                  <Label
                    key={m}
                    htmlFor={`pm-${m}`}
                    className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm hover:bg-muted/40"
                  >
                    <RadioGroupItem id={`pm-${m}`} value={m} />
                    <span>{METHOD_LABELS[m]}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)} disabled={busy}>
              Скасувати
            </Button>
            <Button onClick={handlePay} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Зберегти платіж
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Cancel Dialog --- */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Скасувати бронювання?</DialogTitle>
            <DialogDescription>
              Цю дію неможливо скасувати. Бронювання отримає статус «Скасовано», номер звільниться на обрані дати.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label>Причина скасування (необов&apos;язково)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Наприклад: гість не подзвонив, зміна планів..."
            />
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={busy}>
              Не скасовувати
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4" />}
              Підтвердити скасування
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

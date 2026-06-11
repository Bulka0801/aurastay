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
  ReceiptText,
  UserX,
  Wallet,
} from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { formatMoney } from "@/lib/format"
import { normalizeHotelSettings, type HotelSettings } from "@/lib/hotel-settings"
import {
  isPrepaymentSatisfied,
  remainingPrepayment,
  requiredPrepayment,
} from "@/lib/rules/prepayment"
import { settledPaymentTotal } from "@/lib/rules/payments"
import { canCancelReservation } from "@/lib/rules/transitions"
import { PAYMENT_METHOD_UK } from "@/lib/i18n/uk"
import type { PaymentMethod, UserRole } from "@/lib/types"

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

interface ReservationActionsProps {
  reservation: {
    id: string
    guest_id: string
    status: string
    check_in_date: string
    check_out_date: string
    total_amount: number | string
    paid_amount?: number | string | null
    balance?: number | string | null
    payments?: Array<{
      id: string
      amount: number | string
      payment_method?: string | null
      payment_status?: string | null
      transaction_id?: string | null
      transaction_type?: string | null
      notes?: string | null
    }>
  }
  hotelSettings?: HotelSettings | null
  currentUserRole?: UserRole | null
  folioIsClosed?: boolean
}

const MANAGER_ROLES = new Set<UserRole>([
  "system_administrator",
  "general_manager",
  "front_desk_manager",
])

function localDateKey() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function ReservationActions({
  reservation,
  hotelSettings: hotelSettingsInput,
  currentUserRole,
  folioIsClosed = false,
}: ReservationActionsProps) {
  const router = useRouter()
  const hotelSettings = useMemo(() => normalizeHotelSettings(hotelSettingsInput), [hotelSettingsInput])
  const [payOpen, setPayOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [noShowOpen, setNoShowOpen] = useState(false)
  const [lateCheckInOpen, setLateCheckInOpen] = useState(false)
  const [ibanFailureOpen, setIbanFailureOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState<PaymentMethod>("cash")
  const [instructionNumber, setInstructionNumber] = useState("")
  const [paymentNotes, setPaymentNotes] = useState("")
  const [reason, setReason] = useState("")
  const [noShowReason, setNoShowReason] = useState("")
  const [lateCheckInReason, setLateCheckInReason] = useState("")
  const [ibanFailureReason, setIbanFailureReason] = useState("")
  const [failingPaymentId, setFailingPaymentId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [verifyingPaymentId, setVerifyingPaymentId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [verificationError, setVerificationError] = useState<string | null>(null)

  // Компьютинг сум на основі payments, якщо вони є (точніше за paid_amount)
  const totalPaid = useMemo(() => {
    const payments = reservation.payments ?? []
    if (payments.length > 0) {
      return settledPaymentTotal(payments)
    }
    return Number(reservation.paid_amount || 0)
  }, [reservation])

  const total = Number(reservation.total_amount || 0)
  const balance = Math.max(0, total - totalPaid)
  const prepaymentRequired = hotelSettings.prepayment_required
  const needPrepay = prepaymentRequired ? requiredPrepayment(total, hotelSettings.prepayment_percent) : 0
  const remaining = prepaymentRequired ? remainingPrepayment(totalPaid, total, hotelSettings.prepayment_percent) : 0
  const prepaymentSatisfied = !prepaymentRequired || isPrepaymentSatisfied(totalPaid, total, hotelSettings.prepayment_percent)
  const pendingIbanPayments = (reservation.payments ?? []).filter(
    (payment) =>
      payment.payment_method === "bank_transfer_iban" &&
      payment.payment_status === "pending" &&
      (payment.transaction_type ?? "payment") === "payment",
  )

  const status = reservation.status as any
  const canCancel = canCancelReservation(status)
  const isManager = currentUserRole ? MANAGER_ROLES.has(currentUserRole) : false
  const periodExpired = localDateKey() > String(reservation.check_out_date).slice(0, 10)
  const departureDateReached =
    localDateKey() >= String(reservation.check_out_date).slice(0, 10)
  const isTerminal = status === "cancelled" || status === "no_show"
  const canAcceptPayment = balance > 0 && !isTerminal && !folioIsClosed

  const openPayDialog = () => {
    setError(null)
    setAmount(remaining > 0 ? remaining.toFixed(2) : balance.toFixed(2))
    setMethod("cash")
    setInstructionNumber("")
    setPaymentNotes("")
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
      setError(`Сума перевищує залишок ${formatMoney(balance, hotelSettings)}.`)
      return
    }
    const normalizedInstructionNumber = instructionNumber.trim()
    if (method === "bank_transfer_iban" && normalizedInstructionNumber.length === 0) {
      setError("Введіть номер платіжної інструкції з квитанції.")
      return
    }
    if (method === "bank_transfer_iban" && normalizedInstructionNumber.length > 100) {
      setError("Номер платіжної інструкції має містити не більше 100 символів.")
      return
    }
    const normalizedNotes = paymentNotes.trim()
    if (normalizedNotes.length > 500) {
      setError("Примітка має містити не більше 500 символів.")
      return
    }
    const systemNote =
      method === "bank_transfer_iban"
        ? "Квитанцію отримано. Очікується звірка з банківською випискою."
        : "Передплата / оплата броні"
    setBusy(true)
    try {
      const supabase = createClient()
      const { error: payErr } = await supabase.from("payments").insert({
        reservation_id: reservation.id,
        amount: value,
        payment_method: method,
        payment_status: method === "bank_transfer_iban" ? "pending" : "paid",
        transaction_id: method === "bank_transfer_iban" ? normalizedInstructionNumber : null,
        notes: normalizedNotes ? `${systemNote}\n${normalizedNotes}` : systemNote,
      })
      if (payErr) throw payErr

      setPayOpen(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося зберегти платіж")
    } finally {
      setBusy(false)
    }
  }

  const handleConfirmIbanPayment = async (paymentId: string) => {
    setVerificationError(null)
    setVerifyingPaymentId(paymentId)
    try {
      const supabase = createClient()
      const { error: confirmError } = await supabase.rpc("confirm_iban_payment", {
        p_payment_id: paymentId,
      })
      if (confirmError) throw confirmError

      router.refresh()
    } catch (e) {
      setVerificationError(e instanceof Error ? e.message : "Не вдалося підтвердити зарахування")
    } finally {
      setVerifyingPaymentId(null)
    }
  }

  const handleFailIbanPayment = async () => {
    if (!failingPaymentId || !ibanFailureReason.trim()) {
      setVerificationError("Вкажіть причину, чому кошти не надійшли.")
      return
    }
    setVerificationError(null)
    setVerifyingPaymentId(failingPaymentId)
    try {
      const supabase = createClient()
      const { error: failError } = await supabase.rpc("fail_iban_payment", {
        p_payment_id: failingPaymentId,
        p_reason: ibanFailureReason.trim(),
      })
      if (failError) throw failError
      setIbanFailureOpen(false)
      setFailingPaymentId(null)
      router.refresh()
    } catch (e) {
      setVerificationError(e instanceof Error ? e.message : "Не вдалося відхилити IBAN-платіж")
    } finally {
      setVerifyingPaymentId(null)
    }
  }

  const handleNoShow = async () => {
    if (!noShowReason.trim()) {
      setError("Для No-show потрібно вказати причину.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error: noShowError } = await supabase.rpc("mark_reservation_no_show", {
        p_reservation_id: reservation.id,
        p_reason: noShowReason.trim(),
      })
      if (noShowError) throw noShowError
      setNoShowOpen(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося позначити бронювання як No-show")
    } finally {
      setBusy(false)
    }
  }

  const handleLateCheckIn = async () => {
    if (!lateCheckInReason.trim()) {
      setError("Для пізнього заселення потрібно вказати причину.")
      return
    }

    setBusy(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error: lateCheckInError } = await supabase.rpc(
        "manager_late_check_in_reservation",
        {
          p_reservation_id: reservation.id,
          p_reason: lateCheckInReason.trim(),
        },
      )
      if (lateCheckInError) throw lateCheckInError

      setLateCheckInOpen(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося виконати пізнє заселення")
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
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const cancellationPayload = {
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by: user?.id ?? null,
        cancellation_reason: reason.trim() || null,
      }
      let { error: updErr } = await supabase
        .from("reservations")
        .update(cancellationPayload)
        .eq("id", reservation.id)

      if (updErr?.message.includes("cancelled_by")) {
        const fallback = await supabase
          .from("reservations")
          .update({
            status: cancellationPayload.status,
            cancelled_at: cancellationPayload.cancelled_at,
            cancellation_reason: cancellationPayload.cancellation_reason,
          })
          .eq("id", reservation.id)
        updErr = fallback.error
      }
      if (updErr) throw updErr
      setCancelOpen(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося скасувати бронювання")
    } finally {
      setBusy(false)
    }
  }

  const canEdit = status === "pending" || status === "confirmed"

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {canAcceptPayment && (
          <Button onClick={openPayDialog} variant={prepaymentSatisfied ? "outline" : "default"}>
            <Wallet className="mr-2 h-4 w-4" />
            {prepaymentSatisfied ? "Внести оплату" : "Внести передплату"}
          </Button>
        )}
        {canEdit && (!periodExpired || isManager) && (
          <Button variant="outline" asChild>
            <Link href={`/dashboard/reservations/${reservation.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Редагувати
            </Link>
          </Button>
        )}
        {status === "confirmed" && !departureDateReached && (
          <Button asChild variant="default">
            <Link href={`/dashboard/front-desk/check-in/${reservation.id}`}>
              <LogIn className="mr-2 h-4 w-4" />
              Заселити
            </Link>
          </Button>
        )}
        {status === "confirmed" && departureDateReached && !periodExpired && isManager && (
          <Button
            variant="default"
            onClick={() => {
              setError(null)
              setLateCheckInReason("")
              setLateCheckInOpen(true)
            }}
          >
            <LogIn className="mr-2 h-4 w-4" />
            Пізнє заселення
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
        {status === "confirmed" && periodExpired && (
          <Button
            variant="outline"
            onClick={() => {
              setError(null)
              setNoShowReason("")
              setNoShowOpen(true)
            }}
            className="text-amber-700"
          >
            <UserX className="mr-2 h-4 w-4" />
            Позначити No-show
          </Button>
        )}
        {status === "confirmed" && periodExpired && (
          <Button variant="outline" asChild>
            <Link href={`/dashboard/reservations/new?guestId=${reservation.guest_id}`}>
              Нове бронювання для гостя
            </Link>
          </Button>
        )}
        {periodExpired && (
          <Button variant="outline" asChild>
            <Link href={`/dashboard/reservations/${reservation.id}#folio`}>
              Відкрити folio
            </Link>
          </Button>
        )}
      </div>

      {status === "confirmed" && periodExpired && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Період бронювання завершився. Check-in недоступний, але фінансові операції залишаються
            доступними. Позначте No-show або створіть нове бронювання, якщо гість прибув після
            завершення періоду.
          </AlertDescription>
        </Alert>
      )}

      {status === "confirmed" && departureDateReached && !periodExpired && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Сьогодні дата виїзду. Звичайний check-in уже недоступний.
            {isManager
              ? " Для повністю оплаченого бронювання скористайтеся дією «Пізнє заселення»."
              : " Пізнє заселення може зафіксувати менеджер рецепції."}
          </AlertDescription>
        </Alert>
      )}

      {pendingIbanPayments.map((payment) => (
        <Alert key={payment.id}>
          <ReceiptText className="h-4 w-4" />
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>
              IBAN-переказ {formatMoney(payment.amount, hotelSettings)}, інструкція №
              {payment.transaction_id}: очікується перевірка за банківською випискою.
            </span>
            {isManager && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleConfirmIbanPayment(payment.id)}
                  disabled={verifyingPaymentId !== null}
                >
                  {verifyingPaymentId === payment.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Підтвердити зарахування
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setFailingPaymentId(payment.id)
                    setIbanFailureReason("")
                    setIbanFailureOpen(true)
                  }}
                  disabled={verifyingPaymentId !== null}
                >
                  Кошти не надійшли
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      ))}

      {verificationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{verificationError}</AlertDescription>
        </Alert>
      )}

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
                : `Мінімальна передплата ${hotelSettings.prepayment_percent}% — ${formatMoney(needPrepay, hotelSettings)}. Після досягнення цієї суми бронювання автоматично стане «Підтверджено».`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-2 rounded-lg border p-3 text-sm">
              <div>
                <p className="text-muted-foreground">Загальна</p>
                <p className="font-semibold">{formatMoney(total, hotelSettings)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Сплачено</p>
                <p className="font-semibold text-emerald-600">{formatMoney(totalPaid, hotelSettings)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Залишок</p>
                <p className="font-semibold text-amber-600">{formatMoney(balance, hotelSettings)}</p>
              </div>
            </div>

            {!prepaymentSatisfied && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  До порогу передплати залишилось <strong>{formatMoney(remaining, hotelSettings)}</strong>
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
                    Передплата {formatMoney(remaining, hotelSettings)}
                  </Button>
                )}
                <Button type="button" size="sm" variant="outline" onClick={() => setAmount(balance.toFixed(2))}>
                  Повний залишок {formatMoney(balance, hotelSettings)}
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Спосіб оплати</Label>
              <RadioGroup value={method} onValueChange={(v) => setMethod(v as PaymentMethod)} className="grid grid-cols-2 gap-2">
                {(Object.keys(PAYMENT_METHOD_UK) as PaymentMethod[]).map((m) => (
                  <Label
                    key={m}
                    htmlFor={`pm-${m}`}
                    className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm hover:bg-muted/40"
                  >
                    <RadioGroupItem id={`pm-${m}`} value={m} />
                    <span>{PAYMENT_METHOD_UK[m]}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            {method === "bank_transfer_iban" && (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="instruction-number">Номер платіжної інструкції *</Label>
                  <Input
                    id="instruction-number"
                    value={instructionNumber}
                    onChange={(event) => setInstructionNumber(event.target.value)}
                    maxLength={100}
                    placeholder="Як зазначено у квитанції банку"
                  />
                  <p className="text-xs text-muted-foreground">
                    Номер може містити цифри й літери, тому універсальної маски немає.
                  </p>
                </div>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Квитанція не підтверджує зарахування. Платіж буде збережено як «Очікується» і не
                    підтвердить бронювання, доки працівник не звірить його з випискою готелю.
                  </AlertDescription>
                </Alert>
              </>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="payment-notes">Примітка (необов&apos;язково)</Label>
              <Textarea
                id="payment-notes"
                value={paymentNotes}
                onChange={(event) => setPaymentNotes(event.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Наприклад: оплату прийняла рецепція, гість просив окрему квитанцію"
              />
              <p className="text-xs text-muted-foreground">
                Примітка збережеться разом із платежем і буде видима в його історії.
              </p>
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
              {method === "bank_transfer_iban" ? "Зареєструвати квитанцію" : "Зберегти платіж"}
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

      <Dialog open={noShowOpen} onOpenChange={setNoShowOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Позначити як No-show?</DialogTitle>
            <DialogDescription>
              Бронювання отримає статус «Не прибув». Оплати та повернення не зміняться автоматично:
              фінансове рішення потрібно прийняти окремо у folio.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="no-show-reason">Причина *</Label>
            <Textarea
              id="no-show-reason"
              value={noShowReason}
              onChange={(event) => setNoShowReason(event.target.value)}
              placeholder="Наприклад: гість не прибув і не попередив"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoShowOpen(false)} disabled={busy}>
              Скасувати
            </Button>
            <Button onClick={handleNoShow} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Підтвердити No-show
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={lateCheckInOpen} onOpenChange={setLateCheckInOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Зафіксувати пізнє заселення?</DialogTitle>
            <DialogDescription>
              Дія доступна менеджеру лише в день виїзду, для повністю оплаченого
              підтвердженого бронювання з призначеним готовим номером. Планові дати
              бронювання не змінюються.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="late-check-in-reason">Причина *</Label>
            <Textarea
              id="late-check-in-reason"
              value={lateCheckInReason}
              onChange={(event) => setLateCheckInReason(event.target.value)}
              placeholder="Наприклад: гість прибув пізно, check-in не був зафіксований попередньою зміною"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLateCheckInOpen(false)}
              disabled={busy}
            >
              Скасувати
            </Button>
            <Button onClick={handleLateCheckIn} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Зафіксувати заселення
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={ibanFailureOpen} onOpenChange={setIbanFailureOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Кошти за IBAN не надійшли</DialogTitle>
            <DialogDescription>
              Платіж залишиться в історії зі статусом «Неуспішно» і не впливатиме на баланс.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="iban-failure-reason">Причина *</Label>
            <Textarea
              id="iban-failure-reason"
              value={ibanFailureReason}
              onChange={(event) => setIbanFailureReason(event.target.value)}
              placeholder="Наприклад: платіж відсутній у банківській виписці"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIbanFailureOpen(false)}>
              Скасувати
            </Button>
            <Button variant="destructive" onClick={handleFailIbanPayment} disabled={verifyingPaymentId !== null}>
              {verifyingPaymentId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Позначити неуспішним
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

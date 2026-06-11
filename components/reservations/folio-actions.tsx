"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Loader2, RotateCcw, WalletCards, XCircle } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { formatMoney } from "@/lib/format"
import type { HotelSettings } from "@/lib/hotel-settings"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type FinancePayment = {
  id: string
  amount: number | string
  payment_method: PaymentMethod
  payment_status: string
  transaction_type?: string | null
  parent_payment_id?: string | null
}

type FinanceFolio = {
  id: string
  balance: number | string
  is_closed?: boolean | null
  pending_refund_amount?: number | string | null
}

const MANAGER_ROLES = new Set<UserRole>([
  "system_administrator",
  "general_manager",
  "front_desk_manager",
])

const RESOLUTION_LABELS = {
  retain_deposit: "Утримати передплату",
  retain_full: "Утримати повну суму",
  refund_all: "Повернути всю сплачену суму",
  custom_fee: "Встановити інший штраф",
  leave_open: "Залишити фінансове рішення відкритим",
}

export function FolioActions({
  reservationId,
  reservationStatus,
  reservationTotal,
  payments,
  folio,
  currentUserRole,
  hotelSettings,
  financialResolutionRecorded = false,
}: {
  reservationId: string
  reservationStatus: string
  reservationTotal: number
  payments: FinancePayment[]
  folio: FinanceFolio | null
  currentUserRole?: UserRole | null
  hotelSettings: HotelSettings
  financialResolutionRecorded?: boolean
}) {
  const router = useRouter()
  const isManager = currentUserRole ? MANAGER_ROLES.has(currentUserRole) : false
  const [refundOpen, setRefundOpen] = useState(false)
  const [resolutionOpen, setResolutionOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [selectedPaymentId, setSelectedPaymentId] = useState("")
  const [refundAmount, setRefundAmount] = useState("")
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>("cash")
  const [refundReason, setRefundReason] = useState("")
  const [overrideReason, setOverrideReason] = useState("")
  const [resolution, setResolution] = useState<keyof typeof RESOLUTION_LABELS>("retain_deposit")
  const [resolutionAmount, setResolutionAmount] = useState("")
  const [resolutionReason, setResolutionReason] = useState("")
  const [closeReason, setCloseReason] = useState("")
  const [failureReason, setFailureReason] = useState("")
  const [failingRefundId, setFailingRefundId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const completedOrPendingRefundsByParent = useMemo(() => {
    const totals = new Map<string, number>()
    for (const payment of payments) {
      if (
        payment.transaction_type === "refund" &&
        payment.parent_payment_id &&
        (payment.payment_status === "pending" || payment.payment_status === "refunded")
      ) {
        totals.set(
          payment.parent_payment_id,
          (totals.get(payment.parent_payment_id) ?? 0) + Number(payment.amount || 0),
        )
      }
    }
    return totals
  }, [payments])

  const refundablePayments = useMemo(
    () =>
      payments
        .filter(
          (payment) =>
            (payment.transaction_type ?? "payment") === "payment" &&
            payment.payment_status === "paid",
        )
        .map((payment) => ({
          ...payment,
          available: Math.max(
            0,
            Number(payment.amount || 0) - (completedOrPendingRefundsByParent.get(payment.id) ?? 0),
          ),
        }))
        .filter((payment) => payment.available > 0.01),
    [completedOrPendingRefundsByParent, payments],
  )

  const pendingRefunds = payments.filter(
    (payment) => payment.transaction_type === "refund" && payment.payment_status === "pending",
  )
  const balance = Number(folio?.balance ?? reservationTotal)
  const overpayment = Math.max(0, -balance)
  const pendingRefundAmount = pendingRefunds.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const selectedPayment = refundablePayments.find((payment) => payment.id === selectedPaymentId)
  const folioIsClosed = Boolean(folio?.is_closed)
  const canResolve =
    isManager &&
    !folioIsClosed &&
    !financialResolutionRecorded &&
    ["no_show", "cancelled"].includes(reservationStatus)

  function openRefundDialog() {
    const firstPayment = refundablePayments[0]
    if (!firstPayment) return
    const suggested = overpayment > 0 ? Math.min(overpayment, firstPayment.available) : firstPayment.available
    setError(null)
    setSelectedPaymentId(firstPayment.id)
    setRefundMethod(firstPayment.payment_method)
    setRefundAmount(suggested.toFixed(2))
    setRefundReason(overpayment > 0 ? "Повернення переплати гостю" : "")
    setOverrideReason("")
    setRefundOpen(true)
  }

  async function callRpc(name: string, args: Record<string, unknown>, busyKey: string) {
    setError(null)
    setBusyId(busyKey)
    try {
      const supabase = createClient()
      const { error: rpcError } = await supabase.rpc(name, args)
      if (rpcError) throw rpcError
      router.refresh()
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не вдалося виконати фінансову дію")
      return false
    } finally {
      setBusyId(null)
    }
  }

  async function createRefund() {
    const amount = Number(refundAmount)
    if (!selectedPayment || !Number.isFinite(amount) || amount <= 0 || amount > selectedPayment.available + 0.01) {
      setError("Перевірте суму повернення та вихідний платіж.")
      return
    }
    if (!refundReason.trim()) {
      setError("Вкажіть причину повернення.")
      return
    }
    const ok = await callRpc(
      "create_refund",
      {
        p_parent_payment_id: selectedPayment.id,
        p_amount: amount,
        p_payment_method: refundMethod,
        p_reason: refundReason.trim(),
        p_method_override_reason:
          refundMethod === selectedPayment.payment_method ? null : overrideReason.trim() || null,
      },
      "create-refund",
    )
    if (ok) setRefundOpen(false)
  }

  async function resolveFinances() {
    const amount = resolution === "retain_full" || resolution === "refund_all" || resolution === "leave_open"
      ? 0
      : Number(resolutionAmount)
    if (!resolutionReason.trim()) {
      setError("Вкажіть причину фінансового рішення.")
      return
    }
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Вкажіть коректну суму штрафу.")
      return
    }
    const ok = await callRpc(
      "resolve_reservation_finances",
      {
        p_reservation_id: reservationId,
        p_decision: resolution,
        p_fee_amount: amount,
        p_reason: resolutionReason.trim(),
      },
      "resolve",
    )
    if (ok) setResolutionOpen(false)
  }

  async function changeFolioState(action: "close_folio" | "reopen_folio") {
    if (!folio) return
    if (action === "reopen_folio" && !closeReason.trim()) {
      setError("Вкажіть причину повторного відкриття рахунку.")
      return
    }
    const ok = await callRpc(
      action,
      { p_folio_id: folio.id, p_reason: closeReason.trim() || null },
      action,
    )
    if (ok) setCloseOpen(false)
  }

  async function failRefund() {
    if (!failingRefundId || !failureReason.trim()) {
      setError("Вкажіть причину невдалого повернення.")
      return
    }
    const ok = await callRpc(
      "fail_refund",
      { p_refund_id: failingRefundId, p_reason: failureReason.trim() },
      `fail-${failingRefundId}`,
    )
    if (ok) {
      setFailingRefundId(null)
      setFailureReason("")
    }
  }

  if (!folio) return null

  return (
    <div className="space-y-3">
      {pendingRefunds.map((refund) => (
        <Alert key={refund.id}>
          <RotateCcw className="h-4 w-4" />
          <AlertDescription className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <span>
              Очікується фактичне повернення {formatMoney(refund.amount, hotelSettings)} через{" "}
              {PAYMENT_METHOD_UK[refund.payment_method]}.
            </span>
            {isManager && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => callRpc(
                    "complete_refund",
                    { p_refund_id: refund.id },
                    `complete-${refund.id}`,
                  )}
                  disabled={busyId !== null}
                >
                  {busyId === `complete-${refund.id}` && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Повернення виконано
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setFailureReason("")
                    setFailingRefundId(refund.id)
                  }}
                  disabled={busyId !== null}
                >
                  Не виконано
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      ))}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isManager && (
        <div className="flex flex-wrap gap-2">
          {!folioIsClosed && refundablePayments.length > 0 && (
            <Button variant="outline" onClick={openRefundDialog}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {overpayment > 0
                ? `Оформити повернення ${formatMoney(overpayment, hotelSettings)}`
                : "Оформити повернення"}
            </Button>
          )}
          {canResolve && (
            <Button variant="outline" onClick={() => {
              setError(null)
              setResolutionAmount("")
              setResolutionReason("")
              setResolutionOpen(true)
            }}>
              <WalletCards className="mr-2 h-4 w-4" />
              Фінансове рішення
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              setError(null)
              setCloseReason("")
              setCloseOpen(true)
            }}
          >
            {folio.is_closed ? "Відкрити рахунок повторно" : "Закрити рахунок"}
          </Button>
        </div>
      )}

      {pendingRefundAmount > 0.01 && (
        <p className="text-sm text-amber-700">
          У черзі на повернення: {formatMoney(pendingRefundAmount, hotelSettings)}. До фактичного виконання
          бухгалтерський баланс залишається без змін.
        </p>
      )}

      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Оформити повернення</DialogTitle>
            <DialogDescription>
              Повернення створиться як «Очікується». Після фактичного перерахування його потрібно підтвердити.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Вихідний платіж</Label>
              <Select
                value={selectedPaymentId}
                onValueChange={(value) => {
                  const payment = refundablePayments.find((item) => item.id === value)
                  setSelectedPaymentId(value)
                  if (payment) {
                    setRefundMethod(payment.payment_method)
                    setRefundAmount(Math.min(overpayment || payment.available, payment.available).toFixed(2))
                  }
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {refundablePayments.map((payment) => (
                    <SelectItem key={payment.id} value={payment.id}>
                      {PAYMENT_METHOD_UK[payment.payment_method]} · доступно{" "}
                      {formatMoney(payment.available, hotelSettings)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="refund-amount">Сума</Label>
              <Input
                id="refund-amount"
                type="number"
                min="0.01"
                max={selectedPayment?.available}
                step="0.01"
                value={refundAmount}
                onChange={(event) => setRefundAmount(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Спосіб повернення</Label>
              <Select value={refundMethod} onValueChange={(value) => setRefundMethod(value as PaymentMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PAYMENT_METHOD_UK) as PaymentMethod[]).map((method) => (
                    <SelectItem key={method} value={method}>{PAYMENT_METHOD_UK[method]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedPayment && refundMethod !== selectedPayment.payment_method && (
              <div className="space-y-2">
                <Label htmlFor="override-reason">Причина зміни способу повернення</Label>
                <Textarea
                  id="override-reason"
                  value={overrideReason}
                  onChange={(event) => setOverrideReason(event.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="refund-reason">Причина</Label>
              <Textarea
                id="refund-reason"
                value={refundReason}
                onChange={(event) => setRefundReason(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundOpen(false)}>Скасувати</Button>
            <Button onClick={createRefund} disabled={busyId !== null}>
              {busyId === "create-refund" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Створити повернення
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resolutionOpen} onOpenChange={setResolutionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Фінансове рішення</DialogTitle>
            <DialogDescription>
              Операційний статус уже змінено. Тепер зафіксуйте штраф або повернення у folio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Сценарій</Label>
              <Select value={resolution} onValueChange={(value) => setResolution(value as keyof typeof RESOLUTION_LABELS)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(RESOLUTION_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(resolution === "retain_deposit" || resolution === "custom_fee") && (
              <div className="space-y-2">
                <Label htmlFor="resolution-amount">Сума, яку готель утримує</Label>
                <Input
                  id="resolution-amount"
                  type="number"
                  min="0"
                  max={reservationTotal}
                  step="0.01"
                  value={resolutionAmount}
                  onChange={(event) => setResolutionAmount(event.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="resolution-reason">Причина / коментар</Label>
              <Textarea
                id="resolution-reason"
                value={resolutionReason}
                onChange={(event) => setResolutionReason(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolutionOpen(false)}>Скасувати</Button>
            <Button onClick={resolveFinances} disabled={busyId !== null}>
              {busyId === "resolve" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Застосувати рішення
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{folio.is_closed ? "Відкрити folio повторно?" : "Закрити folio?"}</DialogTitle>
            <DialogDescription>
              Закриття дозволене тільки для збалансованого рахунку без очікуваних платежів і повернень.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="close-reason">Причина {folio.is_closed ? "(обов’язково)" : "(необов’язково)"}</Label>
            <Textarea
              id="close-reason"
              value={closeReason}
              onChange={(event) => setCloseReason(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseOpen(false)}>Скасувати</Button>
            <Button
              onClick={() => changeFolioState(folio.is_closed ? "reopen_folio" : "close_folio")}
              disabled={busyId !== null}
            >
              {busyId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {folio.is_closed ? "Відкрити" : "Закрити"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={failingRefundId !== null} onOpenChange={(open) => !open && setFailingRefundId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Повернення не виконано</DialogTitle>
            <DialogDescription>Запис залишиться в історії зі статусом «Неуспішно».</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="refund-failure-reason">Причина</Label>
            <Textarea
              id="refund-failure-reason"
              value={failureReason}
              onChange={(event) => setFailureReason(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFailingRefundId(null)}>Скасувати</Button>
            <Button variant="destructive" onClick={failRefund} disabled={busyId !== null}>
              {busyId?.startsWith("fail-") ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
              Позначити неуспішним
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

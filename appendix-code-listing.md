ДОДАТОК В
ЛІСТИНГ ПРОГРАМИ

// Л.1. Основні типи предметної області
// Фрагмент коду з файлу: lib/types.ts
// Призначення: описує основні ролі, статуси та сутності системи.

export type UserRole =
  | "system_administrator"
  | "general_manager"
  | "front_desk_manager"
  | "front_desk_agent"
  | "housekeeping_supervisor"
  | "housekeeping_staff"
  | "accountant"
  | "maintenance_staff"

export type RoomStatus =
  | "available"
  | "occupied"
  | "dirty"
  | "cleaning"
  | "inspecting"
  | "inspected"
  | "maintenance"
  | "out_of_order"
  | "blocked"

export type RoomOccupancyStatus = "vacant" | "occupied"
export type RoomHousekeepingStatus =
  | "clean"
  | "dirty"
  | "cleaning"
  | "inspecting"
  | "inspected"

export type RoomOperationalStatus =
  | "operational"
  | "maintenance"
  | "out_of_order"
  | "blocked"

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "no_show"

export type PaymentStatus = "pending" | "partial" | "paid" | "refunded" | "failed"
export type PaymentMethod = "cash" | "card_terminal" | "bank_transfer_iban"
export type PaymentTransactionType = "payment" | "refund"

export interface Reservation {
  id: string
  guest_id: string
  room_id?: string
  room_type_id: string
  check_in_date: string
  check_out_date: string
  status: ReservationStatus
  total_amount: number
  paid_amount: number
  payment_status: PaymentStatus
}

export interface Payment {
  id: string
  reservation_id: string
  amount: number
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  transaction_type: PaymentTransactionType
}

// Л.2. Машина станів бронювань, номерів і задач
// Фрагмент коду з файлу: lib/rules/transitions.ts
// Призначення: визначає дозволені переходи між станами.
export const RESERVATION_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["checked_in", "cancelled", "no_show"],
  checked_in: ["checked_out"],
  checked_out: [],
  cancelled: [],
  no_show: [],
}

export function canTransitionReservation(
  from: ReservationStatus,
  to: ReservationStatus,
): boolean {
  return RESERVATION_TRANSITIONS[from]?.includes(to) ?? false
}

export function isTerminalReservation(status: ReservationStatus): boolean {
  return RESERVATION_TRANSITIONS[status]?.length === 0
}

export function canEditReservation(status: ReservationStatus): boolean {
  return status === "pending" || status === "confirmed"
}

export function canCancelReservation(status: ReservationStatus): boolean {
  return status === "pending" || status === "confirmed"
}

export const ROOM_TRANSITIONS: Record<RoomStatus, RoomStatus[]> = {
  available: ["occupied", "dirty", "maintenance", "blocked"],
  occupied: ["dirty"],
  dirty: ["cleaning", "maintenance"],
  cleaning: ["inspected", "available", "dirty", "maintenance"],
  inspecting: ["available", "dirty"],
  inspected: ["available", "dirty"],
  maintenance: ["available", "maintenance"],
  blocked: ["available"],
  out_of_order: ["maintenance", "available"],
}

export function canTransitionRoom(from: RoomStatus, to: RoomStatus): boolean {
  return ROOM_TRANSITIONS[from]?.includes(to) ?? false
}

export function roomStatusAfterCheckIn(): RoomStatus {
  return "occupied"
}

export function roomStatusAfterCheckOut(): RoomStatus {
  return "dirty"
}

export function isRoomReadyForCheckIn(status: RoomStatus): boolean {
  return status === "available" || status === "inspected"
}

export const HK_TRANSITIONS: Record<HousekeepingTaskStatus, HousekeepingTaskStatus[]> = {
  pending: ["assigned", "in_progress"],
  assigned: ["in_progress", "pending"],
  in_progress: ["completed"],
  completed: ["inspected"],
  inspected: [],
}

export function canTransitionHk(
  from: HousekeepingTaskStatus,
  to: HousekeepingTaskStatus,
): boolean {
  return HK_TRANSITIONS[from]?.includes(to) ?? false
}

// Л.3. Доступність номерів
// Фрагмент коду з файлу: lib/rooms/availability.ts
// Призначення: визначає, чи можна номер продавати та заселяти.
export const ROOM_STATUSES_BLOCKING_SALES = [
  "maintenance",
  "out_of_order",
  "blocked",
] as const

export const ROOM_STATUSES_READY_FOR_CHECK_IN = ["available", "inspected"] as const
export const RESERVATION_STATUSES_BLOCKING_INVENTORY = [
  "pending",
  "confirmed",
  "checked_in",
] as const

const salesBlockingStatuses = new Set<string>(ROOM_STATUSES_BLOCKING_SALES)
const readyForCheckInStatuses = new Set<string>(ROOM_STATUSES_READY_FOR_CHECK_IN)
const inventoryBlockingReservationStatuses = new Set<string>(
  RESERVATION_STATUSES_BLOCKING_INVENTORY,
)

export function isRoomSellableForReservation(status?: string | null) {
  if (!status) return false
  return !salesBlockingStatuses.has(status)
}

export function isRoomReadyForCheckIn(status?: string | null) {
  if (!status) return false
  return readyForCheckInStatuses.has(status)
}

export function isRoomStateReadyForCheckIn(room: {
  occupancy_status?: RoomOccupancyStatus | null
  housekeeping_status?: RoomHousekeepingStatus | null
  operational_status?: RoomOperationalStatus | null
  status?: string | null
}) {
  if (
    room.occupancy_status &&
    room.housekeeping_status &&
    room.operational_status
  ) {
    return (
      room.occupancy_status === "vacant" &&
      (room.housekeeping_status === "clean" ||
        room.housekeeping_status === "inspected") &&
      room.operational_status === "operational"
    )
  }

  return isRoomReadyForCheckIn(room.status)
}

export function isRoomStateSellable(room: {
  occupancy_status?: RoomOccupancyStatus | null
  operational_status?: RoomOperationalStatus | null
  status?: string | null
}) {
  if (room.occupancy_status && room.operational_status) {
    return (
      room.occupancy_status === "vacant" &&
      room.operational_status === "operational"
    )
  }

  return isRoomSellableForReservation(room.status)
}

export function getBlockingReservationStatuses() {
  return [...RESERVATION_STATUSES_BLOCKING_INVENTORY]
}

export function doesReservationStatusBlockInventory(status?: string | null) {
  if (!status) return false
  return inventoryBlockingReservationStatuses.has(status)
}

export function doDateRangesOverlap(
  leftCheckIn: string,
  leftCheckOut: string,
  rightCheckIn: string,
  rightCheckOut: string,
) {
  return leftCheckIn < rightCheckOut && leftCheckOut > rightCheckIn
}

// Л.4. Конфлікти бронювань у шахматці номерів
// Фрагмент коду з файлу: lib/room-rack/availability.ts
// Призначення: не дозволяє накладати бронювання в одному номері.
export function periodsOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart < bEnd && bStart < aEnd
}

export function findConflicts(
  blocks: RackBlock[],
  targetRoomId: string,
  newCheckIn: string,
  newCheckOut: string,
  ignoreReservationRoomId?: string,
): RackBlock[] {
  return blocks.filter((b) => {
    if (b.reservation_room_id === ignoreReservationRoomId) return false
    if (b.room_id !== targetRoomId) return false
    if (b.status === "cancelled" || b.status === "no_show") return false
    return periodsOverlap(newCheckIn, newCheckOut, b.check_in, b.check_out)
  })
}

export function isValidRange(checkIn: string, checkOut: string): boolean {
  return diffInDays(parseISO(checkIn), parseISO(checkOut)) >= 1
}

// Л.5. Розрахунок вартості проживання
// Фрагмент коду з файлу: lib/room-rack/pricing.ts
// Призначення: перераховує суму при зміні номера або дат.
function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

export function calculateRackStayTotal({
  nightlyRate,
  nights,
  discountPercentage,
}: {
  nightlyRate: number
  nights: number
  discountPercentage?: number | null
}) {
  const baseAmount = Math.max(0, nightlyRate) * Math.max(1, nights)
  const discount = baseAmount * (Math.max(0, Number(discountPercentage ?? 0)) / 100)
  return roundMoney(baseAmount - discount)
}

export function buildRackPricingImpact({
  block,
  targetRoom,
  newCheckIn,
  newCheckOut,
}: {
  block: RackBlock
  targetRoom?: RackRoom
  newCheckIn: string
  newCheckOut: string
}): RackPricingImpact {
  const oldNights = Math.max(1, block.nights)
  const newNights = nightsBetween(newCheckIn, newCheckOut)
  const oldNightlyRate = Number(block.rate ?? 0)
  const newNightlyRate = Number(targetRoom?.base_rate ?? oldNightlyRate ?? 0)
  const discountPercentage = Number(block.rate_plan_discount_percentage ?? 0)
  const oldTotal = roundMoney(Number(block.total_amount ?? 0))
  const newTotal = calculateRackStayTotal({
    nightlyRate: newNightlyRate,
    nights: newNights,
    discountPercentage,
  })

  return {
    oldTotal,
    newTotal,
    delta: roundMoney(newTotal - oldTotal),
    oldNightlyRate,
    newNightlyRate,
    oldNights,
    newNights,
    discountPercentage,
    targetRoomTypeId: targetRoom?.room_type_id ?? block.room_type_id,
    requiresReview:
      newTotal !== oldTotal ||
      newNightlyRate !== oldNightlyRate ||
      newNights !== oldNights ||
      (targetRoom?.room_type_id != null && targetRoom.room_type_id !== block.room_type_id),
  }
}

// Л.6. Правило передплати
// Фрагмент коду з файлу: lib/rules/prepayment.ts
// Призначення: визначає мінімальну передплату для підтвердження бронювання.
export const DEFAULT_PREPAYMENT_PERCENT = 10

export function requiredPrepayment(
  total: number,
  percent = DEFAULT_PREPAYMENT_PERCENT,
): number {
  if (!Number.isFinite(total) || total <= 0) return 0
  return Math.round(total * (percent / 100) * 100) / 100
}

export function isPrepaymentSatisfied(
  paid: number,
  total: number,
  percent = DEFAULT_PREPAYMENT_PERCENT,
): boolean {
  if (total <= 0) return true
  return paid >= requiredPrepayment(total, percent) - 0.01
}

export function remainingPrepayment(
  paid: number,
  total: number,
  percent = DEFAULT_PREPAYMENT_PERCENT,
): number {
  const need = requiredPrepayment(total, percent)
  return Math.max(0, Math.round((need - paid) * 100) / 100)
}

export function derivePaymentStatus(
  paid: number,
  total: number,
): "pending" | "partial" | "paid" {
  if (paid <= 0.01) return "pending"
  if (paid + 0.01 >= total) return "paid"
  return "partial"
}

export function shouldAutoConfirmAfterPayment(
  reservation: Pick<Reservation, "status" | "total_amount">,
  newPaidAmount: number,
  percent = DEFAULT_PREPAYMENT_PERCENT,
): boolean {
  return (
    reservation.status === "pending" &&
    isPrepaymentSatisfied(newPaidAmount, reservation.total_amount, percent)
  )
}

// Л.7. Облік оплат і повернень
// Фрагмент коду з файлу: lib/rules/payments.ts
// Призначення: рахує фактично проведені оплати з урахуванням повернень.
export function signedSettledPaymentAmount(payment: PaymentAmountInput): number {
  const amount = Number(payment.amount ?? 0)
  const transactionType =
    payment.transaction_type ?? (payment.payment_status === "refunded" ? "refund" : "payment")

  if (!Number.isFinite(amount)) return 0
  if (transactionType === "refund") {
    if (payment.payment_status !== "refunded") return 0
    return -Math.abs(amount)
  }
  if (payment.payment_status !== "paid" && payment.payment_status !== "partial") {
    return 0
  }

  return amount
}

export function settledPaymentTotal(payments: PaymentAmountInput[]): number {
  return Math.round(
    payments.reduce((sum, payment) => sum + signedSettledPaymentAmount(payment), 0) * 100,
  ) / 100
}

export function paymentFinancialSummary(payments: PaymentAmountInput[]) {
  let paidPayments = 0
  let completedRefunds = 0
  let pendingPayments = 0
  let pendingRefunds = 0

  for (const payment of payments) {
    const amount = Number(payment.amount ?? 0)
    if (!Number.isFinite(amount)) continue

    const transactionType =
      payment.transaction_type ?? (payment.payment_status === "refunded" ? "refund" : "payment")

    if (transactionType === "refund") {
      if (payment.payment_status === "refunded") completedRefunds += Math.abs(amount)
      if (payment.payment_status === "pending") pendingRefunds += Math.abs(amount)
      continue
    }

    if (payment.payment_status === "paid" || payment.payment_status === "partial") {
      paidPayments += amount
    }
    if (payment.payment_status === "pending") pendingPayments += amount
  }

  return {
    paidPayments: Math.round(paidPayments * 100) / 100,
    completedRefunds: Math.round(completedRefunds * 100) / 100,
    pendingPayments: Math.round(pendingPayments * 100) / 100,
    pendingRefunds: Math.round(pendingRefunds * 100) / 100,
    netPaid: Math.round((paidPayments - completedRefunds) * 100) / 100,
  }
}

// Л.8. Перевірки перед заселенням гостя
// Фрагмент коду з файлу: components/front-desk/check-in-form.tsx
// Призначення: перевіряє передплату, номер, дати та статус бронювання.
const payments: Array<{ amount: number; payment_status?: string }> =
  reservation.payments ?? []
const totalPaid = settledPaymentTotal(payments)
const total = Number(reservation.total_amount || 0)
const prepaymentRequired = hotelSettings.prepayment_required
const needPrepayment = prepaymentRequired
  ? requiredPrepayment(total, hotelSettings.prepayment_percent)
  : 0
const remaining = prepaymentRequired
  ? remainingPrepayment(totalPaid, total, hotelSettings.prepayment_percent)
  : 0
const prepaymentOK =
  !prepaymentRequired ||
  isPrepaymentSatisfied(totalPaid, total, hotelSettings.prepayment_percent)

const transitionAllowed = canTransitionReservation(reservation.status, "checked_in")
const todayKey = todayDateKey()
const plannedCheckInKey = String(reservation.check_in_date).slice(0, 10)
const plannedCheckOutKey = String(reservation.check_out_date).slice(0, 10)
const isEarlyCheckIn = todayKey < plannedCheckInKey
const reservationPeriodExpired = todayKey >= plannedCheckOutKey

const effectivePrepayAfterInput = totalPaid + Math.max(0, Number(prepayAmount || 0))
const willSatisfyPrepayment =
  !prepaymentRequired ||
  isPrepaymentSatisfied(effectivePrepayAfterInput, total, hotelSettings.prepayment_percent)

const room = hasAssignedRoom
  ? assignedRoom
  : availableRooms.find((r) => r.id === selectedRoomId) ?? null

const roomReady = room ? isRoomStateReadyForCheckIn(room) : false

const canSubmit =
  !isLoading &&
  transitionAllowed &&
  !reservationPeriodExpired &&
  Boolean(room) &&
  roomReady &&
  willSatisfyPrepayment &&
  !paymentTooHigh &&
  (!isEarlyCheckIn || earlyCheckInConfirmed)

// Метод виконує повторну перевірку номера і платежів перед зміною статусу.
const handleCheckIn = async () => {
  setError(null)

  if (!room || !transitionAllowed || reservationPeriodExpired || !roomReady) {
    setError("Заселення неможливе: перевірте статус бронювання, номер і дати.")
    return
  }

  setIsLoading(true)
  try {
    const supabase = createClient()
    const nowIso = new Date().toISOString()

    const { data: freshRoom, error: roomFetchErr } = await supabase
      .from("rooms")
      .select("id, status, room_number, occupancy_status, housekeeping_status, operational_status")
      .eq("id", room.id)
      .single()

    if (roomFetchErr || !freshRoom || !isRoomStateReadyForCheckIn(freshRoom)) {
      throw new Error("Номер більше не готовий до заселення.")
    }

    if (!hasAssignedRoom) {
      const perNight = total / (nightsBetween(reservation.check_in_date, reserva-tion.check_out_date) || 1)
      const { error: rrErr } = await supabase.from("reservation_rooms").insert({
        reservation_id: reservation.id,
        room_id: room.id,
        room_type_id: room.room_type_id,
        rate: perNight,
        check_in_time: `${plannedCheckInKey}T${hotelSettings.default_checkin_time}:00`,
        check_out_time: `${plannedCheckOutKey}T${hotelSettings.default_checkout_time}:00`,
        actual_check_in: nowIso,
      })
      if (rrErr) throw rrErr
    }

    const extra = Number.parseFloat(prepayAmount || "0")
    if (Number.isFinite(extra) && extra > 0) {
      const { error: payErr } = await supabase.from("payments").insert({
        reservation_id: reservation.id,
        amount: extra,
        payment_method: paymentMethod,
        payment_status: "paid",
      })
      if (payErr) throw payErr
    }

    const { data: freshPayments } = await supabase
      .from("payments")
      .select("amount, payment_status")
      .eq("reservation_id", reservation.id)

    const freshPaid = settledPaymentTotal(freshPayments || [])
    if (prepaymentRequired && !isPrepaymentSatisfied(freshPaid, total, hotelSet-tings.prepayment_percent)) {
      throw new Error("Недостатньо передплати для заселення.")
    }

    const { error: resErr } = await supabase
      .from("reservations")
      .update({ status: "checked_in", room_id: room.id })
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

// Л.9. Перевірки перед виселенням гостя
// Фрагмент коду з файлу: components/front-desk/check-out-form.tsx
// Призначення: не дозволяє виселення з боргом або неповерненою переплатою.
const checkoutPayments = reservation.payments ?? []
const checkoutTotalPaid = settledPaymentTotal(checkoutPayments)

const originalTotal = Number(reservation.total_amount || 0)
const plannedNights = nightsBetween(reservation.check_in_date, reservation.check_out_date) || 1
const plannedCheckOutKey = String(reservation.check_out_date).slice(0, 10)
const isEarlyCheckOut = todayKey < plannedCheckOutKey
const actualStayNights = isEarlyCheckOut
  ? nightsBetween(reservation.check_in_date, todayKey) || 1
  : plannedNights
const nightlyRate = Number(reservationRoom?.rate || 0) || originalTotal / plannedNights
const checkoutTotal = isEarlyCheckOut
  ? Math.min(originalTotal, roundMoney(nightlyRate * actualStayNights))
  : originalTotal
const baseBalance = Math.max(0, roundMoney(checkoutTotal - checkoutTotalPaid))
const overpaidAmount = Math.max(0, roundMoney(checkoutTotalPaid - checkoutTotal))
const needsRefund = overpaidAmount > 0.01

const effectivePayNow = Math.max(0, Number(paymentAmount || 0))
const projectedBalance = Math.max(0, baseBalance - effectivePayNow)
const paymentTooHigh = Math.max(0, roundMoney(effectivePayNow - baseBalance)) > 0.01
const checkoutTransitionAllowed = canTransitionReservation(reservation.status, "checked_out")
const paidInFull = projectedBalance <= 0.01

const canCheckOutSubmit =
  !isLoading &&
  checkoutTransitionAllowed &&
  paidInFull &&
  !paymentTooHigh &&
  !needsRefund &&
  (!isEarlyCheckOut || earlyCheckOutConfirmed)

// Метод перед check-out повторно читає платежі з бази, щоб уникнути
// виселення з непогашеним балансом або переплатою.
const handleCheckOut = async () => {
  setError(null)

  if (!checkoutTransitionAllowed || !paidInFull || needsRefund || paymentTooHigh) {
    setError("Check-out неможливий: перевірте статус, оплату та повернення.")
    return
  }

  setIsLoading(true)
  try {
    const supabase = createClient()

    if (effectivePayNow > 0) {
      const { error: payErr } = await supabase.from("payments").insert({
        reservation_id: reservation.id,
        amount: effectivePayNow,
        payment_method: paymentMethod,
        payment_status: "paid",
      })
      if (payErr) throw payErr
    }

    const { data: freshPayments } = await supabase
      .from("payments")
      .select("amount, payment_status, transaction_type")
      .eq("reservation_id", reservation.id)

    const freshPaid = settledPaymentTotal(freshPayments || [])
    const freshBalance = roundMoney(checkoutTotal - freshPaid)
    const freshOverpaid = Math.max(0, roundMoney(freshPaid - checkoutTotal))

    if (freshBalance > 0.01) throw new Error("Залишок не погашено.")
    if (freshOverpaid > 0.01) throw new Error("Залишилась сума до повернення.")

    if (isEarlyCheckOut) {
      const { error: rrPeriodErr } = await supabase
        .from("reservation_rooms")
        .update({ check_out_time: `${todayKey}T00:00:00` })
        .eq("reservation_id", reservation.id)
      if (rrPeriodErr) throw rrPeriodErr
    }

    const { error: resErr } = await supabase
      .from("reservations")
      .update(
        isEarlyCheckOut
          ? { status: "checked_out", check_out_date: todayKey, total_amount: checkoutTotal }
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

// Л.10. Серверний рендер шахматки номерів
// Фрагмент коду з файлу: app/dashboard/room-rack/page.tsx
// Призначення: завантажує номери та бронювання, формує блоки календаря.
export default async function RoomRackPage() {
  const supabase = await createClient()

  const { data: roomsData } = await supabase
    .from("rooms")
    .select(
      `
      id, room_number, floor, status, occupancy_status, housekeeping_status,
      operational_status, room_type_id, notes,
      room_types ( id, name, code, base_rate, max_occupancy )
    `,
    )
    .order("room_number", { ascending: true })

  const nowIso = new Date().toISOString().split("T")[0]
  const pastWindow = new Date()
  pastWindow.setDate(pastWindow.getDate() - 60)
  const futureWindow = new Date()
  futureWindow.setDate(futureWindow.getDate() + 180)

  const { data: resvData } = await supabase
    .from("reservations")
    .select(
      `
      id, reservation_number, check_in_date, check_out_date, status,
      total_amount, paid_amount, adults, children, special_requests,
      rate_plans ( discount_percentage ),
      guests ( id, first_name, last_name, email, phone, is_vip ),
      reservation_rooms ( id, room_id, moved_from_room_id, room_type_id, rate )
    `,
    )
    .gte("check_out_date", pastWindow.toISOString().split("T")[0])
    .lte("check_in_date", futureWindow.toISOString().split("T")[0])
    .in("status", ["pending", "confirmed", "checked_in", "checked_out", "cancelled", "no_show"])

  const rooms: RackRoom[] = (roomsData || []).map((r: any) => ({
    id: r.id,
    room_number: r.room_number,
    floor: r.floor,
    status: r.status,
    occupancy_status: r.occupancy_status,
    housekeeping_status: r.housekeeping_status,
    operational_status: r.operational_status,
    room_type_id: r.room_type_id,
    room_type_name: r.room_types?.name ?? "—",
    base_rate: r.room_types?.base_rate ? Number(r.room_types.base_rate) : undefined,
  }))

  const blocks: RackBlock[] = []
  for (const res of resvData || []) {
    const r = res as any
    for (const rr of r.reservation_rooms || []) {
      const paid = Number(r.paid_amount || 0)
      const total = Number(r.total_amount || 0)
      blocks.push({
        reservation_room_id: rr.id,
        reservation_id: r.id,
        reservation_number: r.reservation_number,
        room_id: rr.room_id,
        room_type_id: rr.room_type_id,
        guest: {
          id: r.guests?.id,
          first_name: r.guests?.first_name ?? "—",
          last_name: r.guests?.last_name ?? "",
          is_vip: !!r.guests?.is_vip,
        },
        check_in: r.check_in_date,
        check_out: r.check_out_date,
        status: r.status,
        payment_status: paid >= total && total > 0 ? "paid" : paid > 0 ? "partial" : "pending",
        total_amount: total,
        paid_amount: paid,
        balance: total - paid,
        rate: rr.rate ? Number(rr.rate) : undefined,
      })
    }
  }

  return <RoomRackClient rooms={rooms} blocks={blocks} today={nowIso} />
}

// Л.11. Серверний рендер сторінки господарської служби
// Фрагмент коду з файлу: app/dashboard/housekeeping/page.tsx
// Призначення: перевіряє користувача та передає кімнати/персонал клієнту.
export default async function HousekeepingPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()
  if (!profile) redirect("/login")

  const { data: rooms } = await supabase
    .from("rooms")
    .select("*, room_type:room_types(name)")
    .order("room_number")

  const { data: staff } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role")
    .in("role", ["housekeeping_staff", "housekeeping_supervisor"])
    .eq("is_active", true)

  return (
    <HousekeepingClient
      profile={profile}
      initialRooms={rooms || []}
      initialStaff={staff || []}
    />
  )
}

// Л.12. Поведінка задач господарської служби
// Фрагмент коду з файлу: components/housekeeping/housekeeping-client.tsx
// Призначення: фільтрує номери, формує активні задачі та змінює їх статуси.
const filteredRooms = allRooms.filter((room) => {
  if (search && !room.room_number.toLowerCase().includes(search.toLowerCase())) return false
  if (floorFilter !== "all" && room.floor !== Number(floorFilter)) return false
  if (statusFilter !== "all" && room.housekeeping_status !== statusFilter) return false
  return true
})

const isArchivedTask = (task: HKTask) =>
  (ARCHIVED_HOUSEKEEPING_STATUSES as readonly string[]).includes(task.status) ||
  (task.status === "completed" && isHousekeepingInspectionTask(task.task_type))

const activeTasks = allTasks.filter((t) =>
  (ACTIVE_HOUSEKEEPING_STATUSES as readonly string[]).includes(t.status) &&
  !isArchivedTask(t)
)

const visibleActiveTasks = isSupervisor
  ? activeTasks
  : activeTasks.filter((t) => t.assigned_to === profile.id || !t.assigned_to)

const roomsByFloor = filteredRooms.reduce(
  (acc, room) => {
    if (!acc[room.floor]) acc[room.floor] = []
    acc[room.floor].push(room)
    return acc
  },
  {} as Record<number, Room[]>,
)

const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
  const supabase = createClient()
  const task = allTasks.find((t) => t.id === taskId)
  const taskType = task?.task_type ?? ""
  const resolvedStatus =
    newStatus === "completed" && isHousekeepingInspectionTask(taskType)
      ? "inspected"
      : newStatus

  const updateData: Record<string, string | null> = { status: resolvedStatus }
  if (newStatus === "completed") updateData.completed_at = new Date().toISOString()
  if (newStatus === "in_progress") {
    updateData.started_at = new Date().toISOString()
    if (!task?.assigned_to) updateData.assigned_to = profile.id
  }

  await supabase.from("housekeeping_tasks").update(updateData).eq("id", taskId)
  mutateTasks()
  mutateRooms()
}

const handleCreateTask = async () => {
  if (!newTaskRoomId) return
  setSaving(true)
  const supabase = createClient()
  const staffId = newTaskStaff === "none" ? null : newTaskStaff || null

  await supabase.from("housekeeping_tasks").insert({
    room_id: newTaskRoomId,
    task_type: newTaskType,
    priority: newTaskPriority,
    status: staffId ? "assigned" : "pending",
    notes: newTaskNotes || null,
    assigned_to: staffId,
    scheduled_date: new Date().toISOString().split("T")[0],
  })

  setSaving(false)
  mutateTasks()
  mutateRooms()
}

// Л.13. Серверний рендер сторінки технічної служби
// Фрагмент коду з файлу: app/dashboard/maintenance/page.tsx
// Призначення: завантажує профіль, номери і працівників технічної служби.
export default async function MaintenancePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()
  if (!profile) redirect("/login")

  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, room_number, floor")
    .order("room_number")

  const { data: staff } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role")
    .eq("role", "maintenance_staff")
    .eq("is_active", true)

  return (
    <MaintenanceClient
      profile={profile}
      initialRooms={rooms || []}
      initialStaff={staff || []}
    />
  )
}

// Л.14. Поведінка заявок технічної служби
// Фрагмент коду з файлу: components/maintenance/maintenance-client.tsx
// Призначення: створює, фільтрує, призначає і закриває заявки.
const filteredRequests = allRequests.filter((r) => {
  if (statusFilter === "active" && (r.status === "completed" || r.status === "cancelled")) return false
  if (statusFilter !== "active" && statusFilter !== "all" && r.status !== statusFilter) return false
  if (priorityFilter !== "all" && r.priority !== priorityFilter) return false
  if (categoryFilter !== "all" && r.category !== categoryFilter) return false
  if (
    search &&
    !r.description.toLowerCase().includes(search.toLowerCase()) &&
    !r.rooms?.room_number?.toLowerCase().includes(search.toLowerCase()) &&
    !r.request_number?.toLowerCase().includes(search.toLowerCase()) &&
    !r.category.toLowerCase().includes(search.toLowerCase())
  )
    return false
  return true
})

const pendingCount = allRequests.filter((r) => r.status === "pending").length
const inProgressCount = allRequests.filter((r) => r.status === "in_progress").length
const urgentCount = allRequests.filter(
  (r) =>
    (r.priority === "urgent" || r.priority === "high") &&
    r.status !== "completed" &&
    r.status !== "cancelled",
).length

const handleStatusChange = async (id: string, newStatus: string) => {
  setUpdatingId(id)
  const supabase = createClient()
  const updateData: Record<string, string | null> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  }

  if (newStatus === "in_progress") {
    updateData.started_at = new Date().toISOString()
    const req = allRequests.find((r) => r.id === id)
    if (!req?.assigned_to) {
      updateData.assigned_to = profile.id
      updateData.assigned_at = new Date().toISOString()
    }
  }
  if (newStatus === "completed") {
    updateData.completed_at = new Date().toISOString()
  }

  await supabase.from("maintenance_requests").update(updateData).eq("id", id)
  setUpdatingId(null)
  mutate()
}

const handleCreate = async () => {
  if (!newDesc.trim()) return
  setSaving(true)
  const supabase = createClient()
  const staffId = newStaff === "none" || !newStaff ? null : newStaff
  const roomId = newRoomId === "none" || !newRoomId ? null : newRoomId
  const reqNum = `MR-${Date.now().toString(36).toUpperCase()}`

  await supabase.from("maintenance_requests").insert({
    request_number: reqNum,
    room_id: roomId,
    description: newDesc,
    category: newCategory,
    priority: newPriority,
    status: staffId ? "in_progress" : "pending",
    assigned_to: staffId,
    assigned_at: staffId ? new Date().toISOString() : null,
    reported_by: profile.id,
    reported_at: new Date().toISOString(),
  })

  setSaving(false)
  mutate()
}

// Л.15. Серверний рендер сторінки звітів
// Фрагмент коду з файлу: app/dashboard/reports/page.tsx
// Призначення: перевіряє користувача і передає початкові дані для звітів.
export default async function ReportsPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: rooms }, { data: profile }] = await Promise.all([
    supabase.from("rooms").select("id, status, room_type_id"),
    supabase.from("profiles").select("first_name, last_name, role").eq("id", user.id).single(),
  ])

  return (
    <ReportsClient
      totalRooms={rooms?.length ?? 0}
      preparedBy={{
        name: profile ? `${profile.first_name} ${profile.last_name}`.trim() : user.email ?? "Користувач",
        role: profile?.role ?? null,
      }}
      generatedAt={new Date().toISOString()}
    />
  )
}

// Л.16. Поведінка модуля звітів
// Фрагмент коду з файлу: components/reports/reports-client.tsx
// Призначення: формує період, шаблон звіту, метрики та табличні рядки.
type PeriodPreset = "day" | "week" | "month" | "quarter" | "year" | "custom"
type ReportTemplate =
  | "manager"
  | "forecast"
  | "arrivals"
  | "departures"
  | "in_house"
  | "room_categories"
  | "revenue"
  | "reservations"
  | "folios"
  | "cancellations"

const REPORT_TEMPLATES: Record<
  ReportTemplate,
  { title: string; shortTitle: string; description: string }
> = {
  manager: {
    title: "Звіт менеджера",
    shortTitle: "Менеджер",
    description: "Основні показники готелю за обраний період.",
  },
  forecast: {
    title: "Прогноз завантаженості",
    shortTitle: "Прогноз",
    description: "Щоденна завантаженість, заїзди, виїзди та плановий дохід.",
  },
  arrivals: {
    title: "Список гостей, що прибувають",
    shortTitle: "Прибуття",
    description: "Операційний список заїздів із номерами та оплатами.",
  },
  departures: {
    title: "Список гостей, що виїжджають",
    shortTitle: "Виїзди",
    description: "Операційний список виїздів із балансом.",
  },
  in_house: {
    title: "Реєстр проживання гостей",
    shortTitle: "Проживають",
    description: "Гості, чиє проживання перетинається з обраним періодом.",
  },
  room_categories: {
    title: "Завантаженість за категоріями номерів",
    shortTitle: "Категорії",
    description: "Продані ночі та дохід за категоріями номерів.",
  },
  revenue: {
    title: "Звіт про дохід",
    shortTitle: "Дохід",
    description: "Платежі, повернення і структура оплат.",
  },
  reservations: {
    title: "Звіт бронювань",
    shortTitle: "Бронювання",
    description: "Статуси, канали та вартість бронювань.",
  },
  folios: {
    title: "Звіт рахунків",
    shortTitle: "Folio",
    description: "Відкриті рахунки, баланси та заборгованість.",
  },
  cancellations: {
    title: "Скасування та no-show",
    shortTitle: "Скасування",
    description: "Аналіз скасованих бронювань і незаїздів.",
  },
}

const range = useMemo(() => {
  if (periodPreset === "custom") {
    return { from: startOfDay(customRange.from), to: endOfDay(customRange.to) }
  }

  const today = new Date()
  if (periodPreset === "day") return { from: startOfDay(today), to: endOfDay(today) }
  if (periodPreset === "week") return { from: startOfWeek(today), to: endOfWeek(today) }
  if (periodPreset === "month") return { from: startOfMonth(today), to: endOfMonth(today) }
  if (periodPreset === "year") return { from: startOfYear(today), to: endOfYear(today) }

  return { from: startOfMonth(today), to: endOfMonth(today) }
}, [periodPreset, customRange])

const metrics = useMemo(
  () =>
    calculateReportMetrics({
      reservations: filteredReservations,
      payments: filteredPayments,
      rooms,
      totalRooms,
      range,
    }),
  [filteredReservations, filteredPayments, rooms, totalRooms, range],
)

const arrivals = useMemo(
  () =>
    filteredReservations.filter((reservation) =>
      reservationOverlapsPeriod(reservation.check_in_date, reservation.check_in_date, range.from, range.to),
    ),
  [filteredReservations, range],
)

const departures = useMemo(
  () =>
    filteredReservations.filter((reservation) =>
      reservationOverlapsPeriod(reservation.check_out_date, reservation.check_out_date, range.from, range.to),
    ),
  [filteredReservations, range],
)

const forecastRows = useMemo(() => {
  return eachDayOfInterval({ start: range.from, end: range.to }).map((date) => {
    const dayReservations = filteredReservations.filter((reservation) =>
      reservationOccupiesDate(reservation, date),
    )

    return {
      date,
      occupiedRooms: dayReservations.reduce(
        (sum, reservation) => sum + reservationRoomCount(reservation),
        0,
      ),
      guests: dayReservations.reduce(
        (sum, reservation) => sum + reservationPeopleCount(reservation),
        0,
      ),
      revenue: dayReservations.reduce(
        (sum, reservation) => sum + proratedRoomRevenue(reservation, date),
        0,
      ),
    }
  })
}, [filteredReservations, range])

// Л.17. Фільтрація універсальної таблиці
// Фрагмент коду з файлу: components/data-table/table-logic.ts
// Призначення: підключає пошук, числові фільтри і smart defaults колонок.
export const textFilter = (row: any, columnId: string, filterValue: unknown) => {
  const filter =
    typeof filterValue === "object" && filterValue !== null
      ? (filterValue as TextFilterValue)
      : { operator: "contains", value: String(filterValue ?? "") }
  const query = String(filter.value ?? "").trim().toLocaleLowerCase("uk")

  if (!query) return true

  const value = String(row.getValue(columnId) ?? "").toLocaleLowerCase("uk")
  if (filter.operator === "startsWith") return value.startsWith(query)
  if (filter.operator === "equals") return value === query
  return value.includes(query)
}

export const numberFilter = (row: any, columnId: string, filterValue: unknown) => {
  const filter = filterValue as NumberFilterValue | undefined
  const value = Number(row.getValue(columnId))

  if (!filter || Number.isNaN(value)) return true

  const mainValue = Number(filter.value)
  const minValue = Number(filter.min)
  const maxValue = Number(filter.max)

  if (filter.operator === "between") {
    if (filter.min && value < minValue) return false
    if (filter.max && value > maxValue) return false
    return Boolean(filter.min || filter.max)
  }

  if (!filter.value) return true
  if (filter.operator === "equals") return value === mainValue
  if (filter.operator === "greaterThan") return value > mainValue
  if (filter.operator === "lessThan") return value < mainValue

  return true
}

export function getColumnFilterFn<TData, TValue>(column: ColumnDef<TData, TValue>) {
  if (column.filterFn) return column.filterFn
  if (column.meta?.filterType === "checkbox") return checkboxFilter
  if (column.meta?.filterType === "search") return textFilter
  if (column.meta?.filterType === "number") return numberFilter
  if (column.meta?.filterType === "dateRange") return dateRangeFilter
  return undefined
}

export function applySmartColumnDefaults<TData, TValue>(
  columns: ColumnDef<TData, TValue>[],
): ColumnDef<TData, TValue>[] {
  return columns.map((column) => {
    const columnWithDefaults = {
      ...column,
      enableSorting: column.meta?.sortable === true,
      enableColumnFilter: column.meta?.filterable === true,
      enableGlobalFilter: column.meta?.searchable === true,
      filterFn: getColumnFilterFn(column),
    } as ColumnDef<TData, TValue> & { columns?: ColumnDef<TData, TValue>[] }

    if ("columns" in column && column.columns) {
      columnWithDefaults.columns = applySmartColumnDefaults(column.columns)
    }

    return columnWithDefaults
  })
}

// Л.18. Нормалізація значень фільтрів
// Фрагмент коду з файлу: components/data-table/filter-utils.ts
// Призначення: однаково обробляє порожні значення у таблицях.
export const EMPTY_FILTER_VALUE = "__data_table_empty__"
export const EMPTY_FILTER_LABEL = "(Пусто)"

export function normalizeFilterValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return EMPTY_FILTER_VALUE
  }

  return String(value)
}

export function getFilterLabel(
  value: string,
  labels?: Record<string, string>,
) {
  if (value === EMPTY_FILTER_VALUE) {
    return EMPTY_FILTER_LABEL
  }

  return labels?.[value] ?? value
}

// Л.19. Захищений макет панелі керування
// Фрагмент коду з файлу: app/dashboard/layout.tsx
// Призначення: перевіряє авторизацію, активність профілю та рендерить спільну навігацію для всіх сторінок // dashboard.

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) {
      redirect("/login")
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single()

    if (!profile || !profile.is_active) {
      redirect("/login")
    }

    const cookieStore = await cookies()
    const defaultSidebarOpen = cookieStore.get("sidebar_state")?.value !== "false"

    return (
      <SidebarProvider defaultOpen={defaultSidebarOpen} className="bg-slate-50">
        <DashboardNav role={profile.role} />
        <SidebarInset className="bg-slate-50">
          <DashboardHeader user={profile} />
          <main className="min-w-0 flex-1 p-6 md:p-8">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    )
  } catch {
    redirect("/login")
  }
}

// ---------------------------------------------------------------------
// Л.20. Вибір головного дашборду за роллю користувача
// Фрагмент коду з файлу: app/dashboard/page.tsx
// Призначення: після входу відкриває робочу область відповідно до ролі.
// ---------------------------------------------------------------------

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single()

  if (!profile) {
    redirect("/login")
  }

  switch (profile.role) {
    case "front_desk_agent":
    case "front_desk_manager":
      return <FrontDeskDashboard profile={profile} />

    case "housekeeping_supervisor":
    case "housekeeping_staff":
      return <HousekeepingDashboard profile={profile} />

    case "accountant":
      return <AccountantDashboard profile={profile} />

    case "general_manager":
      return <ManagerDashboard profile={profile} />

    case "maintenance_manager":
    case "maintenance_staff":
      return <MaintenanceDashboard profile={profile} />

    case "system_administrator":
      return <AdminDashboard profile={profile} />

    default:
      return <FrontDeskDashboard profile={profile} />
  }
}

// Л.21. Валідація даних користувача і гостя
// Фрагмент коду з файлу: lib/validation.ts
// Призначення: нормалізує телефон, email, паспортні дані та перевіряє пароль.
export const UA_PHONE_PREFIX = "+380"
export const UA_PHONE_NATIONAL_LENGTH = 9

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
const PERSON_NAME_RE = /^[A-Za-zА-Яа-яІіЇїЄєҐґ'ʼ -]{2,}$/
const UKRAINIAN_PASSPORT_NUMBER_RE = /^[А-ЯІЇЄҐ]{2}\d{6}$/
const UKRAINIAN_ID_CARD_NUMBER_RE = /^\d{9}$/
const PASSWORD_SPECIAL_CHARS = "!@#$%"

const LATIN_TO_CYRILLIC_PASSPORT_LETTERS: Record<string, string> = {
  A: "А",
  B: "В",
  C: "С",
  E: "Е",
  H: "Н",
  I: "І",
  K: "К",
  M: "М",
  O: "О",
  P: "Р",
  T: "Т",
  X: "Х",
}

export function getUaPhoneNationalDigits(value: string) {
  const digits = value.replace(/\D/g, "")

  if (digits.startsWith("380")) {
    return digits.slice(3, 3 + UA_PHONE_NATIONAL_LENGTH)
  }

  if (digits.startsWith("0")) {
    return digits.slice(1, 1 + UA_PHONE_NATIONAL_LENGTH)
  }

  return digits.slice(0, UA_PHONE_NATIONAL_LENGTH)
}

export function formatUaPhone(value: string) {
  const nationalDigits = getUaPhoneNationalDigits(value)
  const operatorCode = nationalDigits.slice(0, 2)
  const firstPart = nationalDigits.slice(2, 5)
  const secondPart = nationalDigits.slice(5, 7)
  const thirdPart = nationalDigits.slice(7, 9)

  let formatted = `${UA_PHONE_PREFIX} (`
  if (operatorCode) formatted += operatorCode
  if (operatorCode.length === 2) formatted += ") "
  if (firstPart) formatted += firstPart
  if (firstPart.length === 3) formatted += "-"
  if (secondPart) formatted += secondPart
  if (secondPart.length === 2) formatted += "-"
  if (thirdPart) formatted += thirdPart

  return formatted
}

export function isValidUaPhone(value: string) {
  return getUaPhoneNationalDigits(value).length === UA_PHONE_NATIONAL_LENGTH
}

export function isValidEmail(value: string) {
  return !value || EMAIL_RE.test(value)
}

export function isValidPersonName(value: string) {
  return PERSON_NAME_RE.test(value.trim())
}

export function formatUkrainianPassportNumber(value: string) {
  const normalized = value
    .toUpperCase()
    .split("")
    .map((character) => LATIN_TO_CYRILLIC_PASSPORT_LETTERS[character] ?? character)
    .join("")
  const series = normalized.replace(/[^А-ЯІЇЄҐ]/g, "").slice(0, 2)
  const number = normalized.replace(/\D/g, "").slice(0, 6)

  return `${series}${number}`
}

export function isValidUkrainianPassportNumber(value: string) {
  return UKRAINIAN_PASSPORT_NUMBER_RE.test(value)
}

export function isValidUkrainianIdCardNumber(value: string) {
  return UKRAINIAN_ID_CARD_NUMBER_RE.test(value)
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = []
  let score = 0

  if (password.length >= 8) score += 1
  else errors.push("Мінімум 8 символів.")

  if (/[a-zа-яіїєґ]/.test(password)) score += 1
  else errors.push("Додайте малу літеру.")

  if (/[A-ZА-ЯІЇЄҐ]/.test(password)) score += 1
  else errors.push("Додайте велику літеру.")

  if (/\d/.test(password)) score += 1
  else errors.push("Додайте цифру.")

  if (/[!@#$%]/.test(password)) score += 1
  else errors.push("Додайте спецсимвол: ! @ # $ %.")

  return {
    isValid: errors.length === 0,
    score,
    label: score <= 2 ? "Слабкий пароль" : score <= 4 ? "Середній пароль" : "Сильний пароль",
    errors,
  }
}

// Л.22. Серверне узгодження станів номерів із задачами служб
// Фрагмент коду з файлу: scripts/029_service_room_state_consistency.sql
// Призначення: база даних автоматично змінює стани номера після зміни задач господарської або технічної // служби.
CREATE OR REPLACE FUNCTION public.trg_housekeeping_tasks_room_side_effects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.room_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.status IS NOT DISTINCT FROM NEW.status
     AND OLD.room_id IS NOT DISTINCT FROM NEW.room_id
     AND OLD.task_type IS NOT DISTINCT FROM NEW.task_type THEN
    RETURN NEW;
  END IF;

  IF NEW.status::text IN ('pending', 'assigned') THEN
    IF NEW.task_type <> 'inspection' THEN
      UPDATE public.rooms
      SET housekeeping_status = 'dirty'::public.room_housekeeping_status
      WHERE id = NEW.room_id;
    END IF;
  ELSIF NEW.status::text = 'in_progress' THEN
    UPDATE public.rooms
    SET housekeeping_status = CASE
      WHEN NEW.task_type = 'inspection'
        THEN 'inspecting'::public.room_housekeeping_status
      ELSE 'cleaning'::public.room_housekeeping_status
    END
    WHERE id = NEW.room_id;
    NEW.started_at := COALESCE(NEW.started_at, now());
  ELSIF NEW.status::text = 'completed' THEN
    UPDATE public.rooms
    SET housekeeping_status = CASE
      WHEN NEW.task_type = 'inspection'
        THEN 'inspected'::public.room_housekeeping_status
      ELSE 'inspecting'::public.room_housekeeping_status
    END
    WHERE id = NEW.room_id;
    NEW.completed_at := COALESCE(NEW.completed_at, now());
  ELSIF NEW.status::text = 'inspected' THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Housekeeping inspection requires an authenticated inspector'
        USING ERRCODE = '42501';
    END IF;

    UPDATE public.rooms
    SET housekeeping_status = 'inspected'::public.room_housekeeping_status
    WHERE id = NEW.room_id;
    NEW.completed_at := COALESCE(NEW.completed_at, now());
    NEW.inspected_at := COALESCE(NEW.inspected_at, now());
    NEW.inspected_by := COALESCE(NEW.inspected_by, auth.uid());
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_housekeeping_tasks_room_side_effects
  BEFORE INSERT OR UPDATE OF status, room_id, task_type
  ON public.housekeeping_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_housekeeping_tasks_room_side_effects();

CREATE OR REPLACE FUNCTION public.trg_maintenance_requests_room_side_effects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_was_room_blocking boolean := false;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_was_room_blocking :=
      OLD.priority IN ('high', 'urgent')
      AND OLD.status::text NOT IN ('completed', 'cancelled');
  END IF;

  IF NEW.room_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.priority IN ('high', 'urgent')
     AND NEW.status::text NOT IN ('completed', 'cancelled') THEN
    UPDATE public.rooms
    SET operational_status = 'maintenance'
    WHERE id = NEW.room_id;
  ELSIF v_was_room_blocking
        AND (
          NEW.status::text IN ('completed', 'cancelled')
          OR NEW.priority NOT IN ('high', 'urgent')
        )
        AND NOT EXISTS (
          SELECT 1
          FROM public.maintenance_requests mr
          WHERE mr.room_id = NEW.room_id
            AND mr.id IS DISTINCT FROM NEW.id
            AND mr.priority IN ('high', 'urgent')
            AND mr.status::text NOT IN ('completed', 'cancelled')
        ) THEN
    UPDATE public.rooms
    SET
      operational_status = 'operational'::public.room_operational_status,
      housekeeping_status = CASE
        WHEN NEW.status::text = 'completed'
          THEN 'dirty'::public.room_housekeeping_status
        ELSE housekeeping_status
      END
    WHERE id = NEW.room_id;
  ELSIF NEW.status::text = 'completed' THEN
    UPDATE public.rooms
    SET housekeeping_status = 'dirty'::public.room_housekeeping_status
    WHERE id = NEW.room_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_maintenance_requests_room_side_effects
  AFTER INSERT OR UPDATE OF priority, status, room_id
  ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_maintenance_requests_room_side_effects();

// Л.23. Форматування журналу аудиту
// Фрагмент коду з файлу: lib/audit-log.ts
// Призначення: перетворює технічні події системи на зрозумілі записи 
// журналу дій користувачів, бронювань, // платежів і номерного фонду.

export type AuditLogEntry = {
  id: string
  user_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  changes: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string | null
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  folio_closed: "Закрито рахунок гостя",
  folio_reopened: "Повторно відкрито рахунок гостя",
  reservation_dates_changed: "Змінено дати бронювання",
  reservation_auto_confirmed: "Автоматично підтверджено бронювання",
  reservation_cancelled: "Скасовано бронювання",
  reservation_no_show: "No-show бронювання",
  payment_created: "Створено платіж",
  payment_refunded: "Повернено платіж",
  payment_status_changed: "Змінено статус платежу",
  refund_completed: "Завершено повернення",
  INSERT: "Створено запис",
  UPDATE: "Оновлено запис",
  DELETE: "Видалено запис",
}

// Л.24. Нормалізація налаштувань готелю
// Фрагмент коду з файлу: lib/hotel-settings.ts
// Призначення: задає безпечні значення за замовчуванням для передплати, валюти, локалі та стандартного
// часу заїзду/виїзду.
export function normalizeHotelSettings(
  settings?: Partial<HotelSettings> | null,
): HotelSettings {
  return {
    ...DEFAULT_HOTEL_SETTINGS,
    ...settings,
    prepayment_required:
      settings?.prepayment_required ?? DEFAULT_HOTEL_SETTINGS.prepayment_required,
    prepayment_percent: Number(
      settings?.prepayment_percent ?? DEFAULT_HOTEL_SETTINGS.prepayment_percent,
    ),
    default_checkin_time: String(
      settings?.default_checkin_time ?? DEFAULT_HOTEL_SETTINGS.default_checkin_time,
    ).slice(0, 5),
    default_checkout_time: String(
      settings?.default_checkout_time ?? DEFAULT_HOTEL_SETTINGS.default_checkout_time,
    ).slice(0, 5),
    currency: String(settings?.currency ?? DEFAULT_HOTEL_SETTINGS.currency)
      .trim()
      .toUpperCase(),
    locale:
      String(settings?.locale ?? DEFAULT_HOTEL_SETTINGS.locale).trim() ||
      DEFAULT_HOTEL_SETTINGS.locale,
  }
}

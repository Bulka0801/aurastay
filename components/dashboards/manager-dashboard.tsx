import Link from "next/link"
import {
  BarChart3,
  BedDouble,
  DoorOpen,
  Percent,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import type { Profile } from "@/lib/types"
import { signedSettledPaymentAmount } from "@/lib/rules/payments"
import { DashboardMetricCard, DashboardPageHeader, DashboardQuickActions } from "./dashboard-primitives"
import { ManagerCharts } from "./manager-charts"
interface ManagerDashboardProps {
  profile: Profile
}

function formatMoneyUAH(value: number) {
  return new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: "UAH",
    maximumFractionDigits: 2,
  }).format(value)
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("uk-UA", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)
}

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export async function ManagerDashboard({ profile }: ManagerDashboardProps) {
  const supabase = await createClient()

  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Kiev",
  })

  /**
   * Номерний фонд
   * Для менеджерського дашборду зайнятість краще рахувати за статусом номерів,
   * а не за кількістю бронювань, бо завантаженість — це показник номерного фонду.
   */
  const { count: totalRooms } = await supabase
    .from("rooms")
    .select("*", { count: "exact", head: true })

  const { count: availableRooms } = await supabase
    .from("rooms")
    .select("*", { count: "exact", head: true })
    .eq("occupancy_status", "vacant")
    .eq("operational_status", "operational")
    .in("housekeeping_status", ["clean", "inspected"])

  const { count: occupiedRooms } = await supabase
    .from("rooms")
    .select("*", { count: "exact", head: true })
    .eq("occupancy_status", "occupied")

  const { count: dirtyRooms } = await supabase
    .from("rooms")
    .select("*", { count: "exact", head: true })
    .eq("housekeeping_status", "dirty")

  const { count: cleaningRooms } = await supabase
    .from("rooms")
    .select("*", { count: "exact", head: true })
    .eq("housekeeping_status", "cleaning")

  const { count: maintenanceRooms } = await supabase
    .from("rooms")
    .select("*", { count: "exact", head: true })
    .in("operational_status", ["maintenance", "out_of_order"])

  const { count: blockedRooms } = await supabase
    .from("rooms")
    .select("*", { count: "exact", head: true })
    .eq("operational_status", "blocked")

  const occupancy =
    totalRooms && totalRooms > 0
      ? ((occupiedRooms || 0) / totalRooms) * 100
      : 0

  /**
   * Реальна кількість гостей у готелі.
   * Це adults + children, а не кількість бронювань.
   */
  const { data: inHouseReservations } = await supabase
    .from("reservations")
    .select("id, adults, children")
    .eq("status", "checked_in")

  const inHouseAdults =
    inHouseReservations?.reduce(
      (sum, reservation) => sum + (reservation.adults || 0),
      0
    ) || 0

  const inHouseChildren =
    inHouseReservations?.reduce(
      (sum, reservation) => sum + (reservation.children || 0),
      0
    ) || 0

  const inHouseGuests = inHouseAdults + inHouseChildren

  /**
   * Дохід за сьогодні.
   * Для української PMS відображаємо гривню, не долар.
   */
  const { data: todayPayments } = await supabase
    .from("payments")
    .select("amount, payment_status")
    .gte("payment_date", `${today}T00:00:00`)
    .lt("payment_date", `${today}T23:59:59`)

  const todayRevenue =
    todayPayments?.reduce((sum, payment) => sum + signedSettledPaymentAmount(payment), 0) ||
    0

  /**
   * ADR та RevPAR.
   * Для MVP рахуємо на основі активних проживань.
   * Для production-рівня краще рахувати за закритими або фактично прожитими ночами
   * у звітному періоді.
   */
  const { data: checkedInReservations } = await supabase
    .from("reservations")
    .select("total_amount, check_in_date, check_out_date")
    .eq("status", "checked_in")

  let totalNights = 0
  let totalAccommodationRevenue = 0

  checkedInReservations?.forEach((reservation) => {
    const checkIn = new Date(reservation.check_in_date)
    const checkOut = new Date(reservation.check_out_date)

    const nights = Math.max(
      1,
      Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
      )
    )

    totalNights += nights
    totalAccommodationRevenue += Number(reservation.total_amount || 0)
  })

  const adr =
    totalNights > 0 ? totalAccommodationRevenue / totalNights : 0

  const revpar =
    totalRooms && totalRooms > 0
      ? totalAccommodationRevenue / totalRooms
      : 0

  /**
   * Дані для графіка стану номерного фонду.
   */
  const roomStatusData = [
    {
      name: "Готові",
      value: availableRooms || 0,
    },
    {
      name: "Зайняті",
      value: occupiedRooms || 0,
    },
    {
      name: "Потребують прибирання",
      value: dirtyRooms || 0,
    },
    {
      name: "Прибираються",
      value: cleaningRooms || 0,
    },
    {
      name: "У ремонті",
      value: maintenanceRooms || 0,
    },
    {
      name: "Заблоковані",
      value: blockedRooms || 0,
    },
  ]

  /**
   * Топ типів номерів.
   * MVP-підхід: отримуємо reservation_rooms і рахуємо типи в TypeScript.
   */
  const { data: reservationRoomsForTypes } = await supabase
    .from("reservation_rooms")
    .select(
      `
      rooms!reservation_rooms_room_id_fkey (
        room_type:room_types (
          name
        )
      )
    `
    )

  const roomTypeCounts = new Map<string, number>()

  reservationRoomsForTypes?.forEach((item) => {
    const room = firstRelation(item.rooms)
    const roomType = firstRelation(room?.room_type)
    const roomTypeName =
      roomType?.name || "Тип не вказано"

    roomTypeCounts.set(
      roomTypeName,
      (roomTypeCounts.get(roomTypeName) || 0) + 1
    )
  })

  const topRoomTypesData = Array.from(roomTypeCounts.entries())
    .map(([name, value]) => ({
      name,
      value,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  const freeRooms = Math.max(
    0,
    (totalRooms || 0) - (occupiedRooms || 0)
  )

  return (
    <div className="flex flex-col gap-6">
      <DashboardPageHeader
        title="Дашборд генерального менеджера"
        description={`Операційний і фінансовий огляд готелю на сьогодні, ${profile.first_name}.`}
        actions={
        <Button asChild>
          <Link href="/dashboard/reports">
            <BarChart3 className="mr-2 h-4 w-4" />
            Переглянути звіти
          </Link>
        </Button>
        }
      />

      {/* Ключові показники */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard
          title="Рівень завантаженості"
          value={`${formatPercent(occupancy)}%`}
          description={`Зайнято ${occupiedRooms || 0} з ${totalRooms || 0} номерів`}
          icon={Percent}
          tone="blue"
          href="/dashboard/room-rack"
        />
        <DashboardMetricCard
          title="Гості в готелі"
          value={inHouseGuests}
          description={`${inHouseAdults} дорослих · ${inHouseChildren} дітей`}
          icon={Users}
          tone="emerald"
          href="/dashboard/front-desk"
        />
        <DashboardMetricCard
          title="ADR"
          value={formatMoneyUAH(adr)}
          description="Середня добова ціна проживання"
          icon={Wallet}
          tone="amber"
          href="/dashboard/reports"
        />
        <DashboardMetricCard
          title="RevPAR"
          value={formatMoneyUAH(revpar)}
          description="Дохід на доступний номер"
          icon={TrendingUp}
          tone="slate"
          href="/dashboard/reports"
        />
      </div>

      {/* Аналітичні графіки */}
      <ManagerCharts
        roomStatusData={roomStatusData}
        topRoomTypesData={topRoomTypesData}
      />

      {/* Показники за сьогодні + швидкі дії */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Показники за сьогодні</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border bg-slate-50 p-4">
                <span className="text-sm font-medium text-slate-600">
                  Дохід за сьогодні
                </span>
                <span className="font-semibold text-slate-900">
                  {formatMoneyUAH(todayRevenue)}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-slate-50 p-4">
                <span className="text-sm font-medium text-slate-600">
                  Зайняті номери
                </span>
                <span className="font-semibold text-slate-900">
                  {occupiedRooms || 0}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-slate-50 p-4">
                <span className="text-sm font-medium text-slate-600">
                  Вільні номери
                </span>
                <span className="font-semibold text-slate-900">
                  {freeRooms}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-slate-50 p-4">
                <span className="text-sm font-medium text-slate-600">
                  Номерів у ремонті
                </span>
                <span className="font-semibold text-slate-900">
                  {maintenanceRooms || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <DashboardQuickActions
          actions={[
            { label: "Переглянути бронювання", href: "/dashboard/reservations", icon: Users },
            { label: "Фінансові звіти", href: "/dashboard/reports", icon: BarChart3 },
            { label: "Шахматка номерів", href: "/dashboard/room-rack", icon: DoorOpen },
            { label: "Номерний фонд", href: "/dashboard/rooms", icon: BedDouble },
          ]}
        />
      </div>
    </div>
  )
}

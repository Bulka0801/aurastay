import Link from "next/link";
import {
  AlertTriangle,
  Baby,
  BedDouble,
  CheckCircle2,
  Clock,
  LogIn,
  LogOut,
  Plus,
  Sparkles,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardAlertLink, DashboardMetricCard, DashboardPageHeader } from "@/components/dashboards/dashboard-primitives";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

interface FrontDeskDashboardProps {
  profile: Profile;
}

type OperationalAlert = {
  label: string;
  count: number;
  href: string;
  icon: typeof AlertTriangle;
  tone: "slate" | "blue" | "emerald" | "amber" | "red" | "indigo";
};

export async function FrontDeskDashboard({ profile }: FrontDeskDashboardProps) {
  const supabase = await createClient();

  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Kiev",
  });
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleDateString("en-CA", {
    timeZone: "Europe/Kiev",
  });

  /**
   * Списки для операційної роботи рецепції
   */
  const { data: arrivals } = await supabase
    .from("reservations")
    .select(
      `
      *,
      guests(first_name, last_name, email),
      reservation_rooms (
        room_id,
        rooms!reservation_rooms_room_id_fkey (
          room_number,
          room_type:room_types(name)
        )
      )
    `
    )
    .eq("check_in_date", today)
    .eq("status", "confirmed")
    .order("created_at", { ascending: false });

  const { data: departures } = await supabase
    .from("reservations")
    .select(
      `
      *,
      guests(first_name, last_name),
      reservation_rooms (
        room_id,
        rooms!reservation_rooms_room_id_fkey (
          room_number,
          room_type:room_types(name)
        )
      )
    `
    )
    .eq("check_out_date", today)
    .eq("status", "checked_in")
    .order("created_at", { ascending: false });

  /**
   * KPI для дашборду
   * Важливо: count рахується окремо від списків, щоб цифри були точними.
   */
  const { count: arrivalsCount } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .eq("check_in_date", today)
    .eq("status", "confirmed");

  const { count: departuresCount } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .eq("check_out_date", today)
    .eq("status", "checked_in");

  const { data: inHouseReservations } = await supabase
    .from("reservations")
    .select("id, adults, children")
    .eq("status", "checked_in");

  const inHouseAdults =
    inHouseReservations?.reduce(
      (sum, reservation) => sum + (reservation.adults || 0),
      0
    ) || 0;

  const inHouseChildren =
    inHouseReservations?.reduce(
      (sum, reservation) => sum + (reservation.children || 0),
      0
    ) || 0;

  const inHouseGuests = inHouseAdults + inHouseChildren;

  /**
   * Стан номерного фонду
   */
  const { count: availableRooms } = await supabase
    .from("rooms")
    .select("*", { count: "exact", head: true })
    .eq("occupancy_status", "vacant")
    .eq("operational_status", "operational")
    .in("housekeeping_status", ["clean", "inspected"]);

  const { count: occupiedRoomsCount } = await supabase
    .from("rooms")
    .select("*", { count: "exact", head: true })
    .eq("occupancy_status", "occupied");

  const { count: dirtyRoomsCount } = await supabase
    .from("rooms")
    .select("*", { count: "exact", head: true })
    .eq("housekeeping_status", "dirty");

  const { count: cleaningRoomsCount } = await supabase
    .from("rooms")
    .select("*", { count: "exact", head: true })
    .eq("housekeeping_status", "cleaning");

  const { count: maintenanceRoomsCount } = await supabase
    .from("rooms")
    .select("*", { count: "exact", head: true })
    .in("operational_status", ["maintenance", "out_of_order"]);

  const { count: blockedRoomsCount } = await supabase
    .from("rooms")
    .select("*", { count: "exact", head: true })
    .eq("operational_status", "blocked");

  /**
   * Операційні сповіщення
   */
  const { count: pendingPaymentCount } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  const arrivalsWithoutRoomCount =
    arrivals?.filter((reservation) => {
      const assignedRoom = reservation.reservation_rooms?.[0]?.rooms;
      return !assignedRoom;
    }).length || 0;

  const { count: overdueDeparturesCount } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .lt("check_out_date", today)
    .eq("status", "checked_in");

  const operationalAlerts: OperationalAlert[] = [
    {
      label: "Бронювання очікують передплату",
      count: pendingPaymentCount || 0,
      href: "/dashboard/reservations?filter_status=pending",
      icon: Clock,
      tone: "amber" as const,
    },
    {
      label: "Заїзди без призначеного номера",
      count: arrivalsWithoutRoomCount,
      href: `/dashboard/reservations?filter_status=confirmed&filter_check_in_date=${today}..${today}`,
      icon: AlertTriangle,
      tone: "red" as const,
    },
    {
      label: "Прострочені виїзди",
      count: overdueDeparturesCount || 0,
      href: `/dashboard/reservations?filter_status=checked_in&filter_check_out_date=..${yesterday}`,
      icon: LogOut,
      tone: "red" as const,
    },
    {
      label: "Номери потребують прибирання",
      count: dirtyRoomsCount || 0,
      href: "/dashboard/rooms?state=housekeeping%3Adirty",
      icon: Sparkles,
      tone: "amber" as const,
    },
    {
      label: "Номери у ремонті",
      count: maintenanceRoomsCount || 0,
      href: "/dashboard/rooms?state=operational%3Amaintenance",
      icon: Wrench,
      tone: "slate" as const,
    },
    {
      label: "Заблоковані номери",
      count: blockedRoomsCount || 0,
      href: "/dashboard/rooms?state=operational%3Ablocked",
      icon: BedDouble,
      tone: "slate" as const,
    },
  ].filter((alert) => alert.count > 0);

  const formatPluralUk = (
    count: number,
    one: string,
    few: string,
    many: string
  ) => {
    const absCount = Math.abs(count);
    const lastDigit = absCount % 10;
    const lastTwoDigits = absCount % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
      return many;
    }

    if (lastDigit === 1) {
      return one;
    }

    if (lastDigit >= 2 && lastDigit <= 4) {
      return few;
    }

    return many;
  };

  const formatAdults = (count: number) => {
    return `${count} ${formatPluralUk(
      count,
      "дорослий",
      "дорослих",
      "дорослих"
    )}`;
  };

  const formatChildren = (count: number) => {
    return `${count} ${formatPluralUk(count, "дитина", "дитини", "дітей")}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <DashboardPageHeader
        title="Дашборд рецепції"
        description={`Операційний підсумок заїздів, виїздів, оплат і готовності номерів на сьогодні, ${profile.first_name}.`}
        actions={
          <Button asChild>
            <Link href="/dashboard/reservations/new">
              <Plus className="mr-2 h-4 w-4" />
              Нове бронювання
            </Link>
          </Button>
        }
      />

      {/* 2. Операційні сповіщення */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Операційні сповіщення
          </CardTitle>
        </CardHeader>

        <CardContent>
          {operationalAlerts.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {operationalAlerts.map((alert) => {
                return (
                  <DashboardAlertLink
                    key={alert.label}
                    label={alert.label}
                    count={alert.count}
                    href={alert.href}
                    icon={alert.icon}
                    tone={alert.tone}
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              Критичних операційних сповіщень на цей момент немає.
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Ключові показники зміни */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard
          title="Очікують заїзду"
          value={arrivalsCount || 0}
          description="Підтверджені бронювання на сьогодні"
          icon={LogIn}
          tone="blue"
          href={`/dashboard/reservations?filter_status=confirmed&filter_check_in_date=${today}..${today}`}
        />
        <DashboardMetricCard
          title="Очікують виїзду"
          value={departuresCount || 0}
          description="Гості, які мають виселитися"
          icon={LogOut}
          tone="slate"
          href="/dashboard/front-desk?tab=departures"
        />
        <DashboardMetricCard
          title="Гості в готелі"
          value={inHouseGuests}
          description={`${inHouseAdults} дорослих · ${inHouseChildren} дітей`}
          icon={Users}
          tone="emerald"
          href="/dashboard/front-desk?tab=inhouse"
        />
        <DashboardMetricCard
          title="Готові до заселення"
          value={availableRooms || 0}
          description="Номери зі статусом “Готовий”"
          icon={BedDouble}
          tone="amber"
          href="/dashboard/rooms?state=readiness%3Aready"
        />
      </div>

      {/* 4-5. Сьогоднішні заїзди та виїзди */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <LogIn className="h-5 w-5" />
                Сьогоднішні заїзди
              </span>

              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                {arrivalsCount || 0}
              </span>
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="max-h-[320px] space-y-4 overflow-y-auto pr-2">
              {arrivals && arrivals.length > 0 ? (
                arrivals.map((reservation) => {
                  const assignedRoom =
                    reservation.reservation_rooms?.[0]?.rooms;

                  return (
                    <div
                      key={reservation.id}
                      className="flex items-center justify-between gap-4 border-b pb-3 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">
                          {reservation.guests?.first_name}{" "}
                          {reservation.guests?.last_name}
                        </p>

                        <p className="text-sm text-slate-600">
                          Бронювання № {reservation.reservation_number}
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          {(reservation.adults || 0) > 0 && (
                            <span className="flex items-center gap-1">
                              <UserRound className="h-3.5 w-3.5" />
                              {formatAdults(reservation.adults || 0)}
                            </span>
                          )}

                          {(reservation.children || 0) > 0 && (
                            <span className="flex items-center gap-1">
                              <Baby className="h-3.5 w-3.5" />
                              {formatChildren(reservation.children || 0)}
                            </span>
                          )}
                        </div>

                        {assignedRoom ? (
                          <p className="text-sm text-slate-600">
                            Номер {assignedRoom.room_number} ·{" "}
                            {assignedRoom.room_type?.name || "Тип не вказано"}
                          </p>
                        ) : (
                          <p className="mt-1 inline-flex rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                            Номер не призначено
                          </p>
                        )}
                      </div>

                      <Button size="sm" variant="outline" asChild>
                        <Link
                          href={`/dashboard/front-desk/check-in/${reservation.id}`}
                        >
                          Заселити
                        </Link>
                      </Button>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-500">
                  На сьогодні заїздів не очікується.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <LogOut className="h-5 w-5" />
                  Сьогоднішні виїзди
                </CardTitle>

                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                  {departuresCount || 0}
                </span>
              </div>
            </CardHeader>
          </CardHeader>

          <CardContent>
            <div className="max-h-[320px] space-y-4 overflow-y-auto pr-2">
              {departures && departures.length > 0 ? (
                departures.map((reservation) => {
                  const assignedRoom =
                    reservation.reservation_rooms?.[0]?.rooms;

                  return (
                    <div
                      key={reservation.id}
                      className="flex items-center justify-between gap-4 border-b pb-3 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">
                          {reservation.guests?.first_name}{" "}
                          {reservation.guests?.last_name}
                        </p>

                        <p className="text-sm text-slate-600">
                          Бронювання № {reservation.reservation_number}
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          {(reservation.adults || 0) > 0 && (
                            <span className="flex items-center gap-1">
                              <UserRound className="h-3.5 w-3.5" />
                              {formatAdults(reservation.adults || 0)}
                            </span>
                          )}

                          {(reservation.children || 0) > 0 && (
                            <span className="flex items-center gap-1">
                              <Baby className="h-3.5 w-3.5" />
                              {formatChildren(reservation.children || 0)}
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-slate-600">
                          Номер {assignedRoom?.room_number || "—"}
                        </p>
                      </div>

                      <Button size="sm" variant="outline" asChild>
                        <Link
                          href={`/dashboard/front-desk/check-out/${reservation.id}`}
                        >
                          Виселити
                        </Link>
                      </Button>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-500">
                  На сьогодні виїздів не очікується.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 6. Стан номерного фонду */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BedDouble className="h-5 w-5" />
            Стан номерного фонду
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Link href="/dashboard/rooms?state=readiness%3Aready" className="flex min-h-[96px] flex-col items-center justify-center rounded-xl border bg-emerald-50 p-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md active:translate-y-0 active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <p className="text-2xl font-bold text-emerald-700">
                {availableRooms || 0}
              </p>
              <p className="mt-1 text-sm font-medium text-emerald-700">
                Готові
              </p>
            </Link>

            <Link href="/dashboard/rooms?state=occupancy%3Aoccupied" className="flex min-h-[96px] flex-col items-center justify-center rounded-xl border bg-blue-50 p-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md active:translate-y-0 active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <p className="text-2xl font-bold text-blue-700">
                {occupiedRoomsCount || 0}
              </p>
              <p className="mt-1 text-sm font-medium text-blue-700">Зайняті</p>
            </Link>

            <Link href="/dashboard/rooms?state=housekeeping%3Adirty" className="flex min-h-[96px] flex-col items-center justify-center rounded-xl border bg-orange-50 p-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md active:translate-y-0 active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <p className="text-2xl font-bold text-orange-700">
                {dirtyRoomsCount || 0}
              </p>
              <p className="mt-1 text-sm font-medium text-orange-700">
                Потребують прибирання
              </p>
            </Link>

            <Link href="/dashboard/rooms?state=housekeeping%3Acleaning" className="flex min-h-[96px] flex-col items-center justify-center rounded-xl border bg-yellow-50 p-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-yellow-300 hover:shadow-md active:translate-y-0 active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <p className="text-2xl font-bold text-yellow-700">
                {cleaningRoomsCount || 0}
              </p>
              <p className="mt-1 text-sm font-medium text-yellow-700">
                Прибираються
              </p>
            </Link>

            <Link href="/dashboard/rooms?state=operational%3Amaintenance" className="flex min-h-[96px] flex-col items-center justify-center rounded-xl border bg-red-50 p-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-red-300 hover:shadow-md active:translate-y-0 active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <p className="text-2xl font-bold text-red-700">
                {maintenanceRoomsCount || 0}
              </p>
              <p className="mt-1 text-sm font-medium text-red-700">У ремонті</p>
            </Link>

            <Link href="/dashboard/rooms?state=operational%3Ablocked" className="flex min-h-[96px] flex-col items-center justify-center rounded-xl border bg-slate-100 p-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:translate-y-0 active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <p className="text-2xl font-bold text-slate-700">
                {blockedRoomsCount || 0}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-700">
                Заблоковані
              </p>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

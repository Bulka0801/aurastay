import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { DoorOpen, Users, Plus, LogIn, LogOut } from "lucide-react";
import Link from "next/link";
import type { Profile } from "@/lib/types";

interface FrontDeskDashboardProps {
  profile: Profile;
}

export async function FrontDeskDashboard({ profile }: FrontDeskDashboardProps) {
  const supabase = await createClient();

  // Get today's arrivals
  const today = new Date().toISOString().split("T")[0];

  const { data: arrivals } = await supabase
    .from("reservations")
    .select(
      `
      *,
      guest:guests(first_name, last_name, email),
      room:rooms(room_number, room_type:room_types(name))
    `
    )
    .eq("check_in_date", today)
    .eq("status", "confirmed")
    .order("created_at", { ascending: false })
    .limit(5);

  // Get today's departures
  const { data: departures } = await supabase
    .from("reservations")
    .select(
      `
      *,
      guest:guests(first_name, last_name),
      room:rooms(room_number)
    `
    )
    .eq("check_out_date", today)
    .eq("status", "checked_in")
    .limit(5);

  // Get in-house guests count
  const { count: inHouseCount } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .eq("status", "checked_in");

  // Get available rooms count
  const { count: availableRooms } = await supabase
    .from("rooms")
    .select("*", { count: "exact", head: true })
    .eq("status", "available");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Дашборд рецепції
          </h1>
          <p className="text-slate-600">
            Раді знову вас бачити, {profile.first_name}! Ось підсумок на
            сьогодні.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/dashboard/reservations/new">
              <Plus className="mr-2 h-4 w-4" />
              Нове бронювання
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Сьогоднішні заїзди
            </CardTitle>
            <LogIn className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{arrivals?.length || 0}</div>
            <p className="text-xs text-slate-600">Очікувані заселення</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Сьогоднішні виїзди
            </CardTitle>
            <LogOut className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departures?.length || 0}</div>
            <p className="text-xs text-slate-600">Очікувані виселення</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Гості, що проживають
            </CardTitle>
            <Users className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inHouseCount || 0}</div>
            <p className="text-xs text-slate-600">Наразі проживають</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Вільні номери</CardTitle>
            <DoorOpen className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableRooms || 0}</div>
            <p className="text-xs text-slate-600">Готові до заселення</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" />
              Сьогоднішні заїзди
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {arrivals && arrivals.length > 0 ? (
                arrivals.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0"
                  >
                    <div>
                      <p className="font-medium">
                        {reservation.guest?.first_name}{" "}
                        {reservation.guest?.last_name}
                      </p>
                      <p className="text-sm text-slate-600">
                        {reservation.room?.room_type?.name || "N/A"} - Підтв.:{" "}
                        {reservation.confirmation_number}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link
                        href={`/dashboard/front-desk/check-in/${reservation.id}`}
                      >
                        Заселити
                      </Link>
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  На сьогодні заїздів не очікується
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5" />
              Сьогоднішні виїзди
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {departures && departures.length > 0 ? (
                departures.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0"
                  >
                    <div>
                      <p className="font-medium">
                        {reservation.guest?.first_name}{" "}
                        {reservation.guest?.last_name}
                      </p>
                      <p className="text-sm text-slate-600">
                        Номер {reservation.room?.room_number}
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
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  На сьогодні виїздів не очікується
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

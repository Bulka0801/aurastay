import { createClient } from "@/lib/supabase/server"
import { NewReservationForm } from "@/components/reservations/new-reservation-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function NewReservationPage() {
  const supabase = await createClient()

  // Get room types
  const { data: roomTypes } = await supabase
    .from("room_types")
    .select("*")
    .eq("is_active", true)
    .order("base_rate", { ascending: true })

  // Get rate plans
  const { data: ratePlans } = await supabase
    .from("rate_plans")
    .select("*")
    .eq("is_active", true)
    .order("discount_percentage", { ascending: false })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Нове бронювання</h1>
        <p className="text-slate-600">
          Створіть нове бронювання. Бронювання створюється зі статусом «Очікує передплату» і підтверджується
          автоматично після внесення передплати.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Деталі бронювання</CardTitle>
        </CardHeader>
        <CardContent>
          <NewReservationForm roomTypes={roomTypes || []} ratePlans={ratePlans || []} />
        </CardContent>
      </Card>
    </div>
  )
}

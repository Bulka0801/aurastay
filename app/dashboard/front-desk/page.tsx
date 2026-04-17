import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrivalsTab } from "@/components/front-desk/arrivals-tab"
import { DeparturesTab } from "@/components/front-desk/departures-tab"
import { InHouseTab } from "@/components/front-desk/in-house-tab"

export default async function FrontDeskPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get today's date
  const today = new Date().toISOString().split("T")[0]

  // Fetch arrivals (check-in today)
  const { data: arrivals } = await supabase
    .from("reservations")
    .select(`
      *,
      guests (*),
      reservation_rooms (
        rooms (
          room_number,
          room_type:room_types (name)
        )
      )
    `)
    .eq("check_in_date", today)
    .in("status", ["confirmed", "checked_in"])

  // Fetch departures (check-out today)
  const { data: departures } = await supabase
    .from("reservations")
    .select(`
      *,
      guests (*),
      reservation_rooms (
        rooms (
          room_number,
          room_type:room_types (name)
        )
      )
    `)
    .eq("check_out_date", today)
    .eq("status", "checked_in")

  // Fetch in-house guests
  const { data: inHouse } = await supabase
    .from("reservations")
    .select(`
      *,
      guests (*),
      reservation_rooms (
        rooms (
          room_number,
          room_type:room_types (name)
        )
      )
    `)
    .eq("status", "checked_in")
    .lte("check_in_date", today)
    .gte("check_out_date", today)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Рецепція</h1>
        <p className="text-muted-foreground">Керування заїздами, виїздами та гостями в готелі</p>
      </div>

      <Tabs defaultValue="arrivals" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="arrivals">
            Заїзди <span className="ml-2 text-xs">({arrivals?.length || 0})</span>
          </TabsTrigger>
          <TabsTrigger value="departures">
            Виїзди <span className="ml-2 text-xs">({departures?.length || 0})</span>
          </TabsTrigger>
          <TabsTrigger value="inhouse">
            У готелі <span className="ml-2 text-xs">({inHouse?.length || 0})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="arrivals" className="mt-6">
          <ArrivalsTab arrivals={arrivals || []} />
        </TabsContent>

        <TabsContent value="departures" className="mt-6">
          <DeparturesTab departures={departures || []} />
        </TabsContent>

        <TabsContent value="inhouse" className="mt-6">
          <InHouseTab inHouse={inHouse || []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

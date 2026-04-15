import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus } from "lucide-react"

export default async function RoomsPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch all room types
  const { data: roomTypes } = await supabase.from("room_types").select("*").order("base_rate", { ascending: true })

  // Fetch all rooms
  const { data: rooms } = await supabase
    .from("rooms")
    .select(`
      *,
      room_type:room_types (*)
    `)
    .order("room_number", { ascending: true })

  const statusColors = {
    available: "bg-green-100 text-green-800",
    occupied: "bg-blue-100 text-blue-800",
    dirty: "bg-red-100 text-red-800",
    cleaning: "bg-yellow-100 text-yellow-800",
    maintenance: "bg-orange-100 text-orange-800",
    out_of_order: "bg-gray-100 text-gray-800",
  }

  return ( /* LINE 49! This would link to a form for adding new rooms, but is left as a placeholder for now */
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Room Management</h1>
          <p className="text-muted-foreground">Manage room inventory and configurations</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Room
        </Button> 
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {roomTypes?.map((type) => {
          const typeRooms = rooms?.filter((r) => r.room_type_id === type.id) || []
          const availableCount = typeRooms.filter((r) => r.status === "available").length

          return  (
            <Card key={type.id} className="p-4">
              <div className="space-y-2">
                <h3 className="font-semibold">{type.name}</h3>
                <p className="text-sm text-muted-foreground">{type.code}</p>
                <div className="text-2xl font-bold">${type.base_rate}</div>
                <p className="text-xs text-muted-foreground">per night</p>
                <div className="pt-2 border-t">
                  <p className="text-sm">
                    {availableCount} / {typeRooms.length} available
                  </p>
                  <p className="text-xs text-muted-foreground">Max {type.max_occupancy} guests</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">All Rooms</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {rooms?.map((room) => (
              <div key={room.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-semibold">{room.room_number}</div>
                  <div className="text-sm text-muted-foreground">{room.room_type.name}</div>
                  <div className="text-xs text-muted-foreground">Floor {room.floor}</div>
                </div>
                <Badge className={statusColors[room.status as keyof typeof statusColors]}>{room.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}

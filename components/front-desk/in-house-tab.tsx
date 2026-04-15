"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search } from "lucide-react"

interface InHouseGuest {
  id: string
  reservation_number: string
  check_in_date: string
  check_out_date: string
  adults: number
  children: number
  total_amount: number
  guests: {
    first_name: string
    last_name: string
    email: string
    phone: string
  }
  reservation_rooms: Array<{
    rooms: {
      room_number: string
      room_type: {
        name: string
      }
    }
  }>
}

export function InHouseTab({ inHouse }: { inHouse: InHouseGuest[] }) {
  const [search, setSearch] = useState("")

  const filteredGuests = inHouse.filter(
    (guest) =>
      guest.guests.first_name.toLowerCase().includes(search.toLowerCase()) ||
      guest.guests.last_name.toLowerCase().includes(search.toLowerCase()) ||
      guest.reservation_number.toLowerCase().includes(search.toLowerCase()) ||
      guest.reservation_rooms[0]?.rooms.room_number.includes(search),
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, room, or reservation number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredGuests.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No guests currently in-house</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredGuests.map((guest) => (
            <Card key={guest.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">
                      {guest.guests.first_name} {guest.guests.last_name}
                    </h3>
                    <Badge>In-House</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{guest.reservation_number}</p>
                  <div className="flex gap-4 text-sm">
                    <span>
                      Room: {guest.reservation_rooms[0]?.rooms.room_number || "N/A"} (
                      {guest.reservation_rooms[0]?.rooms.room_type.name || "N/A"})
                    </span>
                    <span>
                      Guests: {guest.adults} Adult{guest.adults > 1 ? "s" : ""}
                      {guest.children > 0 && `, ${guest.children} Child${guest.children > 1 ? "ren" : ""}`}
                    </span>
                    <span>Check-out: {new Date(guest.check_out_date).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/dashboard/reservations/${guest.id}`}>
                    <Button variant="outline">View Details</Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

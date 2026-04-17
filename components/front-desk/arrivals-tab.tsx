"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, UserCheck } from "lucide-react"
import { RESERVATION_STATUS_UK, pluralizeNights } from "@/lib/i18n/uk"

interface Arrival {
  id: string
  reservation_number: string
  check_in_date: string
  check_out_date: string
  adults: number
  children: number
  status: string
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

export function ArrivalsTab({ arrivals }: { arrivals: Arrival[] }) {
  const [search, setSearch] = useState("")

  const filteredArrivals = arrivals.filter(
    (arrival) =>
      arrival.guests.first_name.toLowerCase().includes(search.toLowerCase()) ||
      arrival.guests.last_name.toLowerCase().includes(search.toLowerCase()) ||
      arrival.reservation_number.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Пошук за ім'ям або номером броні..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredArrivals.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">На сьогодні заїздів не заплановано</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredArrivals.map((arrival) => (
            <Card key={arrival.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">
                      {arrival.guests.first_name} {arrival.guests.last_name}
                    </h3>
                    <Badge variant={arrival.status === "checked_in" ? "default" : "secondary"}>
                      {RESERVATION_STATUS_UK[arrival.status as keyof typeof RESERVATION_STATUS_UK] ?? arrival.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{arrival.reservation_number}</p>
                  <div className="flex gap-4 text-sm">
                    <span>
                      Номер: {arrival.reservation_rooms[0]?.rooms.room_number || "не призначено"} (
                      {arrival.reservation_rooms[0]?.rooms.room_type.name || "—"})
                    </span>
                    <span>
                      Гостей: {arrival.adults} дорослих
                      {arrival.children > 0 && `, ${arrival.children} дітей`}
                    </span>
                    <span>
                      {pluralizeNights(
                        Math.ceil(
                          (new Date(arrival.check_out_date).getTime() - new Date(arrival.check_in_date).getTime()) /
                            (1000 * 60 * 60 * 24),
                        ),
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {arrival.status === "confirmed" && (
                    <Link href={`/dashboard/front-desk/check-in/${arrival.id}`}>
                      <Button>
                        <UserCheck className="mr-2 h-4 w-4" />
                        Заселити
                      </Button>
                    </Link>
                  )}
                  <Link href={`/dashboard/reservations/${arrival.id}`}>
                    <Button variant="outline">Деталі</Button>
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

"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, LogOut } from "lucide-react"
import { pluralizeNights } from "@/lib/i18n/uk"

interface Departure {
  id: string
  reservation_number: string
  check_in_date: string
  check_out_date: string
  total_amount: number
  guests: {
    first_name: string
    last_name: string
    email: string
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

export function DeparturesTab({ departures }: { departures: Departure[] }) {
  const [search, setSearch] = useState("")

  const filteredDepartures = departures.filter(
    (dep) =>
      dep.guests.first_name.toLowerCase().includes(search.toLowerCase()) ||
      dep.guests.last_name.toLowerCase().includes(search.toLowerCase()) ||
      dep.reservation_number.toLowerCase().includes(search.toLowerCase()),
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

      {filteredDepartures.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">На сьогодні виїздів не заплановано</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredDepartures.map((departure) => (
            <Card key={departure.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">
                      {departure.guests.first_name} {departure.guests.last_name}
                    </h3>
                    <Badge>Заселено</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{departure.reservation_number}</p>
                  <div className="flex gap-4 text-sm">
                    <span>
                      Номер: {departure.reservation_rooms[0]?.rooms.room_number || "—"} (
                      {departure.reservation_rooms[0]?.rooms.room_type.name || "—"})
                    </span>
                    <span>Сума: {new Intl.NumberFormat("uk-UA", { style: "currency", currency: "UAH", maximumFractionDigits: 0 }).format(departure.total_amount)}</span>
                    <span>
                      {pluralizeNights(
                        Math.ceil(
                          (new Date(departure.check_out_date).getTime() - new Date(departure.check_in_date).getTime()) /
                            (1000 * 60 * 60 * 24),
                        ),
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/dashboard/front-desk/check-out/${departure.id}`}>
                    <Button>
                      <LogOut className="mr-2 h-4 w-4" />
                      Виселити
                    </Button>
                  </Link>
                  <Link href={`/dashboard/reservations/${departure.id}`}>
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

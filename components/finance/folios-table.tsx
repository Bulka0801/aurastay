"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Eye } from "lucide-react"
import Link from "next/link"
import { formatCurrency, formatDate } from "@/lib/localization"

interface Folio {
  id: string
  status: string
  total_charges: number
  total_payments: number
  balance: number
  created_at: string
  guests: {
    first_name: string
    last_name: string
  }
  reservations: {
    reservation_number: string
    check_in_date: string
    check_out_date: string
  }
}

export function FoliosTable({ folios }: { folios: Folio[] }) {
  const [search, setSearch] = useState("")

  const filteredFolios = folios.filter(
    (folio) =>
      folio.guests.first_name.toLowerCase().includes(search.toLowerCase()) ||
      folio.guests.last_name.toLowerCase().includes(search.toLowerCase()) ||
      folio.reservations.reservation_number.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <Card>
      <div className="border-b p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Пошук за ім’ям гостя або номером бронювання..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Гість</TableHead>
              <TableHead>Бронювання</TableHead>
              <TableHead>Заїзд</TableHead>
              <TableHead>Виїзд</TableHead>
              <TableHead>Нарахування</TableHead>
              <TableHead>Оплати</TableHead>
              <TableHead>Баланс</TableHead>
              <TableHead>Дії</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFolios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Відкритих рахунків не знайдено
                </TableCell>
              </TableRow>
            ) : (
              filteredFolios.map((folio) => (
                <TableRow key={folio.id}>
                  <TableCell className="font-medium">
                    {folio.guests.first_name} {folio.guests.last_name}
                  </TableCell>
                  <TableCell className="text-sm">{folio.reservations.reservation_number}</TableCell>
                  <TableCell className="text-sm">{formatDate(folio.reservations.check_in_date)}</TableCell>
                  <TableCell className="text-sm">{formatDate(folio.reservations.check_out_date)}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(folio.total_charges)}</TableCell>
                  <TableCell className="text-green-600">{formatCurrency(folio.total_payments)}</TableCell>
                  <TableCell>
                    <span className={`font-bold ${folio.balance > 0 ? "text-red-600" : "text-green-600"}`}>
                      {formatCurrency(folio.balance)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/finance/folios/${folio.id}`} aria-label="Переглянути рахунок">
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
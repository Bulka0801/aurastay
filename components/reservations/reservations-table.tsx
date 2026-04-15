"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, Edit } from "lucide-react"
import Link from "next/link"

interface Reservation {
  id: string
  reservation_number: string
  check_in_date: string
  check_out_date: string
  status: string
  total_amount: number
  adults: number
  children: number
  guests: {
    first_name: string
    last_name: string
    email: string
    phone: string
  }
  rate_plans: {
    name: string
  }
  reservation_rooms: Array<{
    rooms: {
      room_number: string
      room_types: {
        name: string
      }
    }
  }>
}

const statusColors: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-800",
  checked_in: "bg-green-100 text-green-800",
  checked_out: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
  no_show: "bg-orange-100 text-orange-800",
  pending: "bg-yellow-100 text-yellow-800",
}

export function ReservationsTable({ reservations }: { reservations: Reservation[] }) {
  const columns: ColumnDef<Reservation>[] = [
    {
      accessorKey: "reservation_number",
      header: "Reservation #",
    },
    {
      accessorKey: "guests",
      header: "Guest",
      cell: ({ row }) => {
        const guest = row.original.guests
        return (
          <div>
            <p className="font-medium">
              {guest?.first_name} {guest?.last_name}
            </p>
            <p className="text-sm text-slate-500">{guest?.email}</p>
          </div>
        )
      },
    },
    {
      accessorKey: "check_in_date",
      header: "Check-in",
      cell: ({ row }) => new Date(row.original.check_in_date).toLocaleDateString(),
    },
    {
      accessorKey: "check_out_date",
      header: "Check-out",
      cell: ({ row }) => new Date(row.original.check_out_date).toLocaleDateString(),
    },
    {
      accessorKey: "reservation_rooms",
      header: "Room",
      cell: ({ row }) => {
        const rooms = row.original.reservation_rooms
        return rooms?.[0]?.rooms?.room_number || "N/A"
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status
        return (
          <Badge className={statusColors[status] || "bg-gray-100 text-gray-800"}>
            {status.replace("_", " ").toUpperCase()}
          </Badge>
        )
      },
    },
    {
      accessorKey: "total_amount",
      header: "Total",
      cell: ({ row }) => `$${Number(row.original.total_amount).toFixed(2)}`,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/reservations/${row.original.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/reservations/${row.original.id}/edit`}>
                <Edit className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={reservations}
      searchKey="reservation_number"
      searchPlaceholder="Search by reservation number..."
    />
  )
}

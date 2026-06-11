"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatUAH } from "@/lib/format"
import { isRoomStateReadyForCheckIn } from "@/lib/rooms/availability"

export type RoomTypeRow = {
  id: string
  name?: string | null
  code?: string | null
  description?: string | null
  base_occupancy?: number | string | null
  max_occupancy?: number | string | null
  base_rate?: number | string | null
  base_price?: number | string | null
  amenities?: string[] | Record<string, unknown> | string | null
  size_sqm?: number | string | null
  bed_type?: string | null
  image_urls?: string[] | null
  image_url?: string | null
  is_active?: boolean | null
  [key: string]: unknown
}

type RoomTypeCardsRoom = {
  room_type_id: string
  status: string
  occupancy_status?: "vacant" | "occupied" | null
  housekeeping_status?: "clean" | "dirty" | "cleaning" | "inspecting" | "inspected" | null
  operational_status?: "operational" | "maintenance" | "out_of_order" | "blocked" | null
}

type RoomTypeCardsProps = {
  roomTypes: RoomTypeRow[]
  rooms: RoomTypeCardsRoom[]
}

const roomTypeLabels: Record<string, string> = {
  "Standard Room": "Стандартний номер",
  "Deluxe Room": "Номер «Делюкс»",
  Suite: "Люкс",
  "Junior Suite": "Напівлюкс",
  "Executive Suite": "Представницький люкс",
  "Presidential Suite": "Президентський люкс",
  "Family Room": "Сімейний номер",
}

const roomTypeFieldLabels: Record<string, string> = {
  base_occupancy: "Базова місткість",
  max_occupancy: "Максимум гостей",
  base_rate: "Базова ціна",
  base_price: "Базова ціна",
  size_sqm: "Площа",
  bed_type: "Ліжко",
  is_active: "Активний у продажі",
}

const ignoredExtraRoomTypeFields = new Set([
  "id",
  "name",
  "code",
  "description",
  "base_occupancy",
  "max_occupancy",
  "base_rate",
  "base_price",
  "amenities",
  "size_sqm",
  "bed_type",
  "image_urls",
  "image_url",
  "is_active",
  "created_at",
  "updated_at",
])

function formatRoomTypeName(name?: string | null) {
  if (!name) return "—"
  return roomTypeLabels[name] ?? name
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : null
}

function getRoomTypeRate(type: RoomTypeRow) {
  return toNumber(type.base_rate ?? type.base_price) ?? 0
}

function formatAmenityLabel(value: string) {
  const labels: Record<string, string> = {
    wifi: "Wi-Fi",
    tv: "TV",
    minibar: "Мінібар",
    mini_bar: "Мінібар",
    balcony: "Балкон",
    coffee_maker: "Кавомашина",
    coffee_machine: "Кавомашина",
    air_conditioning: "Кондиціонер",
    safe: "Сейф",
    smart_tv: "Smart TV",
    work_desk: "Робочий стіл",
    bathtub: "Ванна",
    jacuzzi: "Джакузі",
    full_kitchen: "Кухня",
    private_balcony: "Приватний балкон",
  }
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_")
  return labels[normalized] ?? value.replace(/_/g, " ")
}

function getAmenities(amenities: RoomTypeRow["amenities"]) {
  if (!amenities) return []
  if (Array.isArray(amenities)) {
    return amenities.map((item) => String(item).trim()).filter(Boolean).map(formatAmenityLabel)
  }
  if (typeof amenities === "string") {
    try {
      const parsed = JSON.parse(amenities) as unknown
      return getAmenities(parsed as RoomTypeRow["amenities"])
    } catch {
      return amenities
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map(formatAmenityLabel)
    }
  }
  return Object.entries(amenities)
    .filter(([, value]) => value === true || (typeof value !== "boolean" && value !== null && value !== undefined && value !== ""))
    .map(([key, value]) => (value === true ? formatAmenityLabel(key) : `${formatAmenityLabel(key)}: ${String(value)}`))
}

function formatDetailValue(key: string, value: unknown) {
  if (value === null || value === undefined || value === "") return null
  if (key === "base_rate" || key === "base_price") return formatUAH(toNumber(value) ?? 0)
  if (key === "size_sqm") return `${toNumber(value) ?? value} м²`
  if (typeof value === "boolean") return value ? "Так" : "Ні"
  return String(value)
}

function getRoomTypeDetails(type: RoomTypeRow) {
  const primaryKeys = ["base_occupancy", "max_occupancy", "size_sqm", "bed_type", "is_active"]
  const primaryDetails = primaryKeys
    .map((key) => ({
      label: roomTypeFieldLabels[key] ?? key,
      value: formatDetailValue(key, type[key]),
    }))
    .filter((item): item is { label: string; value: string } => Boolean(item.value))

  const extraDetails = Object.entries(type)
    .filter(([key, value]) => !ignoredExtraRoomTypeFields.has(key) && ["string", "number", "boolean"].includes(typeof value))
    .map(([key, value]) => ({
      label: roomTypeFieldLabels[key] ?? key.replace(/_/g, " "),
      value: formatDetailValue(key, value),
    }))
    .filter((item): item is { label: string; value: string } => Boolean(item.value))

  return [...primaryDetails, ...extraDetails]
}

function getRoomTypeImage(type: RoomTypeRow) {
  if (Array.isArray(type.image_urls) && type.image_urls[0]) return type.image_urls[0]
  return type.image_url || null
}

export function RoomTypeCards({ roomTypes, rooms }: RoomTypeCardsProps) {
  const [selectedRoomType, setSelectedRoomType] = useState<RoomTypeRow | null>(null)
  const selectedRoomTypeDetails = selectedRoomType ? getRoomTypeDetails(selectedRoomType) : []
  const selectedAmenities = selectedRoomType ? getAmenities(selectedRoomType.amenities) : []
  const selectedImageUrl = selectedRoomType ? getRoomTypeImage(selectedRoomType) : null

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {roomTypes.map((type) => {
          const typeRooms = rooms.filter((room) => room.room_type_id === type.id)
          const readyCount = typeRooms.filter(isRoomStateReadyForCheckIn).length

          return (
            <button
              key={type.id}
              type="button"
              onClick={() => setSelectedRoomType(type)}
              className="block h-full w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              <Card className="h-full p-4 transition hover:border-slate-400 hover:shadow-sm">
                <div className="space-y-2">
                  <div>
                    <h3 className="font-semibold">{formatRoomTypeName(type.name)}</h3>
                    <p className="text-sm text-muted-foreground">{type.code}</p>
                  </div>
                  <div className="text-2xl font-bold">{formatUAH(getRoomTypeRate(type))}</div>
                  <p className="text-xs text-muted-foreground">за ніч</p>
                  <div className="border-t pt-2">
                    <p className="text-sm">
                      Готові до заселення: {readyCount} з {typeRooms.length}
                    </p>
                    <p className="text-xs text-muted-foreground">До {type.max_occupancy} гостей</p>
                  </div>
                </div>
              </Card>
            </button>
          )
        })}
      </div>

      <Dialog open={Boolean(selectedRoomType)} onOpenChange={(open) => !open && setSelectedRoomType(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          {selectedRoomType && (
            <>
              <DialogHeader>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {selectedRoomType.code && <Badge variant="outline">{selectedRoomType.code}</Badge>}
                  <Badge variant={selectedRoomType.is_active === false ? "secondary" : "default"}>
                    {selectedRoomType.is_active === false ? "Неактивний" : "Активний"}
                  </Badge>
                </div>
                <DialogTitle>{formatRoomTypeName(selectedRoomType.name)}</DialogTitle>
                <DialogDescription>
                  {selectedRoomType.description || "Опис типу номера ще не заповнено в базі даних."}
                </DialogDescription>
              </DialogHeader>

              {selectedImageUrl && (
                <div className="overflow-hidden rounded-lg border bg-slate-100">
                  <img
                    src={selectedImageUrl}
                    alt={formatRoomTypeName(selectedRoomType.name)}
                    className="max-h-72 w-full object-cover"
                  />
                </div>
              )}

              <div className="rounded-lg border bg-slate-50 px-4 py-3">
                <div className="text-xs text-muted-foreground">Базова ціна</div>
                <div className="text-xl font-semibold">{formatUAH(getRoomTypeRate(selectedRoomType))}</div>
                <div className="text-xs text-muted-foreground">за ніч</div>
              </div>

              {selectedRoomTypeDetails.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {selectedRoomTypeDetails.map((detail) => (
                    <div key={`${detail.label}-${detail.value}`} className="rounded-lg border bg-white p-3">
                      <div className="text-xs text-muted-foreground">{detail.label}</div>
                      <div className="mt-1 font-medium">{detail.value}</div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold">Характеристики та зручності</h3>
                {selectedAmenities.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedAmenities.map((amenity) => (
                      <Badge key={amenity} variant="secondary" className="rounded-md">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">Зручності ще не заповнені в базі даних.</p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

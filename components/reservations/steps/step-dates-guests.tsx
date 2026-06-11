"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { uk } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { addDays } from "@/lib/room-rack/date-utils"
import { useNewReservationForm } from "../form-context"

export function StepDatesGuests() {
  const {
    checkInDate,
    checkOutDate,
    adults,
    children,
    nights,
    setStep,
    canGoToStep2,
    handleStayRangeSelect,
    setCheckInDate,
    setCheckOutDate,
    handleAdultsChange,
    handleChildrenChange,
  } = useNewReservationForm()

  const MAX_OCCUPANCY = 6

  const stayRange =
    checkInDate && checkOutDate
      ? { from: checkInDate, to: checkOutDate }
      : checkInDate
        ? { from: checkInDate, to: undefined }
        : undefined

  const maxChildren = MAX_OCCUPANCY - Math.max(1, parseInt(adults || "0", 10))

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Період проживання</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !checkInDate && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {checkInDate && checkOutDate ? (
                <>
                  {format(checkInDate, "d MMMM yyyy", { locale: uk })} —{" "}
                  {format(checkOutDate, "d MMMM yyyy", { locale: uk })}
                </>
              ) : (
                <span>Оберіть період проживання</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="range"
              selected={stayRange}
              onSelect={handleStayRangeSelect}
              numberOfMonths={2}
              initialFocus
              disabled={(date) => {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                return date < today
              }}
            />
          </PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground">
          Ви можете обрати заїзд і виїзд одним діапазоном. Перший клік — дата заїзду, другий — дата виїзду.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Дата заїзду *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !checkInDate && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {checkInDate ? format(checkInDate, "d MMMM yyyy", { locale: uk }) : <span>Оберіть дату</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={checkInDate}
                onSelect={setCheckInDate}
                initialFocus
                disabled={(date) => {
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  return date < today
                }}
              />
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground">Дата заїзду має бути не раніше сьогоднішнього дня.</p>
        </div>

        <div className="space-y-2">
          <Label>Дата виїзду *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !checkOutDate && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {checkOutDate ? format(checkOutDate, "d MMMM yyyy", { locale: uk }) : <span>Оберіть дату</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={checkOutDate}
                onSelect={setCheckOutDate}
                initialFocus
                disabled={(date) => !checkInDate || date <= checkInDate}
              />
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground">Дата виїзду має бути пізніше дати заїзду.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="adults">Дорослі *</Label>
          <Input
            id="adults"
            type="number"
            min="1"
            max={MAX_OCCUPANCY}
            value={adults}
            onChange={handleAdultsChange}
            placeholder="1"
            required
          />
          <p className="text-xs text-muted-foreground">
            Вкажіть кількість дорослих, які заселяються. Це поле не підставляється автоматично.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="children">Діти</Label>
          <Input
            id="children"
            type="number"
            min="0"
            max={Math.max(0, maxChildren)}
            value={children}
            onChange={handleChildrenChange}
            placeholder="0"
          />
          <p className="text-xs text-muted-foreground">За потреби додайте дітей, але сумарна місткість не має перевищувати ліміт номера.</p>
        </div>
      </div>

      {nights > 0 && (
        <p className="text-sm text-muted-foreground">
          Загалом ночей: <span className="font-medium text-foreground">{nights}</span>
        </p>
      )}

      <div className="flex justify-end">
        <Button type="button" onClick={() => setStep(2)} disabled={!canGoToStep2}>
          Далі: обрати номер
        </Button>
      </div>
    </div>
  )
}

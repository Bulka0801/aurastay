"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface RoomType {
  id: string
  name: string
  code: string
  base_rate: number
  base_occupancy: number
  max_occupancy: number
}

interface RatePlan {
  id: string
  name: string
  code: string
  discount_percentage: number
}

interface NewReservationFormProps {
  roomTypes: RoomType[]
  ratePlans: RatePlan[]
}

export function NewReservationForm({ roomTypes, ratePlans }: NewReservationFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1)

  // Step 1: Dates and guests
  const [checkInDate, setCheckInDate] = useState<Date>()
  const [checkOutDate, setCheckOutDate] = useState<Date>()
  const [adults, setAdults] = useState("2")
  const [children, setChildren] = useState("0")

  // Step 2: Room selection
  const [selectedRoomType, setSelectedRoomType] = useState("")
  const [selectedRatePlan, setSelectedRatePlan] = useState("")

  // Step 3: Guest information
  const [guestData, setGuestData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "",
    passport: "",
    specialRequests: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Get authenticated user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Create guest
      const { data: guest, error: guestError } = await supabase
        .from("guests")
        .insert({
          first_name: guestData.firstName,
          last_name: guestData.lastName,
          email: guestData.email,
          phone: guestData.phone,
          country: guestData.country,
          passport_number: guestData.passport,
        })
        .select()
        .single()

      if (guestError) throw guestError

      // Calculate total amount
      const roomType = roomTypes.find((rt) => rt.id === selectedRoomType)
      const ratePlan = ratePlans.find((rp) => rp.id === selectedRatePlan)
      if (!roomType || !ratePlan || !checkInDate || !checkOutDate) throw new Error("Missing required data")

      const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
      const baseAmount = roomType.base_rate * nights
      const discount = (baseAmount * ratePlan.discount_percentage) / 100
      const totalAmount = baseAmount - discount

      // Generate reservation number
      const reservationNumber = `RES${Date.now().toString().slice(-8)}`

      // Create reservation
      const { data: reservation, error: reservationError } = await supabase
        .from("reservations")
        .insert({
          reservation_number: reservationNumber,
          guest_id: guest.id,
          check_in_date: format(checkInDate, "yyyy-MM-dd"),
          check_out_date: format(checkOutDate, "yyyy-MM-dd"),
          adults: Number.parseInt(adults),
          children: Number.parseInt(children),
          status: "confirmed",
          rate_plan_id: selectedRatePlan,
          total_amount: totalAmount,
          special_requests: guestData.specialRequests,
          channel: "Direct",
        })
        .select()
        .single()

      if (reservationError) throw reservationError

      // Find available room
      const { data: availableRooms } = await supabase
        .from("rooms")
        .select("*")
        .eq("room_type_id", selectedRoomType)
        .eq("status", "available")
        .limit(1)

      if (availableRooms && availableRooms.length > 0) {
        // Create reservation room link
        await supabase.from("reservation_rooms").insert({
          reservation_id: reservation.id,
          room_id: availableRooms[0].id,
          room_type_id: selectedRoomType,
          rate: roomType.base_rate,
        })
      }

      router.push(`/dashboard/reservations/${reservation.id}`)
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Step 1: Dates & Guests</h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Check-in Date *</Label>
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
                    {checkInDate ? format(checkInDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={checkInDate}
                    onSelect={setCheckInDate}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Check-out Date *</Label>
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
                    {checkOutDate ? format(checkOutDate, "PPP") : <span>Pick a date</span>}
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
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="adults">Adults *</Label>
              <Input
                id="adults"
                type="number"
                min="1"
                value={adults}
                onChange={(e) => setAdults(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="children">Children</Label>
              <Input
                id="children"
                type="number"
                min="0"
                value={children}
                onChange={(e) => setChildren(e.target.value)}
              />
            </div>
          </div>

          <Button type="button" onClick={() => setStep(2)} disabled={!checkInDate || !checkOutDate}>
            Next: Select Room
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Step 2: Room & Rate Selection</h3>

          <div className="space-y-2">
            <Label>Room Type *</Label>
            <Select value={selectedRoomType} onValueChange={setSelectedRoomType}>
              <SelectTrigger>
                <SelectValue placeholder="Select room type" />
              </SelectTrigger>
              <SelectContent>
                {roomTypes.map((rt) => (
                  <SelectItem key={rt.id} value={rt.id}>
                    {rt.name} - ${rt.base_rate}/night (Max {rt.max_occupancy} guests)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Rate Plan *</Label>
            <Select value={selectedRatePlan} onValueChange={setSelectedRatePlan}>
              <SelectTrigger>
                <SelectValue placeholder="Select rate plan" />
              </SelectTrigger>
              <SelectContent>
                {ratePlans.map((rp) => (
                  <SelectItem key={rp.id} value={rp.id}>
                    {rp.name} ({rp.discount_percentage}% discount)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {checkInDate && checkOutDate && selectedRoomType && selectedRatePlan && (
            <div className="rounded-lg border bg-slate-50 p-4">
              <h4 className="font-semibold mb-2">Price Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Nights:</span>
                  <span>{Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Base Rate:</span>
                  <span>
                    $
                    {(
                      roomTypes.find((rt) => rt.id === selectedRoomType)!.base_rate *
                      Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
                    ).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span className="text-green-600">
                    -{ratePlans.find((rp) => rp.id === selectedRatePlan)!.discount_percentage}%
                  </span>
                </div>
                <div className="flex justify-between border-t pt-1 font-bold">
                  <span>Total:</span>
                  <span>
                    $
                    {(
                      roomTypes.find((rt) => rt.id === selectedRoomType)!.base_rate *
                      Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)) *
                      (1 - ratePlans.find((rp) => rp.id === selectedRatePlan)!.discount_percentage / 100)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button type="button" onClick={() => setStep(3)} disabled={!selectedRoomType || !selectedRatePlan}>
              Next: Guest Information
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Step 3: Guest Information</h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={guestData.firstName}
                onChange={(e) => setGuestData({ ...guestData, firstName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={guestData.lastName}
                onChange={(e) => setGuestData({ ...guestData, lastName: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={guestData.email}
                onChange={(e) => setGuestData({ ...guestData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={guestData.phone}
                onChange={(e) => setGuestData({ ...guestData, phone: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={guestData.country}
                onChange={(e) => setGuestData({ ...guestData, country: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passport">Passport / ID Number</Label>
              <Input
                id="passport"
                value={guestData.passport}
                onChange={(e) => setGuestData({ ...guestData, passport: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialRequests">Special Requests</Label>
            <Textarea
              id="specialRequests"
              value={guestData.specialRequests}
              onChange={(e) => setGuestData({ ...guestData, specialRequests: e.target.value })}
              placeholder="Any special requests or preferences..."
              rows={3}
            />
          </div>

          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Reservation"
              )}
            </Button>
          </div>
        </div>
      )}
    </form>
  )
}

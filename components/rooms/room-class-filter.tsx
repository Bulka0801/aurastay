"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type RoomTypeOption = {
  value: string
  label: string
}

type RoomTypeFilterProps = {
  value: string
  options: RoomTypeOption[]
}

export function RoomTypeFilter({ value, options }: RoomTypeFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleValueChange(nextValue: string) {
    const params = new URLSearchParams(searchParams.toString())

    if (nextValue === "all") {
      params.delete("roomType")
    } else {
      params.set("roomType", nextValue)
    }
    params.delete("roomCategory")

    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <Select value={value} onValueChange={handleValueChange}>
      <SelectTrigger className="w-full sm:w-[240px]" aria-label="Фільтр за типом номера">
        <SelectValue placeholder="Усі типи номерів" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Усі типи номерів</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

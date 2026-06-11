import { ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"

interface RoomMoveNoteProps {
  previousRoomNumber?: string | null
  currentRoomNumber?: string | null
  className?: string
}

export function RoomMoveNote({
  previousRoomNumber,
  currentRoomNumber,
  className,
}: RoomMoveNoteProps) {
  if (!previousRoomNumber || previousRoomNumber === currentRoomNumber) return null

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs text-blue-900",
        className,
      )}
    >
      <span>Переміщено з номера</span>
      <span className="font-semibold">№ {previousRoomNumber}</span>
      {currentRoomNumber && (
        <>
          <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          <span className="font-semibold">№ {currentRoomNumber}</span>
        </>
      )}
    </div>
  )
}

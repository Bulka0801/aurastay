import { AlertTriangle, BedDouble, CheckCircle2, Clock, LogOut } from "lucide-react"

import { cn } from "@/lib/utils"
import { RESERVATION_STATUS_UK } from "@/lib/i18n/uk"

const timelineSteps = [
  {
    status: "pending",
    label: RESERVATION_STATUS_UK.pending,
    // Inactive / upcoming
    idleColor: "bg-gray-50 text-gray-400 border-gray-200",
    // Completed (all steps before active)
    completedColor: "bg-green-50 text-green-700 border-green-200",
    // Active step pill colors
    activeColor: "bg-yellow-50 text-yellow-800 border-yellow-400",
    activeRing: "ring-yellow-200",
    // Connector color when this segment is completed
    connectorDone: "bg-green-400",
    icon: Clock,
  },
  {
    status: "confirmed",
    label: RESERVATION_STATUS_UK.confirmed,
    idleColor: "bg-gray-50 text-gray-400 border-gray-200",
    completedColor: "bg-green-50 text-green-700 border-green-200",
    activeColor: "bg-blue-50 text-blue-800 border-blue-500",
    activeRing: "ring-green-200",
    connectorDone: "bg-green-400",
    icon: CheckCircle2,
  },
  {
    status: "checked_in",
    label: RESERVATION_STATUS_UK.checked_in,
    idleColor: "bg-gray-50 text-gray-400 border-gray-200",
    completedColor: "bg-green-50 text-green-700 border-green-200",
    activeColor: "bg-green-50 text-green-800 border-green-500",
    activeRing: "ring-blue-200",
    connectorDone: "bg-green-400",
    icon: BedDouble,
  },
  {
    status: "checked_out",
    label: RESERVATION_STATUS_UK.checked_out,
    idleColor: "bg-gray-50 text-gray-400 border-gray-200",
    completedColor: "bg-green-50 text-green-700 border-green-200",
    activeColor: "bg-slate-100 text-slate-800 border-slate-400",
    activeRing: "ring-slate-200",
    connectorDone: "bg-green-400",
    icon: LogOut,
  },
] as const

const terminalStatusConfig: Record<
  string,
  { color: string; badgeColor: string; icon: typeof AlertTriangle; label: string }
> = {
  cancelled: {
    color: "bg-red-50 text-red-800 border-red-300",
    badgeColor: "bg-red-100 text-red-700",
    icon: AlertTriangle,
    label: "Скасовано",
  },
  no_show: {
    color: "bg-orange-50 text-orange-800 border-orange-300",
    badgeColor: "bg-orange-100 text-orange-700",
    icon: AlertTriangle,
    label: "Не з'явився",
  },
}

type ReservationStatusTimelineProps = {
  status: string
}

export function ReservationStatusTimeline({ status }: ReservationStatusTimelineProps) {
  const activeStepIndex = timelineSteps.findIndex((step) => step.status === status)
  const terminalStatus = terminalStatusConfig[status]

  // ── Terminal statuses (cancelled / no_show) ──────────────────────────────
  if (terminalStatus) {
    const Icon = terminalStatus.icon

    return (
      <div className="rounded-lg border bg-white p-4">
        {/* Ghost stepper — gives context of where the process was interrupted */}
        <div className="mb-3 grid grid-cols-4 gap-0" aria-hidden="true">
          {timelineSteps.map((step, index) => {
            const StepIcon = step.icon
            return (
              <div key={step.status} className="relative flex flex-col items-center gap-1.5">
                {/* Ghost connector */}
                {index < timelineSteps.length - 1 && (
                  <div className="absolute left-1/2 top-3.5 hidden h-px w-full border-t border-dashed border-gray-200 sm:block" />
                )}
                <div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-gray-50">
                  <StepIcon className="h-3 w-3 text-gray-300" />
                </div>
                <span className="text-center text-[10px] text-gray-300 leading-tight">{step.label}</span>
              </div>
            )
          })}
        </div>

        {/* Terminal badge */}
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "flex items-center gap-2.5 rounded-md border px-3 py-2.5 text-sm font-medium",
            terminalStatus.color,
          )}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{RESERVATION_STATUS_UK[status as keyof typeof RESERVATION_STATUS_UK] ?? status}</span>
        </div>
      </div>
    )
  }

  // ── Normal stepper ────────────────────────────────────────────────────────
  return (
    <div className="rounded-lg border bg-white p-4">
      <div
        className="grid grid-cols-2 gap-y-3 sm:grid-cols-4 sm:gap-y-0"
        role="list"
        aria-label="Статус бронювання"
      >
        {timelineSteps.map((step, index) => {
          const Icon = step.icon
          const isActive = index === activeStepIndex
          const isCompleted = activeStepIndex > index
          const isLast = index === timelineSteps.length - 1

          // Connector segment: completed = green solid, otherwise dashed gray
          const connectorCompleted = activeStepIndex > index
          const connectorIsActive = activeStepIndex === index

          return (
            <div
              key={step.status}
              className="relative flex flex-col items-start sm:items-center"
              role="listitem"
              aria-current={isActive ? "step" : undefined}
            >
              {/* ── Connector line (hidden on last item) ── */}
              {!isLast && (
                <div
                  className="absolute left-[calc(50%+16px)] top-3.5 hidden h-px w-[calc(100%-32px)] sm:block"
                  aria-hidden="true"
                >
                  <div
                    className={cn(
                      "h-full w-full transition-colors duration-300",
                      connectorCompleted
                        ? "bg-green-400"
                        : connectorIsActive
                          ? "bg-gradient-to-r from-green-300 to-gray-200"
                          : "border-t border-dashed border-gray-200",
                    )}
                  />
                </div>
              )}

              {/* ── Step icon circle ── */}
              <div className="relative z-10 flex flex-col items-center gap-1.5 sm:items-center">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-200",
                    isCompleted && "border-green-400 bg-green-50",
                    isActive &&
                      cn(
                        "border-current bg-white shadow-sm ring-2 ring-offset-2",
                        step.activeColor,
                        step.activeRing,
                      ),
                    !isActive && !isCompleted && "border-gray-200 bg-gray-50",
                  )}
                  aria-hidden="true"
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <Icon
                      className={cn(
                        "h-3.5 w-3.5 transition-colors",
                        isActive ? "text-current" : "text-gray-300",
                      )}
                    />
                  )}
                </div>

                {/* ── Label + badge ── */}
                <div className="flex flex-col items-center gap-0.5">
                  <span
                    className={cn(
                      "text-center text-[11px] font-medium leading-tight transition-colors",
                      isCompleted && "text-green-700",
                      isActive && "text-gray-900",
                      !isActive && !isCompleted && "text-gray-400",
                    )}
                  >
                    {step.label}
                  </span>

                  {/* "Зараз" / "Завершено" badge only on active or final completed step */}
                  {isActive && (
                    <span className="rounded-full bg-gray-100 px-1.5 py-px text-[10px] font-medium text-gray-500">
                      Зараз
                    </span>
                  )}
                  {!isActive && isCompleted && index === activeStepIndex - 1 && activeStepIndex === timelineSteps.length && (
                    <span className="rounded-full bg-green-100 px-1.5 py-px text-[10px] font-medium text-green-700">
                      Завершено
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}
"use client"

import type React from "react"
import { cn } from "@/lib/utils"
import { NewReservationFormProvider, useNewReservationForm, type NewReservationFormProps } from "./form-context"
import { StepDatesGuests } from "./steps/step-dates-guests"
import { StepRoomRate } from "./steps/step-room-rate"
import { StepGuestConfirm } from "./steps/step-guest-confirm"

function NewReservationFormCoordinator() {
  const { step, handleSubmit } = useNewReservationForm()

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Steps header */}
      <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {[
          { n: 1, label: "Дати та гості" },
          { n: 2, label: "Номер і тариф" },
          { n: 3, label: "Гість і підтвердження" },
        ].map((s, i) => (
          <li key={s.n} className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold",
                step === s.n
                  ? "border-primary bg-primary text-primary-foreground"
                  : step > s.n
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-background",
              )}
            >
              {s.n}
            </span>
            <span className={cn(step === s.n && "font-medium text-foreground")}>{s.label}</span>
            {i < 2 && <span className="mx-1 text-border">/</span>}
          </li>
        ))}
      </ol>

      {/* Render current step */}
      {step === 1 && <StepDatesGuests />}
      {step === 2 && <StepRoomRate />}
      {step === 3 && <StepGuestConfirm />}
    </form>
  )
}

export function NewReservationForm(props: NewReservationFormProps) {
  return (
    <NewReservationFormProvider {...props}>
      <NewReservationFormCoordinator />
    </NewReservationFormProvider>
  )
}

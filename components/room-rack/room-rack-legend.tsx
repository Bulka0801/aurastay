"use client";

import { RESERVATION_STATUS_UK } from "@/lib/i18n/uk";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { BedDouble, Sparkles, Wrench, X } from "lucide-react";
import type { ReactNode } from "react";
import type {
  RackReservationStatusFilter,
  RackRoomStateFilter,
} from "@/lib/room-rack/filters";
import { STATUS_BG, STATUS_BORDER } from "./reservation-block";

interface Props {
  onClose: () => void;
  activeRoomState: RackRoomStateFilter;
  activeReservationStatus: RackReservationStatusFilter;
  showInactiveReservations: boolean;
  onRoomStateChange: (status: RackRoomStateFilter) => void;
  onReservationStatusChange: (status: RackReservationStatusFilter) => void;
  onShowInactiveReservationsChange: (checked: boolean) => void;
}

const reservationStatuses: Array<keyof typeof RESERVATION_STATUS_UK> = [
  "pending",
  "confirmed",
  "checked_in",
  "checked_out",
  "cancelled",
  "no_show",
];

const inactiveReservationStatuses = new Set<keyof typeof RESERVATION_STATUS_UK>(
  ["cancelled", "no_show"]
);

export function RoomRackLegend({
  onClose,
  activeRoomState,
  activeReservationStatus,
  showInactiveReservations,
  onRoomStateChange,
  onReservationStatusChange,
  onShowInactiveReservationsChange,
}: Props) {
  return (
    <div className="border-b bg-muted/40 px-3 py-2 md:px-4">
      <div className="grid items-start gap-2 lg:grid-cols-[1.25fr_1fr]">
        <section className="rounded-lg border border-border/60 bg-background/70 p-2.5 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Як читати шахматку
            </h3>
          </div>

          <div className="space-y-1.5 text-xs">
            <LegendRow
              icon={<BedDouble className="h-3.5 w-3.5" />}
              title="Проживання"
              activeRoomState={activeRoomState}
              onRoomStateChange={onRoomStateChange}
              items={[
                {
                  color: "border-slate-300 bg-white",
                  label: "вільний",
                  filter: "occupancy:vacant",
                },
                {
                  color: "border-blue-600 bg-blue-600",
                  label: "зайнятий",
                  filter: "occupancy:occupied",
                },
              ]}
            />

            <LegendRow
              icon={<Sparkles className="h-3.5 w-3.5" />}
              title="Прибирання"
              activeRoomState={activeRoomState}
              onRoomStateChange={onRoomStateChange}
              items={[
                {
                  color: "border-sky-300 bg-sky-100",
                  label: "чистий",
                  filter: "housekeeping:clean",
                },
                {
                  color: "border-rose-600 bg-rose-600",
                  label: "брудний",
                  filter: "housekeeping:dirty",
                },
                {
                  color: "border-amber-500 bg-amber-100",
                  label: "прибирається",
                  filter: "housekeeping:cleaning",
                },
                {
                  color: "border-violet-600 bg-violet-600",
                  label: "на перевірці",
                  filter: "housekeeping:inspecting",
                },
                {
                  color: "border-teal-600 bg-teal-600",
                  label: "перевірено",
                  filter: "housekeeping:inspected",
                },
              ]}
            />

            <LegendRow
              icon={<Wrench className="h-3.5 w-3.5" />}
              title="Технічний стан"
              activeRoomState={activeRoomState}
              onRoomStateChange={onRoomStateChange}
              items={[
                {
                  color: "border-emerald-300 bg-emerald-100",
                  label: "справний",
                  filter: "operational:operational",
                },
                {
                  color: "border-orange-500 bg-orange-100",
                  label: "техобслуговування",
                  filter: "operational:maintenance",
                },
                {
                  color: "border-red-700 bg-red-700",
                  label: "не в експлуатації",
                  filter: "operational:out_of_order",
                },
                {
                  color: "border-slate-600 bg-slate-600",
                  label: "тимчасово недоступний",
                  filter: "operational:blocked",
                },
              ]}
            />

            <div className="flex items-center gap-2 pt-1 text-[11px] leading-4 text-muted-foreground">
              <span
                className="h-3.5 w-6 shrink-0 rounded border border-slate-300 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(100,116,139,0.25)_4px,rgba(100,116,139,0.25)_8px)]"
                aria-hidden="true"
              />

              <span>штрихування — номер недоступний</span>
            </div>

            <p className="pt-1 text-[11px] leading-4 text-muted-foreground">
              Повторний клік по активному фільтру скидає його.
            </p>
          </div>
        </section>

        <section className="relative rounded-lg border border-border/60 bg-background/70 p-2.5 shadow-sm">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Статус бронювання
          </h3>

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-7 w-7 shrink-0"
            onClick={onClose}
            aria-label="Закрити легенду"
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="flex flex-wrap gap-1.5">
            {reservationStatuses.map((s) => (
              <StatusChipButton
                key={s}
                active={activeReservationStatus === s}
                disabled={
                  inactiveReservationStatuses.has(s) &&
                  !showInactiveReservations
                }
                className={cn(STATUS_BG[s], STATUS_BORDER[s])}
                activeClassName="ring-2 ring-primary/25 shadow-sm"
                onClick={() =>
                  onReservationStatusChange(
                    activeReservationStatus === s ? "all" : s
                  )
                }
              >
                <span className="h-2 w-2 rounded-full bg-current opacity-70" />
                <span className="font-medium">{RESERVATION_STATUS_UK[s]}</span>
              </StatusChipButton>
            ))}
          </div>

          <label className="mt-2 flex items-center gap-2 rounded-md border border-border/70 bg-muted/30 px-2 py-1.5 text-[11px] leading-4">
            <Checkbox
              checked={showInactiveReservations}
              onCheckedChange={(checked) =>
                onShowInactiveReservationsChange(checked === true)
              }
              aria-label="Показувати скасовані та no-show бронювання"
            />

            <span className="text-muted-foreground">
              Показувати скасовані та no-show
            </span>
          </label>
        </section>
      </div>
    </div>
  );
}

function LegendRow({
  icon,
  title,
  items,
  activeRoomState,
  onRoomStateChange,
}: {
  icon: ReactNode;
  title: string;
  items: Array<{
    color: string;
    label: string;
    filter: RackRoomStateFilter;
  }>;
  activeRoomState: RackRoomStateFilter;
  onRoomStateChange: (status: RackRoomStateFilter) => void;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-start gap-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="font-medium text-foreground">{title}</span>
      </div>

      <div className="flex flex-wrap gap-x-2 gap-y-1">
        {items.map((item) => (
          <LegendColorItem
            key={item.label}
            color={item.color}
            label={item.label}
            active={activeRoomState === item.filter}
            onClick={() =>
              onRoomStateChange(
                activeRoomState === item.filter ? "all" : item.filter
              )
            }
          />
        ))}
      </div>
    </div>
  );
}

function LegendColorItem({
  color,
  label,
  active,
  onClick,
}: {
  color: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded border bg-background px-2 py-0.5 text-[11px] leading-4 text-muted-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active
          ? "border-primary bg-primary/10 text-foreground shadow-sm"
          : "hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <span className={cn("h-2.5 w-2.5 rounded-full border", color)} />
      <span>{label}</span>
    </button>
  );
}

function StatusChipButton({
  active,
  className,
  activeClassName,
  disabled,
  children,
  onClick,
}: {
  active: boolean;
  className?: string;
  activeClassName?: string;
  disabled?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
        disabled && "cursor-not-allowed opacity-45",
        active
          ? activeClassName
          : !disabled && "hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {children}
    </button>
  );
}

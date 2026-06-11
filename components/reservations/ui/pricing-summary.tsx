"use client"

import React from "react"
import { formatMoney } from "@/lib/format"
import { useNewReservationForm } from "../form-context"

export function PricingSummary() {
  const {
    hotelSettings,
    roomType,
    ratePlan,
    nights,
    baseAmount,
    discount,
    totalAmount,
    prepaymentDue,
    prepaymentRequired,
  } = useNewReservationForm()

  if (!roomType || !ratePlan || nights <= 0) return null

  return (
    <div className="rounded-lg border bg-muted/40 p-4">
      <h4 className="mb-2 font-semibold text-foreground">Підсумок вартості</h4>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Ночей:</span>
          <span>{nights}</span>
        </div>
        <div className="flex justify-between">
          <span>Базова вартість:</span>
          <span>{formatMoney(baseAmount, hotelSettings, { maximumFractionDigits: 0 })}</span>
        </div>
        {ratePlan.discount_percentage > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>Знижка ({ratePlan.discount_percentage}%):</span>
            <span>−{formatMoney(discount, hotelSettings, { maximumFractionDigits: 0 })}</span>
          </div>
        )}
        <div className="flex justify-between border-t pt-2 font-semibold text-foreground">
          <span>Разом:</span>
          <span>{formatMoney(totalAmount, hotelSettings, { maximumFractionDigits: 0 })}</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {prepaymentRequired
              ? `Передплата для підтвердження (${hotelSettings.prepayment_percent}%):`
              : "Передплата для підтвердження:"}
          </span>
          <span>{prepaymentRequired ? formatMoney(prepaymentDue, hotelSettings, { maximumFractionDigits: 0 }) : "Не вимагається"}</span>
        </div>
      </div>
    </div>
  )
}

export type HotelSettings = {
  prepayment_required: boolean
  prepayment_percent: number
  default_checkin_time: string
  default_checkout_time: string
  currency: string
  locale: string
  updated_at?: string | null
}

export const DEFAULT_HOTEL_SETTINGS: HotelSettings = {
  prepayment_required: true,
  prepayment_percent: 10,
  default_checkin_time: "14:00",
  default_checkout_time: "12:00",
  currency: "UAH",
  locale: "uk-UA",
  updated_at: null,
}

export function normalizeHotelSettings(settings?: Partial<HotelSettings> | null): HotelSettings {
  return {
    ...DEFAULT_HOTEL_SETTINGS,
    ...settings,
    prepayment_required: settings?.prepayment_required ?? DEFAULT_HOTEL_SETTINGS.prepayment_required,
    prepayment_percent: Number(settings?.prepayment_percent ?? DEFAULT_HOTEL_SETTINGS.prepayment_percent),
    default_checkin_time: String(settings?.default_checkin_time ?? DEFAULT_HOTEL_SETTINGS.default_checkin_time).slice(0, 5),
    default_checkout_time: String(settings?.default_checkout_time ?? DEFAULT_HOTEL_SETTINGS.default_checkout_time).slice(0, 5),
    currency: String(settings?.currency ?? DEFAULT_HOTEL_SETTINGS.currency).trim().toUpperCase(),
    locale: String(settings?.locale ?? DEFAULT_HOTEL_SETTINGS.locale).trim() || DEFAULT_HOTEL_SETTINGS.locale,
  }
}

workspace "AuraStay check-in diagrams" "Paste this DSL into Structurizr to view the check-in page diagrams." {
  model {
    staff = person "Hotel staff" "Front desk user who checks guests in."

    supabase = softwareSystem "Supabase" "Auth, database and API backend." {
      tags "External"
    }

    nextRuntime = softwareSystem "Next.js runtime" "App Router, server components, client components and navigation." {
      tags "External"
    }

    lucide = softwareSystem "lucide-react" "Icon library used by the UI." {
      tags "External"
    }

    aura = softwareSystem "AuraStay" "Hotel management system." {
      web = container "Next.js web app" "Dashboard application for hotel operations." "Next.js, React, TypeScript" {
        checkInPage = component "app/dashboard/front-desk/check-in/[id]/page.tsx" "Server route for guest check-in. Reads reservation, hotel settings, current user profile and available rooms." "Server Component"
        checkInForm = component "components/front-desk/check-in-form.tsx" "Client form that validates status, room readiness, prepayment and early check-in, then performs check-in writes." "Client Component"
        reservationActions = component "components/reservations/reservation-actions.tsx" "Conditional actions shown when the reservation period has expired." "Client Component"
        roomMoveNote = component "components/reservations/room-move-note.tsx" "Displays previous/current room move context." "UI Component"

        uiAlert = component "Alert" "Warning/error blocks for blocked check-in, early check-in and runtime errors." "UI primitive"
        uiBadge = component "Badge" "Status labels for reservation and room state." "UI primitive"
        uiButton = component "Button" "Quick payment buttons and final submit button." "UI primitive"
        uiCard = component "Card" "Main layout cards: reservation details and check-in controls." "UI primitive"
        uiInput = component "Input" "Payment amount input." "UI primitive"
        uiRadio = component "RadioGroup" "Available room picker." "UI primitive"
        uiSelect = component "Select" "Payment method selector." "UI primitive"
        uiTextarea = component "Textarea" "Early check-in reason and check-in notes." "UI primitive"
        uiCheckbox = component "Checkbox" "Early check-in confirmation." "UI primitive"

        rulesPrepayment = component "lib/rules/prepayment.ts" "Required prepayment, remaining prepayment and prepayment satisfied checks." "Business rules"
        rulesPayments = component "lib/rules/payments.ts" "Settled payment totals." "Business rules"
        rulesTransitions = component "lib/rules/transitions.ts" "Reservation status transition rules." "Business rules"
        roomAvailability = component "lib/rooms/availability.ts" "Room readiness and blocking reasons for check-in." "Business rules"
        hotelSettings = component "lib/hotel-settings.ts" "Normalizes hotel settings used by the page and form." "Domain helper"
        formatting = component "lib/format.ts" "Money and nights formatting/calculation helpers." "Domain helper"
        localization = component "lib/localization.ts + lib/i18n/uk.ts" "Ukrainian labels for statuses, payment methods and room states." "Localization"
        supabaseServer = component "lib/supabase/server.ts" "Supabase server client for route data loading." "Data access"
        supabaseClient = component "lib/supabase/client.ts" "Supabase browser client for submit mutations." "Data access"

        rbHeader = component "Header block" "Page title and helper text." "Render block" {
          tags "RenderBlock"
        }
        rbReads = component "Server data reads" "Auth user, reservation, hotel_settings, profile, rooms and overlapping reservation_rooms." "Render block" {
          tags "DataBlock"
        }
        rbDetails = component "Reservation details card" "Reservation number, guest, dates, nights, guests, total, paid amount, balance and prepayment progress." "Render block" {
          tags "RenderBlock"
        }
        rbCheckIn = component "Check-in controls card" "Room choice/state, early check-in guard, payment controls, notes, blockers, errors and submit." "Render block" {
          tags "RenderBlock"
        }
        rbAssignedRoom = component "Assigned room state" "Assigned room number, type, readiness badge and RoomMoveNote." "Render block" {
          tags "RenderBlock"
        }
        rbRoomPicker = component "Available rooms picker" "Radio list of vacant, operational, clean/inspected rooms without date conflicts." "Render block" {
          tags "RenderBlock"
        }
        rbEarly = component "Early check-in guard" "Alert, confirmation checkbox and optional reason textarea." "Render block" {
          tags "RenderBlock"
        }
        rbPayment = component "Payment block" "Payment amount input, quick-fill buttons and payment method select." "Render block" {
          tags "RenderBlock"
        }
        rbNotes = component "Notes block" "Optional check-in notes textarea." "Render block" {
          tags "RenderBlock"
        }
        rbBlockers = component "Blockers and errors" "Validation messages for status, expired period, room readiness, prepayment, overpay and early check-in." "Render block" {
          tags "RenderBlock"
        }
        rbSubmit = component "Submit button" "Disabled until canSubmit is true; calls handleCheckIn." "Render block" {
          tags "RenderBlock"
        }
        rbWrites = component "Client submit writes" "Re-check room, insert/update reservation_rooms, insert payment, verify prepayment, update reservation checked_in." "Render block" {
          tags "DataBlock"
        }
      }
    }

    staff -> checkInPage "opens /dashboard/front-desk/check-in/{id}"
    staff -> rbSubmit "clicks confirm check-in"
    checkInPage -> nextRuntime "runs as App Router page"
    checkInPage -> supabaseServer "creates server client"
    checkInPage -> rbReads "loads data"
    rbReads -> supabase "queries auth and hotel data"
    checkInPage -> hotelSettings "normalizes settings"
    checkInPage -> roomAvailability "filters ready available rooms"
    checkInPage -> reservationActions "conditionally renders expired-reservation actions"
    checkInPage -> checkInForm "renders with reservation, availableRooms and hotelSettings"

    checkInForm -> rbDetails "renders"
    checkInForm -> rbCheckIn "renders"
    checkInForm -> formatting "formats money and nights"
    checkInForm -> hotelSettings "normalizes settings"
    checkInForm -> rulesPrepayment "checks required prepayment"
    checkInForm -> rulesPayments "calculates paid total"
    checkInForm -> rulesTransitions "checks transition to checked_in"
    checkInForm -> roomAvailability "checks room readiness"
    checkInForm -> localization "formats Ukrainian labels"
    checkInForm -> supabaseClient "creates browser client"
    checkInForm -> lucide "uses AlertCircle, CheckCircle, Loader2, LockKeyhole"

    rbDetails -> uiCard "uses"
    rbDetails -> uiBadge "uses"
    rbCheckIn -> uiCard "uses"
    rbCheckIn -> rbAssignedRoom "if room is assigned"
    rbAssignedRoom -> roomMoveNote "renders"
    rbAssignedRoom -> uiBadge "shows room state"
    rbCheckIn -> rbRoomPicker "if room is not assigned"
    rbRoomPicker -> uiRadio "uses"
    rbRoomPicker -> uiBadge "shows room readiness/type"
    rbCheckIn -> rbEarly "if today is before planned check-in"
    rbEarly -> uiAlert "uses"
    rbEarly -> uiCheckbox "uses"
    rbEarly -> uiTextarea "uses"
    rbCheckIn -> rbPayment "if balance remains"
    rbPayment -> uiInput "uses"
    rbPayment -> uiButton "uses"
    rbPayment -> uiSelect "uses"
    rbCheckIn -> rbNotes "always renders"
    rbNotes -> uiTextarea "uses"
    rbCheckIn -> rbBlockers "when blocked or error exists"
    rbBlockers -> uiAlert "uses"
    rbCheckIn -> rbSubmit "renders"
    rbSubmit -> uiButton "uses"
    rbSubmit -> rbWrites "calls handleCheckIn"
    rbWrites -> supabase "mutates rooms/reservation_rooms/payments/reservations"
    rbSubmit -> nextRuntime "router.push and router.refresh after success"
  }

  views {
    systemContext aura "01_System_Context" {
      include *
      autolayout lr
      title "AuraStay check-in context"
    }

    container aura "02_Containers" {
      include *
      autolayout lr
      title "AuraStay check-in containers"
    }

    component web "03_CheckIn_Render" {
      include checkInPage
      include checkInForm
      include reservationActions
      include roomMoveNote
      include rbHeader
      include rbReads
      include rbDetails
      include rbCheckIn
      include rbAssignedRoom
      include rbRoomPicker
      include rbEarly
      include rbPayment
      include rbNotes
      include rbBlockers
      include rbSubmit
      include supabase
      include nextRuntime
      include lucide
      autolayout lr
      title "Check-in page render tree"
    }

    component web "04_CheckIn_Dependencies" {
      include checkInPage
      include checkInForm
      include supabaseServer
      include supabaseClient
      include hotelSettings
      include formatting
      include rulesPrepayment
      include rulesPayments
      include rulesTransitions
      include roomAvailability
      include localization
      include supabase
      include nextRuntime
      include lucide
      autolayout lr
      title "Check-in imports and business dependencies"
    }

    dynamic web "05_CheckIn_Submit_Flow" {
      staff -> rbSubmit "clicks confirm check-in"
      rbSubmit -> rbWrites "handleCheckIn starts"
      rbWrites -> supabase "re-check room, write reservation room, payment and checked_in status"
      rbSubmit -> nextRuntime "navigate to /dashboard/front-desk and refresh"
      autolayout lr
      title "Check-in submit flow"
    }

    styles {
      element "Person" {
        shape Person
        background "#334155"
        color "#ffffff"
      }
      element "Software System" {
        background "#2563eb"
        color "#ffffff"
      }
      element "External" {
        background "#6b7280"
        color "#ffffff"
      }
      element "Container" {
        background "#0f766e"
        color "#ffffff"
      }
      element "Component" {
        background "#ffffff"
        color "#111827"
        stroke "#64748b"
      }
      element "RenderBlock" {
        shape RoundedBox
        background "#fff7ed"
        color "#7c2d12"
        stroke "#fb923c"
      }
      element "DataBlock" {
        shape Cylinder
        background "#ecfeff"
        color "#155e75"
        stroke "#06b6d4"
      }
    }
  }
}

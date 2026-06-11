-- One-time reconciliation for historical rows discovered by migration 025.
-- This script repairs only facts that can be derived from existing relations.
-- It does not create payments or invent employee actions.

BEGIN;

-- A checked-in reservation is authoritative evidence that its assigned room
-- is occupied. Migration 026 will later split this into occupancy_status.
UPDATE public.rooms rooms
SET status = 'occupied'
WHERE EXISTS (
  SELECT 1
  FROM public.reservation_rooms rr
  JOIN public.reservations r ON r.id = rr.reservation_id
  WHERE rr.room_id = rooms.id
    AND r.status::text = 'checked_in'
)
  AND rooms.status::text IS DISTINCT FROM 'occupied';

-- The concrete room is authoritative for the room type of an assignment.
UPDATE public.reservation_rooms rr
SET room_type_id = rooms.room_type_id
FROM public.rooms rooms
WHERE rr.room_id = rooms.id
  AND rr.room_type_id IS DISTINCT FROM rooms.room_type_id;

-- If a historical task started before its recorded creation timestamp, the
-- task necessarily existed by started_at. Move created_at back without
-- changing the operational start/completion history.
UPDATE public.housekeeping_tasks
SET created_at = started_at
WHERE started_at IS NOT NULL
  AND started_at < created_at;

-- Older UI versions changed status to inspected without storing who confirmed
-- it. Preserve that limitation explicitly instead of attributing the action to
-- the cleaner or to the person running this migration.
UPDATE public.housekeeping_tasks
SET
  inspected_at = COALESCE(inspected_at, completed_at),
  notes = concat_ws(
    E'\n',
    NULLIF(notes, ''),
    '[Історична інспекція: виконавець не зафіксований]'
  )
WHERE status::text = 'inspected'
  AND inspected_by IS NULL
  AND completed_at IS NOT NULL
  AND COALESCE(notes, '') NOT LIKE
    '%[Історична інспекція: виконавець не зафіксований]%';

-- Preserve the truth that the old maintenance record has no detailed result,
-- while satisfying the new requirement that completed work has a resolution.
UPDATE public.maintenance_requests
SET resolution = 'Історичний запис: результат виконання не зафіксовано.'
WHERE status::text = 'completed'
  AND public.fn_clean_text(resolution) IS NULL;

-- audit_logs.entity_id is UUID, while the legacy hotel_settings singleton did
-- not have a compatible UUID. Preserve its former type in changes and clear
-- the invalid entity pair.
UPDATE public.audit_logs
SET
  changes = COALESCE(changes, '{}'::jsonb)
    || jsonb_build_object('legacy_entity_type', entity_type),
  entity_type = NULL
WHERE entity_type IS NOT NULL
  AND entity_id IS NULL;

COMMIT;

-- Manual finance decision required: record a real payment if money was
-- received, or add an explicit approved adjustment/write-off. Do not invent a
-- payment merely to make this result empty.
SELECT
  r.id,
  r.reservation_number,
  r.total_amount,
  public.fn_reservation_net_paid(r.id) AS net_paid,
  public.reservation_folio_balance(r.id) AS unresolved_balance
FROM public.reservations r
WHERE r.status::text = 'checked_out'
  AND public.reservation_folio_balance(r.id) > 0.01
ORDER BY r.reservation_number;

-- OPTIONAL, RUN ONLY AFTER CONFIRMING THAT THE HOTEL ACTUALLY RECEIVED CASH.
-- This block is intentionally commented out. It records the four confirmed
-- historical payments using each reservation's check-out date and canonical
-- folio. The migration marker makes reruns idempotent.
/*
WITH historical_payments(reservation_id, amount) AS (
  VALUES
    ('6c08fef8-8f33-493a-bf8c-6db77760f2b0'::uuid, 1530.00::numeric),
    ('0c0b253a-1b05-4201-821a-b88bb15122c4'::uuid, 600.00::numeric),
    ('90332cde-eaa8-40e5-8aa4-5ab98d8997b2'::uuid, 765.00::numeric),
    ('66dbecb1-7756-4c40-a031-7b2be8e8013f'::uuid, 75.00::numeric)
)
INSERT INTO public.payments (
  reservation_id,
  folio_id,
  amount,
  payment_method,
  payment_status,
  transaction_type,
  payment_date,
  status_changed_at,
  notes
)
SELECT
  r.id,
  f.id,
  historical.amount,
  'cash'::public.payment_method,
  'paid'::public.payment_status,
  'payment',
  (r.check_out_date::timestamp + time '12:00')
    AT TIME ZONE 'Europe/Kyiv',
  (r.check_out_date::timestamp + time '12:00')
    AT TIME ZONE 'Europe/Kyiv',
  '[MIGRATION-20260610-HISTORICAL-CASH] Історичний платіж: гроші фактично отримані.'
FROM historical_payments historical
JOIN public.reservations r ON r.id = historical.reservation_id
JOIN public.folios f ON f.reservation_id = r.id
WHERE NOT EXISTS (
  SELECT 1
  FROM public.payments existing
  WHERE existing.reservation_id = r.id
    AND existing.transaction_type = 'payment'
    AND existing.notes LIKE
      '[MIGRATION-20260610-HISTORICAL-CASH]%'
);
*/

-- Expected: zero rows. Old inspected tasks are marked honestly as legacy
-- records when the original inspector cannot be reconstructed.
SELECT
  id,
  room_id,
  assigned_to,
  completed_at,
  inspected_at,
  inspected_by
FROM public.housekeeping_tasks
WHERE status::text = 'inspected'
  AND (
    inspected_at IS NULL
    OR (
      inspected_by IS NULL
      AND COALESCE(notes, '') NOT LIKE
        '%[Історична інспекція: виконавець не зафіксований]%'
    )
  )
ORDER BY completed_at;

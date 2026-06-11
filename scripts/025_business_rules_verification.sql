-- Read-only verification for canonical BR-01..BR-26 after migration 024.
-- Expected: required objects exist; all issue queries return zero rows.

-- 1. Canonical functions.
SELECT required.function_name,
       to_regprocedure(required.signature) IS NOT NULL AS exists
FROM (VALUES
  ('users normalization', 'public.trg_users_normalize_validate()'),
  ('guests normalization', 'public.trg_guests_normalize_validate()'),
  ('required prepayment', 'public.reservation_required_prepayment(numeric)'),
  ('folio balance', 'public.reservation_folio_balance(uuid)'),
  ('status transitions', 'public.reservation_transition_allowed(text,text)'),
  ('reservation lifecycle', 'public.trg_reservations_canonical_lifecycle()'),
  ('check-in validation', 'public.fn_validate_reservation_checkin(uuid)'),
  ('manager late check-in', 'public.manager_late_check_in_reservation(uuid,text)'),
  ('payment synchronization', 'public.sync_finance_from_payment()'),
  ('reservation room validation', 'public.trg_reservation_rooms_canonical_validate()'),
  ('reservation room effects', 'public.trg_reservations_room_side_effects()'),
  ('housekeeping validation', 'public.trg_housekeeping_tasks_validate()'),
  ('maintenance validation', 'public.trg_maintenance_requests_validate()'),
  ('notification validation', 'public.trg_notifications_validate()'),
  ('updated_at', 'public.fn_set_updated_at()')
) AS required(function_name, signature)
ORDER BY required.function_name;

-- 2. Canonical triggers.
SELECT expected.table_name,
       expected.trigger_name,
       trigger_state.tgenabled,
       trigger_state.tgname IS NOT NULL AS exists
FROM (VALUES
  ('users', 'trg_users_normalize_validate'),
  ('guests', 'trg_guests_normalize_validate'),
  ('room_types', 'trg_room_types_validate'),
  ('rooms', 'trg_rooms_normalize_validate'),
  ('reservations', 'trg_reservations_canonical_lifecycle'),
  ('reservations', 'trg_reservations_room_side_effects'),
  ('reservation_rooms', 'trg_reservation_rooms_canonical_validate'),
  ('reservation_rooms', 'prevent_active_reservation_room_overlap_before_write'),
  ('payments', 'trg_finance_validate_payment'),
  ('payments', 'trg_finance_sync_payment'),
  ('folios', 'trg_folios_canonical_validate'),
  ('folio_charges', 'trg_folio_charges_canonical_validate'),
  ('folio_charges', 'trg_finance_sync_charge'),
  ('inventory_transactions', 'trg_inventory_transactions_apply'),
  ('housekeeping_tasks', 'trg_housekeeping_tasks_validate'),
  ('housekeeping_tasks', 'trg_housekeeping_tasks_room_side_effects'),
  ('maintenance_requests', 'trg_maintenance_requests_validate'),
  ('maintenance_requests', 'trg_maintenance_requests_room_side_effects'),
  ('notifications', 'trg_notifications_validate')
) AS expected(table_name, trigger_name)
LEFT JOIN LATERAL (
  SELECT t.tgname, t.tgenabled
  FROM pg_trigger t
  WHERE t.tgrelid = format('public.%I', expected.table_name)::regclass
    AND t.tgname = expected.trigger_name
    AND NOT t.tgisinternal
) trigger_state ON true
ORDER BY expected.table_name, expected.trigger_name;

-- 3. Legacy triggers that must no longer exist.
SELECT t.tgrelid::regclass AS table_name,
       t.tgname AS conflicting_trigger
FROM pg_trigger t
WHERE NOT t.tgisinternal
  AND t.tgname IN (
    'trg_reservations_validate_lifecycle',
    'guard_reservation_check_in_room_status_before_update',
    'sync_reservation_paid_amount_on_payments',
    'trg_payments_sync',
    'trg_payments_sync_reservation',
    'update_folio_on_payment',
    'trg_payments_auto_confirm_reservation',
    'validate_reservation_room_period_before_write',
    'trg_validate_reservation_room_period',
    'trg_folios_validate'
  )
ORDER BY table_name, conflicting_trigger;

-- 4. BR-01 users.
SELECT id, employee_id, email, first_name, last_name
FROM public.users
WHERE employee_id !~ '^EMP[0-9]{3}$'
   OR public.fn_clean_text(first_name) IS NULL
   OR public.fn_clean_text(last_name) IS NULL
   OR NOT public.fn_is_valid_email(email);

SELECT lower(email) AS normalized_email, count(*)
FROM public.users
GROUP BY lower(email)
HAVING count(*) > 1;

SELECT upper(employee_id) AS normalized_employee_id, count(*)
FROM public.users
GROUP BY upper(employee_id)
HAVING count(*) > 1;

-- 5. BR-02 guests.
SELECT id, first_name, last_name, email, phone, passport_number, id_number, date_of_birth
FROM public.guests
WHERE public.fn_clean_text(first_name) IS NULL
   OR public.fn_clean_text(last_name) IS NULL
   OR (public.fn_clean_text(email) IS NULL AND public.fn_clean_text(phone) IS NULL)
   OR (
     public.fn_clean_text(passport_number) IS NULL
     AND public.fn_clean_text(id_number) IS NULL
   )
   OR NOT public.fn_is_valid_email(email)
   OR date_of_birth > current_date;

-- 6. BR-03..BR-05 rates and rooms.
SELECT count(*) AS default_rate_plan_count
FROM public.rate_plans
WHERE is_default = true
HAVING count(*) > 1;

SELECT id, code, base_occupancy, max_occupancy, base_rate, size_sqm
FROM public.room_types
WHERE public.fn_clean_text(code) IS NULL
   OR base_occupancy < 1
   OR max_occupancy < base_occupancy
   OR base_rate < 0
   OR (size_sqm IS NOT NULL AND size_sqm <= 0);

SELECT id, room_number, room_type_id
FROM public.rooms
WHERE public.fn_clean_text(room_number) IS NULL
   OR room_type_id IS NULL;

-- 7. BR-06..BR-08: reservation shape and automatic confirmation.
SELECT id, reservation_number
FROM public.reservations
WHERE guest_id IS NULL
   OR rate_plan_id IS NULL
   OR check_in_date IS NULL
   OR check_out_date IS NULL
   OR check_out_date <= check_in_date
   OR COALESCE(adults, 0) < 1
   OR COALESCE(children, 0) < 0
   OR total_amount < 0
   OR paid_amount < 0;

SELECT
  r.id,
  r.reservation_number,
  r.status,
  r.total_amount,
  public.fn_reservation_net_paid(r.id) AS net_paid,
  public.reservation_required_prepayment(r.total_amount) AS required_prepayment
FROM public.reservations r
WHERE r.status::text = 'pending'
  AND public.fn_reservation_net_paid(r.id) + 0.01 >=
      public.reservation_required_prepayment(r.total_amount);

-- 8. BR-09: checked-in reservations need concrete, ready rooms.
SELECT r.id,
       r.reservation_number,
       rr.id AS reservation_room_id,
       rr.room_id,
       rooms.room_number,
       rooms.status
FROM public.reservations r
LEFT JOIN public.reservation_rooms rr ON rr.reservation_id = r.id
LEFT JOIN public.rooms rooms ON rooms.id = rr.room_id
WHERE r.status::text = 'checked_in'
  AND (
    rr.id IS NULL
    OR rr.room_id IS NULL
    OR rooms.status::text <> 'occupied'
  );

-- 9. BR-10..BR-11: checkout and payment synchronization.
SELECT r.id,
       r.reservation_number,
       r.status,
       r.total_amount,
       r.paid_amount,
       public.fn_reservation_net_paid(r.id) AS calculated_paid,
       public.reservation_folio_balance(r.id) AS calculated_balance
FROM public.reservations r
WHERE abs(
        COALESCE(r.paid_amount, 0)
        - GREATEST(public.fn_reservation_net_paid(r.id), 0)
      ) > 0.01
   OR (
     r.status::text = 'checked_out'
     AND public.reservation_folio_balance(r.id) > 0.01
   );

-- 10. BR-12..BR-15: finance ownership and totals.
SELECT p.id, p.reservation_id, p.folio_id, p.transaction_type, p.payment_status
FROM public.payments p
LEFT JOIN public.folios f ON f.id = p.folio_id
WHERE p.reservation_id IS NULL
   OR p.folio_id IS NULL
   OR f.reservation_id IS DISTINCT FROM p.reservation_id
   OR p.amount <= 0
   OR (
     p.transaction_type = 'payment'
     AND p.payment_method::text = 'bank_transfer_iban'
     AND public.fn_clean_text(p.transaction_id) IS NULL
   );

SELECT f.id, f.folio_number, f.reservation_id, f.guest_id
FROM public.folios f
WHERE f.reservation_id IS NULL AND f.guest_id IS NULL;

SELECT f.id,
       f.folio_number,
       f.total_amount,
       COALESCE(charges.calculated_total, 0) AS calculated_total
FROM public.folios f
LEFT JOIN LATERAL (
  SELECT SUM(fc.amount * COALESCE(fc.quantity, 1)) AS calculated_total
  FROM public.folio_charges fc
  WHERE fc.folio_id = f.id
    AND COALESCE(fc.charge_status, 'confirmed') = 'confirmed'
) charges ON true
WHERE abs(f.total_amount - COALESCE(charges.calculated_total, 0)) > 0.01;

-- 11. BR-16..BR-17: room assignment consistency and overlap.
SELECT rr.id,
       rr.reservation_id,
       rr.room_id,
       rr.room_type_id AS assigned_room_type_id,
       rooms.room_type_id AS actual_room_type_id
FROM public.reservation_rooms rr
LEFT JOIN public.rooms rooms ON rooms.id = rr.room_id
WHERE rr.reservation_id IS NULL
   OR rr.room_type_id IS NULL
   OR rr.rate < 0
   OR (
     rr.room_id IS NOT NULL
     AND rooms.room_type_id IS DISTINCT FROM rr.room_type_id
   );

SELECT
  first_res.reservation_number AS first_reservation,
  second_res.reservation_number AS second_reservation,
  first_rr.room_id
FROM public.reservation_rooms first_rr
JOIN public.reservations first_res ON first_res.id = first_rr.reservation_id
JOIN public.reservation_rooms second_rr
  ON second_rr.room_id = first_rr.room_id
 AND second_rr.id > first_rr.id
JOIN public.reservations second_res ON second_res.id = second_rr.reservation_id
WHERE first_rr.room_id IS NOT NULL
  AND public.reservation_status_blocks_inventory(first_res.status::text)
  AND public.reservation_status_blocks_inventory(second_res.status::text)
  AND COALESCE(first_rr.check_in_time::date, first_res.check_in_date)
      < COALESCE(second_rr.check_out_time::date, second_res.check_out_date)
  AND COALESCE(first_rr.check_out_time::date, first_res.check_out_date)
      > COALESCE(second_rr.check_in_time::date, second_res.check_in_date);

-- 12. BR-18..BR-25.
SELECT id, current_stock, max_stock
FROM public.inventory_items
WHERE current_stock < 0
   OR (max_stock IS NOT NULL AND current_stock > max_stock);

SELECT id,
       room_id,
       status,
       created_at,
       started_at,
       completed_at,
       inspected_at,
       inspected_by,
       started_at IS NOT NULL AND started_at < created_at
         AS started_before_created,
       completed_at IS NOT NULL AND started_at IS NULL
         AS completed_without_start,
       status::text = 'inspected'
         AND (
           inspected_at IS NULL
           OR (
             inspected_by IS NULL
             AND COALESCE(notes, '') NOT LIKE
               '%[Історична інспекція: виконавець не зафіксований]%'
           )
         )
         AS inspected_without_metadata
FROM public.housekeeping_tasks
WHERE (started_at IS NOT NULL AND started_at < created_at)
   OR (completed_at IS NOT NULL AND started_at IS NULL)
   OR (
     status::text = 'inspected'
     AND (
       inspected_at IS NULL
       OR (
         inspected_by IS NULL
         AND COALESCE(notes, '') NOT LIKE
           '%[Історична інспекція: виконавець не зафіксований]%'
       )
     )
   )
   OR (
     inspected_at IS NOT NULL
     AND (
       completed_at IS NULL
       OR (
         inspected_by IS NULL
         AND COALESCE(notes, '') NOT LIKE
           '%[Історична інспекція: виконавець не зафіксований]%'
       )
       OR inspected_at < completed_at
     )
   );

SELECT id, request_number, status, assigned_to, assigned_at, started_at, completed_at, resolution
FROM public.maintenance_requests
WHERE (assigned_to IS NOT NULL AND assigned_at IS NULL)
   OR (started_at IS NOT NULL AND assigned_to IS NULL)
   OR (completed_at IS NOT NULL AND public.fn_clean_text(resolution) IS NULL);

SELECT id, is_read, read_at
FROM public.notifications
WHERE (is_read = true AND read_at IS NULL)
   OR (COALESCE(is_read, false) = false AND read_at IS NOT NULL);

SELECT id, action, entity_type, entity_id
FROM public.audit_logs
WHERE public.fn_clean_text(action) IS NULL
   OR ((entity_type IS NULL) <> (entity_id IS NULL));

-- 13. BR-26: every mutable table with updated_at has the canonical trigger.
SELECT expected.table_name,
       trigger_state.tgname IS NOT NULL AS has_updated_at_trigger
FROM (VALUES
  ('users'), ('guests'), ('rate_plans'), ('room_types'), ('rooms'),
  ('reservations'), ('reservation_rooms'), ('folios'), ('hotel_settings'),
  ('housekeeping_tasks'), ('inventory_items'), ('maintenance_requests')
) expected(table_name)
LEFT JOIN LATERAL (
  SELECT t.tgname
  FROM pg_trigger t
  WHERE t.tgrelid = format('public.%I', expected.table_name)::regclass
    AND t.tgname = 'trg_set_updated_at'
    AND NOT t.tgisinternal
) trigger_state ON true
ORDER BY expected.table_name;

-- 14. Acceptance case.
SELECT
  r.reservation_number,
  r.status,
  r.total_amount,
  r.paid_amount,
  public.fn_reservation_net_paid(r.id) AS calculated_paid,
  public.reservation_required_prepayment(r.total_amount) AS required_prepayment
FROM public.reservations r
WHERE r.reservation_number = 'RES54579114';

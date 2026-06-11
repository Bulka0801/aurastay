-- Read-only verification after 026_room_state_dimensions.sql.
-- Expected: object checks are true and issue queries return zero rows.

SELECT
  to_regclass('public.v_room_current_state') IS NOT NULL AS view_exists,
  to_regprocedure(
    'public.room_is_ready_for_check_in(public.room_occupancy_status,public.room_housekeeping_status,public.room_operational_status)'
  ) IS NOT NULL AS readiness_function_exists,
  to_regprocedure(
    'public.room_legacy_status(public.room_occupancy_status,public.room_housekeeping_status,public.room_operational_status)'
  ) IS NOT NULL AS compatibility_function_exists;

SELECT expected.column_name,
       columns.column_name IS NOT NULL AS exists
FROM (VALUES
  ('occupancy_status'),
  ('housekeeping_status'),
  ('operational_status')
) AS expected(column_name)
LEFT JOIN information_schema.columns columns
  ON columns.table_schema = 'public'
 AND columns.table_name = 'rooms'
 AND columns.column_name = expected.column_name
ORDER BY expected.column_name;

SELECT expected.trigger_name,
       trigger_state.tgenabled,
       trigger_state.tgname IS NOT NULL AS exists
FROM (VALUES
  ('trg_rooms_state_dimensions'),
  ('trg_reservations_room_side_effects'),
  ('trg_housekeeping_tasks_room_side_effects'),
  ('trg_maintenance_requests_room_side_effects')
) AS expected(trigger_name)
LEFT JOIN pg_trigger trigger_state
  ON trigger_state.tgname = expected.trigger_name
 AND NOT trigger_state.tgisinternal
ORDER BY expected.trigger_name;

SELECT
  id,
  room_number,
  status,
  occupancy_status,
  housekeeping_status,
  operational_status,
  public.room_legacy_status(
    occupancy_status,
    housekeeping_status,
    operational_status
  ) AS calculated_legacy_status
FROM public.rooms
WHERE status IS DISTINCT FROM public.room_legacy_status(
  occupancy_status,
  housekeeping_status,
  operational_status
);

-- Checked-in reservations must have occupied rooms.
SELECT
  r.reservation_number,
  rooms.room_number,
  rooms.occupancy_status,
  rooms.housekeeping_status,
  rooms.operational_status
FROM public.reservations r
JOIN public.reservation_rooms rr ON rr.reservation_id = r.id
JOIN public.rooms rooms ON rooms.id = rr.room_id
WHERE r.status::text = 'checked_in'
  AND rooms.occupancy_status <> 'occupied';

-- Vacant rooms may be in any housekeeping state, but occupied rooms are never
-- considered ready for another check-in.
SELECT id, room_number
FROM public.rooms
WHERE occupancy_status = 'occupied'
  AND public.room_is_ready_for_check_in(
    occupancy_status,
    housekeeping_status,
    operational_status
  );

-- Illustrates legitimate combined states such as occupied + cleaning.
SELECT
  room_number,
  occupancy_status,
  housekeeping_status,
  operational_status,
  expected_arrival,
  expected_departure,
  is_sellable,
  is_ready_for_check_in
FROM public.v_room_current_state
ORDER BY room_number;

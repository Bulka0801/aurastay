-- Historical check-in validation used by trg_reservations_validate_lifecycle.
--
-- The room availability guards in migration 010 provide additional overlap
-- and room-status protection.

CREATE OR REPLACE FUNCTION public.fn_validate_reservation_checkin(
  p_reservation_id uuid
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_room_assigned boolean;
  v_room_status text;
  v_room_number text;
BEGIN
  SELECT
    rr.room_id IS NOT NULL,
    rm.status::text,
    rm.room_number
  INTO v_room_assigned, v_room_status, v_room_number
  FROM public.reservation_rooms rr
  LEFT JOIN public.rooms rm ON rm.id = rr.room_id
  WHERE rr.reservation_id = p_reservation_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Не можна заселити бронювання %: не знайдено інформації про номер',
      p_reservation_id;
  END IF;

  IF NOT v_room_assigned THEN
    RAISE EXCEPTION
      'Не можна заселити бронювання %: не вказано конкретний номер кімнати',
      p_reservation_id;
  END IF;

  IF v_room_status NOT IN ('available', 'inspected') THEN
    RAISE EXCEPTION
      'Не можна заселити бронювання %: номер % не готовий (статус %)',
      p_reservation_id,
      v_room_number,
      v_room_status;
  END IF;
END;
$$;

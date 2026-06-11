-- Legacy finance smoke checks, updated for migration 024.
-- Use 025_business_rules_verification.sql for the complete BR-01..BR-26 audit.
-- Expected: all issue queries return zero rows or issue_count = 0.

-- 1. Required finance RPCs.
SELECT required.function_name,
       to_regprocedure(required.signature) IS NOT NULL AS exists
FROM (VALUES
  ('confirm_iban_payment', 'public.confirm_iban_payment(uuid)'),
  ('fail_iban_payment', 'public.fail_iban_payment(uuid,text)'),
  ('create_refund', 'public.create_refund(uuid,numeric,public.payment_method,text,text)'),
  ('complete_refund', 'public.complete_refund(uuid)'),
  ('fail_refund', 'public.fail_refund(uuid,text)'),
  ('mark_reservation_no_show', 'public.mark_reservation_no_show(uuid,text)'),
  ('resolve_reservation_finances', 'public.resolve_reservation_finances(uuid,text,numeric,text)'),
  ('close_folio', 'public.close_folio(uuid,text)'),
  ('reopen_folio', 'public.reopen_folio(uuid,text)')
) AS required(function_name, signature)
ORDER BY required.function_name;

-- 2. Required triggers.
SELECT expected.table_name,
       expected.trigger_name,
       trigger_state.tgenabled,
       trigger_state.tgname IS NOT NULL AS exists
FROM (VALUES
  ('payments', 'trg_finance_validate_payment'),
  ('payments', 'trg_finance_sync_payment'),
  ('payments', 'trg_payments_prevent_delete'),
  ('folio_charges', 'trg_finance_sync_charge'),
  ('folio_charges', 'trg_folio_charges_prevent_delete'),
  ('reservations', 'trg_reservations_create_folio'),
  ('reservations', 'trg_reservations_sync_accommodation'),
  ('reservations', 'trg_reservations_canonical_lifecycle'),
  ('reservations', 'trg_reservations_room_side_effects'),
  ('reservations', 'trg_reservations_audit_date_change'),
  ('reservations', 'trg_reservations_close_folio_after_checkout'),
  ('reservation_rooms', 'trg_reservation_rooms_canonical_validate'),
  ('guests', 'trg_guests_normalize_validate')
) AS expected(table_name, trigger_name)
LEFT JOIN LATERAL (
  SELECT t.tgname, t.tgenabled
  FROM pg_trigger t
  WHERE t.tgrelid = format('public.%I', expected.table_name)::regclass
    AND t.tgname = expected.trigger_name
    AND NOT t.tgisinternal
) AS trigger_state ON true
ORDER BY expected.table_name, expected.trigger_name;

-- 3. Canonical view exists and is readable.
SELECT to_regclass('public.v_folios_with_payments') IS NOT NULL AS view_exists,
       count(*) AS folio_count
FROM public.v_folios_with_payments;

-- 4. Every reservation has exactly one folio.
SELECT r.id, r.reservation_number, count(f.id) AS folio_count
FROM public.reservations r
LEFT JOIN public.folios f ON f.reservation_id = r.id
GROUP BY r.id, r.reservation_number
HAVING count(f.id) <> 1;

-- 5. Payment relation and status integrity.
SELECT p.id,
       p.reservation_id,
       p.folio_id,
       p.transaction_type,
       p.payment_status,
       p.parent_payment_id
FROM public.payments p
LEFT JOIN public.folios f ON f.id = p.folio_id
WHERE p.reservation_id IS NULL
   OR p.folio_id IS NULL
   OR f.reservation_id IS DISTINCT FROM p.reservation_id
   OR (p.transaction_type = 'payment' AND (
       p.parent_payment_id IS NOT NULL
       OR p.payment_status::text NOT IN ('pending', 'paid', 'failed')
   ))
   OR (p.transaction_type = 'refund' AND (
       p.parent_payment_id IS NULL
       OR p.payment_status::text NOT IN ('pending', 'refunded', 'failed')
   ));

-- 6. Refunds cannot exceed their parent payment.
SELECT parent.id AS parent_payment_id,
       parent.reservation_id,
       parent.amount AS payment_amount,
       SUM(refund.amount) AS reserved_refund_amount
FROM public.payments parent
JOIN public.payments refund ON refund.parent_payment_id = parent.id
WHERE refund.transaction_type = 'refund'
  AND refund.payment_status::text IN ('pending', 'refunded')
GROUP BY parent.id, parent.reservation_id, parent.amount
HAVING SUM(refund.amount) > parent.amount + 0.01;

-- 7. Cached totals match their sources.
SELECT r.id,
       r.reservation_number,
       r.paid_amount,
       public.fn_reservation_net_paid(r.id) AS calculated_paid
FROM public.reservations r
WHERE abs(
  COALESCE(r.paid_amount, 0) - public.fn_reservation_net_paid(r.id)
) > 0.01;

SELECT f.id,
       f.folio_number,
       f.total_amount,
       v.total_charges,
       f.paid_amount,
       v.total_payments - v.total_refunds AS calculated_paid,
       f.balance,
       v.total_charges - v.total_payments + v.total_refunds AS calculated_balance
FROM public.folios f
JOIN public.v_folios_with_payments v ON v.id = f.id
WHERE abs(COALESCE(f.total_amount, 0) - v.total_charges) > 0.01
   OR abs(
     COALESCE(f.paid_amount, 0) - (v.total_payments - v.total_refunds)
   ) > 0.01
   OR abs(
     COALESCE(f.balance, 0)
     - (v.total_charges - v.total_payments + v.total_refunds)
   ) > 0.01;

-- 8. Closed folios must be balanced and have no pending transactions.
SELECT v.id,
       v.folio_number,
       v.balance,
       v.pending_payment_amount,
       v.pending_refund_amount
FROM public.v_folios_with_payments v
WHERE v.is_closed
  AND (
    abs(COALESCE(v.balance, 0)) > 0.01
    OR COALESCE(v.pending_payment_amount, 0) > 0.01
    OR COALESCE(v.pending_refund_amount, 0) > 0.01
  );

-- 9. Guest identity guards.
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_guests_passport_number_unique',
    'idx_guests_id_number_unique'
  )
ORDER BY indexname;

SELECT passport_number, count(*) AS duplicate_count
FROM public.guests
WHERE passport_number IS NOT NULL
GROUP BY passport_number
HAVING count(*) > 1;

SELECT id_number, count(*) AS duplicate_count
FROM public.guests
WHERE id_number IS NOT NULL
GROUP BY id_number
HAVING count(*) > 1;

-- 10. Inspect the known overpaid reservation used in the acceptance scenario.
SELECT r.reservation_number,
       v.folio_number,
       v.total_charges,
       v.total_payments,
       v.total_refunds,
       v.pending_refund_amount,
       v.balance,
       v.financial_state,
       v.is_closed
FROM public.reservations r
JOIN public.v_folios_with_payments v ON v.reservation_id = r.id
WHERE r.reservation_number = 'RES93274077';

-- 11. No paid reservation should remain pending after migration 023.
SELECT
  r.id,
  r.reservation_number,
  r.status,
  r.total_amount,
  public.fn_reservation_net_paid(r.id) AS calculated_paid
FROM public.reservations r
CROSS JOIN LATERAL (
  SELECT
    COALESCE(hs.prepayment_required, true) AS prepayment_required,
    COALESCE(hs.prepayment_percent, 10) AS prepayment_percent
  FROM (SELECT 1) AS fallback
  LEFT JOIN public.hotel_settings hs ON hs.id = 1
) settings
WHERE r.status::text = 'pending'
  AND public.fn_reservation_net_paid(r.id) + 0.01 >= CASE
    WHEN settings.prepayment_required THEN
      round(
        COALESCE(r.total_amount, 0) * settings.prepayment_percent / 100,
        2
      )
    ELSE COALESCE(r.total_amount, 0)
  END;

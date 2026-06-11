-- Canonical folio view, cache refresh and post-migration diagnostics.

DROP VIEW IF EXISTS public.v_folios_with_payments;

CREATE VIEW public.v_folios_with_payments
WITH (security_invoker = true)
AS
SELECT
  f.id,
  f.reservation_id,
  f.guest_id,
  f.folio_number,
  f.total_amount,
  f.paid_amount,
  f.balance,
  f.status,
  f.is_closed,
  f.created_at,
  f.updated_at,
  COALESCE(charges.total_charges, 0) AS total_charges,
  COALESCE(transactions.total_payments, 0) AS total_payments,
  COALESCE(transactions.total_refunds, 0) AS total_refunds,
  COALESCE(transactions.pending_payment_amount, 0) AS pending_payment_amount,
  COALESCE(transactions.pending_refund_amount, 0) AS pending_refund_amount,
  CASE
    WHEN COALESCE(f.balance, 0) > 0.01
         AND COALESCE(transactions.total_payments, 0) <= 0.01
      THEN 'awaiting_payment'
    WHEN COALESCE(f.balance, 0) > 0.01
      THEN 'partially_paid'
    WHEN COALESCE(f.balance, 0) < -0.01
         AND COALESCE(transactions.pending_refund_amount, 0) > 0.01
      THEN 'awaiting_refund'
    WHEN COALESCE(f.balance, 0) < -0.01
      THEN 'overpaid'
    WHEN COALESCE(transactions.pending_payment_amount, 0) > 0.01
         OR COALESCE(transactions.pending_refund_amount, 0) > 0.01
      THEN 'pending_transaction'
    ELSE 'balanced'
  END AS financial_state
FROM public.folios f
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(fc.amount * COALESCE(fc.quantity, 1)), 0) AS total_charges
  FROM public.folio_charges fc
  WHERE fc.folio_id = f.id
    AND fc.charge_status = 'confirmed'
) charges ON true
LEFT JOIN LATERAL (
  SELECT
    COALESCE(SUM(p.amount) FILTER (
      WHERE p.transaction_type = 'payment' AND p.payment_status::text = 'paid'
    ), 0) AS total_payments,
    COALESCE(SUM(p.amount) FILTER (
      WHERE p.transaction_type = 'refund' AND p.payment_status::text = 'refunded'
    ), 0) AS total_refunds,
    COALESCE(SUM(p.amount) FILTER (
      WHERE p.transaction_type = 'payment' AND p.payment_status::text = 'pending'
    ), 0) AS pending_payment_amount,
    COALESCE(SUM(p.amount) FILTER (
      WHERE p.transaction_type = 'refund' AND p.payment_status::text = 'pending'
    ), 0) AS pending_refund_amount
  FROM public.payments p
  WHERE p.reservation_id = f.reservation_id
) transactions ON true;

GRANT SELECT ON public.v_folios_with_payments TO authenticated;

DO $$
DECLARE
  v_reservation_id uuid;
BEGIN
  FOR v_reservation_id IN
    SELECT id FROM public.reservations
  LOOP
    PERFORM public.sync_finance_totals(v_reservation_id);
  END LOOP;
END;
$$;

-- Expected result: zero rows.
SELECT p.id, p.reservation_id, p.folio_id, f.reservation_id AS folio_reservation_id
FROM public.payments p
JOIN public.folios f ON f.id = p.folio_id
WHERE p.reservation_id IS DISTINCT FROM f.reservation_id;

SELECT p.id, p.transaction_type, p.payment_status, p.parent_payment_id
FROM public.payments p
WHERE (p.transaction_type = 'payment' AND p.payment_status::text NOT IN ('pending', 'paid', 'failed'))
   OR (p.transaction_type = 'refund' AND (
     p.payment_status::text NOT IN ('pending', 'refunded', 'failed')
     OR p.parent_payment_id IS NULL
   ));

SELECT f.id, f.folio_number, f.balance, f.is_closed
FROM public.folios f
WHERE f.is_closed = true
  AND abs(COALESCE(f.balance, 0)) > 0.01;

SELECT r.id, r.reservation_number, r.paid_amount, public.fn_reservation_net_paid(r.id) AS calculated_paid
FROM public.reservations r
WHERE abs(COALESCE(r.paid_amount, 0) - public.fn_reservation_net_paid(r.id)) > 0.01;


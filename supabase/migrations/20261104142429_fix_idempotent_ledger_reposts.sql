-- Keep repeat posting of the same statement row idempotent while
-- blocking another row from posting the same verified PayPal order/capture.

CREATE OR REPLACE FUNCTION public.post_reconciliation_entry(p_row_id uuid, p_owner_id uuid, p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_row public.bank_statement_rows%rowtype;
  v_order public.orders%rowtype;
  v_entry_id uuid;
  v_existing_row_id uuid;
  v_now timestamptz := now();
BEGIN
  SELECT * INTO v_row
  FROM public.bank_statement_rows
  WHERE id = p_row_id AND owner_id = p_owner_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Statement row not found in this workspace';
  END IF;

  SELECT id INTO v_entry_id
  FROM public.ledger_entries
  WHERE statement_row_id = v_row.id;

  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'already_posted', true, 'ledger_entry_id', v_entry_id);
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = v_row.matched_order_id AND owner_id = p_owner_id;

  IF NOT FOUND
     OR v_row.match_status <> 'approved'
     OR v_order.payment_status <> 'paid'
     OR v_order.paypal_capture_id IS NULL
     OR v_order.verified_at IS NULL
     OR v_order.total_amount <> v_row.amount
     OR v_order.currency <> v_row.currency
     OR NOT (
       lower(coalesce(v_order.order_number, '')) = lower(trim(coalesce(v_row.reference, '')))
       OR lower(coalesce(v_order.paypal_order_id, '')) = lower(trim(coalesce(v_row.reference, '')))
       OR lower(coalesce(v_order.paypal_capture_id, '')) = lower(trim(coalesce(v_row.reference, '')))
     )
  THEN
    RAISE EXCEPTION 'Only a currently verified exact reference, amount and currency match can be posted';
  END IF;

  SELECT id, statement_row_id INTO v_entry_id, v_existing_row_id
  FROM public.ledger_entries
  WHERE order_id = v_order.id;

  IF FOUND THEN
    RAISE EXCEPTION 'This verified PayPal capture has already been reconciled to another statement row';
  END IF;

  INSERT INTO public.ledger_entries (
    statement_row_id, order_id, entry_type, amount, currency, memo, posted_by, owner_id
  ) VALUES (
    v_row.id, v_order.id, 'payment_receivable_settlement', v_row.amount, v_row.currency,
    format('Reconciled PayPal capture %s; statement transaction %s', v_order.paypal_capture_id, v_row.transaction_id),
    left(coalesce(nullif(trim(p_actor), ''), 'authenticated reviewer'), 80), p_owner_id
  )
  ON CONFLICT (statement_row_id) DO NOTHING
  RETURNING id INTO v_entry_id;

  IF v_entry_id IS NULL THEN
    SELECT id INTO v_entry_id
    FROM public.ledger_entries
    WHERE statement_row_id = v_row.id;
    RETURN jsonb_build_object('ok', true, 'already_posted', true, 'ledger_entry_id', v_entry_id);
  END IF;

  UPDATE public.bank_statement_rows
  SET match_status = 'posted',
      ledger_posted_at = v_now,
      match_reason = 'Exact reference, amount and currency revalidated against a server-verified completed PayPal capture. Human approval recorded before persistent ledger posting.',
      updated_at = v_now
  WHERE id = v_row.id AND owner_id = p_owner_id AND match_status = 'approved';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Statement row changed before posting; no ledger entry was committed';
  END IF;

  INSERT INTO public.reconciliation_audit (
    statement_row_id, order_id, action, actor, details, owner_id
  ) VALUES (
    v_row.id, v_order.id, 'internal_ledger_posted',
    left(coalesce(nullif(trim(p_actor), ''), 'authenticated reviewer'), 80),
    jsonb_build_object(
      'transaction_id', v_row.transaction_id,
      'ledger_entry_id', v_entry_id,
      'amount', v_row.amount,
      'currency', v_row.currency,
      'destination', 'persistent PayProof AI workspace ledger',
      'payment_environment', v_order.payment_environment
    ),
    p_owner_id
  );

  RETURN jsonb_build_object('ok', true, 'already_posted', false, 'ledger_entry_id', v_entry_id);
END;
$function$;

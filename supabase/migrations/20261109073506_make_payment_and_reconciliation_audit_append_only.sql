create or replace function public.prevent_audit_log_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'Audit records are append-only and cannot be changed or deleted.';
end;
$$;

drop trigger if exists payment_events_append_only on public.payment_events;
create trigger payment_events_append_only
before update or delete on public.payment_events
for each row execute function public.prevent_audit_log_mutation();

drop trigger if exists reconciliation_audit_append_only on public.reconciliation_audit;
create trigger reconciliation_audit_append_only
before update or delete on public.reconciliation_audit
for each row execute function public.prevent_audit_log_mutation();

drop trigger if exists payment_events_no_truncate on public.payment_events;
create trigger payment_events_no_truncate
before truncate on public.payment_events
for each statement execute function public.prevent_audit_log_mutation();

drop trigger if exists reconciliation_audit_no_truncate on public.reconciliation_audit;
create trigger reconciliation_audit_no_truncate
before truncate on public.reconciliation_audit
for each statement execute function public.prevent_audit_log_mutation();

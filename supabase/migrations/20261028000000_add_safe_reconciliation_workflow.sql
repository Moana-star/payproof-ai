-- Reconciliation records are accessible only through server-side service-role API routes.
-- RLS is enabled and no client-facing policies are created.
create table if not exists public.bank_statement_rows (
  id uuid primary key default gen_random_uuid(),
  statement_id text not null,
  transaction_id text not null unique,
  amount numeric(12,2) not null,
  currency text not null check (currency = upper(currency) and length(currency)=3),
  reference text,
  description text,
  posted_at timestamptz,
  source_file text not null,
  match_status text not null default 'unmatched' check (match_status in ('unmatched','matched_pending_review','exception','approved','posted','rejected')),
  matched_order_id uuid references public.orders(id),
  match_reason text,
  approved_by text,
  approved_at timestamptz,
  rejected_by text,
  rejected_at timestamptz,
  ledger_posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bank_statement_rows_status_idx on public.bank_statement_rows(match_status, created_at desc);
create index if not exists bank_statement_rows_statement_idx on public.bank_statement_rows(statement_id);

create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  statement_row_id uuid not null unique references public.bank_statement_rows(id),
  order_id uuid references public.orders(id),
  entry_type text not null check (entry_type in ('payment_receivable_settlement')),
  amount numeric(12,2) not null,
  currency text not null check (currency = upper(currency) and length(currency)=3),
  memo text not null,
  posted_by text not null,
  posted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.reconciliation_audit (
  id uuid primary key default gen_random_uuid(),
  statement_row_id uuid references public.bank_statement_rows(id),
  order_id uuid references public.orders(id),
  action text not null,
  actor text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists reconciliation_audit_created_idx on public.reconciliation_audit(created_at desc);

alter table public.bank_statement_rows enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.reconciliation_audit enable row level security;

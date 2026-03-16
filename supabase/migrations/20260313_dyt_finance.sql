-- DYT Finance Engine: Payment Plans & Transactions
-- Note: All financial records are anchored to enrollment_id (semester boundary).

create table if not exists dyt_payment_plans (
    id uuid primary key default gen_random_uuid(),
    enrollment_id uuid not null references dyt_enrollments(id) on delete cascade,
    plan_type text not null check (plan_type in ('contado', 'cuotas')),
    base_amount numeric not null default 0,
    enrollment_fee numeric not null default 0,
    uniform_fee numeric not null default 0,
    total_amount numeric not null default 0,
    status text not null check (status in ('pending', 'partial', 'paid')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists dyt_payment_plans_enrollment_id_idx
    on dyt_payment_plans(enrollment_id);

create table if not exists dyt_transactions (
    id uuid primary key default gen_random_uuid(),
    payment_plan_id uuid not null references dyt_payment_plans(id) on delete cascade,
    amount_paid numeric not null default 0,
    payment_date timestamptz not null default now(),
    payment_method text,
    reference_code text,
    notes text,
    created_at timestamptz not null default now()
);

create index if not exists dyt_transactions_payment_plan_id_idx
    on dyt_transactions(payment_plan_id);

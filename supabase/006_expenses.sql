-- 가계부 (실제로 쓴 돈)
-- Supabase 대시보드 → SQL Editor → New query 에 붙여넣고 Run (여러 번 실행해도 괜찮아요)

create table if not exists expenses (
  id uuid primary key,                       -- 폰에서 만든 id (오프라인에서 적고 나중에 올려도 한 줄)
  trip_id uuid not null references trips(id) on delete cascade,
  day date not null,
  amount numeric not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  paid_by text not null check (paid_by in ('a', 'b')),
  memo text not null default '' check (length(memo) <= 200),
  created_at timestamptz not null default now()
);
create index if not exists expenses_trip_id_idx on expenses (trip_id);

alter table expenses enable row level security;
drop policy if exists "us only" on expenses;
create policy "us only" on expenses for all to authenticated using (true) with check (true);

do $$ begin
  alter publication supabase_realtime add table expenses;
exception when duplicate_object then null;
end $$;

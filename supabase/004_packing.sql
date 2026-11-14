-- 준비물 체크리스트
-- Supabase 대시보드 → SQL Editor → New query 에 붙여넣고 Run (여러 번 실행해도 괜찮아요)

create table if not exists packing_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  name text not null check (length(name) between 1 and 100),
  owner text not null default 'both' check (owner in ('both', 'a', 'b')), -- 누가 챙길지 (both = 같이)
  checked boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists packing_items_trip_id_idx on packing_items (trip_id);

-- 보안: 로그인한 사람(= 우리 둘)만 읽고 쓰기
alter table packing_items enable row level security;
drop policy if exists "us only" on packing_items;
create policy "us only" on packing_items for all to authenticated using (true) with check (true);

-- 한 명이 체크하면 상대 화면에도 바로
do $$ begin
  alter publication supabase_realtime add table packing_items;
exception when duplicate_object then null;
end $$;

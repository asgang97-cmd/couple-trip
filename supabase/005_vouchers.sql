-- 예약·QR·바우처 보관함
-- Supabase 대시보드 → SQL Editor → New query 에 붙여넣고 Run (여러 번 실행해도 괜찮아요)

-- 1) 바우처 목록
create table if not exists vouchers (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  item_id uuid references items(id) on delete set null, -- 연결된 일정 (일정을 지우면 연결만 풀림)
  day date,                                              -- 연결된 날짜 (없으면 "날짜 없음")
  title text not null check (length(title) between 1 and 200),
  kind text not null check (kind in ('image', 'pdf')),
  path text not null,                                    -- 보관함 안 원본 파일 위치
  pages text[] not null default '{}',                    -- PDF 페이지 그림 위치들
  size integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists vouchers_trip_id_idx on vouchers (trip_id);

alter table vouchers enable row level security;
drop policy if exists "us only" on vouchers;
create policy "us only" on vouchers for all to authenticated using (true) with check (true);

-- 2) 파일 보관함: 비공개, 파일당 10MB, 사진·PDF만
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vouchers', 'vouchers', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

drop policy if exists "us read vouchers" on storage.objects;
drop policy if exists "us upload vouchers" on storage.objects;
drop policy if exists "us delete vouchers" on storage.objects;
create policy "us read vouchers" on storage.objects for select to authenticated using (bucket_id = 'vouchers');
create policy "us upload vouchers" on storage.objects for insert to authenticated with check (bucket_id = 'vouchers');
create policy "us delete vouchers" on storage.objects for delete to authenticated using (bucket_id = 'vouchers');

-- 3) 한 명이 올리면 상대 화면에도 바로
do $$ begin
  alter publication supabase_realtime add table vouchers;
exception when duplicate_object then null;
end $$;

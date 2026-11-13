-- 둘만의 여행 앱 — 데이터베이스 설계도
-- Supabase 대시보드 → SQL Editor → New query 에 전체를 붙여넣고 Run

-- 1) 여행
create table trips (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  destination text not null default '',
  start_date date not null,
  end_date date not null,
  currency text not null default 'JPY',
  manual_rate numeric,               -- 비워두면 실시간 환율 사용
  check (end_date >= start_date)
);

-- 2) 일정 항목
create table items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  day date not null,
  time text check (time ~ '^\d{2}:\d{2}$'),   -- 'HH:MM' 또는 null(시간 미정)
  place_name text not null check (length(place_name) between 1 and 200),
  memo text not null default '',
  booking_code text not null default '',
  booking_url text not null default '',
  cost_amount numeric check (cost_amount >= 0),
  cost_currency text not null,
  lat double precision,
  lng double precision,
  google_place_id text,
  created_by text not null check (created_by in ('a', 'b')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index items_trip_day on items (trip_id, day);

create function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
create trigger items_touch before update on items
  for each row execute function touch_updated_at();

-- 3) 하트
create table hearts (
  item_id uuid not null references items(id) on delete cascade,
  member text not null check (member in ('a', 'b')),
  primary key (item_id, member)
);

-- 4) 댓글
create table comments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  member text not null check (member in ('a', 'b')),
  body text not null check (length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

-- 보안: 로그인한 사람(= 우리 둘)만 읽고 쓰기
alter table trips enable row level security;
alter table items enable row level security;
alter table hearts enable row level security;
alter table comments enable row level security;
create policy "us only" on trips for all to authenticated using (true) with check (true);
create policy "us only" on items for all to authenticated using (true) with check (true);
create policy "us only" on hearts for all to authenticated using (true) with check (true);
create policy "us only" on comments for all to authenticated using (true) with check (true);

-- 실시간: 상대가 바꾸면 내 화면에 알림
alter publication supabase_realtime add table items, hearts, comments;

-- 우리 여행 1건 (✏️ 제목·도시·날짜·통화를 실제 여행으로 바꾸세요)
insert into trips (title, destination, start_date, end_date, currency)
values ('우리의 도쿄 여행', '도쿄', '2027-01-10', '2027-01-14', 'JPY');

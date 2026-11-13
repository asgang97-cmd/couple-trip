-- 커플 사진(커버) 기능 추가
-- Supabase 대시보드 → SQL Editor → New query 에 붙여넣고 Run

-- 1) 여행에 "지금 커버 사진 파일 위치" 칸 추가
alter table trips add column cover_path text;

-- 2) 사진 보관함: 비공개(로그인한 우리만 볼 수 있음), 파일당 최대 5MB, 이미지만
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

-- 3) 보관함 권한: 로그인한 사람만 보기/올리기/바꾸기/지우기
create policy "us read covers" on storage.objects for select to authenticated using (bucket_id = 'covers');
create policy "us upload covers" on storage.objects for insert to authenticated with check (bucket_id = 'covers');
create policy "us update covers" on storage.objects for update to authenticated using (bucket_id = 'covers');
create policy "us delete covers" on storage.objects for delete to authenticated using (bucket_id = 'covers');

-- 4) 한 명이 사진을 바꾸면 상대 화면에도 알림
alter publication supabase_realtime add table trips;

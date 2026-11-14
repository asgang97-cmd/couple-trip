-- 꾸미기 (캐릭터 사진 5자리 + 앱 배경 사진)
-- Supabase 대시보드 → SQL Editor → New query 에 붙여넣고 Run (여러 번 실행해도 괜찮아요)
-- 사진 파일은 커플 사진과 같은 'covers' 보관함에 들어가요.
alter table trips add column if not exists decor jsonb not null default '{}'::jsonb;

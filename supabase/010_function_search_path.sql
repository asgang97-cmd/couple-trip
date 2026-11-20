-- 함수 2개에 search_path(어느 곳에서 표를 찾을지)를 고정하는 안전장치
-- Supabase 보안 경고 "Function Search Path Mutable" 해결용
-- 함수 내용은 그대로 두고 설정만 추가해요. 앱 코드는 바꿀 필요 없어요.
-- Supabase 대시보드 → SQL Editor → New query → 붙여넣고 Run (여러 번 실행해도 괜찮아요)

alter function public.touch_updated_at() set search_path = public;
alter function public.set_decor_slot(uuid, text, jsonb) set search_path = public;

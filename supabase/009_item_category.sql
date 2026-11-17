-- 일정 종류 (숙소·교통·식사·관광·쇼핑·기타). 안 골라도 됨(null)
-- 앱을 새로 배포하기 전에 먼저 실행 (칸이 없으면 일정 저장이 실패함)
alter table items add column if not exists category text
  check (category in ('stay', 'move', 'food', 'sight', 'shop', 'etc'));

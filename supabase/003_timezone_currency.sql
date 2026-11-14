-- 여행지 시간대 + 통화 코드 검사 추가
-- Supabase 대시보드 → SQL Editor → New query 에 붙여넣고 Run (여러 번 실행해도 괜찮아요)

-- 1) 여행지 시간대. 비워 두면 폰의 시간대 기준으로 계산해요.
--    한국과 시차가 있는 곳(예: 파리, 뉴욕)이면 아래 update의 주석을 풀고 시간대 이름을 넣으세요.
alter table trips add column if not exists timezone text;
-- update trips set timezone = 'Europe/Paris';

-- 2) 통화 코드는 영어 대문자 3글자만 (예: JPY, KRW, EUR). 잘못 넣어서 화면이 멈추는 것 방지.
--    혹시 소문자로 들어간 값이 있으면 먼저 대문자로 고쳐요.
update trips set currency = upper(trim(currency)) where currency <> upper(trim(currency));
update items set cost_currency = upper(trim(cost_currency)) where cost_currency <> upper(trim(cost_currency));
alter table trips drop constraint if exists trips_currency_iso;
alter table trips add constraint trips_currency_iso check (currency ~ '^[A-Z]{3}$');
alter table items drop constraint if exists items_currency_iso;
alter table items add constraint items_currency_iso check (cost_currency ~ '^[A-Z]{3}$');

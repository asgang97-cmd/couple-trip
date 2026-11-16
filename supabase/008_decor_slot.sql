-- 꾸미기 사진 한 자리만 바꾸기 (둘이 동시에 다른 자리를 바꿔도 서로 덮어쓰지 않게)
-- Supabase 대시보드 → SQL Editor → New query 에 붙여넣고 Run (여러 번 실행해도 괜찮아요)
-- 실행 전에도 앱은 예전 방식으로 그대로 동작해요.
create or replace function set_decor_slot(p_trip uuid, p_slot text, p_item jsonb)
returns jsonb
language plpgsql
security invoker
as $$
declare
  old jsonb;
begin
  -- 이 여행 줄을 잠가서, 동시에 들어온 다른 변경은 이게 끝난 뒤 최신 값 위에서 처리됨
  select decor -> p_slot into old from trips where id = p_trip for update;
  if not found then
    raise exception 'trip not found';
  end if;
  update trips
     set decor = case
       when p_item is null then coalesce(decor, '{}'::jsonb) - p_slot
       else jsonb_set(coalesce(decor, '{}'::jsonb), array[p_slot], p_item)
     end
   where id = p_trip;
  return old; -- 예전 사진 (파일 정리용)
end;
$$;

revoke all on function set_decor_slot(uuid, text, jsonb) from public, anon;
grant execute on function set_decor_slot(uuid, text, jsonb) to authenticated;

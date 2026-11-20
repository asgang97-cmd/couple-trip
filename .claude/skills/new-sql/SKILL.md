---
name: new-sql
description: Use when a couple-trip change needs a Supabase database change (new column, table, function, policy, storage bucket) — the user types /new-sql, or a feature request implies the DB schema must change.
argument-hint: "[무엇을 바꿀지, 예: 준비물에 수량 칸]"
disable-model-invocation: true
---

# 새 Supabase SQL 만들기

규칙의 근거는 `CLAUDE.md`의 "Supabase SQL 바꾸기"에 있다. 이 스킬은 그 규칙을 매번 같은 순서로 지키게 하는 체크리스트다. 요청: $ARGUMENTS

## 순서

1. **실제 DB부터 본다** (Supabase MCP, 읽기 전용)
   - `list_tables`(verbose)로 바꿀 표의 지금 칸을 확인한다. 코드나 `supabase/*.sql`만 보고 추측하지 않는다(파일과 실제 DB가 다를 수 있음).
   - 함수나 정책을 바꿀 때는 `execute_sql`로 `pg_get_functiondef` / `pg_policies`를 읽는다.
2. **번호를 정한다:** `supabase/`에서 가장 큰 번호 + 1, 이름은 `NNN_짧은_설명.sql`.
3. **SQL 파일을 쓴다**
   - 맨 위 주석은 한국어로: 무엇을 하는지 + `Supabase 대시보드 → SQL Editor → New query → 붙여넣고 Run`.
   - 여러 번 실행해도 괜찮게 쓴다: `add column if not exists`, `create or replace function`, `drop policy if exists` 후 `create policy`.
   - 새 표에는 RLS를 켜고 `authenticated` 정책을 만든다. 새 함수에는 `security invoker` + `set search_path = public`을 쓰고, `anon` 실행 권한은 뺀다.
   - 새 칸에 "안 골랐을 때" 값이 있으면 `not null default 그값`으로, 없으면 null을 허용한다. 허용 범위나 값 목록은 `check`로 건다. 범위를 사용자 요청에서 알 수 없으면 정한 값을 사용자에게 알려 준다.
4. **README.md**의 SQL 목록에 한 줄 추가한다. 5번 처리가 있어서 SQL 전에 배포해도 앱이 동작하면 "아무 때나 실행", 없으면 "앱을 새로 배포하기 전에 먼저 실행"이라고 적는다.
5. **앱이 SQL 실행 전에도 깨지지 않게** 만든다. `repo.ts`의 기존 방식을 따른다:
   - 칸이 없음(`PGRST204` + 칸 이름) → 보내려던 값이 기본값(또는 null)이면 그 칸 없이 다시 보내고, 기본값이 아니면 `*_NEEDS_SQL` 문구를 throw (`saveItem`의 `CATEGORY_NEEDS_SQL`이 예시). 화면은 이 문구를 그대로 알림으로 띄운다.
   - 함수가 없음(`PGRST202`) → 예전 방식
   - 표가 없음 → `isMissingTableError`, 빈 목록
   - 서버 응답과 예전 오프라인 저장본에는 새 칸이 없을 수 있으니 타입은 선택 항목(`?`)으로, 화면에서는 기본값으로 읽는다.
   - 이 경우들을 테스트로 쓴다.
6. **같이 고칠 곳:** `src/lib/types.ts`, 새 값을 보여 주고 바꾸는 화면 컴포넌트(+ 테스트, 아이폰 기준 입력 16px·터치 44px), `repo.ts`에 새 export를 만들었으면 `.hallmark/preview/fakeRepo.ts`에도 추가, 폰에 새로 저장하는 민감 정보가 생기면 `src/lib/wipe.ts`에도 추가.
7. **검사:** `npm test`, `npm run lint`, `npm run build`.
8. **사용자 안내:** SQL 내용을 코드 블록으로 보여 주고, Supabase 실행 방법을 클릭 단위로 적는다(대시보드 → 프로젝트 → SQL Editor → New query → 붙여넣기 → Run → "Success" 확인). 끝나면 "했어"라고 알려 달라고 한다. **SQL은 사용자가 실행한다.** MCP는 읽기 전용이라 실행할 수 없다.
9. **"했어"라는 답을 받은 뒤:** MCP로 확인한다(`list_tables`로 새 칸·표가 있는지, `get_advisors` security로 새 경고가 없는지). 결과를 사용자에게 알린 뒤 커밋하고 push한다.

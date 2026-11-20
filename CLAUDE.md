# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 이 프로젝트

두 사람(밍석=`a`, 밍하=`b`)만 쓰는 커플 여행 일정 PWA. 밍석이 밍하에게 주는 선물이다. 둘 다 아이폰 홈 화면에 추가해서 쓴다.
제품 정리는 `PRODUCT.md`, 디자인 규칙은 `DESIGN.md`(+ `.impeccable/design.json`), 처음 세팅 순서는 `README.md`에 있다.

**사용자(밍석)는 코딩 초보이고 한국어로 대화한다.** 설명은 쉬운 한국어로, 사용자가 직접 할 일(Supabase SQL 실행, 콘솔 설정 등)은 클릭 단위로 한 단계씩 자세히 안내한다. 화면 변경은 사용자가 실제 아이폰에서 확인한다.

## 명령어

```bash
npm run dev                          # http://localhost:5173
npm test                             # vitest 전체 (jsdom)
npx vitest run src/lib/money.test.ts # 파일 하나
npx vitest run -t "테스트 이름"        # 이름으로 하나
npm run lint                         # oxlint
npm run build                        # tsc -b + vite build (타입 검사 포함)
npx tsc -b                           # 타입 검사만
```

- 가짜 데이터 미리보기: `npx vite --config .hallmark/preview/vite.config.ts` (`?screen=gate|picker|empty`, `?photos=1`). `.hallmark/preview/`는 git에 안 올라간다. **`src/lib/repo.ts`에 새 export를 추가하면 `.hallmark/preview/fakeRepo.ts`에도 추가해야** 미리보기가 안 깨진다.
- 배포: `main`에 push하면 Vercel이 자동 배포 (https://couple-trip-rho.vercel.app). 보안 헤더는 `vercel.json`.
- `.claude/settings.json`의 hook이 `.ts/.tsx`를 고칠 때마다 oxlint(`--deny-warnings`)와 `tsc -b`를 돌리고, `.env*` 파일 수정을 막는다(`.claude/hooks/check.mjs`).
- Windows, 사용자 폴더 이름이 한글이다. npm 캐시는 `C:\dev\npm-cache`로 옮겨 둠.

## 구조 (여러 파일을 봐야 보이는 것)

- **서버 코드 없음.** 브라우저가 Supabase(로그인·DB·Storage·Realtime)와 구글 API(Maps JS, Places New, Routes), Open-Meteo, frankfurter(환율)를 직접 부른다. `VITE_*` 값은 전부 공개된다고 보고 판단한다.
- **로그인:** 공유 이메일(`VITE_SHARED_EMAIL`) + 비밀번호 하나 (`src/lib/session.ts`). 가입·익명 로그인은 Supabase에서 꺼져 있다. RLS 정책은 `authenticated` 전부 허용, 즉 로그인 = 모든 권한. 둘 중 누구인지(`member`)는 로그인과 별개로 폰 localStorage에 저장한다.
- **데이터 흐름:** `src/lib/repo.ts` = 함수 하나에 쿼리 하나, 실패하면 throw. `src/hooks/useTripData.ts`가 전부 불러오고, Realtime 변경 알림(`subscribe`)이 오면 **전부 다시 불러온다**(부분 갱신 없음). 성공할 때마다 `offlineCache.ts`에 저장본을 남기고, 실패하면 저장본을 보여 주면서 `offline=true`로 편집을 막는다.
- **오프라인:** 일정 저장본(localStorage `snapshot:v1`), 바우처 파일(Cache Storage `vouchers-v1`, `voucherCache.ts`), 커버·꾸미기 사진(서비스워커 `cover-photo`, `vite.config.ts`). 가계부는 오프라인 대기열(`expenseQueue.ts`)로 쓰고 나중에 올린다. 비짓재팬 정보(`vjw.ts`, `vjw:v1`)는 이 폰에만 저장하고 서버에 올리지 않는다.
- **진짜 로그아웃 때 지우기:** `src/lib/wipe.ts`. **민감한 저장소 키나 캐시를 새로 만들면 여기에 추가한다.** 비짓재팬 정보·`member`·가계부 대기열은 일부러 남긴다(사용자 결정).
- **테스트 방식:** hook과 lib는 `deps`/옵션 인자로 `repo`, `storage`, `fetcher`, `now`를 주입받는다. 테스트는 이걸로 가짜를 넣는다(`memoryStorage()` → `src/test-utils.ts`). Supabase를 부르는 모듈은 `vi.mock('./supabase')`로 막는다.
- **외부 API 캐시:** 영업시간·경로·날씨·환율은 localStorage에 키별로 캐시한다(`hours:v1:*`, `wx:*` 등). 정리 로직은 아직 없다.
- **화면:** `App.tsx`(비밀번호 → 누구인지 고르기 → `TripPage`). `TripPage.tsx`가 상태를 모으고, 탭 5개(목록/지도/준비물/보관함/가계부)와 아래에서 올라오는 시트들을 연다. 꾸미기 사진 주소는 `DecorContext`로 내려준다.

## Supabase SQL 바꾸기

- 스키마는 `supabase/schema.sql` + 번호 순서 파일(`002_…` ~ `010_…`). 새 변경은 **다음 번호 파일**로 만들고 `README.md`의 SQL 목록에 한 줄 추가한다. 가능하면 여러 번 실행해도 괜찮게 쓴다.
- **사용자가 Supabase SQL Editor에서 직접 실행한다.** Supabase MCP는 읽기 전용(`read_only=true`)으로 연결돼 있어서 표 구조·정책·보안 경고 확인에만 쓴다. 실행 뒤 `get_advisors`로 경고를 다시 확인한다.
- 앱은 **SQL이 아직 실행되지 않은 상태에서도 깨지지 않게** 만든다. 칸이 없으면(`PGRST204`) 그 칸을 빼고 다시 보내고, 함수가 없으면(`PGRST202`) 예전 방식으로, 표가 없으면(`isMissingTableError`) 빈 목록으로 처리한다. 사용자에게는 "○○.sql을 먼저 실행해야 해요" 같은 문구를 보여 준다(`repo.ts`의 `*_NEEDS_SQL`).
- 함수는 `security invoker` + `search_path = public`. `set_decor_slot`은 안에서 표를 이름만으로 찾기 때문에 `search_path = ''`로 바꾸면 안 된다.

## 디자인 규칙 (사용자가 정한 것)

- 크림·밤색 토큰(`src/tokens.css`)을 쓰고 색을 직접 쓰지 않는다. 자세한 규칙은 `DESIGN.md`.
- **앱의 모든 글자는 온글잎 대롱체**(`public/fonts/ongeulip-daerong.woff2`, 자체 호스팅)로 쓴다. 손글씨와 기기 글꼴을 나누자고 다시 제안하지 않는다. 가짜 굵게(synthetic bold)는 끈다.
- 커버 커플 사진 + D-day, 사용자가 넣은 캐릭터·배경 사진(`trips.decor`)은 꼭 남긴다. **저작권 캐릭터(치이카와 등)는 그리지 않는다.** 캐릭터는 사용자가 사진으로 넣는다.
- 아이폰 사파리가 기준 기기다. 입력 글자 16px 이상(작으면 사파리가 확대함), 터치 목표 44px 이상, 시간·날짜 입력칸은 `appearance:none`(폭 버그 대응).
- 경고·중복은 막지 않고 알리기만 한다(결정은 사람이 함).
- 메인 화면 방향: `.impeccable/surfaces/src-components-trippage-tsx.md`.

## 작업 방식

- 설계·계획 문서는 `docs/superpowers/specs/`, `docs/superpowers/plans/`에 둔다.
- 보안 점검은 `.claude/agents/security-reviewer.md` 서브에이전트를 쓴다.
- Claude Code는 이 폴더(`couple-trip`)에서 켜야 위 hook·서브에이전트가 적용된다.

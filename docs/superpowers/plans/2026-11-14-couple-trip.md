# 둘만의 여행 앱 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 커플 둘이 각자 폰에서 해외여행 일정을 함께 편집하고, 비용(원화 환산)·구글맵 동선·하트/댓글·D-day를 보는 PWA를 만든다.

**Architecture:** 정적 React SPA가 Supabase(Postgres + Auth + Realtime)에 직접 붙는다. 서버 코드는 없다. 순수 로직(날짜·돈·환율·지도 URL)은 `src/lib/`에 분리해 단위 테스트하고, 화면은 그 위에 얇게 얹는다. 실시간 변경 알림이 오면 전체를 다시 불러온다(데이터가 작아서 가장 단순하고 안전함).

**Tech Stack:** Vite + React 18 + TypeScript, Vitest + @testing-library/react + jsdom, @supabase/supabase-js v2, vite-plugin-pwa, @vis.gl/react-google-maps, Frankfurter 환율 API(무키), Vercel.

**Spec:** `docs/superpowers/specs/2026-11-14-couple-trip-design.md`

## Global Constraints

- 프로젝트 루트: `C:\Users\김민석\couple-trip` (경로에 한글이 있어 도구가 깨지면 `C:\dev\couple-trip`으로 옮긴다).
- 모든 UI 문구는 한국어. 모바일 우선, 375px 폭에서 가로 스크롤 없음.
- 모든 외부 서비스는 무료 티어 안에서만. 유료 API 호출(구글 Directions API 등)은 쓰지 않는다.
- 환경변수: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SHARED_EMAIL`, `VITE_GOOGLE_MAPS_API_KEY`, `VITE_GOOGLE_MAP_ID`. `.env.local`에 두고 git에 올리지 않는다.
- 회원 구분은 `Member = 'a' | 'b'`. 표시 이름·테마·커버사진은 사용자가 직접 고치는 `src/theme.ts` 하나에 모은다.
- 날짜는 `'YYYY-MM-DD'` 문자열, 시간은 `'HH:MM'` 문자열 또는 `null`. 날짜 문자열을 `new Date('YYYY-MM-DD')`로 파싱하지 않는다(UTC로 해석됨) — 항상 `parseLocalDate` 사용.
- 환율 `rate`의 의미: 현지통화 1단위 = `rate` 원. 원화 금액은 `Math.round`로 정수.
- 지원 통화: 여행 통화(`trips.currency`) 1개 + `KRW`.
- 민감정보(여권번호 등) 입력 필드를 만들지 않는다.

## Review Focus

1. **자정 근처 D-day / 날짜 밀림** — 한국 시간 00:30에 D-day가 하루 틀리면 안 된다. → Task 1 테스트 `daysUntil` 자정·`parseLocalDate` 케이스.
2. **시간 없는 일정** — 시간 미정 항목은 그날의 시간 있는 항목들 뒤에, 추가 순서대로. → Task 1 `groupItemsByDay` 테스트.
3. **환율 API 실패·오프라인** — 앱이 죽지 않고 캐시 → 없으면 현지통화만 표시. → Task 2 `getRate` 실패 테스트, Task 5 `CostSummary` 'none' 테스트.
4. **원화로 낸 항목 섞임** — `KRW` 항목은 환율 없이 그대로 합산, 환산 불가 항목 개수는 따로 표시. → Task 2 `sumKrw` 테스트.
5. **둘이 거의 동시에 수정 / 오프라인 중 수정 시도** — 마지막 저장이 이기고 상대 화면은 다시 불러와 갱신, 오프라인이면 편집 버튼 비활성. → Task 4 `useTripData` 재로딩 테스트, Task 7 오프라인 비활성 테스트.

---

## File Structure

```
couple-trip/
  supabase/schema.sql            # 테이블·RLS·실시간 설정 (대시보드 SQL 에디터에 붙여 실행)
  public/cover.jpg               # 커플 사진 (직접 넣기)
  public/icon-192.png, icon-512.png
  src/
    theme.ts                     # ✏️ 직접 꾸미는 곳: 이름, 색, 문구, 사진 경로
    main.tsx, App.tsx            # 진입: 비밀번호 → 누구세요 → 여행 화면
    lib/
      types.ts                   # Trip, Item, Heart, Comment, Member, ItemInput
      dates.ts                   # parseLocalDate, toDateString, daysUntil, tripDays, groupItemsByDay
      money.ts                   # toKrw, formatMoney, sumKrw
      rates.ts                   # getRate (수동 → 실시간 → 캐시 → 없음)
      maps.ts                    # itemsWithLocation, directionsUrl
      supabase.ts                # createClient
      session.ts                 # signIn, isSignedIn, getMember, setMember
      repo.ts                    # DB 읽기/쓰기 + subscribe
      offlineCache.ts            # saveSnapshot, loadSnapshot
    hooks/
      useTripData.ts             # 불러오기 + 실시간 재로딩 + 오프라인 폴백
      useRate.ts                 # getRate 감싸기
    components/
      PasswordGate.tsx, MemberPicker.tsx
      HomeHeader.tsx             # 커버사진 + D-day
      DayTabs.tsx, ItemList.tsx, ItemCard.tsx, ItemForm.tsx
      CostSummary.tsx, CommentThread.tsx, OfflineBanner.tsx
      DayMap.tsx, PlaceSearch.tsx
```

---

### Task 1: 프로젝트 뼈대 + 날짜 로직

**Files:**
- Create: Vite 프로젝트 전체, `src/lib/types.ts`, `src/lib/dates.ts`
- Test: `src/lib/dates.test.ts`

**Interfaces:**
- Produces (`types.ts`):
  ```ts
  type Member = 'a' | 'b'
  interface Trip { id: string; title: string; destination: string; start_date: string; end_date: string; currency: string; manual_rate: number | null }
  interface Item { id: string; trip_id: string; day: string; time: string | null; place_name: string; memo: string; booking_code: string; booking_url: string; cost_amount: number | null; cost_currency: string; lat: number | null; lng: number | null; google_place_id: string | null; created_by: Member; sort_order: number; created_at: string; updated_at: string }
  type ItemInput = Omit<Item, 'id' | 'created_at' | 'updated_at'> & { id?: string }
  interface Heart { item_id: string; member: Member }
  interface Comment { id: string; item_id: string; member: Member; body: string; created_at: string }
  ```
- Produces (`dates.ts`): `parseLocalDate(s: string): Date`, `toDateString(d: Date): string`, `daysUntil(target: string, now: Date): number`, `tripDays(start: string, end: string): string[]`, `groupItemsByDay(items: Item[], days: string[]): Record<string, Item[]>`

- [ ] **Step 1: 스캐폴딩** — `npm create vite@latest couple-trip -- --template react-ts` (이미 있는 `docs/`는 유지), `npm i -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event`. `vite.config.ts`에 `test: { environment: 'jsdom', setupFiles: './src/test-setup.ts' }`, `package.json`에 `"test": "vitest run"`. `.gitignore`에 `.env.local`. `git init`.
- [ ] **Step 2: 실패하는 테스트 작성** (`src/lib/dates.test.ts`)
  ```ts
  test('parseLocalDate는 로컬 자정', () => { const d = parseLocalDate('2027-01-10'); expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2027, 0, 10, 0]) })
  test('toDateString 왕복', () => expect(toDateString(parseLocalDate('2027-02-01'))).toBe('2027-02-01'))
  test('daysUntil 기본', () => expect(daysUntil('2027-01-10', new Date(2027, 0, 1, 12, 0))).toBe(9))
  test('daysUntil 자정 직후', () => expect(daysUntil('2027-01-10', new Date(2027, 0, 1, 0, 30))).toBe(9))
  test('daysUntil 당일 밤', () => expect(daysUntil('2027-01-10', new Date(2027, 0, 10, 23, 59))).toBe(0))
  test('daysUntil 지난 날', () => expect(daysUntil('2027-01-10', new Date(2027, 0, 12, 9, 0))).toBe(-2))
  test('tripDays 월 경계', () => expect(tripDays('2027-01-30', '2027-02-01')).toEqual(['2027-01-30', '2027-01-31', '2027-02-01']))
  test('groupItemsByDay: 시간순, 시간 없는 건 뒤에 sort_order순, 빈 날도 키 존재, days에 없는 날짜 항목은 제외', ...)
  // items: {day:'D1', time:'14:00'}, {day:'D1', time:null, sort_order:2}, {day:'D1', time:'09:30'}, {day:'D1', time:null, sort_order:1}
  // expect D1 순서 = ['09:30', '14:00', null(sort 1), null(sort 2)], D2 = []
  ```
- [ ] **Step 3: 실패 확인** — `npx vitest run src/lib/dates.test.ts` → FAIL (모듈 없음)
- [ ] **Step 4: `dates.ts` 구현** — `parseLocalDate`는 `split('-')`로 `new Date(y, m-1, d)`. `daysUntil`은 `now`를 로컬 자정으로 내린 뒤 `Math.round((target - today) / 86400000)`. `tripDays`는 `setDate(+1)` 반복. `groupItemsByDay`는 `days`의 모든 키를 빈 배열로 초기화, 정렬 키 = (time 없음 여부, time, sort_order, created_at). `days`에 없는 날짜의 항목은 무시한다.
- [ ] **Step 5: 통과 확인** — `npm test` → 전부 PASS
- [ ] **Step 6: 커밋** — `git add -A && git commit -m "feat: scaffold project and date utilities"`

---

### Task 2: 돈 계산 + 환율

**Files:**
- Create: `src/lib/money.ts`, `src/lib/rates.ts`
- Test: `src/lib/money.test.ts`, `src/lib/rates.test.ts`

**Interfaces:**
- Consumes: `Item` (Task 1)
- Produces:
  - `toKrw(amount: number, currency: string, rate: number | null): number | null`
  - `formatMoney(amount: number, currency: string): string` — `Intl.NumberFormat('ko-KR', { style: 'currency', currency })`
  - `sumKrw(items: Item[], tripCurrency: string, rate: number | null): { totalKrw: number; unconvertedCount: number }`
  - `type RateSource = 'manual' | 'live' | 'cached' | 'identity' | 'none'`
  - `getRate(currency: string, opts: { manualRate?: number | null; fetcher?: typeof fetch; storage?: Storage; now?: () => Date }): Promise<{ rate: number | null; source: RateSource; fetchedAt: string | null }>`
  - 캐시 키: `localStorage['rate:' + currency] = JSON.stringify({ rate, fetchedAt })`
  - API: `https://api.frankfurter.dev/v1/latest?base=${currency}&symbols=KRW` → `json.rates.KRW`

- [ ] **Step 1: 실패하는 테스트 작성**
  ```ts
  // money.test.ts
  expect(toKrw(1200, 'JPY', 9.2)).toBe(11040)
  expect(toKrw(5000, 'KRW', null)).toBe(5000)
  expect(toKrw(10, 'JPY', null)).toBeNull()
  expect(formatMoney(1200, 'JPY')).toContain('1,200')
  expect(formatMoney(11040, 'KRW')).toBe('₩11,040')
  // sumKrw: [JPY 1000, KRW 5000, JPY 500, cost null] rate 9 → { totalKrw: 18500, unconvertedCount: 0 }
  // 같은 목록 rate null → { totalKrw: 5000, unconvertedCount: 2 }
  // rates.test.ts
  test('manualRate가 있으면 fetch 안 함', ...)            // → { rate: 9.0, source: 'manual' }, fetcher 호출 0회
  test('KRW는 1', ...)                                   // → { rate: 1, source: 'identity' }
  test('실시간 성공 시 캐시 저장', ...)                    // fetcher → {rates:{KRW:9.2}} → source 'live', storage에 저장됨
  test('fetch 실패 + 캐시 있음 → cached', ...)             // fetcher throws, storage에 9.1 → { rate: 9.1, source: 'cached' }
  test('fetch 실패 + 캐시 없음 → none', ...)               // → { rate: null, source: 'none', fetchedAt: null }
  test('응답이 비정상(ok=false 또는 KRW 없음)도 실패로 취급', ...)
  ```
- [ ] **Step 2: 실패 확인** — `npx vitest run src/lib/money.test.ts src/lib/rates.test.ts` → FAIL
- [ ] **Step 3: `money.ts`, `rates.ts` 구현** — 우선순위: identity(KRW) → manual → live → cached → none. 저장소 접근은 try/catch로 감싼다(사생활 모드 대비).
- [ ] **Step 4: 통과 확인** — `npm test` → PASS
- [ ] **Step 5: 커밋** — `git commit -am "feat: money conversion and exchange rate lookup"` (새 파일은 `git add` 먼저)

---

### Task 3: Supabase 준비 + 비밀번호 화면 + 누구세요

**Files:**
- Create: `supabase/schema.sql`, `src/lib/supabase.ts`, `src/lib/session.ts`, `src/lib/repo.ts`, `src/components/PasswordGate.tsx`, `src/components/MemberPicker.tsx`, `src/theme.ts`, `.env.local`(커밋 금지), `.env.example`
- Modify: `src/App.tsx`
- Test: `src/components/PasswordGate.test.tsx`, `src/lib/session.test.ts`

**Interfaces:**
- Consumes: 타입 (Task 1)
- Produces:
  - `session.ts`: `signIn(password: string): Promise<{ ok: true } | { ok: false; message: string }>`, `isSignedIn(): Promise<boolean>`, `getMember(storage?: Storage): Member | null`, `setMember(m: Member, storage?: Storage): void` (키 `'member'`)
  - `repo.ts`: `fetchTrip(): Promise<Trip>` (trips의 첫 행), `listItems(tripId: string): Promise<Item[]>`, `upsertItem(input: ItemInput): Promise<Item>`, `deleteItem(id: string): Promise<void>`, `listHearts(tripId: string): Promise<Heart[]>`, `toggleHeart(itemId: string, member: Member, on: boolean): Promise<void>`, `listComments(tripId: string): Promise<Comment[]>`, `addComment(itemId: string, member: Member, body: string): Promise<Comment>`, `subscribe(tripId: string, onChange: () => void): () => void`
  - `theme.ts`: `export const theme = { names: { a: '나', b: '너' }, emoji: { a: '🧑', b: '👩' }, primary: '#ff6b81', background: '#fff7f8', coverPhoto: '/cover.jpg', greeting: '우리 여행까지' }`

- [ ] **Step 1: Supabase 프로젝트 만들기 (사람이 직접, Claude가 안내)** — supabase.com 무료 프로젝트 생성 → Authentication에서 **Sign-ups 끄기** → 사용자 1명 수동 생성(`VITE_SHARED_EMAIL` 값, 비밀번호 = 둘만의 비밀번호, Auto Confirm) → URL/anon key를 `.env.local`에.
- [ ] **Step 2: `supabase/schema.sql` 작성 후 SQL 에디터에서 실행**
  - `trips`(id uuid pk default gen_random_uuid(), title, destination, start_date date, end_date date, currency text default 'JPY', manual_rate numeric null)
  - `items`(Task 1 `Item` 필드 그대로; trip_id fk on delete cascade; created_by text check in ('a','b'); cost_currency text not null; sort_order int default 0; updated_at은 update 트리거로 갱신)
  - `hearts`(item_id fk cascade, member, primary key(item_id, member))
  - `comments`(id, item_id fk cascade, member, body text check (length(body) between 1 and 500), created_at)
  - 모든 테이블 `enable row level security` + 정책 `for all to authenticated using (true) with check (true)`
  - `alter publication supabase_realtime add table items, hearts, comments;`
  - 여행 1건 insert (실제 여행 제목·날짜·통화로)
  - 확인: Table Editor에 4개 테이블과 trips 1행이 보임. 로그아웃 상태(anon)로 `select * from items`가 0행/거부되는지 확인.
- [ ] **Step 3: 실패하는 테스트 작성**
  ```ts
  // session.test.ts
  test('member 저장/읽기', () => { setMember('b', storage); expect(getMember(storage)).toBe('b') })
  test('이상한 값은 null', () => { storage.setItem('member', 'x'); expect(getMember(storage)).toBeNull() })
  // PasswordGate.test.tsx (signIn을 vi.mock)
  test('틀린 비밀번호면 "비밀번호가 달라요 🥲" 표시하고 onSuccess 안 부름')
  test('맞으면 onSuccess 호출')
  test('빈 값이면 제출 버튼 비활성')
  ```
- [ ] **Step 4: 실패 확인** — `npm test` → FAIL
- [ ] **Step 5: 구현** — `signIn`은 `supabase.auth.signInWithPassword({ email: import.meta.env.VITE_SHARED_EMAIL, password })`; 에러면 `{ ok:false, message:'비밀번호가 달라요 🥲' }`. 세션은 supabase-js가 localStorage에 유지. `App.tsx` 흐름: `isSignedIn` 아님 → `PasswordGate`; `getMember()` 없음 → `MemberPicker`(theme의 emoji+names 두 버튼); 둘 다 됨 → 임시로 "준비 완료" 텍스트. `repo.ts`는 각 함수가 supabase 쿼리 하나; 에러는 throw. `subscribe`는 `supabase.channel('trip-'+tripId).on('postgres_changes', { event: '*', schema: 'public', table }, onChange)`를 세 테이블에 걸고 해제 함수 반환.
- [ ] **Step 6: 통과 확인 + 수동 확인** — `npm test` PASS. `npm run dev` → 폰 크기 브라우저에서 틀린 비번 → 에러, 맞는 비번 → 누구세요 → 새로고침해도 유지.
- [ ] **Step 7: 커밋** — `git add -A && git commit -m "feat: supabase schema, password gate, member picker"`

---

### Task 4: 일정 화면 — 날짜 탭, 목록, 추가/수정/삭제, 실시간 반영

**Files:**
- Create: `src/hooks/useTripData.ts`, `src/components/DayTabs.tsx`, `ItemList.tsx`, `ItemCard.tsx`, `ItemForm.tsx`
- Modify: `src/App.tsx` ("준비 완료" → 여행 화면)
- Test: `src/hooks/useTripData.test.ts`, `src/components/ItemForm.test.tsx`

**Interfaces:**
- Consumes: `repo.*`, `tripDays`, `groupItemsByDay`, `getMember`
- Produces:
  - `useTripData(deps?: { repo?: typeof repo }): { status: 'loading' | 'ready' | 'error'; trip: Trip | null; items: Item[]; hearts: Heart[]; comments: Comment[]; offline: boolean; reload: () => Promise<void> }` — Task 7에서 `offline` 처리 추가
  - `ItemForm` props: `{ trip: Trip; day: string; member: Member; initial?: Item; onSave: (input: ItemInput) => Promise<void>; onDelete?: () => Promise<void>; onClose: () => void; placeSlot?: ReactNode }` (placeSlot은 Task 9에서 장소 검색 꽂는 자리)
  - `ItemCard` props: `{ item: Item; trip: Trip; rate: number | null; hearts: Heart[]; comments: Comment[]; member: Member; disabled: boolean; onEdit: () => void }`

- [ ] **Step 1: 실패하는 테스트 작성**
  ```ts
  // useTripData.test.ts (가짜 repo 주입)
  test('처음 불러오면 ready + items')
  test('subscribe 콜백이 불리면 다시 불러와 상대가 바꾼 내용 반영')   // 가짜 listItems가 두 번째엔 다른 값 → items 갱신
  test('언마운트 시 구독 해제 함수 호출')
  // ItemForm.test.tsx
  test('장소명 비면 저장 버튼 비활성')
  test('비용에 숫자 아닌 값이면 "숫자만 입력해 주세요" 표시')
  test('저장 시 ItemInput: day, created_by=member, cost_currency 기본=trip.currency, 빈 시간은 null, 비용 빈칸은 null')
  test('initial이 있으면 id 유지하고 created_by는 원래 작성자 유지')
  ```
- [ ] **Step 2: 실패 확인** — `npm test` → FAIL
- [ ] **Step 3: 구현** — 화면 구성: 상단 `DayTabs`(1일차·날짜, 가로 스크롤 칩) → 선택된 날의 `ItemList` → 하단 고정 "+ 일정 추가". 카드 탭 → `ItemForm`을 바텀시트로. 카드에 시간·장소·메모·작성자 이모지·예약번호(탭하면 복사)·예약링크(새 탭). 통화 선택은 `trip.currency`/`KRW` 두 개. 새 항목 `sort_order` = 그날 최대 + 1. 삭제는 `confirm('이 일정을 지울까요?')`.
- [ ] **Step 4: 통과 확인 + 두 기기 확인** — `npm test` PASS. 브라우저 창 2개(하나는 시크릿)로 로그인 → 한쪽에서 추가 → 다른 쪽에 몇 초 안에 뜸.
- [ ] **Step 5: 커밋** — `git commit -m "feat: itinerary editing with realtime sync"`

---

### Task 5: 비용 표시 + 첫 화면(D-day · 테마 · 커버)

**Files:**
- Create: `src/hooks/useRate.ts`, `src/components/CostSummary.tsx`, `src/components/HomeHeader.tsx`
- Modify: `ItemCard.tsx`(비용 줄), `App.tsx`(헤더·합계 배치, theme 색을 CSS 변수로)
- Test: `src/components/CostSummary.test.tsx`, `src/components/HomeHeader.test.tsx`

**Interfaces:**
- Consumes: `getRate`, `sumKrw`, `toKrw`, `formatMoney`, `daysUntil`, `theme`
- Produces: `useRate(trip: Trip | null): { rate: number | null; source: RateSource; fetchedAt: string | null }`, `CostSummary` props `{ items: Item[]; trip: Trip; rate: number | null; source: RateSource }`, `HomeHeader` props `{ trip: Trip; now?: Date }`

- [ ] **Step 1: 실패하는 테스트 작성**
  ```ts
  // HomeHeader: now=2027-01-01, start 2027-01-10 → "D-9"; now=2027-01-10 → "D-DAY"; now=2027-01-12, end 2027-01-14 → "여행 3일차"; 끝난 뒤 → "다녀온 지 2일"
  // CostSummary: rate 9, JPY 1000 + KRW 5000 → "₩14,000"; source 'cached' → "저장된 환율 기준" 문구;
  //              rate null + JPY 항목 → 원화 합계 + "환율을 못 불러와서 2개는 현지통화로만 보여요"
  // ItemCard 비용 줄: "¥1,200 (≈ ₩11,040)", rate null이면 "¥1,200"만
  ```
- [ ] **Step 2: 실패 확인** — `npm test` → FAIL
- [ ] **Step 3: 구현** — `HomeHeader`: `theme.coverPhoto` 배경 + 어두운 그라데이션 위 흰 글씨로 `theme.greeting`·D-day·여행 제목. `CostSummary`: 선택한 날 합계 + 전체 합계, 환율 출처·시각 작게. `index.css`에서 `--primary`, `--bg`를 `theme`에서 주입.
- [ ] **Step 4: 통과 확인** — `npm test` PASS. `public/cover.jpg`에 사진 넣고 화면 확인.
- [ ] **Step 5: 커밋** — `git commit -m "feat: cost summary with KRW conversion, D-day header, theme"`

> ✏️ 여기서 직접 할 일: `src/theme.ts` 이름·색·문구, `public/cover.jpg`.

---

### Task 6: 하트 · 댓글

**Files:**
- Create: `src/components/CommentThread.tsx`
- Modify: `ItemCard.tsx`
- Test: `src/components/ItemCard.test.tsx`, `src/components/CommentThread.test.tsx`

**Interfaces:**
- Consumes: `toggleHeart`, `addComment`, `theme.emoji`
- Produces: `CommentThread` props `{ itemId: string; comments: Comment[]; member: Member; disabled: boolean; onAdd: (body: string) => Promise<void> }`

- [ ] **Step 1: 실패하는 테스트 작성**
  ```ts
  // ItemCard: 내가 하트 안 누름 → 탭 시 toggleHeart(id, member, true); 이미 누름 → false
  //           둘 다 누름 → "💕" 표시, 하나만 → 누른 사람 이모지 + "❤️"
  //           댓글 2개면 "💬 2"
  // CommentThread: 오래된 순 정렬, 작성자 이모지 표시, 공백만 입력하면 전송 안 됨, 500자 초과 입력 막음, 전송 후 입력창 비움
  ```
- [ ] **Step 2: 실패 확인** — `npm test` → FAIL
- [ ] **Step 3: 구현** — 하트는 낙관적 업데이트 없이 호출 후 실시간 재로딩에 맡긴다(단순). 댓글은 카드의 "💬"을 누르면 펼침.
- [ ] **Step 4: 통과 확인** — `npm test` PASS, 창 2개로 하트·댓글이 상대 화면에 뜨는지 확인.
- [ ] **Step 5: 커밋** — `git commit -m "feat: hearts and comments on items"`

---

### Task 7: 오프라인 보기 + PWA + 배포

**Files:**
- Create: `src/lib/offlineCache.ts`, `src/components/OfflineBanner.tsx`, `public/icon-192.png`, `public/icon-512.png`
- Modify: `useTripData.ts`, `vite.config.ts`, 편집 버튼이 있는 컴포넌트들(`disabled` 전달)
- Test: `src/lib/offlineCache.test.ts`, `src/hooks/useTripData.test.ts`(추가)

**Interfaces:**
- Produces: `type Snapshot = { trip: Trip; items: Item[]; hearts: Heart[]; comments: Comment[]; savedAt: string }`, `saveSnapshot(s: Snapshot, storage?: Storage): void`, `loadSnapshot(storage?: Storage): Snapshot | null` (키 `'snapshot:v1'`, 깨진 JSON이면 null)

- [ ] **Step 1: 실패하는 테스트 작성**
  ```ts
  // offlineCache: 저장→읽기 동일, 깨진 JSON → null, 저장소 throw해도 예외 안 남
  // useTripData: 성공 시 saveSnapshot 호출; repo가 throw + 스냅샷 있음 → status 'ready', offline true, 스냅샷 데이터
  //              repo throw + 스냅샷 없음 → status 'error'
  //              window 'offline' 이벤트 → offline true, 'online' → reload 후 false
  // ItemList/ItemCard: offline이면 "+ 일정 추가", 하트, 댓글 전송, 수정 버튼 disabled
  ```
- [ ] **Step 2: 실패 확인** — `npm test` → FAIL
- [ ] **Step 3: 구현** — `OfflineBanner`: "오프라인이에요 · {savedAt} 기준 일정" 상단 띠. `npm i -D vite-plugin-pwa`, `VitePWA({ registerType: 'autoUpdate', manifest: { name: theme 기반 이름, short_name, display: 'standalone', theme_color, background_color, icons: [192, 512] } })`. 앱 셸만 캐시(Supabase·구글 요청은 캐시하지 않음).
- [ ] **Step 4: 통과 확인** — `npm test` PASS. `npm run build && npm run preview` → 개발자도구 Network "Offline" → 새로고침해도 일정 보이고 편집 버튼 비활성.
- [ ] **Step 5: 배포 (사람이 직접, Claude가 안내)** — GitHub 비공개 저장소에 push → Vercel에서 import → 환경변수 5개 입력 → 배포 URL을 아이폰 Safari "홈 화면에 추가" / 안드로이드 Chrome "앱 설치"로 확인.
- [ ] **Step 6: 커밋** — `git commit -m "feat: offline read-only mode and PWA install"`

> 🎁 여기까지가 **선물 가능한 최소 버전**. 지도는 이후 Task.

---

### Task 8: 구글맵 — 하루 핀 + 동선 + 구글맵 길찾기 열기

**Files:**
- Create: `src/lib/maps.ts`, `src/components/DayMap.tsx`
- Modify: `App.tsx`(목록/지도 토글)
- Test: `src/lib/maps.test.ts`

**Interfaces:**
- Consumes: `groupItemsByDay` 결과의 하루 목록
- Produces: `itemsWithLocation(items: Item[]): Item[]` (lat·lng 둘 다 있는 것만, 순서 유지), `directionsUrl(items: Item[], mode?: 'transit' | 'walking' | 'driving'): string | null`, `DayMap` props `{ items: Item[] }`

- [ ] **Step 0: 구글 클라우드 준비 (사람이 직접, Claude가 안내)** — 프로젝트 생성·결제 등록 → Maps JavaScript API, Places API (New) 활성화 → API 키 생성 후 **HTTP 리퍼러 제한**(`https://<앱>.vercel.app/*`, `http://localhost:5173/*`) + **API 제한**(두 API만) → 각 API 할당량 상한(Maps JS 하루 1,000, Places 하루 300) → 예산 알림 ₩10,000 → Map ID 생성(벡터) → `.env.local`·Vercel에 키와 Map ID.
- [ ] **Step 1: 실패하는 테스트 작성**
  ```ts
  // 위치 0개 → null; 1개 → destination만 있는 URL
  // 3개(A,B,C) → https://www.google.com/maps/dir/?api=1&origin=A&destination=C&waypoints=B&travelmode=transit
  //   (좌표 "lat,lng", waypoints는 '|'로 연결 후 encodeURIComponent)
  // google_place_id 있으면 origin_place_id / destination_place_id / waypoint_place_ids 도 붙임
  // 위치 없는 항목은 건너뜀
  ```
- [ ] **Step 2: 실패 확인** — `npx vitest run src/lib/maps.test.ts` → FAIL
- [ ] **Step 3: 구현** — `npm i @vis.gl/react-google-maps`. `DayMap`: `APIProvider` + `Map(mapId)`, 각 항목에 번호 달린 `AdvancedMarker`(테마색), `useMap()`으로 `google.maps.Polyline`을 순서대로 그림(직선, Directions API 안 씀), 모든 핀이 보이게 `fitBounds`. 위치 있는 항목이 없으면 "장소를 검색해서 넣으면 지도에 보여요" 안내. 지도 아래 "구글맵에서 길찾기" 버튼 = `directionsUrl`.
- [ ] **Step 4: 통과 확인** — `npm test` PASS. DB에서 항목 2개에 lat/lng를 직접 넣고 핀·선·버튼 확인.
- [ ] **Step 5: 커밋** — `git commit -m "feat: day map with pins, route line, directions link"`

---

### Task 9: 장소 검색으로 일정 추가

**Files:**
- Create: `src/components/PlaceSearch.tsx`
- Modify: `ItemForm.tsx` (`placeSlot`에 연결)
- Test: `src/components/ItemForm.test.tsx`(추가)

**Interfaces:**
- Consumes: `ItemForm`의 `placeSlot`
- Produces: `PlaceSearch` props `{ onPick: (p: { name: string; lat: number; lng: number; placeId: string }) => void }`

- [ ] **Step 1: 실패하는 테스트 작성** (PlaceSearch는 가짜로 대체)
  ```ts
  // onPick({name:'센소지', lat:35.71, lng:139.79, placeId:'abc'}) → 장소명 칸이 비어 있으면 '센소지'로 채움, 이미 썼으면 유지
  // 저장 시 lat/lng/google_place_id 포함
  // "위치 지우기" → 세 값 null
  ```
- [ ] **Step 2: 실패 확인** — `npm test` → FAIL
- [ ] **Step 3: 구현** — `useMapsLibrary('places')`의 `PlaceAutocompleteElement`를 쓰고, 선택 시 `fetchFields({ fields: ['displayName', 'location', 'id'] })`만 요청(필드 최소화 = 비용 최소화). 검색 편향: 위치가 있는 항목이 하나라도 있으면 그 좌표 반경 50km를 `locationBias`로 주고, 없으면 편향 없이 검색한다(지오코딩 API는 쓰지 않음).
- [ ] **Step 4: 통과 확인** — `npm test` PASS, 폰에서 실제 검색 → 저장 → 지도 핀 확인.
- [ ] **Step 5: 커밋 + 배포** — `git commit -m "feat: place search in item form"` → push → Vercel 자동 배포.

---

## 시간이 모자랄 때 (spec의 컷 순서)
- 실시간 환율 → `trips.manual_rate`만 쓰도록(`getRate`는 이미 manual 우선이라 DB 값만 넣으면 됨, 코드 변경 없음).
- Task 8·9는 여행 후 업데이트로 미뤄도 Task 7까지로 선물 가능.

# 영업시간·휴무일 경고 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 장소 검색으로 넣은 일정 카드에, 그날 휴무·영업시간 밖·1시간 안 마감이면 경고 한 줄.

**Architecture:** 순수 판단(`src/lib/hours.ts`) → 구글에서 받아 폰에 3일 저장(`src/lib/placeHours.ts`) → 보이는 날짜의 장소 번호별 영업시간을 모으는 훅(`src/hooks/usePlaceHours.ts`). 경고는 렌더 때 `checkHours`로 계산하므로 일정 시간을 바꾸면 바로 반영된다.

**Tech Stack:** React 19 + TypeScript, Vitest + Testing Library, Google Places API (New) Place Details REST.

**Spec:** `docs/superpowers/specs/2026-11-17-opening-hours-design.md`

## Global Constraints

- 문구(정확히): `⚠️ 이날 휴무 ({요일}요일)` / `⚠️ {HH:MM}엔 아직 안 열어요 ({HH:MM} 오픈)` / `⚠️ {HH:MM}엔 문 닫아요 ({HH:MM} 마감)` / `⚠️ {HH:MM} 마감 · {N}분 남아요`. 요일 = `일월화수목금토`.
- 곧 마감 = 일정 시각부터 마감까지 **60분 이하**(0 초과).
- 시간 미정 일정은 휴무만 판단.
- 저장: localStorage, 장소마다 **3일**(259_200_000ms) 신선. 받기 실패 시 기간 지난 저장본이라도 사용, 없으면 경고 없음.
- 요청: `GET https://places.googleapis.com/v1/places/{id}`, 헤더 `X-Goog-Api-Key`, `X-Goog-FieldMask: regularOpeningHours,currentOpeningHours`. 키 = `VITE_GOOGLE_MAPS_API_KEY`. 키 없으면 요청 안 함.
- 일정 날짜가 여행지 시간대(`trip.timezone`, 없거나 잘못되면 기기 시간대) 기준 오늘~+6일이면 `currentOpeningHours` 우선, 아니면 `regularOpeningHours`.
- 확실하지 않으면 경고 없음(정보 없음·실패·24시간 영업).

## Review Focus

1. 새벽 영업(18:00–02:00): 01:30 일정 → 30분 남음 경고, 그날 휴무 아님 → Task 1 테스트.
2. 점심·저녁 두 구간(11–14, 17–22): 15:00 일정 → "아직 안 열어요 (17:00 오픈)" → Task 1 테스트.
3. 응답은 성공(200)인데 영업시간 필드가 없음 → 저장(다시 묻지 않음), 경고 없음 → Task 2 테스트.
4. 403(키에 Places 권한 없음) → 저장하지 않고 경고 없음, 에러 없음 → Task 2 테스트.
5. 같은 장소가 하루에 두 번(다른 시간) → 요청 1번, 카드마다 각자 판단 → Task 3 테스트.

---

### Task 1: 영업시간 판단 (순수 함수)

**Files:** Create `src/lib/hours.ts`, Test `src/lib/hours.test.ts`

**Interfaces — Produces:**
- `interface HoursPoint { day: number; hour: number; minute: number; date?: { year: number; month: number; day: number } }` (구글 형식, `day` 0=일요일)
- `interface HoursPeriod { open: HoursPoint; close?: HoursPoint }` (close 없음 = 24시간)
- `interface PlaceHours { regular: HoursPeriod[] | null; current: HoursPeriod[] | null }` (null = 정보 없음)
- `type HoursWarning = { kind: 'closedDay'; weekday: number } | { kind: 'notOpen'; at: string; opens: string } | { kind: 'closed'; at: string; closedAt: string } | { kind: 'closingSoon'; closes: string; minutesLeft: number }`
- `checkHours(hours: PlaceHours, day: string, time: string | null, today: string): HoursWarning | null`
- `hoursMessage(w: HoursWarning): string`
- `todayIn(timeZone: string | null | undefined, now: Date): string` ('YYYY-MM-DD', 잘못된 시간대면 기기 시간대)

**판단 방법 (테스트가 정하지 않는 부분):** 쓸 목록 = (`day`가 `today`~+6일이고 `current` 있음) ? `current` : `regular`; 없으면 null. 각 구간을 "그날 0시 기준 분"의 `[start, end)`로 바꾼다 — `date`가 있으면 날짜 차이로, 없으면 요일 차이(−3~+3으로 맞춤); end < start면 +7일. close 없는 구간이 있으면 null(24시간). 그날 시작하는 구간(0 ≤ start < 1440)이 없고 일정 시각을 덮는 구간도 없으면 `closedDay`. 시간 미정이면 여기까지. 일정 시각 t를 덮는 구간이 있으면 `end − t ≤ 60`일 때 `closingSoon`. 아니면 t 뒤에 그날 시작하는 구간이 있으면 `notOpen`(가장 이른 것), 없으면 `closed`(t 이전에 끝난 가장 늦은 마감). 시각 표기는 `HH:MM`(1440 이상은 빼서).

- [ ] **Step 1: 실패하는 테스트** (`R`=매일 11:00–21:00, 월요일 휴무인 regular 등 도우미로)
  - 월요일(2027-01-11) 시간 미정 → `{ kind: 'closedDay', weekday: 1 }`, 문구 `⚠️ 이날 휴무 (월요일)`.
  - 화요일 10:00 → notOpen, `⚠️ 10:00엔 아직 안 열어요 (11:00 오픈)`.
  - 화요일 22:00 → closed, `⚠️ 22:00엔 문 닫아요 (21:00 마감)`.
  - 화요일 20:30 → closingSoon 30, `⚠️ 21:00 마감 · 30분 남아요`; 20:00 → closingSoon 60; 19:59 → null.
  - 화요일 12:00 → null; 시간 미정 화요일 → null.
  - 새벽 영업 18:00–02:00(close.day = 다음 날): 01:30 → closingSoon `02:00` 30; 그날 시간 미정 → null.
  - 두 구간 11–14, 17–22: 15:00 → notOpen `17:00`; 14:30 → closed `14:00`.
  - 24시간(`[{ open: { day: 0, hour: 0, minute: 0 } }]`) → null.
  - `regular: null, current: null` → null.
  - current 우선: today=2027-01-10, day=2027-01-12, current에 그날 구간 없음(특별 휴무), regular엔 있음 → closedDay. 같은 데이터로 today=2027-01-01(8일 이상 전) → regular 기준 null.
  - `todayIn('Asia/Tokyo', new Date('2027-01-10T16:00:00Z')) === '2027-01-11'`; 잘못된 시간대 → 예외 없이 문자열.
- [ ] **Step 2:** `npx vitest run src/lib/hours.test.ts` → FAIL (모듈 없음)
- [ ] **Step 3:** 구현
- [ ] **Step 4:** 같은 명령 → PASS
- [ ] **Step 5:** 커밋 `feat: opening hours check`

### Task 2: 구글에서 받아 폰에 저장

**Files:** Create `src/lib/placeHours.ts`, Test `src/lib/placeHours.test.ts`

**Interfaces:**
- Consumes: `PlaceHours`, `HoursPeriod` (Task 1)
- Produces: `getPlaceHours(placeId: string, opts: { apiKey: string; fetcher?: typeof fetch; storage?: Storage; now?: number }): Promise<PlaceHours | null>` — 저장 키 `hours:v1:{placeId}`, 값 `{ savedAt: number; hours: PlaceHours }`.

- [ ] **Step 1: 실패하는 테스트** (가짜 fetcher, `memoryStorage` from `../test-utils`)
  - 첫 요청: URL `https://places.googleapis.com/v1/places/abc`, 헤더 `X-Goog-Api-Key: key`, `X-Goog-FieldMask: regularOpeningHours,currentOpeningHours`; 응답의 `regularOpeningHours.periods`/`currentOpeningHours.periods` → `{ regular, current }`.
  - 3일 안에 다시 → fetcher 1번만; 3일 지나면 다시 요청.
  - 200인데 영업시간 필드 없음 → `{ regular: null, current: null }`을 저장, 다음엔 요청 안 함.
  - 403 → null, 저장 안 함 (다음에 다시 요청).
  - 기간 지난 저장본 + fetcher가 throw → 저장본 반환.
  - 저장본 깨짐(JSON 아님) → 새로 요청.
- [ ] **Step 2:** `npx vitest run src/lib/placeHours.test.ts` → FAIL
- [ ] **Step 3:** 구현 (저장 실패는 무시)
- [ ] **Step 4:** PASS
- [ ] **Step 5:** 커밋 `feat: place opening hours fetch with 3-day phone cache`

### Task 3: 카드에 경고 그리기

**Files:**
- Create `src/hooks/usePlaceHours.ts`, Test `src/hooks/usePlaceHours.test.ts`
- Modify `src/components/ItemList.tsx` (훅 호출, 카드마다 경고 계산해 넘김), `src/components/ItemCard.tsx` (선택 prop `hoursWarning?: HoursWarning | null`, 제목 `<h3>` 바로 아래 `<p className="hours-warning" role="note">`), `src/index.css` (`.hours-warning`: `.tight-warning`과 같은 규칙을 공유 — 선택자 묶기), `src/components/ItemList.test.tsx`

**Interfaces:**
- Consumes: Task 1 `checkHours`, `hoursMessage`, `todayIn`, `PlaceHours`, `HoursWarning`; Task 2 `getPlaceHours`
- Produces: `type LoadHours = (placeId: string) => Promise<PlaceHours | null>`; `usePlaceHours(placeIds: string[], opts?: { apiKey?: string; loadHours?: LoadHours }): Record<string, PlaceHours>` (받은 장소만; 키 = placeId). ItemList Props에 테스트용 `loadHours?: LoadHours` 추가(`apiKey`, `now`는 이미 있음).

- [ ] **Step 1: 실패하는 테스트**
  - 훅: `['p1', 'p1', 'p2']` → loadHours 2번(중복 제거), 결과 키 `p1`,`p2`; null 받은 장소는 결과에 없음; throw해도 에러 없이 빠짐; `apiKey: ''` → 호출 0번 `{}`.
  - 훅: 날짜를 빨리 바꿔 이전 결과가 늦게 와도 반영되지 않음(이전 결과는 버림).
  - ItemList: 화요일 10:00 일정(place p1, 11:00–21:00) → 카드 안에 `⚠️ 10:00엔 아직 안 열어요 (11:00 오픈)` (`findByText`).
  - ItemList: 같은 장소 두 일정(10:00, 12:00) → 요청 1번, 경고는 10:00 카드에만.
  - ItemList: `google_place_id` 없는 일정 → loadHours 안 부름, 경고 없음.
- [ ] **Step 2:** `npx vitest run src/hooks/usePlaceHours.test.ts src/components/ItemList.test.tsx` → FAIL
- [ ] **Step 3:** 구현. 훅 effect 키 = 정렬·중복 제거한 placeId 목록 JSON; `alive` 가드. ItemList는 `todayIn(trip.timezone, now ?? new Date())`로 오늘을 정하고 카드마다 `checkHours`.
- [ ] **Step 4:** 전체 `npx vitest run` PASS, `npm run build`, `npm run lint` 깨끗
- [ ] **Step 5:** 실제 키로 한 번 확인: `.env`의 키로 유명 장소 하나(`ChIJ...` — 테스트용으로 구글 문서 예시 place id 사용) 요청해 200과 `regularOpeningHours`가 오는지. 403이면 사용자에게 Places API (New) 켜는 방법 안내.
- [ ] **Step 6:** 커밋 `feat: opening hours warning on item cards`

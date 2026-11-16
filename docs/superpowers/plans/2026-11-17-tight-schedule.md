# 빠듯한 일정 경고 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 목록 화면에서 붙어 있는 두 일정 사이 이동 시간이 모자라면 경고 한 줄을 보여준다.

**Architecture:** 순수 함수(`src/lib/tight.ts`)가 비교할 쌍과 경고 여부를 정하고, 훅(`src/hooks/useTightLegs.ts`)이 기존 `getLeg`로 도보·대중교통 시간을 받아 경고를 만든다. `ItemList`가 카드 사이에 경고를 그린다.

**Tech Stack:** React 19 + TypeScript, Vitest + Testing Library, Google Routes API(기존 `src/lib/routes.ts`).

**Spec:** `docs/superpowers/specs/2026-11-17-tight-schedule-design.md`

## Global Constraints

- 판단: `빠른 쪽 이동 시간(초) > (다음 시각 − 앞 시각)(초)`일 때만 경고. 같으면 경고 아님.
- 빠른 쪽 = 도보·대중교통 중 구한 것들의 최솟값. 둘 다 못 구하면 경고 없음.
- 비교 쌍 = 목록 순서로 바로 붙은 두 일정, 둘 다 `time`과 `lat`/`lng`가 있고 다음 시각 > 앞 시각.
- 대중교통 출발 = `transitDeparture(앞.day, 앞.time, now, trip.timezone)`.
- 문구(정확히): `⚠️ {gap} 뒤 다음 일정인데 이동이 {fastest} 걸려요` + 둘째 줄 `(대중교통 {t} · 도보 {w})` — 못 구한 수단은 빠짐. 시간 표기는 DayMap의 `formatDuration`과 같은 규칙(`35분`, `1시간 5분`, `2시간`).
- 지도 탭(DayMap) 동작은 바꾸지 않음. API 키 없으면 아무것도 계산하지 않음.

## Review Focus

1. 시간 없는/장소 없는 일정이 사이에 끼면 그 앞뒤를 이어 비교하지 않아야 함 → Task 1 테스트.
2. 다음 일정 시각이 앞보다 이르거나 같음(순서 일부러 바꿈) → 경고 없음 → Task 1 테스트.
3. 오프라인·API 실패로 한 수단만 구해짐 → 그 수단만으로 판단, 둘째 줄에도 그 수단만 → Task 2·3 테스트.
4. 날짜를 빠르게 바꿔 이전 날짜 계산이 늦게 도착 → 이전 결과가 새 날짜에 섞이면 안 됨 → Task 2 테스트.
5. 일정이 수정돼 시간이 바뀌면 같은 장소 쌍이라도 다시 판단 → Task 2 테스트.

---

### Task 1: 비교할 쌍과 판단 (순수 함수)

**Files:**
- Modify: `src/lib/routes.ts` (DayMap의 `formatDuration`을 여기로 옮겨 export)
- Modify: `src/components/DayMap.tsx` (로컬 `formatDuration` 지우고 import)
- Create: `src/lib/tight.ts`
- Test: `src/lib/tight.test.ts`

**Interfaces:**
- Produces:
  - `formatDuration(sec: number): string` (routes.ts, 기존 동작 그대로)
  - `interface TightPair { from: Item; to: Item; gapSec: number }`
  - `tightPairs(items: Item[]): TightPair[]` — 목록 순서 유지
  - `fastestSec(walkSec: number | null, transitSec: number | null): number | null`
  - `isTight(gapSec: number, fastest: number | null): boolean` — `fastest !== null && fastest > gapSec`

- [ ] **Step 1: 실패하는 테스트** (`makeItem`은 `src/test-fixtures`)
  - `tightPairs`: `[11:00 A(장소), 11:20 B(장소)]` → 1쌍, `gapSec === 1200`.
  - `[A 11:00, B 장소 없음 11:10, C 11:30]` → 0쌍 (B를 건너뛰어 A–C 비교하지 않음).
  - `[A 11:00, B 시간 없음, C 12:00]` → 0쌍.
  - `[A 12:00, B 11:00]`, `[A 11:00, B 11:00]` → 0쌍.
  - `[A, B, C]` 모두 유효 → 2쌍 `(A,B)`, `(B,C)`.
  - `fastestSec(2520, 2100) === 2100`, `fastestSec(null, 2100) === 2100`, `fastestSec(null, null) === null`.
  - `isTight(1200, 2100) === true`, `isTight(1200, 1200) === false`, `isTight(1200, null) === false`.
  - `formatDuration(2100) === '35분'`, `formatDuration(3900) === '1시간 5분'`, `formatDuration(7200) === '2시간'`, `formatDuration(10) === '1분'`.
- [ ] **Step 2:** `npx vitest run src/lib/tight.test.ts` → FAIL (모듈 없음)
- [ ] **Step 3:** 구현. 시각 차이는 `'HH:MM'`을 분으로 바꿔 계산(같은 날 일정이라 날짜 무시).
- [ ] **Step 4:** `npx vitest run src/lib/tight.test.ts src/components/DayMap.test.tsx` → PASS
- [ ] **Step 5:** 커밋 `feat: tight schedule pairs and check`

### Task 2: 이동 시간 받아 경고 만들기 (훅)

**Files:**
- Create: `src/hooks/useTightLegs.ts`
- Test: `src/hooks/useTightLegs.test.ts`

**Interfaces:**
- Consumes: Task 1의 `tightPairs`, `fastestSec`, `isTight`; `getLeg`, `transitDeparture`, `LatLng`, `Leg`, `RouteMode` (routes.ts)
- Produces:
  - `interface TightWarning { gapSec: number; walkSec: number | null; transitSec: number | null }`
  - `type LoadLeg = (a: LatLng, b: LatLng, mode: RouteMode, departureTime: string | undefined) => Promise<Leg | null>`
  - `useTightLegs(items: Item[], timeZone: string | null | undefined, opts?: { apiKey?: string; loadLeg?: LoadLeg; now?: Date }): Record<string, TightWarning>` — 키 = 앞 일정 `id`. 빠듯한 쌍만 들어 있음.
  - 기본값: `apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY`, `loadLeg`는 `getLeg(a, b, m, { apiKey, departureTime })`.

- [ ] **Step 1: 실패하는 테스트** (`renderHook`, 가짜 `loadLeg`)
  - 11:00→11:20, 도보 2520초·대중교통 2100초 → `{ [A.id]: { gapSec: 1200, walkSec: 2520, transitSec: 2100 } }`.
  - 도보 600초면 → `{}`.
  - 대중교통이 `null`(실패)이고 도보 2520초 → 경고, `transitSec: null`.
  - 둘 다 `null` → `{}`. `loadLeg`가 throw해도 → `{}` (에러 안 남).
  - 대중교통 호출의 `departureTime`이 `transitDeparture(A.day, '11:00', now, 'Asia/Tokyo')`와 같음; 도보 호출은 `undefined`.
  - `apiKey: ''` → `loadLeg` 호출 0번, `{}`.
  - 날짜 바꾸기: 첫 items의 `loadLeg`를 늦게 resolve시키고 바로 다른 items로 rerender → 첫 결과가 결과에 나타나지 않음.
  - 같은 장소 쌍에서 B 시간만 11:20→12:00로 rerender → 경고 사라짐.
- [ ] **Step 2:** `npx vitest run src/hooks/useTightLegs.test.ts` → FAIL
- [ ] **Step 3:** 구현. 계산 요청 키 = `tightPairs` 결과를 JSON으로(id·time·lat·lng·gap) + timeZone. effect 안에서 쌍마다 도보·대중교통 `Promise.all`, cleanup에서 `alive = false`. 각 `loadLeg`는 catch → `null`.
- [ ] **Step 4:** 테스트 PASS
- [ ] **Step 5:** 커밋 `feat: tight schedule hook (fastest of walk and transit)`

### Task 3: 목록에 경고 줄 그리기

**Files:**
- Modify: `src/components/ItemList.tsx`
- Modify: `src/index.css` (`.tight-warning` — 기존 토큰만: 글씨 `--text-sm`, 색 `--color-ink-2`, 바탕 `--color-blush-wash`, 둥글기 `--radius-input`, 여백 `--space-xs`/`--space-sm`)
- Test: `src/components/ItemList.test.tsx` (새로)

**Interfaces:**
- Consumes: Task 2의 `useTightLegs`, `LoadLeg`; Task 1의 `formatDuration`
- Produces: `ItemList` Props에 선택 칸 `loadLeg?: LoadLeg`, `now?: Date` (테스트용, TripPage는 안 넘김). 시간대는 기존 `trip.timezone` 사용.

- [ ] **Step 1: 실패하는 테스트**
  - 빠듯한 쌍: A 카드와 B 카드 사이에 `⚠️ 20분 뒤 다음 일정인데 이동이 35분 걸려요`와 `(대중교통 35분 · 도보 42분)` (`findByText`). 요소 순서가 A 카드 → 경고 → B 카드.
  - 대중교통 `null`: 둘째 줄이 `(도보 42분)`.
  - 여유 있는 쌍: `⚠️` 문구 없음.
  - 경고 요소는 `role="note"`.
- [ ] **Step 2:** `npx vitest run src/components/ItemList.test.tsx` → FAIL
- [ ] **Step 3:** 구현. 카드 다음에 `warnings[it.id]`가 있으면 `<p className="tight-warning" role="note">` 두 줄(둘째 줄은 `<span className="note">`).
- [ ] **Step 4:** 전체 `npx vitest run` → 전부 PASS, `npm run build`, `npm run lint` 통과
- [ ] **Step 5:** 커밋 `feat: tight schedule warning between list cards`

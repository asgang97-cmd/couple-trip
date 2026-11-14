# 여행 설정 화면 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 앱 안에서 여행 이름·여행지·시작일·마지막 날을 바꾸는 ⚙️ 설정 창.

**Architecture:** 순수 함수(`countHiddenItems`)와 DB 함수(`updateTrip`)를 lib에 두고, `ItemForm`과 같은 바텀시트 컴포넌트 `TripSettings`가 이를 사용. `HomeHeader`에 ⚙️ 버튼, `TripPage`가 창 열기/저장/다시 불러오기를 담당.

**Tech Stack:** React 19 + TS, Vitest + Testing Library, Supabase JS.

**Spec:** `docs/superpowers/specs/2026-11-14-trip-settings-design.md`

## Global Constraints
- 바꿀 수 있는 칸: `title`(필수, trim 후 1~100자), `destination`(선택, 100자), `start_date`, `end_date`('YYYY-MM-DD').
- 통화·환율·시간대는 이 화면에 넣지 않음.
- 기간 밖 일정은 절대 지우지 않음 (숨겨질 뿐).
- 오프라인이면 ⚙️ 막힘 (`disabled`).
- 문구(정확히): 버튼 aria-label `여행 설정`, 창 제목 `여행 설정`, 라벨 `여행 이름`·`여행지`·`시작일`·`마지막 날`, 기간 `N일 여행`, 날짜 오류 `마지막 날은 시작일과 같거나 뒤여야 해요`, 경고 `기간 밖 일정 N개가 숨겨져요 (지워지진 않아요)`, 실패 알림 `여행 정보를 저장하지 못했어요. 다시 시도해 주세요`.

## Review Focus
- 시작일 = 마지막 날(당일치기) → 저장 가능, `1일 여행`. (Task 2 테스트)
- 날짜 칸을 비움 → 저장 막힘. (Task 2 테스트)
- 이름이 공백뿐 → 저장 막힘. (Task 2 테스트)
- 보고 있던 날짜 탭이 새 기간 밖 → 기본 선택(오늘/첫날)으로. (Task 3: `selected`가 `days`에 없으면 무시)
- 저장 실패 → 창 유지, 입력 유지. (Task 2 테스트: onSave reject 후 값 유지)

---

### Task 1: `countHiddenItems` + `updateTrip`

**Files:**
- Modify: `src/lib/dates.ts`, `src/lib/dates.test.ts`, `src/lib/repo.ts`, `src/lib/repo.test.ts`, `src/lib/types.ts`

**Interfaces:**
- Produces: `countHiddenItems(items: Item[], start: string, end: string): number` (dates.ts)
- Produces: `type TripInput = Pick<Trip, 'title' | 'destination' | 'start_date' | 'end_date'>` (types.ts)
- Produces: `updateTrip(id: string, input: TripInput): Promise<void>` (repo.ts) — `from('trips').update(input).eq('id', id)`, 에러면 throw.

- [ ] **Step 1: 실패하는 테스트**
  - dates: `countHiddenItems([day 01-10, 01-13, 01-14], '2027-01-10', '2027-01-12') === 2`; 범위 안이면 0.
  - repo: `updateTrip('trip-1', {...})` → calls에 `['from','trips']`, `update`, `['eq','id','trip-1']`; result error면 reject.
- [ ] **Step 2:** `npx vitest run src/lib/dates.test.ts src/lib/repo.test.ts` → FAIL (not a function)
- [ ] **Step 3:** 구현 (`countHiddenItems`는 `itemsInTrip(items, tripDays(start, end))` 재사용)
- [ ] **Step 4:** 같은 명령 → PASS
- [ ] **Step 5:** commit `feat: trip update and hidden-item count helpers`

### Task 2: `TripSettings` 바텀시트

**Files:**
- Create: `src/components/TripSettings.tsx`, `src/components/TripSettings.test.tsx`

**Interfaces:**
- Consumes: `countHiddenItems`, `tripDays`, `TripInput`
- Produces: `TripSettings(props: { trip: Trip; items: Item[]; onSave: (input: TripInput) => Promise<void>; onClose: () => void })`
  — `ItemForm`과 같은 `sheet-backdrop`/`sheet stack` 구조, `busy` 처리 동일.

- [ ] **Step 1: 실패하는 테스트** (`TRIP` = 2027-01-10~14)
  - 처음 값이 trip 값으로 채워지고 `5일 여행` 보임.
  - 이름·여행지·날짜 바꾸고 저장 → `onSave({ title, destination, start_date, end_date })` (trim 적용).
  - 마지막 날 < 시작일 → 오류 문구 + 저장 비활성.
  - 시작일 = 마지막 날 → `1일 여행`, 저장 가능.
  - 날짜 칸 비움 / 이름 공백 → 저장 비활성.
  - items에 01-14 일정 2개, 마지막 날을 01-13으로 → `기간 밖 일정 2개가 숨겨져요 (지워지진 않아요)`.
  - onSave가 reject해도 입력값 유지, 저장 버튼 다시 활성.
- [ ] **Step 2:** `npx vitest run src/components/TripSettings.test.tsx` → FAIL
- [ ] **Step 3:** 구현 (`<input type="date">`, 이름 `maxLength={100}`, 여행지 `maxLength={100}`)
- [ ] **Step 4:** 같은 명령 → PASS
- [ ] **Step 5:** commit `feat: trip settings sheet`

### Task 3: ⚙️ 버튼 연결

**Files:**
- Modify: `src/components/HomeHeader.tsx`, `src/components/HomeHeader.test.tsx`, `src/components/TripPage.tsx`, `src/index.css`

**Interfaces:**
- Consumes: `TripSettings`, `updateTrip`
- Produces: `HomeHeader` 새 prop `onOpenSettings: () => void`

- [ ] **Step 1: 실패하는 테스트** (HomeHeader): `여행 설정` 버튼 클릭 → `onOpenSettings` 호출; `disabled`면 버튼 disabled.
- [ ] **Step 2:** `npx vitest run src/components/HomeHeader.test.tsx` → FAIL
- [ ] **Step 3:** 구현
  - HomeHeader: 📷 옆에 `<button aria-label="여행 설정">⚙️</button>` (css: `.photo-btn`과 같은 원형, 나란히).
  - TripPage: `settingsOpen` 상태; 저장 = `updateTrip` → 닫기 → `data.reload()`; 실패 시 Global Constraints의 알림 + 창 유지 (오류 다시 던져 입력 유지).
  - TripPage: `const day = selected && days.includes(selected) ? selected : (기존 기본값)`.
- [ ] **Step 4:** `npx vitest run && npx tsc -b && npx oxlint && npm run build` → 모두 통과
- [ ] **Step 5:** commit `feat: open trip settings from cover` → push (자동 배포), 배포 번들 확인

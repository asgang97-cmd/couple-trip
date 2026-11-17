# 일정 종류(카테고리) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 일정에 종류(숙소·교통·식사·관광·쇼핑·기타)를 붙이고, 카드에 아이콘을 보이고, 목록 탭 위 버튼으로 여행 전체에서 한 종류만 모아 본다.

**Architecture:** 종류 정의·필터는 `src/lib/category.ts`. DB는 `items.category` 칸(SQL 009). 입력은 ItemForm, 표시는 ItemCard, 모아 보기는 새 `CategoryList`(날짜 제목 + 날짜별 `ItemList`), 버튼 줄과 화면 전환은 TripPage.

**Tech Stack:** React + TypeScript, Supabase(Postgres), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-17-item-category-design.md`

## Global Constraints

- 종류 (값 → 이름 · 아이콘, 이 순서로 표시): `stay` 숙소 🏨, `move` 교통 🚃, `food` 식사 🍜, `sight` 관광 ⛩️, `shop` 쇼핑 🛍️, `etc` 기타 📌.
- 종류는 선택. 없음 = `null`(예전 데이터는 칸 자체가 없을 수 있어 `undefined`도 없음으로 취급).
- 종류 없음은 카드에 아이콘 없음. 모아 보기 `etc`에는 종류 없음도 포함.
- 모아 보기: 여행 기간 안 일정만, 날짜 → 기존 `compareItems` 순, 날짜 제목 `N일차 · 1/12(화)` (ko-KR, month/day/weekday short), 빈 화면 문구 `아직 {이름} 일정이 없어요`, 빠듯한 일정 경고 없음.
- 고른 종류는 화면 상태만(저장 안 함), 기본 `전체`.
- SQL 먼저 실행 후 배포 (README에 9번으로 추가).

## Review Focus

1. 종류 칸이 없는 예전 데이터(`category` undefined)로도 카드·모아 보기·수정 저장이 깨지지 않음 → Task 1·3 테스트.
2. 종류를 고른 뒤 다시 눌러 해제하면 `null`로 저장 → Task 2 테스트.
3. 모아 보기 중 지도 탭으로 가면 날짜 탭이 다시 보이고 그날 지도 → Task 5 Step 5 화면 확인 (TripPage 테스트 파일 없음).
4. 모아 보기에서 여러 날 일정이 붙어 있어도 날짜 사이 "빠듯한 일정" 경고 안 나옴 → Task 4 테스트.
5. 모아 보기에서 일정 추가 → 그 종류가 미리 골라짐, 전체에서는 안 골라짐 → Task 2 테스트(defaultCategory) + Task 5 Step 5 화면 확인.

---

### Task 1: 종류 정의, 타입, SQL

**Files:**
- Create: `src/lib/category.ts`, `src/lib/category.test.ts`, `supabase/009_item_category.sql`
- Modify: `src/lib/types.ts` (Item에 `category?: Category | null`), `README.md` (SQL 목록 9번)

**Interfaces:**
- Produces:
  - `type Category = 'stay' | 'move' | 'food' | 'sight' | 'shop' | 'etc'`
  - `CATEGORIES: readonly { value: Category; label: string; icon: string }[]` (Global Constraints 순서)
  - `categoryInfo(c: Category | null | undefined): { value; label; icon } | null`
  - `itemsOfCategory(items: Item[], c: Category): Item[]` — `etc`면 `etc`·null·undefined 모두
  - `Item.category?: Category | null` (ItemInput에도 따라옴)

- [ ] **Step 1: 실패하는 테스트** — `CATEGORIES.map(c => c.value)`가 `['stay','move','food','sight','shop','etc']`, `categoryInfo('food')`가 `{ value: 'food', label: '식사', icon: '🍜' }`, `categoryInfo(null)`·`categoryInfo(undefined)`가 null, `itemsOfCategory`: food는 food만, etc는 etc + null + 칸 없는 것(`delete it.category`).
- [ ] **Step 2: 실패 확인** — `npx vitest run src/lib/category.test.ts` → FAIL(모듈 없음)
- [ ] **Step 3: 구현** + `009_item_category.sql`:
  ```sql
  -- 일정 종류 (숙소·교통·식사·관광·쇼핑·기타). 안 골라도 됨(null)
  alter table items add column if not exists category text
    check (category in ('stay', 'move', 'food', 'sight', 'shop', 'etc'));
  ```
  README SQL 목록에 `9. supabase/009_item_category.sql — 일정 종류(숙소·식사 등). 앱을 새로 배포하기 전에 먼저 실행` 추가.
- [ ] **Step 4: 통과 확인** — 같은 명령 → PASS, `npx tsc -b` 통과
- [ ] **Step 5: 커밋** — `feat: item categories and SQL 009`

### Task 2: 일정 창에서 종류 고르기

**Files:** Modify `src/components/ItemForm.tsx`, `src/index.css` · Test `src/components/ItemForm.test.tsx`

**Interfaces:**
- Consumes: `CATEGORIES`, `Category`
- Produces: ItemForm prop `defaultCategory?: Category | null` (새 일정의 처음 값, 수정할 땐 `initial.category ?? null`이 우선)

- [ ] **Step 1: 실패하는 테스트**
  - `'종류 버튼 6개, 누르면 골라져 저장'`: `role="group"` 이름 `종류` 안에 버튼 6개(이름 `🏨 숙소` … 순서대로), `🍜 식사` 누름 → `aria-pressed="true"`, 저장 → onSave 인자에 `category: 'food'`.
  - `'고른 걸 다시 누르면 해제, null로 저장'`.
  - `'안 고르면 null로 저장'` (기존 `'새 항목 저장 시 ItemInput'` 기대값에 `category: null` 추가).
  - `'수정: 저장된 종류가 골라져 있음, 칸 없는 예전 일정은 아무것도 안 골라짐'`.
  - `'defaultCategory가 있으면 새 일정에 미리 골라짐'`.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/components/ItemForm.test.tsx` → 새 테스트 FAIL
- [ ] **Step 3: 구현** — 장소 이름 입력칸 바로 아래 `<div role="group" aria-label="종류" className="category-pick">` + 버튼(`type="button"`, `aria-pressed`). 저장 객체에 `category`. CSS: 줄바꿈 없이 가로로 밀기(`overflow-x: auto`), 기존 칩 토큰 사용.
- [ ] **Step 4: 통과 확인** — 같은 명령 → PASS
- [ ] **Step 5: 커밋** — `feat: pick a category in the item form`

### Task 3: 카드에 종류 아이콘

**Files:** Modify `src/components/ItemCard.tsx`, `src/index.css` · Test `src/components/ItemCard.test.tsx`

**Interfaces:** Consumes `categoryInfo`

- [ ] **Step 1: 실패하는 테스트**
  - `'종류가 있으면 시간 옆에 아이콘, 읽는 이름은 종류 이름'`: `category: 'food'` → `screen.getByText('🍜')`, 그 요소 `aria-label`(또는 `role="img"` 이름) `식사`.
  - `'종류 없거나 칸 없으면 아이콘 없음'`: null·undefined 둘 다 `queryByRole('img', { name: /숙소|교통|식사|관광|쇼핑|기타/ })` 없음.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/components/ItemCard.test.tsx` → FAIL
- [ ] **Step 3: 구현** — `.card-head`의 시간 `<span className="time">` 바로 앞에 `<span className="cat" role="img" aria-label={label}>{icon}</span>`.
- [ ] **Step 4: 통과 확인** → PASS
- [ ] **Step 5: 커밋** — `feat: category icon on item cards`

### Task 4: 모아 보기 목록 (`CategoryList`)

**Files:**
- Create: `src/components/CategoryList.tsx`, `src/components/CategoryList.test.tsx`
- Modify: `src/components/ItemList.tsx` (prop `tight?: boolean`, 기본 true; false면 `useTightLegs`에 `[]`)

**Interfaces:**
- Consumes: `itemsOfCategory`, `categoryInfo`, `groupItemsByDay`(`src/lib/dates`), `parseLocalDate`
- Produces: `CategoryList(props: { category: Category; items: Item[]; days: string[] } & Omit<ItemListProps, 'items'>)` — ItemList의 나머지 props를 그대로 받아 날짜별 `ItemList`(`tight={false}`)에 넘김. `ItemList`의 `Props`는 `export type ItemListProps`로 내보냄.

- [ ] **Step 1: 실패하는 테스트**
  - `'여행 기간 안 그 종류만, 날짜 제목과 함께 날짜순'`: 1일차 food, 3일차 food, 2일차 stay, 기간 밖 food → 제목 `1일차 · {fmt}`, `3일차 · {fmt}`만(`heading` 역할), 카드 2개.
  - `'기타는 종류 없는 일정 포함'`.
  - `'없으면 안내 문구'`: `아직 식사 일정이 없어요`.
  - `'날짜 사이 빠듯한 일정 경고 없음'`: `loadLeg`가 항상 아주 긴 이동을 돌려줘도 `.tight-warning` 없음(ItemList 테스트의 loadLeg 모양 그대로).
- [ ] **Step 2: 실패 확인** — `npx vitest run src/components/CategoryList.test.tsx` → FAIL
- [ ] **Step 3: 구현** — 날짜 제목은 `<h3 className="cat-day">`. 빈 화면은 기존 `.empty` 문단.
- [ ] **Step 4: 통과 확인** — `npx vitest run src/components/CategoryList.test.tsx src/components/ItemList.test.tsx` → PASS
- [ ] **Step 5: 커밋** — `feat: whole-trip list for one category`

### Task 5: 목록 탭 위 종류 버튼 줄

**Files:** Modify `src/components/TripPage.tsx`, `src/index.css`, `.hallmark/preview/fakeRepo.ts` (가짜 일정 몇 개에 category) · Test: `src/components/TripPage.test.tsx`가 있으면 거기, 없으면 새로 만들지 말고 `CategoryBar` 컴포넌트로 빼서 `src/components/CategoryBar.test.tsx`

**Interfaces:**
- Consumes: `CATEGORIES`, `CategoryList`, ItemForm `defaultCategory`
- Produces: `CategoryBar({ value: Category | null; onChange: (c: Category | null) => void })` — `role="group"` 이름 `종류별로 보기`, 버튼 `전체` + 6개(`🏨 숙소` …), `aria-pressed`.

- [ ] **Step 1: 실패하는 테스트** (CategoryBar)
  - `'전체 + 6개, 고른 것만 눌림'`, `'누르면 onChange(값), 전체는 onChange(null)'`.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/components/CategoryBar.test.tsx` → FAIL
- [ ] **Step 3: 구현**
  - CategoryBar 컴포넌트.
  - TripPage: `const [category, setCategory] = useState<Category | null>(null)`. `view === 'list'`일 때만 보기 탭 아래 CategoryBar. `view === 'list' && category`면 `DayTabs` 숨기고 `ItemList` 대신 `CategoryList`(items=`tripItems`). 다른 탭에서는 DayTabs 그대로(category는 남겨 둠, 목록으로 돌아오면 이어짐).
  - `FormState`의 new에 `category?: Category`; 일정 추가 버튼은 `setForm({ mode: 'new', category: view === 'list' ? category ?? undefined : undefined })`; ItemForm에 `defaultCategory`.
  - fakeRepo 가짜 일정에 food·stay 몇 개.
- [ ] **Step 4: 통과 확인** — `npx vitest run src/components/CategoryBar.test.tsx` → PASS
- [ ] **Step 5: 화면 확인** — 미리보기(`npx vite --config .hallmark/preview/vite.config.ts`)를 375px로 열어 식사 → 모아 보기, 지도 탭 → 날짜 탭 다시 보임, 목록 → 식사 그대로, 일정 추가 → 식사 골라짐.
- [ ] **Step 6: 전체 확인** — `npx vitest run`, `npx tsc -b`, `npm run lint`, `npm run build`
- [ ] **Step 7: 커밋** — `feat: category bar above the list for whole-trip view`

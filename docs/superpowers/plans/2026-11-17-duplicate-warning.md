# 중복 알림 (일정·준비물) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 일정 저장·준비물 추가 순간에 겹치는 게 있으면 폰 기본 확인 창으로 알리고, [확인]이면 그대로 저장한다(막지 않음).

**Architecture:** 비교는 `src/lib/duplicates.ts`의 순수 함수 두 개. 창(`confirm()`)은 `ItemForm`의 저장과 `PackingList`의 추가에서 띄운다. `ItemForm`은 여행 전체 일정을 새 prop `allItems`로 받는다.

**Tech Stack:** React + TypeScript, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-17-duplicate-warning-design.md`

## Global Constraints

- 막지 않는다: [취소]면 저장 안 하고 쓴 내용 그대로, [확인]이면 그대로 저장.
- 창은 `window.confirm()` (앱의 다른 확인 창과 같은 방식).
- 이름 비교: 모든 공백 제거 + 영문 소문자. 빈 이름은 비교 안 함.
- 일정 창 문구 (줄바꿈 `\n`):
  `이미 넣은 장소예요\n· 2일차 11/30(월) 14:00 센소지 (밍하)\n그래도 저장할까요?` — 최대 3줄, 시간 없으면 시간 빼고, 괄호 안은 `theme.names[created_by]`.
- 준비물 창 문구: `"여권"은 이미 있어요 (같이). 그래도 넣을까요?` — 괄호 안은 겹친 것의 챙길 사람(`같이`/`밍석`/`밍하`), 여러 개면 `, `로.
- 날짜 표시는 ItemForm의 기존 `dayFmt`(`ko-KR`, month/day/weekday short) + `N일차` (여행 날짜 목록에서의 순서).

## Review Focus

1. 일정 **수정**에서 장소를 안 바꾸고 메모만 고치면 창이 뜨지 않아야 함 → Task 2 테스트.
2. 장소 번호가 한쪽만 있을 때(검색으로 고른 것 vs 이름만 적은 것) 이름으로 비교 → Task 1 테스트.
3. 장소 번호가 둘 다 있는데 다르면 이름이 같아도 겹침 아님(체인점 지점 다름) → Task 1 테스트.
4. [취소] 후 쓴 내용이 지워지지 않아야 함(준비물 이름 칸, 일정 창 열린 채) → Task 2·3 테스트.
5. 상대 사람 개인 준비물만 있으면 창 없이 바로 추가 → Task 3 테스트.

---

### Task 1: 비교 함수

**Files:**
- Create: `src/lib/duplicates.ts`
- Test: `src/lib/duplicates.test.ts`

**Interfaces:**
- Produces:
  - `sameName(a: string, b: string): boolean` — 공백 전부 제거·소문자 후 같고, 비어 있지 않음.
  - `samePlaceItems(target: { id?: string; place_name: string; google_place_id: string | null }, items: Item[]): Item[]` — target 자신(id 같음) 제외. 둘 다 `google_place_id`가 있으면 번호 비교, 하나라도 없으면 `sameName`. 결과는 `day` → `time`(null은 뒤) 순.
  - `samePackingItems(name: string, owner: PackingItem['owner'], items: PackingItem[]): PackingItem[]` — `sameName` 이고, owner가 `'both'`면 모든 owner, `'a'|'b'`면 owner가 `'both'` 또는 같은 사람인 것.

- [ ] **Step 1: 실패하는 테스트** (`makeItem`은 `src/test-fixtures`)

```ts
test('sameName: 공백·대소문자 무시, 빈 이름은 겹침 아님', () => {
  expect(sameName('센소지', ' 센 소지 ')).toBe(true)
  expect(sameName('Ichiran', 'ichiran')).toBe(true)
  expect(sameName('', '  ')).toBe(false)
})
test('samePlaceItems: 장소 번호가 둘 다 있으면 번호로', () => {
  const a = makeItem({ id: '1', place_name: '이치란', google_place_id: 'P1' })
  const b = makeItem({ id: '2', place_name: '이치란', google_place_id: 'P2' })
  const c = makeItem({ id: '3', place_name: '이치란 본점', google_place_id: 'P1' })
  expect(samePlaceItems({ place_name: '이치란', google_place_id: 'P1' }, [a, b, c]).map((i) => i.id)).toEqual(['1', '3'])
})
test('samePlaceItems: 한쪽이라도 번호가 없으면 이름으로, 자기 자신은 뺌, 날짜·시간 순', () => {
  const x = makeItem({ id: '1', day: '2026-12-02', time: null, place_name: '센소지', google_place_id: 'P1' })
  const y = makeItem({ id: '2', day: '2026-12-01', time: '14:00', place_name: '센 소지', google_place_id: null })
  const self = makeItem({ id: '9', place_name: '센소지', google_place_id: null })
  expect(samePlaceItems({ id: '9', place_name: '센소지', google_place_id: null }, [x, y, self]).map((i) => i.id)).toEqual(['2', '1'])
})
test('samePackingItems: 같이는 누구 것이든, 개인은 같이·같은 사람 것만', () => {
  const both = P({ id: 'b', name: '우산', owner: 'both' })
  const a = P({ id: 'a', name: '여권', owner: 'a' })
  const b = P({ id: 'bb', name: '여권', owner: 'b' })
  expect(samePackingItems('여권', 'both', [both, a, b]).map((i) => i.id)).toEqual(['a', 'bb'])
  expect(samePackingItems('여권', 'a', [a, b]).map((i) => i.id)).toEqual(['a'])
  expect(samePackingItems('여권', 'b', [a]).map((i) => i.id)).toEqual([])
  expect(samePackingItems(' 우 산', 'a', [both]).map((i) => i.id)).toEqual(['b'])
})
```
(`P`는 테스트 안에서 `PackingItem` 기본값 + 덮어쓰기 헬퍼; `PackingList.test.tsx`의 `P`와 같은 모양)

- [ ] **Step 2: 실패 확인** — `npx vitest run src/lib/duplicates.test.ts` → FAIL (모듈 없음)
- [ ] **Step 3: 위 Interfaces대로 구현**
- [ ] **Step 4: 통과 확인** — 같은 명령 → PASS
- [ ] **Step 5: 커밋** — `feat: duplicate checks for schedule places and packing items`

### Task 2: 일정 저장 확인 창

**Files:**
- Modify: `src/components/ItemForm.tsx` (Props에 `allItems`, `submit` 시작부)
- Modify: `src/components/TripPage.tsx` (`<ItemForm ... allItems={data.items} />`)
- Test: `src/components/ItemForm.test.tsx`

**Interfaces:**
- Consumes: `samePlaceItems` (Task 1), `theme.names`
- Produces: `ItemForm` Props에 `allItems?: Item[]` (없으면 비교 안 함 → 기존 테스트 그대로)

- [ ] **Step 1: 실패하는 테스트** (`vi.spyOn(window, 'confirm')`)
  - `'같은 장소가 다른 날에 있으면 확인 창, 취소면 저장 안 함'`: allItems에 `{ day: days[1], time: '14:00', place_name: '센소지', created_by: 'b' }`, 새 일정 장소 `센소지` 저장 → confirm 메시지가 정확히 `` `이미 넣은 장소예요\n· 2일차 ${dayFmt(days[1])} 14:00 센소지 (밍하)\n그래도 저장할까요?` `` (테스트 안에서 같은 `Intl.DateTimeFormat`으로 기대값 만들기), `onSave` 안 불림, 장소 칸 값 그대로.
  - `'확인이면 그대로 저장'`: confirm → true, `onSave` 1번.
  - `'겹치는 게 없으면 창 없이 저장'`: confirm 안 불림.
  - `'수정할 때 장소를 안 바꾸면 창 없음'`: `initial` = 겹치는 일정 중 하나와 같은 장소, 메모만 바꿔 저장 → confirm 안 불림, onSave 1번.
  - `'수정할 때 장소를 바꾸면 확인'`: `initial` 장소 `A`, 이름을 겹치는 `센소지`로 바꿔 저장 → confirm 불림.
  - `'겹치는 게 4개면 3줄만'`: confirm 메시지의 `·` 줄 수 = 3.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/components/ItemForm.test.tsx` → 새 테스트 FAIL
- [ ] **Step 3: 구현** — `submit`에서 `canSave` 확인 뒤, `setBusy` 전에: 장소가 바뀌었는지(`!initial` 또는 `placeName.trim() !== initial.place_name` 또는 `(location?.placeId ?? null) !== initial.google_place_id`) 볼 때만 `samePlaceItems({ id: initial?.id, place_name: placeName, google_place_id: location?.placeId ?? null }, allItems ?? [])`. 결과가 있으면 문구(Global Constraints) 만들어 `confirm`, false면 return. `N일차`는 `days.indexOf(day) + 1`, 여행 기간 밖 날짜(-1)면 `N일차 ` 빼고 날짜만.
- [ ] **Step 4: 통과 확인** — `npx vitest run src/components/ItemForm.test.tsx src/components/TripPage.test.tsx` → PASS
- [ ] **Step 5: 커밋** — `feat: warn before saving a place that is already in the trip`

### Task 3: 준비물 추가 확인 창

**Files:**
- Modify: `src/components/PackingList.tsx` (`add`)
- Test: `src/components/PackingList.test.tsx`

**Interfaces:**
- Consumes: `samePackingItems` (Task 1), 파일 안 `ownerName`

- [ ] **Step 1: 실패하는 테스트**
  - `'같이 준비물과 같은 이름이면 확인 창, 취소면 안 넣고 이름 남김'`: items `[P({ name: '여권', owner: 'both' })]`, 이름 `여권`·챙길 사람 `밍석`으로 추가 → confirm 메시지 `'"여권"은 이미 있어요 (같이). 그래도 넣을까요?'`, `onAdd` 안 불림, 입력칸 값 `여권`.
  - `'확인이면 넣음'`: confirm true → `onAdd('여권', 'a')`.
  - `'상대 개인 준비물만 있으면 창 없이 넣음'`: items `[P({ name: '여권', owner: 'b' })]`, `밍석`으로 추가 → confirm 안 불림, onAdd 1번.
  - `'같이로 넣을 때 개인 것들이 있으면 모두 표시'`: items 여권 a·b, `같이`로 추가 → 메시지 `'"여권"은 이미 있어요 (밍석, 밍하). 그래도 넣을까요?'`.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/components/PackingList.test.tsx` → 새 테스트 FAIL
- [ ] **Step 3: 구현** — `add`에서 `canAdd` 뒤: `samePackingItems(name.trim(), owner, items)`가 있으면 owner 이름들(중복 없이, 나온 순서) 넣어 `confirm`, false면 return(이름 유지). `items`는 컴포넌트 안의 pending 반영된 목록.
- [ ] **Step 4: 통과 확인** — 같은 명령 → PASS
- [ ] **Step 5: 전체 확인** — `npx vitest run`, `npx tsc -b`, `npm run lint`, `npm run build` 모두 통과
- [ ] **Step 6: 커밋** — `feat: warn before adding a packing item that is already there`

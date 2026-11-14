# 비짓재팬 준비 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 두 사람의 VJW 입력 정보를 폰에만 저장하고 칸별로 복사하는 바텀시트.

**Architecture:** `lib/vjw.ts`(순수: 타입·저장·가리기·기본값·가져오기 후보) → `components/VisitJapanSheet.tsx`(보기/수정/복사) → `HomeHeader` 비행기 버튼 + `TripPage` 연결.

**Tech Stack:** React 19 + TS, Vitest + Testing Library, localStorage.

**Spec:** `docs/superpowers/specs/2026-11-14-visit-japan-design.md`

## Global Constraints
- 저장은 localStorage `vjw:v1`만. Supabase 호출 금지.
- 필드 키(순서 고정): passport: `passportNo, surname, givenName, nationality, birthDate, sex, passportExpiry`; entry: `purpose, stayDays, flightNo, arrivalDate, arrivalAirport`; address: `hotelName, postalCode, address, phone`; 그리고 `memo`.
- 문구: 시트 제목 `비짓재팬 준비`, 버튼 aria-label `비짓재팬 준비`, 복사 버튼 aria-label `${라벨} 복사`, 알림 `복사했어요`, `수정`, `저장`, `${이름}과 같게`(입국·주소), `이 폰에서 지우기`, 안내 `이 폰에만 저장돼요. 서버로 보내지 않아요.`
- 여권번호 가리기: 앞 4자 + 나머지 `*` (4자 이하면 그대로).
- 오프라인이어도 버튼·시트 동작.

## Review Focus
- 저장소 막힘(사파리 사생활 모드 등) → 시트는 열리고 저장 실패 안내. (Task 1 테스트)
- 깨진 저장값 → 빈 기본값으로. (Task 1 테스트)
- 클립보드 막힘 → "복사하지 못했어요, 길게 눌러 복사" 안내. (Task 2 테스트)
- 값이 빈 칸의 복사 버튼 → 숨김. (Task 2 테스트)
- 수정 중 닫기 → 저장 안 한 내용은 버림(되묻지 않음). (Task 2, 판단)

---

### Task 1: `lib/vjw.ts`
**Files:** Create `src/lib/vjw.ts`, `src/lib/vjw.test.ts`
**Interfaces (Produces):**
- `type VjwPerson = Record<FieldKey, string>`; `type VjwData = Record<Member, VjwPerson>`; `FIELD_GROUPS: { title: string; fields: { key: FieldKey; label: string; type?: 'date' | 'text' }[] }[]`
- `emptyPerson(trip?: Trip): VjwPerson` (nationality `대한민국 (KOR)`, purpose `관광`, stayDays = 여행 일수 문자열, arrivalDate = start_date)
- `loadVjw(trip?: Trip, storage?): VjwData`, `saveVjw(data, storage?): boolean`, `clearVjw(storage?): void`
- `maskPassport(no: string): string`
- `flightCandidates(items: Item[]): string[]` (booking_code 있는 일정, 중복 제거), `hotelCandidates(items: Item[]): string[]` (place_name 중복 제거)
- [ ] 테스트: 저장→읽기 동일, 깨진/없는 값→기본값, setItem throw→`saveVjw` false, mask `M12345678`→`M123*****`, `AB`→`AB`, 후보 중복 제거.
- [ ] FAIL 확인 → 구현 → PASS → commit `feat: visit japan local storage helpers`

### Task 2: `VisitJapanSheet`
**Files:** Create `src/components/VisitJapanSheet.tsx`, `.test.tsx`; Modify `src/components/Icon.tsx` (+`plane`, `copy`)
**Interfaces:** `VisitJapanSheet(props: { trip: Trip; items: Item[]; onClose: () => void; storage?: Storage; clipboard?: { writeText(s: string): Promise<void> } })`
- [ ] 테스트: 기본은 밍석 보기 모드, 여권번호 가려 보임 + 복사하면 전체가 clipboard로 / 빈 칸엔 복사 버튼 없음 / 수정→입력→저장하면 storage에 남고 보기 모드 / 밍하 탭에서 `밍석과 같게` → 입국·주소 값 복사, 여권은 안 바뀜 / 일정 후보 select에서 항공편 고르면 칸 채워짐 / clipboard reject → `복사하지 못했어요` 안내 / `이 폰에서 지우기` confirm 후 storage 비움 / 저장 실패 시 안내.
- [ ] FAIL → 구현 → PASS → commit `feat: visit japan prep sheet`

### Task 3: 연결 + 스타일
**Files:** Modify `HomeHeader.tsx`(+`onOpenVisitJapan`), `.test.tsx`, `TripPage.tsx`, `index.css`
- [ ] 테스트(HomeHeader): `비짓재팬 준비` 버튼 → 콜백; `disabled`(오프라인)여도 활성.
- [ ] 구현: 버튼은 ⚙️ 앞, TripPage `vjwOpen` 상태로 시트 렌더(items = data.items). CSS는 기존 토큰만(`.vjw-*`), 복사 버튼 32px 이상·44px 터치, focus-visible.
- [ ] `npx vitest run && npx tsc -b && npx oxlint && npm run build` 통과 → commit → 최종 리뷰 후 push.

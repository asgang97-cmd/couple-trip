# 커버 사진 자르기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** 커버 사진을 4:3 틀에서 끌기·확대로 잘라 1200×900으로 올리기.
**Spec:** `docs/superpowers/specs/2026-11-14-cover-crop-design.md`

## Global Constraints
- 틀 비율 4:3, 결과 1200×900 JPEG(0.85), 확대 1~4배, 틀은 항상 꽉 참.
- 문구: 시트 제목 `사진 자르기`, 막대 aria-label `크기`, 버튼 `취소`, `저장`, 안내 `끌어서 위치를, 두 손가락이나 막대로 크기를 맞춰요`.

## Review Focus
- 세로로 긴 사진 / 아주 작은 사진(틀보다 작음) → 꽉 차게 시작. (Task 1)
- 끌어서 틀 밖으로 → 가장자리에서 멈춤. (Task 1)
- 확대 후 축소 → 위치가 틀 밖으로 안 나감. (Task 1)
- 사진을 못 읽음(HEIC 등) → 안내 후 닫기. (Task 2)
- 저장 중 두 번 누름 → 한 번만. (Task 2)

### Task 1: `lib/crop.ts`
`coverScale(img, frame)`, `clampOffset(view, img, frame)`, `zoomAt(view, zoom, focus, img, frame)`, `cropRect(view, img, frame)`; `View = { zoom, x, y }` (x,y = 사진 왼쪽 위의 틀 기준 위치, px). 테스트 → 구현 → commit.

### Task 2: `CoverCropper`
props `{ file, onCancel, onDone(blob) }` + 테스트용 `loadImage`, `renderCrop`. 포인터 끌기·두 손가락·막대·키보드. 테스트 → 구현 → commit.

### Task 3: 연결
TripPage `changePhoto` → 자르기 시트 → `uploadCover`. CSS. 전체 검사 → 리뷰 → push.

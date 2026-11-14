# 보관함 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** 바우처 보관함(업로드·자동 연결 추천·오프라인 보기).
**Spec:** `docs/superpowers/specs/2026-11-14-voucher-vault-design.md`

## Global Constraints
- 표 `vouchers(id, trip_id, item_id null, day null, title, kind 'image'|'pdf', path, pages text[], size, created_at)`; 버킷 `vouchers` 비공개 10MB.
- 오프라인이면 올리기·수정·지우기 막힘, 보기는 저장본으로.
- 표가 없어도(SQL 전) 앱 정상, 보관함은 빈 목록 (준비물과 같은 규칙: 표 없음만 []; 그 밖의 실패는 이전 목록 유지).

## Review Focus
- 같은 예약번호가 여러 일정에 → 첫 일정 추천, 사용자 확인. (T1)
- 여행 기간 밖 날짜만 있는 PDF → 추천 없음. (T1)
- 글자 없는 스캔 PDF → 추천 없음, 페이지 그림은 생성. (T2 수동)
- 저장 공간 부족으로 캐시 실패 → "폰에 저장 안 됨" 표시, 앱 정상. (T4)
- 업로드 중 실패 → 올라간 파일 정리, 입력 유지. (T3)

### T1 SQL + 타입 + `lib/voucherMatch.ts` (findDates, suggestLink) — 테스트 먼저
### T2 `lib/voucherFile.ts`: prepareUpload(file) → {kind, main Blob, pages Blob[], text} (pdf.js 지연 로딩, 사진 JPEG 변환)
### T3 repo(list/upload/update/delete/download) + useTripData(vouchers, voucherError) + snapshot — 테스트 먼저
### T4 `lib/voucherCache.ts` (Cache Storage, sync, prune) + `useVoucherCache` — 테스트 먼저
### T5 `VoucherUploadSheet`, `VaultView`, `VoucherViewer` — 테스트 먼저
### T6 ItemCard 바우처 칸 + TripPage 보관함 탭 + CSS + 미리보기 확인
### T7 전체 검사, 리뷰, push, SQL 안내

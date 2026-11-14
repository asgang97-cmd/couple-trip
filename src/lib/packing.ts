/** 일본 여행에 자주 챙기는 것 (비어 있을 때 한 번에 넣기) */
export const STARTER_ITEMS = [
  '여권', '항공권과 숙소 예약 확인', '엔화 현금과 트래블카드', '휴대폰 충전기', '보조배터리',
  '돼지코 (일본 콘센트용 플러그)', '유심 또는 이심', '상비약', '세면도구', '우산',
]

/** 준비물 표가 아직 없음 (004_packing.sql 실행 전) */
export function isMissingTableError(e: unknown): boolean {
  const m = e instanceof Error ? e.message : String(e)
  return /packing_items/.test(m) && /(does not exist|schema cache)/.test(m)
}

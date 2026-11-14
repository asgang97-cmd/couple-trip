const fmt = new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })

export function OfflineBanner({ offline, savedAt }: { offline: boolean; savedAt: string | null }) {
  if (!offline) return null
  return (
    <div role="status" className="offline-banner">
      오프라인이에요. {savedAt ? `${fmt.format(new Date(savedAt))}에 저장한 일정을 보여줘요 (보기만 가능)` : '보기만 가능해요'}
    </div>
  )
}

import { formatMoney, sumKrw } from '../lib/money'
import type { RateResult } from '../lib/rates'
import type { Item, Trip } from '../lib/types'

interface Props {
  dayItems: Item[]
  allItems: Item[]
  trip: Trip
  rate: RateResult
}

const timeFmt = new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })

export function CostSummary({ dayItems, allItems, trip, rate }: Props) {
  if (!allItems.some((i) => i.cost_amount !== null)) return null

  const day = sumKrw(dayItems, trip.currency, rate.rate)
  const all = sumKrw(allItems, trip.currency, rate.rate)

  let note: string | null = null
  if (rate.source === 'cached' && rate.fetchedAt) note = `저장된 환율 기준 (${timeFmt.format(new Date(rate.fetchedAt))})`
  // 직접 넣은 환율은 둘이 정한 값이라 따로 알리지 않음 (메인 화면 한 줄 유지)

  return (
    <section className="cost-summary" aria-label="예상 비용">
      <div>
        <small>이 날</small>
        <strong>{formatMoney(day.totalKrw, 'KRW')}</strong>
      </div>
      <div>
        <small>여행 전체</small>
        <strong>{formatMoney(all.totalKrw, 'KRW')}</strong>
      </div>
      {all.unconvertedCount > 0 && (
        <p className="note">환율을 못 불러와서 {all.unconvertedCount}개는 현지통화로만 보여요</p>
      )}
      {note && <p className="note">{note}</p>}
    </section>
  )
}

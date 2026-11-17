import { Fragment } from 'react'
import { useNow } from '../hooks/useNow'
import { usePlaceHours, type LoadHours } from '../hooks/usePlaceHours'
import { useTightLegs, type LoadLeg, type TightWarning } from '../hooks/useTightLegs'
import { checkHours, todayIn } from '../lib/hours'
import { formatDuration } from '../lib/routes'
import { fastestSec } from '../lib/tight'
import type { Comment, Heart, Item, Member, Trip, Voucher } from '../lib/types'
import { Mascot } from './Mascot'
import { splitNextUp, timeIn } from '../lib/nextUp'
import { ItemCard } from './ItemCard'

export interface ItemListProps {
  items: Item[]
  trip: Trip
  member: Member
  rate: number | null
  hearts: Heart[]
  comments: Comment[]
  disabled: boolean
  onEdit: (item: Item) => void
  onToggleHeart: (itemId: string, on: boolean) => Promise<void>
  onAddComment: (itemId: string, body: string) => Promise<void>
  onEditComment: (id: string, body: string) => Promise<void>
  onDeleteComment: (id: string) => Promise<void>
  vouchers: Voucher[]
  onOpenVoucher: (v: Voucher) => void
  onAddVoucher: (itemId: string, file: File) => void
  // 테스트용 (앱에서는 안 넘김: 구글 경로 계산 + .env의 API 키)
  loadLeg?: LoadLeg
  loadHours?: LoadHours
  apiKey?: string
  now?: Date
  /** false면 두 일정 사이 '빠듯한 일정' 경고를 안 구함 (종류별 모아 보기: 날짜가 섞여 있어서) */
  tight?: boolean
  /** 다음 일정을 맨 위에 크게, 오늘 지난 일정은 아래에 접어 둠 (날짜별 목록) */
  lead?: boolean
}

const NO_ITEMS: Item[] = []

export function ItemList({ items, hearts, comments, vouchers, onAddVoucher, onEdit, onToggleHeart, onAddComment, loadLeg, loadHours, apiKey, now, tight = true, lead = false, ...rest }: ItemListProps) {
  // 바로 붙은 두 일정 사이에 이동조차 못 하면 경고 (도보·대중교통 중 빠른 쪽 기준)
  const keyOpt = apiKey !== undefined ? { apiKey } : {}
  const warnings = useTightLegs(tight ? items : NO_ITEMS, rest.trip.timezone, { loadLeg, now, ...keyOpt })
  // 장소 검색으로 넣은 일정: 그날 휴무·영업시간 밖·1시간 안 마감이면 카드에 경고
  const hours = usePlaceHours(items.flatMap((it) => (it.google_place_id ? [it.google_place_id] : [])), { loadHours, ...keyOpt })
  const clock = useNow() // 앱으로 돌아올 때마다 새로 (자정 넘김 반영)
  const today = todayIn(rest.trip.timezone, now ?? clock)
  const hoursWarningOf = (it: Item) => {
    const h = it.google_place_id ? hours[it.google_place_id] : undefined
    // 특별 영업일(7일치)은 받은 날 기준 — 폰에 저장된 며칠 전 것이면 그만큼 범위가 앞당겨짐
    return h ? checkHours(h, it.day, it.time, h.fetchedAt !== undefined ? todayIn(rest.trip.timezone, new Date(h.fetchedAt)) : today) : null
  }
  if (items.length === 0) {
    return (
      <div className="empty-pond">
        <div className="pond-perch" aria-hidden="true">
          <Mascot slot="empty" size={88} />
        </div>
        <p className="empty-title">이 날은 아직 비어 있어요</p>
        <p className="empty">아래 일정 추가로 첫 일정을 넣어 보세요</p>
      </div>
    )
  }
  const card = (it: Item, featured: string | null = null, compact = false) => (
    <Fragment key={it.id}>
      <ItemCard
        item={it}
        featured={featured}
        compact={compact}
        hoursWarning={hoursWarningOf(it)}
        {...rest}
        hearts={hearts.filter((h) => h.item_id === it.id)}
        comments={comments.filter((c) => c.item_id === it.id)}
        onEdit={() => onEdit(it)}
        onToggleHeart={(on) => onToggleHeart(it.id, on)}
        onAddComment={(body) => onAddComment(it.id, body)}
        vouchers={vouchers.filter((v) => v.item_id === it.id)}
        onAddVoucher={(file) => onAddVoucher(it.id, file)}
      />
      {warnings[it.id] && <TightNote w={warnings[it.id]} />}
    </Fragment>
  )
  if (!lead) return <div className="item-list">{items.map((it) => card(it))}</div>
  // 다음 일정 먼저: 오늘이면 지금(여행지 시각) 이후 첫 일정, 다른 날이면 그날 첫 일정
  const next = splitNextUp(items, items[0].day, today, timeIn(rest.trip.timezone, now ?? clock))
  return (
    <div className="item-list">
      {next.lead && card(next.lead, next.label)}
      {next.rest.map((it) => card(it, null, true))}
      {next.passed.length > 0 && (
        <details className="passed">
          <summary>지난 일정 {next.passed.length}개</summary>
          <div className="passed-list">{next.passed.map((it) => card(it, null, true))}</div>
        </details>
      )}
    </div>
  )
}

/** 두 카드 사이 경고: 빠른 쪽 시간 + 수단별 시간 (못 구한 수단은 빠짐) */
function TightNote({ w }: { w: TightWarning }) {
  const modes = [
    w.transitSec !== null && `대중교통 ${formatDuration(w.transitSec)}`,
    w.walkSec !== null && `도보 ${formatDuration(w.walkSec)}`,
  ].filter(Boolean)
  return (
    <p className="tight-warning" role="note">
      ⚠️ {formatDuration(w.gapSec)} 뒤 다음 일정인데 이동이 {formatDuration(fastestSec(w.walkSec, w.transitSec)!)} 걸려요
      <span className="note">({modes.join(' · ')})</span>
    </p>
  )
}

import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useRate } from '../hooks/useRate'
import { useTripData } from '../hooks/useTripData'
import { groupItemsByDay, itemsInTrip, toDateString, tripDays } from '../lib/dates'
import { resizeImage } from '../lib/image'
import { itemsWithLocation } from '../lib/maps'
import {
  addComment, coverUrl as getCoverUrl, deleteComment, deleteItem, ITEM_GONE, saveItem, toggleHeart, updateComment, uploadCover,
} from '../lib/repo'
import type { Item, ItemInput, Member } from '../lib/types'
import { CostSummary } from './CostSummary'
import { DayTabs } from './DayTabs'
import { HomeHeader } from './HomeHeader'
import { ItemForm } from './ItemForm'
import { ItemList } from './ItemList'
import { OfflineBanner } from './OfflineBanner'

// 구글 지도 코드는 커서 필요할 때(지도 보기·장소 검색)만 불러옴 → 첫 화면이 빨리 뜸
const DayMap = lazy(() => import('./DayMap').then((m) => ({ default: m.DayMap })))
const PlaceSearch = lazy(() => import('./PlaceSearch').then((m) => ({ default: m.PlaceSearch })))

type FormState = { mode: 'new' } | { mode: 'edit'; item: Item } | null

export function TripPage({ member }: { member: Member }) {
  const data = useTripData()
  const rate = useRate(data.trip)
  const [selected, setSelected] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(null)
  const [coverState, setCoverState] = useState<{ path: string; url: string | null } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [view, setView] = useState<'list' | 'map'>('list')
  const [today] = useState(() => toDateString(new Date())) // 화면을 연 날

  const days = useMemo(() => (data.trip ? tripDays(data.trip.start_date, data.trip.end_date) : []), [data.trip])
  const byDay = useMemo(() => groupItemsByDay(data.items, days), [data.items, days])
  const tripItems = useMemo(() => itemsInTrip(data.items, days), [data.items, days])

  // 사진 위치가 바뀌면(내가 올리든 상대가 올리든) 새 주소 받아오기
  const coverPath = data.trip?.cover_path ?? null
  useEffect(() => {
    if (!coverPath) return
    let alive = true
    getCoverUrl(coverPath).then(
      (url) => alive && setCoverState({ path: coverPath, url }),
      () => alive && setCoverState({ path: coverPath, url: null }),
    )
    return () => {
      alive = false
    }
  }, [coverPath])
  const cover = coverPath && coverState?.path === coverPath ? coverState.url : null

  if (data.status === 'loading') return <p className="empty">불러오는 중…</p>
  if (data.status === 'error' || !data.trip) {
    return (
      <div className="center-screen">
        <p>일정을 불러오지 못했어요.</p>
        <button onClick={() => void data.reload()}>다시 시도</button>
      </div>
    )
  }

  const trip = data.trip
  // 기본 선택: 오늘이 여행 중이면 오늘, 아니면 첫날
  const day = selected ?? (days.includes(today) ? today : days[0])
  const dayItems = byDay[day] ?? []
  const nextSortOrder = Math.max(0, ...dayItems.map((i) => i.sort_order)) + 1
  const disabled = data.offline
  // 장소 검색은 그날(없으면 여행 전체) 첫 장소 근처를 먼저 보여줌
  const firstLocated = itemsWithLocation(dayItems)[0] ?? itemsWithLocation(tripItems)[0]
  const near = firstLocated ? { lat: firstLocated.lat, lng: firstLocated.lng } : null

  async function save(input: ItemInput) {
    try {
      await saveItem(input)
      setForm(null)
      await data.reload()
    } catch (e) {
      if (e instanceof Error && e.message === ITEM_GONE) {
        alert('그 사이에 이 일정이 지워졌어요')
        setForm(null)
        await data.reload()
      } else {
        alert('저장하지 못했어요. 다시 시도해 주세요')
      }
    }
  }

  async function remove(item: Item) {
    if (!confirm('이 일정을 지울까요?')) return
    try {
      await deleteItem(item.id)
      setForm(null)
      await data.reload()
    } catch {
      alert('지우지 못했어요. 다시 시도해 주세요')
    }
  }

  async function heart(itemId: string, on: boolean) {
    try {
      await toggleHeart(itemId, member, on)
      await data.reload()
    } catch {
      alert('하트를 보내지 못했어요')
    }
  }

  /** 댓글 작업 공통: 실패하면 알리고 다시 던져서 입력한 글이 지워지지 않게 */
  async function commentAction(task: () => Promise<unknown>, failMessage: string) {
    try {
      await task()
      await data.reload()
    } catch (e) {
      alert(failMessage)
      throw e
    }
  }

  const comment = (itemId: string, body: string) =>
    commentAction(() => addComment(itemId, member, body), '댓글을 보내지 못했어요')

  async function changePhoto(file: File) {
    setUploading(true)
    try {
      await uploadCover(trip, await resizeImage(file))
      await data.reload()
    } catch {
      alert('사진을 올리지 못했어요. 다른 사진으로 해보거나 다시 시도해 주세요')
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <OfflineBanner offline={data.offline} savedAt={data.savedAt} />
      <HomeHeader trip={trip} coverUrl={cover} uploading={uploading} disabled={disabled} onPickPhoto={changePhoto} />
      <DayTabs days={days} selected={day} onSelect={setSelected} />
      <CostSummary dayItems={dayItems} allItems={tripItems} trip={trip} rate={rate} />
      <div className="view-toggle" role="group" aria-label="보기">
        <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>📋 목록</button>
        <button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')}>🗺️ 지도</button>
      </div>
      {view === 'map' && (
        <Suspense fallback={<p className="empty">지도 불러오는 중…</p>}>
          <DayMap items={dayItems} timeZone={trip.timezone} />
        </Suspense>
      )}
      {view === 'list' && <ItemList
        items={dayItems}
        trip={trip}
        member={member}
        rate={rate.rate}
        hearts={data.hearts}
        comments={data.comments}
        disabled={disabled}
        onEdit={(item) => setForm({ mode: 'edit', item })}
        onToggleHeart={heart}
        onAddComment={comment}
        onEditComment={(id, body) => commentAction(() => updateComment(id, body), '댓글을 고치지 못했어요')}
        onDeleteComment={(id) => commentAction(() => deleteComment(id), '댓글을 지우지 못했어요')}
      />}
      <div className="bottom-bar">
        <button onClick={() => setForm({ mode: 'new' })} disabled={disabled}>+ 일정 추가</button>
      </div>
      {form && (
        <ItemForm
          trip={trip}
          days={days}
          day={day}
          member={member}
          nextSortOrder={nextSortOrder}
          initial={form.mode === 'edit' ? form.item : undefined}
          onSave={save}
          onDelete={form.mode === 'edit' ? () => remove(form.item) : undefined}
          onClose={() => setForm(null)}
          renderPlaceSearch={(onPick) => (
            <Suspense fallback={null}>
              <PlaceSearch onPick={onPick} near={near} />
            </Suspense>
          )}
        />
      )}
    </>
  )
}

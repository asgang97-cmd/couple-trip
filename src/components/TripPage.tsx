import { useMemo, useState } from 'react'
import { useTripData } from '../hooks/useTripData'
import { groupItemsByDay, toDateString, tripDays } from '../lib/dates'
import { deleteItem, upsertItem } from '../lib/repo'
import type { Item, ItemInput, Member } from '../lib/types'
import { DayTabs } from './DayTabs'
import { ItemForm } from './ItemForm'
import { ItemList } from './ItemList'

type FormState = { mode: 'new' } | { mode: 'edit'; item: Item } | null

export function TripPage({ member }: { member: Member }) {
  const data = useTripData()
  const [selected, setSelected] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(null)

  const days = useMemo(() => (data.trip ? tripDays(data.trip.start_date, data.trip.end_date) : []), [data.trip])
  const byDay = useMemo(() => groupItemsByDay(data.items, days), [data.items, days])

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
  const today = toDateString(new Date())
  const day = selected ?? (days.includes(today) ? today : days[0])
  const dayItems = byDay[day] ?? []
  const nextSortOrder = Math.max(0, ...dayItems.map((i) => i.sort_order)) + 1
  const disabled = data.offline

  async function save(input: ItemInput) {
    try {
      await upsertItem(input)
      setForm(null)
      await data.reload()
    } catch {
      alert('저장하지 못했어요. 다시 시도해 주세요')
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

  return (
    <>
      <header className="trip-head">
        <h1>{trip.title}</h1>
      </header>
      <DayTabs days={days} selected={day} onSelect={setSelected} />
      <ItemList items={dayItems} trip={trip} member={member} disabled={disabled} onEdit={(item) => setForm({ mode: 'edit', item })} />
      <div className="bottom-bar">
        <button onClick={() => setForm({ mode: 'new' })} disabled={disabled}>+ 일정 추가</button>
      </div>
      {form && (
        <ItemForm
          trip={trip}
          day={day}
          member={member}
          nextSortOrder={nextSortOrder}
          initial={form.mode === 'edit' ? form.item : undefined}
          onSave={save}
          onDelete={form.mode === 'edit' ? () => remove(form.item) : undefined}
          onClose={() => setForm(null)}
        />
      )}
    </>
  )
}

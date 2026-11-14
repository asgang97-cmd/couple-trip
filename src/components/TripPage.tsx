import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useNow } from '../hooks/useNow'
import { useDecorUrls } from '../hooks/useDecorUrls'
import { useExpenses } from '../hooks/useExpenses'
import { prepareDecor, type DecorSlot, type DecorUrls } from '../lib/decor'
import { useVoucherCache } from '../hooks/useVoucherCache'
import { newExpense } from '../lib/expenseQueue'
import { useRate } from '../hooks/useRate'
import { useTripData } from '../hooks/useTripData'
import { groupItemsByDay, itemsInTrip, nextSortOrder, toDateString, tripDays } from '../lib/dates'
import { itemsWithLocation } from '../lib/maps'
import {
  addComment, coverUrl as getCoverUrl, addExpense, removeDecor, signedUrl, uploadDecor, addPacking, addPackingMany, deleteExpense, deleteComment, deleteItem, deletePacking, deleteVoucher, downloadVoucherFile, updateVoucher, uploadVoucher, ITEM_GONE, saveItem, setPackingChecked, setPackingOwner, toggleHeart, updateComment, updateTrip, uploadCover,
} from '../lib/repo'
import type { Item, ItemInput, Member, PackingItem, TripInput, Voucher } from '../lib/types'
import { CostSummary } from './CostSummary'
import { CoverCropper } from './CoverCropper'
import { DayTabs } from './DayTabs'
import { DecorSheet } from './DecorSheet'
import { ExpenseView } from './ExpenseView'
import { Mascot } from './Mascot'
import { HomeHeader } from './HomeHeader'
import { Icon } from './Icon'
import { ItemForm } from './ItemForm'
import { ItemList } from './ItemList'
import { OfflineBanner } from './OfflineBanner'
import { PackingList } from './PackingList'
import { TripSettings } from './TripSettings'
import { VaultView } from './VaultView'
import { VoucherSheet, type VoucherFields } from './VoucherSheet'
import { VoucherViewer } from './VoucherViewer'
import { VisitJapanSheet } from './VisitJapanSheet'

// 구글 지도 코드는 커서 필요할 때(지도 보기·장소 검색)만 불러옴 → 첫 화면이 빨리 뜸
const DayMap = lazy(() => import('./DayMap').then((m) => ({ default: m.DayMap })))
const PlaceSearch = lazy(() => import('./PlaceSearch').then((m) => ({ default: m.PlaceSearch })))

type FormState = { mode: 'new' } | { mode: 'edit'; item: Item } | null

export function TripPage({ member, onDecor }: { member: Member; onDecor?: (urls: DecorUrls) => void }) {
  const data = useTripData()
  const rate = useRate(data.trip)
  // 꾸미기 사진 주소 받기 (여행을 불러온 뒤에만: 불러오는 중엔 예전 사진 그대로)
  useDecorUrls(data.status === 'ready' && data.trip ? (data.trip.decor ?? {}) : undefined, (u) => onDecor?.(u), (p) => signedUrl(p))
  // 가계부: 인터넷이 없어도 적고, 연결되면 자동으로 올림
  const expenses = useExpenses(data.expenses, data.offline, { add: addExpense, remove: deleteExpense, reload: data.reload })
  // 불러오기 전(null)과 예전 목록(voucherError)일 때는 폰의 파일을 정리하지 않음
  const voucherFiles = useVoucherCache(data.status === 'ready' ? data.vouchers : null, data.offline, {
    download: downloadVoucherFile,
    prune: !data.voucherError,
  })
  const [selected, setSelected] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(null)
  const [coverState, setCoverState] = useState<{ path: string; url: string | null } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [view, setView] = useState<'list' | 'map' | 'packing' | 'vault' | 'money'>('list')
  // 바우처: 올리기·수정 창, 크게 보기
  const [voucherSheet, setVoucherSheet] = useState<
    { kind: 'new'; file: File; presetItemId: string | null } | { kind: 'edit'; voucher: Voucher } | null
  >(null)
  const [viewing, setViewing] = useState<Voucher | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [decorOpen, setDecorOpen] = useState(false)
  const [vjwOpen, setVjwOpen] = useState(false)
  const [cropFile, setCropFile] = useState<File | null>(null) // 자르는 중인 사진
  const now = useNow()
  const today = toDateString(now)

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

  if (data.status === 'loading') {
    return (
      <div className="center-screen" role="status">
        <Mascot slot="empty" size={96} className="mascot-hop keep-motion" />
        <p className="empty">일정 불러오는 중…</p>
      </div>
    )
  }
  if (data.status === 'error' || !data.trip) {
    return (
      <div className="center-screen">
        <Mascot slot="empty" size={96} />
        <p>일정을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.</p>
        <button onClick={() => void data.reload()}>다시 시도</button>
      </div>
    )
  }

  const trip = data.trip
  // 기본 선택: 오늘이 여행 중이면 오늘, 아니면 첫날
  // 보던 날이 (기간을 바꿔서) 없어졌으면 기본 선택으로
  const day = selected && days.includes(selected) ? selected : days.includes(today) ? today : days[0]
  const dayItems = byDay[day] ?? []
  const disabled = data.offline
  // 장소 검색은 그날(없으면 여행 전체) 첫 장소 근처를 먼저 보여줌
  const firstLocated = itemsWithLocation(dayItems)[0] ?? itemsWithLocation(tripItems)[0]
  const near = firstLocated ? { lat: firstLocated.lat, lng: firstLocated.lng } : null

  async function save(input: ItemInput) {
    // 다른 날로 옮긴 일정은 그날 맨 뒤로
    const original = form?.mode === 'edit' ? form.item : null
    if (original && original.day !== input.day) input = { ...input, sort_order: nextSortOrder(byDay[input.day] ?? []) }
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

  /** 여행 정보 저장. 실패하면 알리고 다시 던져서 설정 창의 입력이 남게 */
  async function saveTrip(input: TripInput) {
    try {
      await updateTrip(trip.id, input)
    } catch (e) {
      alert('여행 정보를 저장하지 못했어요. 다시 시도해 주세요')
      throw e
    }
    setSettingsOpen(false)
    await data.reload()
  }

  /** 준비물 작업 공통: 실패하면 알리고 다시 던져서 쓴 이름이 남게 */
  async function packingAction(task: () => Promise<unknown>, failMessage: string) {
    try {
      await task()
      await data.reload()
    } catch (e) {
      alert(failMessage)
      throw e
    }
  }

  const packing = {
    onAdd: (name: string, owner: PackingItem['owner']) => packingAction(() => addPacking(trip.id, name, owner), '준비물을 추가하지 못했어요'),
    onAddMany: (names: string[]) =>
      packingAction(() => {
        // 이미 있는 이름은 빼고 한 번에
        const have = new Set(data.packing.map((p) => p.name))
        return addPackingMany(trip.id, names.filter((n) => !have.has(n)))
      }, '준비물을 넣지 못했어요. 다시 시도해 주세요'),
    onToggle: (id: string, checked: boolean) => packingAction(() => setPackingChecked(id, checked), '체크하지 못했어요').catch(() => {}),
    onOwner: (id: string, owner: PackingItem['owner']) => packingAction(() => setPackingOwner(id, owner), '바꾸지 못했어요').catch(() => {}),
    onDelete: (id: string) => packingAction(() => deletePacking(id), '지우지 못했어요').catch(() => {}),
  }

  /** 바우처 저장(새로 올리기 또는 수정). 실패하면 알리고 다시 던져서 창이 남게 */
  async function saveVoucher(f: VoucherFields) {
    const sheet = voucherSheet
    if (!sheet) return
    try {
      if (sheet.kind === 'new' && f.prepared) {
        await uploadVoucher({ tripId: trip.id, prepared: f.prepared, title: f.title, itemId: f.itemId, day: f.day })
      } else if (sheet.kind === 'edit') {
        await updateVoucher(sheet.voucher.id, { title: f.title, item_id: f.itemId, day: f.day })
      }
      setVoucherSheet(null)
      await data.reload()
    } catch (e) {
      alert('바우처를 저장하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요')
      throw e
    }
  }

  async function removeVoucher(v: Voucher) {
    try {
      await deleteVoucher(v)
      setVoucherSheet(null)
      await data.reload()
    } catch (e) {
      alert('바우처를 지우지 못했어요')
      throw e
    }
  }

  /** 꾸미기 사진 넣기·빼기. 실패하면 알리고 다시 던짐 */
  async function pickDecor(slot: DecorSlot, file: File) {
    try {
      const { blob, round } = await prepareDecor(file, slot)
      await uploadDecor(trip.id, slot, blob, round)
      await data.reload()
    } catch (e) {
      alert('사진을 넣지 못했어요. 다른 사진으로 해 보거나 다시 시도해 주세요')
      throw e
    }
  }

  async function dropDecor(slot: DecorSlot) {
    try {
      await removeDecor(trip.id, slot)
      await data.reload()
    } catch (e) {
      alert('사진을 빼지 못했어요')
      throw e
    }
  }

  /** 자른 사진 올리기. 실패하면 알리고 다시 던져서 자르기 창이 그대로 남게 */
  async function uploadCropped(photo: Blob) {
    setUploading(true)
    try {
      await uploadCover(trip, photo)
      setCropFile(null)
      await data.reload()
    } catch (e) {
      alert('사진을 올리지 못했어요. 다시 시도해 주세요')
      throw e
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <OfflineBanner offline={data.offline} savedAt={data.savedAt} />
      <HomeHeader now={now} trip={trip} coverUrl={cover} uploading={uploading} disabled={disabled} onPickPhoto={setCropFile} onOpenSettings={() => setSettingsOpen(true)} onOpenVisitJapan={() => setVjwOpen(true)} />
      <DayTabs days={days} selected={day} onSelect={setSelected} />
      <CostSummary dayItems={dayItems} allItems={tripItems} trip={trip} rate={rate} />
      <div className="view-toggle view-tabs" role="group" aria-label="보기">
        <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}><Icon name="list" />목록</button>
        <button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')}><Icon name="map" />지도</button>
        <button type="button" aria-pressed={view === 'packing'} onClick={() => setView('packing')}><Icon name="bag" />준비물</button>
        <button type="button" aria-pressed={view === 'vault'} onClick={() => setView('vault')}><Icon name="ticket" />보관함</button>
        <button type="button" aria-pressed={view === 'money'} onClick={() => setView('money')}><Icon name="wallet" />가계부</button>
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
        vouchers={data.vouchers}
        onOpenVoucher={setViewing}
        onAddVoucher={(itemId, file) => setVoucherSheet({ kind: 'new', file, presetItemId: itemId })}
      />}
      {view === 'money' && (
        <ExpenseView
          shown={expenses.shown}
          trip={trip}
          days={days}
          defaultDay={day}
          member={member}
          rate={rate.rate}
          waiting={expenses.waiting}
          offline={data.offline}
          loadError={data.expenseError}
          onAdd={(x) => expenses.add(newExpense({ tripId: trip.id, day: x.day, amount: x.amount, currency: x.currency, paidBy: x.paidBy, memo: x.memo }))}
          onRemove={expenses.remove}
          failed={expenses.failed}
          onDiscardFailed={expenses.discardFailed}
        />
      )}
      {view === 'vault' && (
        <VaultView
          vouchers={data.vouchers}
          items={tripItems}
          days={days}
          disabled={disabled}
          loadError={data.voucherError}
          isSaved={voucherFiles.isSaved}
          onPick={(file) => setVoucherSheet({ kind: 'new', file, presetItemId: null })}
          onOpen={setViewing}
          onEdit={(v) => setVoucherSheet({ kind: 'edit', voucher: v })}
        />
      )}
      {view === 'packing' && <PackingList items={data.packing} disabled={disabled} loadError={data.packingError} {...packing} />}
      {(view === 'list' || view === 'map') && (
        <div className="bottom-bar">
          <button onClick={() => setForm({ mode: 'new' })} disabled={disabled}><Icon name="plus" />일정 추가</button>
        </div>
      )}
      {decorOpen && <DecorSheet disabled={disabled} onPick={pickDecor} onRemove={dropDecor} onClose={() => setDecorOpen(false)} />}
      {voucherSheet && (
        <VoucherSheet
          key={voucherSheet.kind === 'new' ? voucherSheet.file.name + voucherSheet.file.lastModified : voucherSheet.voucher.id}
          mode={voucherSheet.kind === 'new' ? { kind: 'new', file: voucherSheet.file } : { kind: 'edit', voucher: voucherSheet.voucher }}
          trip={trip}
          items={tripItems}
          days={days}
          presetItemId={voucherSheet.kind === 'new' ? voucherSheet.presetItemId : null}
          onClose={() => setVoucherSheet(null)}
          onSave={saveVoucher}
          onDelete={voucherSheet.kind === 'edit' ? () => removeVoucher(voucherSheet.voucher) : undefined}
        />
      )}
      {viewing && <VoucherViewer voucher={viewing} read={voucherFiles.read} onClose={() => setViewing(null)} />}
      {cropFile && <CoverCropper file={cropFile} onCancel={() => setCropFile(null)} onDone={uploadCropped} />}
      {vjwOpen && <VisitJapanSheet trip={trip} items={data.items} onClose={() => setVjwOpen(false)} />}
      {settingsOpen && (
        <TripSettings
          trip={trip}
          items={data.items}
          onSave={saveTrip}
          onClose={() => setSettingsOpen(false)}
          onOpenDecor={() => {
            setSettingsOpen(false)
            setDecorOpen(true)
          }}
        />
      )}
      {form && (
        <ItemForm
          trip={trip}
          days={days}
          day={day}
          member={member}
          nextSortOrder={nextSortOrder(dayItems)}
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

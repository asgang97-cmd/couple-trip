// 데이터베이스 읽기/쓰기. 함수 하나 = 쿼리 하나. 실패하면 throw.
import { supabase } from './supabase'
import type { Comment, Heart, Item, ItemInput, Member, Trip } from './types'

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export async function fetchTrip(): Promise<Trip> {
  const trip = check(await supabase.from('trips').select('*').order('start_date').limit(1).maybeSingle())
  if (!trip) throw new Error('여행이 아직 없어요. schema.sql의 insert를 실행했는지 확인하세요.')
  return trip as Trip
}

export async function listItems(tripId: string): Promise<Item[]> {
  return check(await supabase.from('items').select('*').eq('trip_id', tripId)) as Item[]
}

export const ITEM_GONE = '이미 지워진 일정이에요'

/** 새 일정은 추가, id가 있으면 수정. 수정하는 사이 상대가 지웠으면 다시 만들지 않고 ITEM_GONE. */
export async function saveItem(input: ItemInput): Promise<Item> {
  const { id, ...fields } = input
  if (!id) return check(await supabase.from('items').insert(fields).select().single()) as Item
  const rows = check(await supabase.from('items').update(fields).eq('id', id).select()) as Item[]
  if (rows.length === 0) throw new Error(ITEM_GONE)
  return rows[0]
}

export async function deleteItem(id: string): Promise<void> {
  check(await supabase.from('items').delete().eq('id', id))
}

export async function listHearts(tripId: string): Promise<Heart[]> {
  const rows = check(
    await supabase.from('hearts').select('item_id, member, items!inner(trip_id)').eq('items.trip_id', tripId),
  ) as (Heart & { items: unknown })[]
  return rows.map(({ item_id, member }) => ({ item_id, member }))
}

export async function toggleHeart(itemId: string, member: Member, on: boolean): Promise<void> {
  if (on) check(await supabase.from('hearts').upsert({ item_id: itemId, member }))
  else check(await supabase.from('hearts').delete().match({ item_id: itemId, member }))
}

export async function listComments(tripId: string): Promise<Comment[]> {
  const rows = check(
    await supabase
      .from('comments')
      .select('id, item_id, member, body, created_at, items!inner(trip_id)')
      .eq('items.trip_id', tripId)
      .order('created_at'),
  ) as (Comment & { items: unknown })[]
  return rows.map(({ items: _items, ...c }) => c)
}

export async function addComment(itemId: string, member: Member, body: string): Promise<Comment> {
  return check(await supabase.from('comments').insert({ item_id: itemId, member, body }).select().single()) as Comment
}

export async function updateComment(id: string, body: string): Promise<void> {
  check(await supabase.from('comments').update({ body }).eq('id', id))
}

export async function deleteComment(id: string): Promise<void> {
  check(await supabase.from('comments').delete().eq('id', id))
}

/** 커플 사진 올리기: 새 파일 저장 → 여행에 위치 기록 → 안 쓰는 파일 정리 */
export async function uploadCover(trip: Trip, photo: Blob): Promise<string> {
  const path = `${trip.id}/${Date.now()}.jpg`
  const up = await supabase.storage.from('covers').upload(path, photo, { contentType: 'image/jpeg' })
  if (up.error) throw new Error(up.error.message)
  check(await supabase.from('trips').update({ cover_path: path }).eq('id', trip.id))
  await cleanupCovers(trip.id)
  return path
}

/**
 * 지금 커버로 기록된 파일만 남기고 나머지 삭제.
 * 둘이 동시에 올려도 나중에 기록된 쪽 하나만 남는다. 실패해도 무시(저장 공간만 조금 더 씀).
 */
async function cleanupCovers(tripId: string): Promise<void> {
  try {
    const cur = await supabase.from('trips').select('cover_path').eq('id', tripId).single()
    const keep = (cur.data as { cover_path: string | null } | null)?.cover_path
    if (cur.error || !keep) return
    const list = await supabase.storage.from('covers').list(tripId)
    if (list.error || !list.data) return
    // 파일 이름 = 올린 시각. 지금 커버보다 나중 파일은 상대가 막 올리는 중일 수 있어 남겨 둠
    const stamp = (p: string) => Number(p.split('/').pop()?.split('.')[0]) || 0
    const stale = list.data
      .map((f) => `${tripId}/${f.name}`)
      .filter((p) => p !== keep && stamp(p) < stamp(keep))
    if (stale.length) await supabase.storage.from('covers').remove(stale)
  } catch {
    // 정리는 다음에 올릴 때 다시
  }
}

const SIGN_SEC = 60 * 60 * 24 * 7
const COVER_KEY = 'cover-url:v1'

/**
 * 비공개 사진을 7일간 볼 수 있는 주소.
 * 받은 주소를 기기에 저장해 두고 하루 이상 남았으면 재사용한다.
 * (주소가 같아야 브라우저·오프라인 캐시가 사진을 다시 받지 않음)
 */
export async function coverUrl(
  path: string,
  { storage = globalThis.localStorage, now = Date.now() }: { storage?: Storage; now?: number } = {},
): Promise<string> {
  let saved: { path: string; url: string; expiresAt: number } | null = null
  try {
    saved = JSON.parse(storage.getItem(COVER_KEY) ?? 'null')
  } catch {
    // 깨졌으면 새로 받기
  }
  const same = saved?.path === path && typeof saved.url === 'string'
  if (same && saved!.expiresAt - now > 86_400_000) return saved!.url

  const res = await supabase.storage
    .from('covers')
    .createSignedUrl(path, SIGN_SEC)
    .catch((e: unknown) => ({ data: null, error: { message: String(e) } }))
  if (res.error || !res.data) {
    if (same) return saved!.url // 오프라인: 기기에 저장된 사진이라도 보여주기
    throw new Error(res.error?.message ?? 'no url')
  }
  try {
    storage.setItem(COVER_KEY, JSON.stringify({ path, url: res.data.signedUrl, expiresAt: now + SIGN_SEC * 1000 }))
  } catch {
    // 저장 못 해도 이번엔 보여줌
  }
  return res.data.signedUrl
}

/** trips/items/hearts/comments 중 무엇이든 바뀌면 onChange. 반환값을 부르면 구독 해제. */
export function subscribe(tripId: string, onChange: () => void): () => void {
  const channel = supabase.channel(`trip-${tripId}`)
  for (const table of ['trips', 'items', 'hearts', 'comments']) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, onChange)
  }
  channel.subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}

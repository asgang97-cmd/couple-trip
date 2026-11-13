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

export async function upsertItem(input: ItemInput): Promise<Item> {
  return check(await supabase.from('items').upsert(input).select().single()) as Item
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

/** items/hearts/comments 중 무엇이든 바뀌면 onChange. 반환값을 부르면 구독 해제. */
export function subscribe(tripId: string, onChange: () => void): () => void {
  const channel = supabase.channel(`trip-${tripId}`)
  for (const table of ['items', 'hearts', 'comments']) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, onChange)
  }
  channel.subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}

import { useState, type FormEvent } from 'react'
import type { PackingItem } from '../lib/types'
import { STARTER_ITEMS } from '../lib/packing'
import { theme } from '../theme'
import { Frog, LilyPad } from './Frog'
import { Icon } from './Icon'

type Owner = PackingItem['owner']

interface Props {
  items: PackingItem[]
  disabled: boolean // 오프라인이면 보기만
  /** 실패하면 throw (알림은 부르는 쪽에서) */
  onAdd: (name: string, owner: Owner) => Promise<void>
  onAddMany: (names: string[]) => Promise<void>
  onToggle: (id: string, checked: boolean) => Promise<void>
  onOwner: (id: string, owner: Owner) => Promise<void>
  onDelete: (id: string) => Promise<void>
}


const OWNERS: Owner[] = ['both', 'a', 'b']
const ownerName = (o: Owner) => (o === 'both' ? '같이' : theme.names[o])
const nextOwner = (o: Owner): Owner => OWNERS[(OWNERS.indexOf(o) + 1) % OWNERS.length]

export function PackingList({ items, disabled, onAdd, onAddMany, onToggle, onOwner, onDelete }: Props) {
  const [name, setName] = useState('')
  const [owner, setOwner] = useState<Owner>('both')
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState<Owner | 'all'>('all')

  const done = items.filter((i) => i.checked).length
  const shown = items
    .filter((i) => filter === 'all' || i.owner === filter)
    .sort((x, y) => Number(x.checked) - Number(y.checked) || (x.created_at < y.created_at ? -1 : 1))
  const canAdd = name.trim() !== '' && !busy && !disabled

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!canAdd) return
    setBusy(true)
    try {
      await onAdd(name.trim(), owner)
      setName('')
    } catch {
      // 부르는 쪽에서 알림. 쓴 이름은 남겨둠
    } finally {
      setBusy(false)
    }
  }

  async function addStarter() {
    setBusy(true)
    try {
      await onAddMany(STARTER_ITEMS)
    } catch {
      // 부르는 쪽에서 알림
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="packing" aria-label="준비물">
      {items.length > 0 && (
      <div className="packing-head">
        <p className="packing-count">{items.length}개 중 {done}개 챙겼어요</p>
        <progress max={items.length} value={done} aria-label="챙긴 정도" />
      </div>
      )}

      <form className="packing-add" onSubmit={add}>
        <input
          aria-label="준비물 이름"
          placeholder="예: 여권"
          maxLength={100}
          value={name}
          disabled={disabled}
          onChange={(e) => setName(e.target.value)}
        />
        <select aria-label="챙길 사람" value={owner} disabled={disabled} onChange={(e) => setOwner(e.target.value as Owner)}>
          {OWNERS.map((o) => <option key={o} value={o}>{ownerName(o)}</option>)}
        </select>
        <button type="submit" disabled={!canAdd}>
          <Icon name="plus" size={18} />
          추가
        </button>
      </form>

      {items.length > 0 && (
        <div className="view-toggle" role="group" aria-label="누구 것 보기">
          {(['all', ...OWNERS] as const).map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === 'all' ? '전체' : ownerName(f)}
            </button>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <div className="empty-pond">
          <div className="pond-perch" aria-hidden="true">
            <Frog size={80} />
            <LilyPad size={140} />
          </div>
          <p className="empty-title">아직 준비물이 없어요</p>
          <p className="empty">위에 하나씩 적거나, 자주 챙기는 것부터 넣어 보세요</p>
          <button type="button" className="packing-starter" disabled={disabled || busy} onClick={() => void addStarter()}>
            자주 챙기는 것 넣기
          </button>
        </div>
      ) : (
        <ul className="packing-list">
          {shown.map((it) => (
            <li key={it.id} className={it.checked ? 'done' : ''}>
              <label className="packing-check">
                <input
                  type="checkbox"
                  checked={it.checked}
                  disabled={disabled}
                  onChange={(e) => void onToggle(it.id, e.target.checked)}
                />
                <span>{it.name}</span>
              </label>
              <button
                type="button"
                className="packing-owner"
                aria-label={`${it.name} 챙길 사람 바꾸기 (지금: ${ownerName(it.owner)})`}
                disabled={disabled}
                onClick={() => void onOwner(it.id, nextOwner(it.owner))}
              >
                {it.owner === 'both' ? '같이' : `${theme.emoji[it.owner]} ${theme.names[it.owner]}`}
              </button>
              <button
                type="button"
                className="packing-delete"
                aria-label={`${it.name} 지우기`}
                disabled={disabled}
                onClick={() => void onDelete(it.id)}
              >
                <Icon name="trash" size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

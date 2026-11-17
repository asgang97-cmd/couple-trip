import { useState, type FormEvent } from 'react'
import type { PackingItem } from '../lib/types'
import { STARTER_ITEMS } from '../lib/packing'
import { samePackingItems } from '../lib/duplicates'
import { theme } from '../theme'
import { Mascot } from './Mascot'
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
  /** 준비물을 불러오지 못함 (보이는 목록이 최신이 아닐 수 있음) */
  loadError?: boolean
}


const OWNERS: Owner[] = ['both', 'a', 'b']
const ownerName = (o: Owner) => (o === 'both' ? '같이' : theme.names[o])
const nextOwner = (o: Owner): Owner => OWNERS[(OWNERS.indexOf(o) + 1) % OWNERS.length]

export function PackingList({ items: saved, disabled, onAdd, onAddMany, onToggle, onOwner, onDelete, loadError = false }: Props) {
  // 서버 응답 전에도 바로 보이게: 진행 중인 변경을 화면에 먼저 덮어씀
  const [pending, setPending] = useState<Record<string, Partial<PackingItem>>>({})
  const items = saved.map((i) => (pending[i.id] ? { ...i, ...pending[i.id] } : i))

  async function change(id: string, patch: Partial<PackingItem>, task: () => Promise<void>) {
    setPending((p) => ({ ...p, [id]: { ...p[id], ...patch } }))
    try {
      await task()
    } finally {
      setPending((p) => {
        const { [id]: _done, ...rest } = p
        return rest
      })
    }
  }

  function remove(it: PackingItem) {
    if (confirm(`"${it.name}" 지울까요?`)) void onDelete(it.id)
  }

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
    // 이미 있는 준비물이면 확인 (막지 않음). 상대 개인 것만 있으면 조용히 넣음
    const dups = samePackingItems(name.trim(), owner, items)
    if (dups.length > 0) {
      const who = [...new Set(dups.map((d) => ownerName(d.owner)))].join(', ')
      if (!confirm(`"${name.trim()}"은 이미 있어요 (${who}). 그래도 넣을까요?`)) return
    }
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

      {loadError && <p className="error">준비물을 불러오지 못했어요. 인터넷 연결을 확인해 주세요</p>}

      {items.length === 0 && !loadError ? (
        <div className="empty-pond">
          <div className="pond-perch" aria-hidden="true">
            <Mascot slot="empty" size={80} />
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
                  onChange={(e) => {
                    const checked = e.target.checked
                    void change(it.id, { checked }, () => onToggle(it.id, checked))
                  }}
                />
                <span>{it.name}</span>
              </label>
              <button
                type="button"
                className="packing-owner"
                aria-label={`${it.name} 챙길 사람 바꾸기 (지금: ${ownerName(it.owner)})`}
                disabled={disabled || pending[it.id]?.owner !== undefined}
                onClick={() => {
                  const owner = nextOwner(it.owner)
                  void change(it.id, { owner }, () => onOwner(it.id, owner))
                }}
              >
                {it.owner === 'both' ? '같이' : `${theme.emoji[it.owner]} ${theme.names[it.owner]}`}
              </button>
              <button
                type="button"
                className="packing-delete"
                aria-label={`${it.name} 지우기`}
                disabled={disabled}
                onClick={() => remove(it)}
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

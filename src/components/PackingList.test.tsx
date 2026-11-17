import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import type { PackingItem } from '../lib/types'
import { theme } from '../theme'
import { STARTER_ITEMS } from '../lib/packing'
import { PackingList } from './PackingList'

let n = 0
const P = (o: Partial<PackingItem>): PackingItem => ({
  id: `p${++n}`, trip_id: 't', name: `물건${n}`, owner: 'both', checked: false, created_at: `2026-11-14T00:00:0${n % 10}Z`, ...o,
})

function setup(items: PackingItem[], over: Partial<Parameters<typeof PackingList>[0]> = {}) {
  const props = {
    items,
    disabled: false,
    onAdd: vi.fn(async () => {}),
    onAddMany: vi.fn(async () => {}),
    onToggle: vi.fn(async () => {}),
    onOwner: vi.fn(async () => {}),
    onDelete: vi.fn(async () => {}),
    ...over,
  }
  render(<PackingList {...props} />)
  return props
}

describe('PackingList', () => {
  test('몇 개 챙겼는지', () => {
    setup([P({ checked: true }), P({}), P({})])
    expect(screen.getByText('3개 중 1개 챙겼어요')).toBeInTheDocument()
  })

  test('추가: 이름과 챙길 사람, 성공하면 입력칸 비움', async () => {
    const { onAdd } = setup([])
    await userEvent.type(screen.getByLabelText('준비물 이름'), '여권')
    await userEvent.selectOptions(screen.getByLabelText('챙길 사람'), 'a')
    await userEvent.click(screen.getByRole('button', { name: '추가' }))
    expect(onAdd).toHaveBeenCalledWith('여권', 'a')
    expect(screen.getByLabelText('준비물 이름')).toHaveValue('')
  })

  test('추가 실패하면 쓴 이름 남김', async () => {
    setup([], { onAdd: vi.fn(async () => { throw new Error('x') }) })
    await userEvent.type(screen.getByLabelText('준비물 이름'), '여권')
    await userEvent.click(screen.getByRole('button', { name: '추가' }))
    expect(screen.getByLabelText('준비물 이름')).toHaveValue('여권')
  })

  test('빈 이름은 추가 안 됨', () => {
    setup([])
    expect(screen.getByRole('button', { name: '추가' })).toBeDisabled()
  })

  test('체크하면 onToggle, 챙긴 건 아래로', async () => {
    const a = P({ name: '여권', checked: true })
    const b = P({ name: '충전기' })
    const { onToggle } = setup([a, b])
    const names = screen.getAllByRole('checkbox').map((c) => c.getAttribute('aria-label') ?? c.closest('label')?.textContent)
    expect(names[0]).toContain('충전기')
    await userEvent.click(screen.getByRole('checkbox', { name: '충전기' }))
    expect(onToggle).toHaveBeenCalledWith(b.id, true)
  })

  test('챙길 사람 바꾸기: 같이 → 밍석 → 밍하 → 같이', async () => {
    const item = P({ name: '여권', owner: 'a' })
    const { onOwner } = setup([item])
    await userEvent.click(screen.getByRole('button', { name: `여권 챙길 사람 바꾸기 (지금: ${theme.names.a})` }))
    expect(onOwner).toHaveBeenCalledWith(item.id, 'b')
  })

  test('지우기', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true)
    const item = P({ name: '우산' })
    const { onDelete } = setup([item])
    await userEvent.click(screen.getByRole('button', { name: '우산 지우기' }))
    expect(onDelete).toHaveBeenCalledWith(item.id)
  })

  test('사람별로 보기', async () => {
    setup([P({ name: '여권A', owner: 'a' }), P({ name: '여권B', owner: 'b' }), P({ name: '우산', owner: 'both' })])
    await userEvent.click(within(screen.getByRole('group', { name: '누구 것 보기' })).getByRole('button', { name: theme.names.b }))
    expect(screen.queryByText('여권A')).toBeNull()
    expect(screen.getByText('여권B')).toBeInTheDocument()
    expect(screen.queryByText('우산')).toBeNull()
  })

  test('비어 있으면 0개 중 0개 같은 숫자는 안 보임', () => {
    setup([])
    expect(screen.queryByText(/개 중/)).toBeNull()
  })

  test('비어 있으면 자주 챙기는 것 한 번에 넣기', async () => {
    const { onAddMany } = setup([])
    await userEvent.click(screen.getByRole('button', { name: '자주 챙기는 것 넣기' }))
    expect(onAddMany).toHaveBeenCalledWith(STARTER_ITEMS)
  })

  test('오프라인이면 체크·추가·지우기 막힘', () => {
    setup([P({ name: '여권' })], { disabled: true })
    expect(screen.getByRole('checkbox', { name: '여권' })).toBeDisabled()
    expect(screen.getByLabelText('준비물 이름')).toBeDisabled()
    expect(screen.getByRole('button', { name: '여권 지우기' })).toBeDisabled()
  })
})

describe('PackingList 바로 반응', () => {
  test('체크하면 서버 응답 전에도 바로 체크돼 보임', async () => {
    let finish: () => void = () => {}
    const onToggle = vi.fn(() => new Promise<void>((r) => { finish = r }))
    setup([P({ name: '충전기' })], { onToggle })
    await userEvent.click(screen.getByRole('checkbox', { name: '충전기' }))
    expect(screen.getByRole('checkbox', { name: '충전기' })).toBeChecked()
    finish()
  })
  test('사람 바꾸는 중에는 그 버튼을 잠가서 두 번 눌러도 꼬이지 않음', async () => {
    const onOwner = vi.fn(() => new Promise<void>(() => {}))
    setup([P({ name: '여권', owner: 'a' })], { onOwner })
    await userEvent.click(screen.getByRole('button', { name: /여권 챙길 사람 바꾸기/ }))
    expect(screen.getByRole('button', { name: /여권 챙길 사람 바꾸기/ })).toBeDisabled()
    expect(onOwner).toHaveBeenCalledTimes(1)
  })
  test('지우기는 한 번 물어봄 (취소하면 그대로)', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false)
    const { onDelete } = setup([P({ name: '우산' })])
    await userEvent.click(screen.getByRole('button', { name: '우산 지우기' }))
    expect(onDelete).not.toHaveBeenCalled()
  })
  test('불러오기에 실패했으면 알려주고, 비어 보여도 기본 목록 넣기 버튼은 숨김', () => {
    setup([], { loadError: true })
    expect(screen.getByText('준비물을 불러오지 못했어요. 인터넷 연결을 확인해 주세요')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '자주 챙기는 것 넣기' })).toBeNull()
  })
})

describe('PackingList 중복 알림', () => {
  async function addAs(name: string, owner: 'both' | 'a' | 'b') {
    await userEvent.type(screen.getByLabelText('준비물 이름'), name)
    await userEvent.selectOptions(screen.getByLabelText('챙길 사람'), owner)
    await userEvent.click(screen.getByRole('button', { name: '추가' }))
  }

  test('같이 준비물과 같은 이름이면 확인 창, 취소면 안 넣고 이름 남김', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false)
    const { onAdd } = setup([P({ name: '여권', owner: 'both' })])
    await addAs('여권', 'a')
    expect(confirm).toHaveBeenCalledWith('"여권"은 이미 있어요 (같이). 그래도 넣을까요?')
    expect(onAdd).not.toHaveBeenCalled()
    expect(screen.getByLabelText('준비물 이름')).toHaveValue('여권')
    confirm.mockRestore()
  })

  test('확인이면 넣음', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(true)
    const { onAdd } = setup([P({ name: '여권', owner: 'both' })])
    await addAs('여권', 'a')
    expect(onAdd).toHaveBeenCalledWith('여권', 'a')
    confirm.mockRestore()
  })

  test('상대 개인 준비물만 있으면 창 없이 넣음', async () => {
    const confirm = vi.spyOn(window, 'confirm')
    const { onAdd } = setup([P({ name: '여권', owner: 'b' })])
    await addAs('여권', 'a')
    expect(confirm).not.toHaveBeenCalled()
    expect(onAdd).toHaveBeenCalledTimes(1)
    confirm.mockRestore()
  })

  test('같이로 넣을 때 개인 것들이 있으면 모두 표시', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false)
    setup([P({ name: '여권', owner: 'a' }), P({ name: '여권', owner: 'b' })])
    await addAs('여권', 'both')
    expect(confirm).toHaveBeenCalledWith(`"여권"은 이미 있어요 (${theme.names.a}, ${theme.names.b}). 그래도 넣을까요?`)
    confirm.mockRestore()
  })

  test('받침 없는 이름은 "는"', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false)
    setup([P({ name: '카메라', owner: 'both' })])
    await addAs('카메라', 'both')
    expect(confirm).toHaveBeenCalledWith('"카메라"는 이미 있어요 (같이). 그래도 넣을까요?')
    confirm.mockRestore()
  })
})

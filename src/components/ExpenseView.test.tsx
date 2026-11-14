import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import type { ShownExpense } from '../lib/expenseQueue'
import { TRIP } from '../test-fixtures'
import { theme } from '../theme'
import { ExpenseView } from './ExpenseView'

const DAYS = ['2027-01-10', '2027-01-11']
const X = (id: string, o: Partial<ShownExpense> = {}): ShownExpense => ({
  id, trip_id: 't', day: '2027-01-10', amount: 1000, currency: 'JPY', paid_by: 'a', memo: id, created_at: id, pending: false, ...o,
})

function setup(shown: ShownExpense[], over: Partial<Parameters<typeof ExpenseView>[0]> = {}) {
  const props = {
    shown, trip: TRIP, days: DAYS, defaultDay: '2027-01-11', member: 'b' as const, rate: 9 as number | null,
    waiting: 0, offline: false, loadError: false, onAdd: vi.fn(), onRemove: vi.fn(),
    failed: [] as ShownExpense[], onDiscardFailed: vi.fn(),
    ...over,
  }
  render(<ExpenseView {...props} />)
  return props
}

describe('ExpenseView 합계', () => {
  test('총 지출과 누가 얼마 냈는지 (원화)', () => {
    setup([X('라멘', { amount: 1000, paid_by: 'a' }), X('택시', { amount: 20000, currency: 'KRW', paid_by: 'b' })])
    const sum = screen.getByRole('region', { name: '지출 합계' })
    expect(within(sum).getByText('₩29,000')).toBeInTheDocument()
    expect(within(sum).getByText('₩9,000')).toBeInTheDocument()
    expect(within(sum).getByText('₩20,000')).toBeInTheDocument()
    expect(within(sum).getByText(new RegExp(theme.names.a))).toBeInTheDocument()
  })

  test('환율이 없으면 몇 건이 빠졌는지', () => {
    setup([X('라멘')], { rate: null })
    expect(screen.getByText('환율을 못 불러와서 1건은 합계에서 빠졌어요')).toBeInTheDocument()
  })
})

describe('ExpenseView 적기', () => {
  test('금액·메모 적고 추가 → 낸 사람은 나, 날짜는 보고 있는 날, 통화는 여행 통화가 기본', async () => {
    const { onAdd } = setup([])
    await userEvent.type(screen.getByLabelText('금액'), '1,500')
    await userEvent.type(screen.getByLabelText('메모'), '편의점')
    await userEvent.click(screen.getByRole('button', { name: '추가' }))
    expect(onAdd).toHaveBeenCalledWith({ day: '2027-01-11', amount: 1500, currency: 'JPY', paidBy: 'b', memo: '편의점' })
    expect(screen.getByLabelText('금액')).toHaveValue('')
  })

  test('낸 사람·통화 바꾸기', async () => {
    const { onAdd } = setup([])
    await userEvent.click(within(screen.getByRole('group', { name: '낸 사람' })).getByRole('button', { name: new RegExp(theme.names.a) }))
    await userEvent.selectOptions(screen.getByLabelText('통화'), 'KRW')
    await userEvent.type(screen.getByLabelText('금액'), '30000')
    await userEvent.click(screen.getByRole('button', { name: '추가' }))
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ paidBy: 'a', currency: 'KRW', amount: 30000 }))
  })

  test('금액이 숫자가 아니거나 0이면 추가 막힘', async () => {
    setup([])
    expect(screen.getByRole('button', { name: '추가' })).toBeDisabled()
    await userEvent.type(screen.getByLabelText('금액'), '0')
    expect(screen.getByRole('button', { name: '추가' })).toBeDisabled()
  })

  test('오프라인에서도 적을 수 있고, 올리기 대기 안내', () => {
    setup([X('라멘', { pending: true })], { offline: true, waiting: 1 })
    expect(screen.getByLabelText('금액')).toBeEnabled()
    expect(screen.getByText('인터넷이 없어서 1건은 폰에 있어요. 연결되면 자동으로 올라가요')).toBeInTheDocument()
    expect(within(screen.getByRole('listitem', { name: /라멘/ })).getByText('올리기 대기')).toBeInTheDocument()
  })
})

describe('ExpenseView 목록', () => {
  test('최근 날짜 먼저, 날짜별로', () => {
    setup([X('첫날'), X('둘째날', { day: '2027-01-11' })])
    const heads = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(heads[0]).toContain('2일차')
    expect(heads[1]).toContain('1일차')
  })

  test('지우기는 한 번 물어봄', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true)
    const { onRemove } = setup([X('라멘')])
    await userEvent.click(screen.getByRole('button', { name: '라멘 지우기' }))
    expect(onRemove).toHaveBeenCalledWith('라멘')
  })
})

describe('ExpenseView 안전장치', () => {
  test('말도 안 되게 큰 금액은 막음', async () => {
    setup([])
    await userEvent.type(screen.getByLabelText('금액'), '99999999999')
    expect(screen.getByRole('button', { name: '추가' })).toBeDisabled()
  })
  test('서버가 거절한 지출을 알려주고 버리기', async () => {
    const { onDiscardFailed } = setup([], { failed: [X('이상한 것')] })
    expect(screen.getByText('올리지 못한 지출이 1건 있어요')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '이상한 것 버리기' }))
    expect(onDiscardFailed).toHaveBeenCalledWith('이상한 것')
  })
})

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { loadVjw, saveVjw } from '../lib/vjw'
import { makeItem, TRIP } from '../test-fixtures'
import { memoryStorage } from '../test-utils'
import { theme } from '../theme'
import { VisitJapanSheet } from './VisitJapanSheet'

function setup(opts: { storage?: Storage; clipboard?: { writeText: (s: string) => Promise<void> }; items?: ReturnType<typeof makeItem>[] } = {}) {
  const storage = opts.storage ?? memoryStorage()
  const clipboard = opts.clipboard ?? { writeText: vi.fn(async () => {}) }
  render(<VisitJapanSheet trip={TRIP} items={opts.items ?? []} onClose={() => {}} storage={storage} clipboard={clipboard} />)
  return { storage, clipboard }
}

function withSaved(fill: (d: ReturnType<typeof loadVjw>) => void) {
  const s = memoryStorage()
  const d = loadVjw(TRIP, s)
  fill(d)
  saveVjw(d, s)
  return s
}

describe('VisitJapanSheet', () => {
  test('이 폰에만 저장된다고 알려줌, 처음엔 밍석', () => {
    setup()
    expect(screen.getByText('이 폰에만 저장돼요. 서버로 보내지 않아요.')).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: '누구 정보' })).getByRole('button', { name: new RegExp(theme.names.a) })).toHaveAttribute('aria-pressed', 'true')
  })

  test('여권번호는 가려 보이고, 복사하면 전체가 복사됨', async () => {
    const storage = withSaved((d) => { d.a.passportNo = 'M12345678' })
    const { clipboard } = setup({ storage })
    expect(screen.getByText('M123*****')).toBeInTheDocument()
    expect(screen.queryByText('M12345678')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: '여권번호 복사' }))
    expect(clipboard.writeText).toHaveBeenCalledWith('M12345678')
    expect(screen.getByRole('status')).toHaveTextContent('복사했어요')
  })

  test('빈 칸에는 복사 버튼이 없음', () => {
    setup()
    expect(screen.queryByRole('button', { name: '성 (영문) 복사' })).toBeNull()
    expect(screen.getByRole('button', { name: '국적 복사' })).toBeInTheDocument() // 기본값 있음
  })

  test('수정 → 입력 → 저장하면 이 폰에 남고 보기 모드로', async () => {
    const { storage } = setup()
    await userEvent.click(screen.getByRole('button', { name: '수정' }))
    await userEvent.type(screen.getByLabelText('성 (영문)'), 'KIM')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(loadVjw(TRIP, storage).a.surname).toBe('KIM')
    expect(screen.getByRole('button', { name: '성 (영문) 복사' })).toBeInTheDocument()
  })

  test('밍하 화면에서 "밍석과 같게" → 입국·주소만 복사, 여권은 그대로', async () => {
    const storage = withSaved((d) => {
      d.a.flightNo = 'KE703'
      d.a.hotelName = '아사쿠사 호텔'
      d.a.passportNo = 'M11111111'
      d.b.passportNo = 'M22222222'
    })
    setup({ storage })
    await userEvent.click(within(screen.getByRole('group', { name: '누구 정보' })).getByRole('button', { name: new RegExp(theme.names.b) }))
    await userEvent.click(screen.getByRole('button', { name: `${theme.names.a}과 같게` }))
    const b = loadVjw(TRIP, storage).b
    expect(b.flightNo).toBe('KE703')
    expect(b.hotelName).toBe('아사쿠사 호텔')
    expect(b.passportNo).toBe('M22222222')
  })

  test('일정에서 항공편·숙소 고르기', async () => {
    const items = [makeItem({ booking_code: 'KE703' }), makeItem({ place_name: '아사쿠사 호텔' })]
    setup({ items })
    await userEvent.click(screen.getByRole('button', { name: '수정' }))
    await userEvent.selectOptions(screen.getByLabelText('항공편명 일정에서 고르기'), 'KE703')
    expect(screen.getByLabelText('항공편명')).toHaveValue('KE703')
    await userEvent.selectOptions(screen.getByLabelText('숙소 이름 일정에서 고르기'), '아사쿠사 호텔')
    expect(screen.getByLabelText('숙소 이름')).toHaveValue('아사쿠사 호텔')
  })

  test('복사가 막히면 길게 눌러 복사하라고 안내', async () => {
    setup({ clipboard: { writeText: async () => { throw new Error('denied') } } })
    await userEvent.click(screen.getByRole('button', { name: '국적 복사' }))
    expect(screen.getByRole('status')).toHaveTextContent('복사하지 못했어요')
  })

  test('저장이 막히면 알려줌', async () => {
    const storage = memoryStorage()
    storage.setItem = () => { throw new Error('blocked') }
    setup({ storage })
    await userEvent.click(screen.getByRole('button', { name: '수정' }))
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(screen.getByRole('status')).toHaveTextContent('저장하지 못했어요')
  })

  test('이 폰에서 지우기 (확인 후)', async () => {
    const storage = withSaved((d) => { d.a.passportNo = 'M12345678' })
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true)
    setup({ storage })
    await userEvent.click(screen.getByRole('button', { name: '이 폰에서 지우기' }))
    expect(storage.getItem('vjw:v1')).toBeNull()
    expect(screen.queryByText('M123*****')).toBeNull()
  })

  test('세 묶음 제목', () => {
    setup()
    const heads = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(heads).toEqual(['여권', '입국 정보', '일본 내 주소', '메모'])
    expect(within(document.body).getByText('여권번호')).toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { TRIP, makeItem } from '../test-fixtures'
import { ItemForm } from './ItemForm'

const DAY = '2027-01-11'

function setup(over: Partial<Parameters<typeof ItemForm>[0]> = {}) {
  const onSave = vi.fn(async () => {})
  render(<ItemForm trip={TRIP} day={DAY} member="b" nextSortOrder={3} onSave={onSave} onClose={() => {}} {...over} />)
  return { onSave, save: () => screen.getByRole('button', { name: '저장' }) }
}

describe('ItemForm', () => {
  test('장소명 비면 저장 버튼 비활성', async () => {
    const { save } = setup()
    expect(save()).toBeDisabled()
    await userEvent.type(screen.getByLabelText('장소'), '   ')
    expect(save()).toBeDisabled()
  })

  test('비용에 숫자 아닌 값이면 안내하고 저장 막음', async () => {
    const { save } = setup()
    await userEvent.type(screen.getByLabelText('장소'), '센소지')
    await userEvent.type(screen.getByLabelText('예상 비용'), '천엔')
    expect(screen.getByText('숫자만 입력해 주세요')).toBeInTheDocument()
    expect(save()).toBeDisabled()
  })

  test('새 항목 저장 시 ItemInput', async () => {
    const { onSave, save } = setup()
    await userEvent.type(screen.getByLabelText('장소'), ' 센소지 ')
    await userEvent.type(screen.getByLabelText('예상 비용'), '1,200')
    await userEvent.click(save())
    expect(onSave).toHaveBeenCalledWith({
      trip_id: TRIP.id,
      day: DAY,
      time: null,
      place_name: '센소지',
      memo: '',
      booking_code: '',
      booking_url: '',
      cost_amount: 1200,
      cost_currency: 'JPY',
      lat: null,
      lng: null,
      google_place_id: null,
      created_by: 'b',
      sort_order: 3,
    })
  })

  test('비용 빈칸은 null, 시간 입력은 HH:MM', async () => {
    const { onSave, save } = setup()
    await userEvent.type(screen.getByLabelText('장소'), '라멘')
    await userEvent.type(screen.getByLabelText('시간'), '12:30')
    await userEvent.click(save())
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ time: '12:30', cost_amount: null }))
  })

  test('수정 시 id·작성자·순서·위치 유지', async () => {
    const initial = makeItem({ id: 'keep', created_by: 'a', sort_order: 7, lat: 35.7, lng: 139.8, google_place_id: 'g1', place_name: '전' })
    const { onSave, save } = setup({ initial })
    const place = screen.getByLabelText('장소')
    await userEvent.clear(place)
    await userEvent.type(place, '후')
    await userEvent.click(save())
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'keep', created_by: 'a', sort_order: 7, lat: 35.7, lng: 139.8, google_place_id: 'g1', place_name: '후', day: initial.day }),
    )
  })

  test('통화는 여행 통화와 KRW 두 가지', () => {
    setup()
    const options = Array.from((screen.getByLabelText('통화') as HTMLSelectElement).options).map((o) => o.value)
    expect(options).toEqual(['JPY', 'KRW'])
  })
})
